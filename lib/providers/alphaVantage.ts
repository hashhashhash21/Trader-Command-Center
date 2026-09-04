import type {MarketQuote,Bar} from "@/lib/types";
const num=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null};
export function alphaConfigured(){return !!process.env.ALPHAVANTAGE_API_KEY}
async function j(url:string,ttl=60){const r=await fetch(url,{next:{revalidate:ttl}});if(!r.ok)throw new Error("AlphaVantage "+r.status);return r.json()}
export async function alphaQuote(symbol:string):Promise<MarketQuote>{
 if(!alphaConfigured())throw new Error("ALPHAVANTAGE_NOT_CONFIGURED");const key=process.env.ALPHAVANTAGE_API_KEY!;
 const [g,t]=await Promise.all([j("https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol="+encodeURIComponent(symbol)+"&apikey="+key,60),j("https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol="+encodeURIComponent(symbol)+"&interval=5min&outputsize=compact&apikey="+key,60).catch(()=>null)]);
 const q=g["Global Quote"]||{},series=t?.["Time Series (5min)"]||{},bars:Bar[]=Object.entries(series).map(([time,v]:any)=>({time:Date.parse(time),open:Number(v["1. open"]),high:Number(v["2. high"]),low:Number(v["3. low"]),close:Number(v["4. close"]),volume:Number(v["5. volume"]),vwap:null})).sort((a,b)=>a.time-b.time);
 const price=num(q["05. price"]),pc=num(q["08. previous close"]),tsIso=q["07. latest trading day"]?new Date(q["07. latest trading day"]+"T20:00:00Z").toISOString():(bars.at(-1)?new Date(bars.at(-1)!.time).toISOString():null),age=tsIso?Date.now()-Date.parse(tsIso):Infinity;
 return{symbol,price,bid:null,ask:null,open:num(q["02. open"]),high:num(q["03. high"]),low:num(q["04. low"]),previousClose:pc,volume:num(q["06. volume"]),vwap:null,timestamp:tsIso,sessionStatus:age>30*60000?"STALE":"DELAYED",source:"Alpha Vantage",delayed:true,delayMinutes:Number.isFinite(age)?Math.round(age/60000):null,change1h:null,change24h:price!=null&&pc?100*(price-pc)/pc:null,bars};
}