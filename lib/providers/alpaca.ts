import type { Bar, MarketQuote } from "@/lib/types";
const num=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null};
function nySession(){
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  if(["Sat","Sun"].includes(p.weekday))return"CLOSED";const m=Number(p.hour)*60+Number(p.minute);if(m>=240&&m<570)return"PRE-MARKET";if(m>=570&&m<960)return"REGULAR";if(m>=960&&m<1200)return"AFTER-HOURS";return"CLOSED";
}
async function j(url:string,headers:HeadersInit,ttl=30){const r=await fetch(url,{headers,next:{revalidate:ttl}});if(!r.ok)throw new Error("Alpaca "+r.status);return r.json()}
export function alpacaConfigured(){return !!(process.env.ALPACA_API_KEY&&process.env.ALPACA_API_SECRET)}
export async function alpacaQuote(symbol:string):Promise<MarketQuote>{
  if(!alpacaConfigured())throw new Error("ALPACA_NOT_CONFIGURED");const h={"APCA-API-KEY-ID":process.env.ALPACA_API_KEY!,"APCA-API-SECRET-KEY":process.env.ALPACA_API_SECRET!},base="https://data.alpaca.markets";
  const snap=await j(base+"/v2/stocks/"+symbol+"/snapshot?feed=iex",h,30);const end=new Date().toISOString(),start=new Date(Date.now()-2*86400000).toISOString();
  const bh=await j(base+"/v2/stocks/"+symbol+"/bars?timeframe=5Min&start="+encodeURIComponent(start)+"&end="+encodeURIComponent(end)+"&limit=500&feed=iex&adjustment=raw",h,30).catch(()=>({bars:[]}));
  const bars:Bar[]=(bh.bars??[]).map((b:any)=>({time:Date.parse(b.t),open:Number(b.o),high:Number(b.h),low:Number(b.l),close:Number(b.c),volume:Number(b.v),vwap:num(b.vw)}));
  const q=snap.latestQuote??{},tr=snap.latestTrade??{},d=snap.dailyBar??{},p=snap.prevDailyBar??{},price=num(tr.p??snap.minuteBar?.c??d.c),ts=tr.t??q.t??d.t??null,age=ts?Date.now()-Date.parse(ts):Infinity,ny=nySession();
  const state=ny==="CLOSED"?"CLOSED":age>15*60000?"STALE":age>90000?"DELAYED":"LIVE";
  return {symbol,price,bid:num(q.bp),ask:num(q.ap),open:num(d.o),high:num(d.h),low:num(d.l),previousClose:num(p.c),volume:num(d.v),vwap:num(d.vw),timestamp:ts,sessionStatus:state,source:"Alpaca IEX",delayed:state==="DELAYED",delayMinutes:Number.isFinite(age)?Math.round(age/60000):null,change1h:null,change24h:price!=null&&num(p.c)?100*(price-Number(p.c))/Number(p.c):null,bars};
}
