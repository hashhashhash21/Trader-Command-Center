import type { Bar, DerivativesSnapshot, MarketQuote } from "@/lib/types";
const F="https://fapi.binance.com", S="https://api.binance.com";
async function j(url:string,ttl=10){const r=await fetch(url,{next:{revalidate:ttl}});if(!r.ok)throw new Error("Binance "+r.status);return r.json()}
const num=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null}
const rows=(x:any[]):Bar[]=>x.map(k=>({time:Number(k[0]),open:Number(k[1]),high:Number(k[2]),low:Number(k[3]),close:Number(k[4]),volume:Number(k[5]),vwap:null}));
function session(ts:string|null):MarketQuote["sessionStatus"]{if(!ts)return"DATA UNAVAILABLE";const age=Date.now()-Date.parse(ts);return age>120000?"STALE":"LIVE"}
export async function discoverBmnrSymbol(){const e=await j(S+"/api/v3/exchangeInfo",60);const hit=(e.symbols??[]).find((x:any)=>x.status==="TRADING"&&String(x.symbol).includes("BMNR")&&String(x.quoteAsset)==="USDT");return hit?.symbol??null}
export async function cryptoSnapshot(symbol:"BTCUSDT"|"ETHUSDT"){
  const start=Date.now(); const [t,k,oi,fr,book,ls]=await Promise.all([
    j(F+"/fapi/v1/ticker/24hr?symbol="+symbol,8),j(F+"/fapi/v1/klines?symbol="+symbol+"&interval=5m&limit=180",8),j(F+"/fapi/v1/openInterest?symbol="+symbol,8).catch(()=>null),j(F+"/fapi/v1/premiumIndex?symbol="+symbol,8).catch(()=>null),j(F+"/fapi/v1/depth?symbol="+symbol+"&limit=20",8).catch(()=>null),j(F+"/futures/data/globalLongShortAccountRatio?symbol="+symbol+"&period=5m&limit=1",20).catch(()=>null)
  ]);
  const bars=rows(k), last=bars.at(-1), twelve=bars.at(-13), bid=(book?.bids?.[0]&&num(book.bids[0][0]))??null,ask=(book?.asks?.[0]&&num(book.asks[0][0]))??null;
  const ts=new Date(Number(t.closeTime??Date.now())).toISOString(); let buy=0,total=0; for(const x of k.slice(-12)){const q=num(x[7]),tb=num(x[10]);if(q!=null&&tb!=null){total+=q;buy+=tb}}
  const quote:MarketQuote={symbol,price:num(t.lastPrice),bid,ask,open:num(t.openPrice),high:num(t.highPrice),low:num(t.lowPrice),previousClose:num(t.prevClosePrice),volume:num(t.quoteVolume),vwap:num(t.weightedAvgPrice),timestamp:ts,sessionStatus:session(ts),source:"Binance Futures",delayed:false,delayMinutes:0,change1h:last&&twelve?100*(last.close-twelve.close)/twelve.close:null,change24h:num(t.priceChangePercent),bars};
  const takerSell=total-buy; const derivatives:DerivativesSnapshot={symbol,openInterest:num(oi?.openInterest),openInterestChange:null,takerBuyVolume:buy||null,takerSellVolume:takerSell||null,takerRatio:total?buy/total:null,fundingRate:num(fr?.lastFundingRate),longShortRatio:num(ls?.[0]?.longShortRatio)};
  return {quote,derivatives,latencyMs:Date.now()-start};
}
export async function bmnrSnapshot(){
  const symbol=await discoverBmnrSymbol(); if(!symbol)return null; const [t,k,b]=await Promise.all([j(S+"/api/v3/ticker/24hr?symbol="+symbol,8),j(S+"/api/v3/klines?symbol="+symbol+"&interval=5m&limit=180",8),j(S+"/api/v3/depth?symbol="+symbol+"&limit=20",8).catch(()=>null)]);
  const bars=rows(k),last=bars.at(-1),twelve=bars.at(-13),bid=(b?.bids?.[0]&&num(b.bids[0][0]))??null,ask=(b?.asks?.[0]&&num(b.asks[0][0]))??null,ts=new Date(Number(t.closeTime??Date.now())).toISOString();
  let bn=0,an=0;for(const x of b?.bids??[])bn+=Number(x[0])*Number(x[1]);for(const x of b?.asks??[])an+=Number(x[0])*Number(x[1]);
  const quote:MarketQuote={symbol:"BMNRB",price:num(t.lastPrice),bid,ask,open:num(t.openPrice),high:num(t.highPrice),low:num(t.lowPrice),previousClose:num(t.prevClosePrice),volume:num(t.quoteVolume),vwap:num(t.weightedAvgPrice),timestamp:ts,sessionStatus:session(ts),source:"Binance Spot ("+symbol+")",delayed:false,delayMinutes:0,change1h:last&&twelve?100*(last.close-twelve.close)/twelve.close:null,change24h:num(t.priceChangePercent),bars};
  return {quote,meta:{actualSymbol:symbol,turnover:num(t.quoteVolume),trades:num(t.count),orderBookImbalance:(bn+an)?100*(bn-an)/(bn+an):null,spreadBps:(bid&&ask)?10000*(ask-bid)/((ask+bid)/2):null}};
}
