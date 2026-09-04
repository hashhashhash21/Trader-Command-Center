import type {MarketQuote,Bar} from "@/lib/types";
const num=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null};
export function finnhubConfigured(){return !!process.env.FINNHUB_API_KEY}
async function j(url:string,ttl=45){const r=await fetch(url,{next:{revalidate:ttl}});if(!r.ok)throw new Error("Finnhub "+r.status);return r.json()}
export async function finnhubQuote(symbol:string):Promise<MarketQuote>{
 if(!finnhubConfigured())throw new Error("FINNHUB_NOT_CONFIGURED");const key=process.env.FINNHUB_API_KEY!,to=Math.floor(Date.now()/1000),from=to-2*86400;
 const [q,c]=await Promise.all([j("https://finnhub.io/api/v1/quote?symbol="+encodeURIComponent(symbol)+"&token="+key,45),j("https://finnhub.io/api/v1/stock/candle?symbol="+encodeURIComponent(symbol)+"&resolution=5&from="+from+"&to="+to+"&token="+key,45).catch(()=>null)]);
 const bars:Bar[]=c&&c.s==="ok"?(c.t||[]).map((t:number,i:number)=>({time:t*1000,open:Number(c.o[i]),high:Number(c.h[i]),low:Number(c.l[i]),close:Number(c.c[i]),volume:Number(c.v[i]),vwap:null})):[];
 const price=num(q.c),pc=num(q.pc),tsIso=q.t?new Date(Number(q.t)*1000).toISOString():null,age=tsIso?Date.now()-Date.parse(tsIso):Infinity;
 return{symbol,price,bid:null,ask:null,open:num(q.o),high:num(q.h),low:num(q.l),previousClose:pc,volume:null,vwap:null,timestamp:tsIso,sessionStatus:age>15*60000?"STALE":age>2*60000?"DELAYED":"LIVE",source:"Finnhub",delayed:age>2*60000,delayMinutes:Number.isFinite(age)?Math.round(age/60000):null,change1h:null,change24h:price!=null&&pc?100*(price-pc)/pc:null,bars};
}