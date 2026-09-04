import type {MarketQuote,Bar} from "@/lib/types";
const num=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null};
export function twelveConfigured(){return !!process.env.TWELVEDATA_API_KEY}
async function j(url:string,ttl=45){const r=await fetch(url,{next:{revalidate:ttl}});if(!r.ok)throw new Error("TwelveData "+r.status);return r.json()}
export async function twelveQuote(symbol:string):Promise<MarketQuote>{
 if(!twelveConfigured())throw new Error("TWELVEDATA_NOT_CONFIGURED");const key=process.env.TWELVEDATA_API_KEY!;
 const [q,ts]=await Promise.all([
  j("https://api.twelvedata.com/quote?symbol="+encodeURIComponent(symbol)+"&apikey="+key,45),
  j("https://api.twelvedata.com/time_series?symbol="+encodeURIComponent(symbol)+"&interval=5min&outputsize=120&apikey="+key,45)
 ]);
 const bars:Bar[]=(ts.values||[]).slice().reverse().map((b:any)=>({time:Date.parse(b.datetime),open:Number(b.open),high:Number(b.high),low:Number(b.low),close:Number(b.close),volume:Number(b.volume||0),vwap:null}));
 const price=num(q.close??q.price),pc=num(q.previous_close),tsIso=q.datetime?new Date(q.datetime).toISOString():(bars.at(-1)?new Date(bars.at(-1)!.time).toISOString():null),age=tsIso?Date.now()-Date.parse(tsIso):Infinity;
 return{symbol,price,bid:null,ask:null,open:num(q.open),high:num(q.high),low:num(q.low),previousClose:pc,volume:num(q.volume),vwap:null,timestamp:tsIso,sessionStatus:age>15*60000?"STALE":age>2*60000?"DELAYED":"LIVE",source:"Twelve Data",delayed:age>2*60000,delayMinutes:Number.isFinite(age)?Math.round(age/60000):null,change1h:null,change24h:price!=null&&pc?100*(price-pc)/pc:null,bars};
}