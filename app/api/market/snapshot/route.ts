import { NextResponse } from "next/server";
import type { AssetSnapshot, DashboardSnapshot, HealthItem, MarketQuote } from "@/lib/types";
import { analyze } from "@/lib/analytics/engine";
import { bmnrSnapshot, cryptoSnapshot } from "@/lib/providers/binance";
import { US_SYMBOLS, usQuote } from "@/lib/providers/us";
import { companyNews } from "@/lib/providers/news";

export const runtime="nodejs";
const unavailable=(symbol:string,source:string):MarketQuote=>({symbol,price:null,bid:null,ask:null,open:null,high:null,low:null,previousClose:null,volume:null,vwap:null,timestamp:null,sessionStatus:"DATA UNAVAILABLE",source,delayed:false,delayMinutes:null,bars:[]});
function nySession(){const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).map(x=>[x.type,x.value]));if(["Sat","Sun"].includes(p.weekday))return"CLOSED";const m=+p.hour*60+ +p.minute;return m>=240&&m<570?"PRE-MARKET":m>=570&&m<960?"REGULAR":m>=960&&m<1200?"AFTER-HOURS":"CLOSED"}
export async function GET(){
  const started=Date.now(); const health:HealthItem[]=[]; let btc:any,eth:any,bm:any;
  const crypto=await Promise.allSettled([cryptoSnapshot("BTCUSDT"),cryptoSnapshot("ETHUSDT"),bmnrSnapshot()]);
  btc=crypto[0].status==="fulfilled"?crypto[0].value:null;eth=crypto[1].status==="fulfilled"?crypto[1].value:null;bm=crypto[2].status==="fulfilled"?crypto[2].value:null;
  health.push({name:"Binance",state:btc&&eth?"LIVE":"DEGRADED",latencyMs:Date.now()-started,detail:"Public Futures / Spot"});
  const usResults=await Promise.all(US_SYMBOLS.map(async s=>{try{return await usQuote(s)}catch{return unavailable(s,"US API NOT CONFIGURED")}}));
  const usMap=Object.fromEntries(usResults.map(q=>[q.symbol,q]));const usLive=usResults.find(x=>x.price!=null&&!x.source.includes("NOT CONFIGURED")),usIsIex=!!usLive?.source.includes("Alpaca");health.push({name:"US Market",state:usLive?(usIsIex?"IEX":"LIVE"):"NOT CONFIGURED",latencyMs:null,detail:usLive?.source||"Optional"});
  const sectorSymbols=["SOXX","NVDA","AMD","AVGO","TSM"];const sector=sectorSymbols.map(s=>usMap[s]).filter(Boolean);const changes=sector.map(q=>q.change24h).filter((x):x is number=>x!=null);const sectorBias=changes.length>=3?changes.reduce((a,b)=>a+Math.sign(b),0)/changes.length:null;
  const news=await Promise.all(["BMNR","BMNU","SOXL","SOXS"].map(s=>companyNews(s).catch(()=>({score:null,headlines:0,source:"Unavailable",items:[]}))));
  health.push({name:"News",state:news.some(n=>n.headlines>0)?"LIVE":"NOT CONFIGURED",latencyMs:null,detail:news.some(n=>n.headlines>0)?news.reduce((a,n)=>a+n.headlines,0)+" headlines":"—"});
  const mk=(symbol:string,label:string,quote:MarketQuote,extra?:Partial<AssetSnapshot>,opts?:Parameters<typeof analyze>[1]):AssetSnapshot=>({symbol,label,quote,technical:analyze(quote,opts),...extra});
  const assets:AssetSnapshot[]=[
    mk("BTCUSDT","BTC",btc?.quote??unavailable("BTCUSDT","Binance"),{derivatives:btc?.derivatives??null}),
    mk("ETHUSDT","ETH",eth?.quote??unavailable("ETHUSDT","Binance"),{derivatives:eth?.derivatives??null}),
    mk("BMNRB","BMNRB",bm?.quote??unavailable("BMNRB","Binance"),{context:bm?.meta??{}}),
    mk("BMNU","BMNU",usMap.BMNU??unavailable("BMNU","US"),{productBadge:"2× DAILY TARGET",news:news[1]},{leveraged:true,news:news[1].score}),
    mk("SOXL","SOXL",usMap.SOXL??unavailable("SOXL","US"),{productBadge:"LEVERAGED SEMICONDUCTOR ETF",news:news[2]},{leveraged:true,sectorBias,news:news[2].score}),
    mk("SOXS","SOXS",usMap.SOXS??unavailable("SOXS","US"),{productBadge:"INVERSE LEVERAGED SEMICONDUCTOR ETF",news:news[3]},{leveraged:true,sectorBias:sectorBias==null?null:-sectorBias,news:news[3].score})
  ];
  const contextAssets=sectorSymbols.map(s=>mk(s,s,usMap[s]??unavailable(s,"US")));
  const snap:DashboardSnapshot={generatedAt:new Date().toISOString(),saudiTime:new Intl.DateTimeFormat("ar-SA",{timeZone:"Asia/Riyadh",dateStyle:"short",timeStyle:"medium"}).format(new Date()),usSession:nySession(),assets,contextAssets,health};return NextResponse.json(snap);
}
