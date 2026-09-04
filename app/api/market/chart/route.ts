import {NextRequest,NextResponse} from "next/server";
import {discoverBmnrSymbol} from "@/lib/providers/binance";
import {US_SYMBOLS,usQuote} from "@/lib/providers/us";
import type {Bar} from "@/lib/types";

export const runtime="nodejs";
const primary=new Set(["BTCUSDT","ETHUSDT","BMNRB",...US_SYMBOLS]);
const tfs=new Set(["1m","5m","15m","1h"]);
const rows=(x:any[]):Bar[]=>x.map(k=>({time:Number(k[0]),open:Number(k[1]),high:Number(k[2]),low:Number(k[3]),close:Number(k[4]),volume:Number(k[5]),vwap:null}));
function aggregate(bars:Bar[],minutes:number){const span=minutes*60000,out:Bar[]=[];for(const b of bars){const bucket=Math.floor(b.time/span)*span;const last=out.at(-1);if(!last||last.time!==bucket)out.push({time:bucket,open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume,vwap:null});else{last.high=Math.max(last.high,b.high);last.low=Math.min(last.low,b.low);last.close=b.close;last.volume+=b.volume}}return out}
export async function GET(req:NextRequest){
 const symbol=(req.nextUrl.searchParams.get("symbol")||"BTCUSDT").toUpperCase(),tf=(req.nextUrl.searchParams.get("tf")||"5m").toLowerCase();
 if(!primary.has(symbol)||!tfs.has(tf))return NextResponse.json({error:"unsupported symbol or timeframe"},{status:400});
 try{
  if(symbol==="BTCUSDT"||symbol==="ETHUSDT"){const r=await fetch("https://fapi.binance.com/fapi/v1/klines?symbol="+symbol+"&interval="+tf+"&limit=240",{next:{revalidate:5}});if(!r.ok)throw new Error("Binance "+r.status);return NextResponse.json({symbol,tf,source:"Binance Futures",bars:rows(await r.json())})}
  if(symbol==="BMNRB"){const actual=await discoverBmnrSymbol();if(!actual)return NextResponse.json({symbol,tf,source:"Binance",bars:[],available:false});const r=await fetch("https://api.binance.com/api/v3/klines?symbol="+actual+"&interval="+tf+"&limit=240",{next:{revalidate:5}});if(!r.ok)throw new Error("Binance "+r.status);return NextResponse.json({symbol,tf,source:"Binance Spot ("+actual+")",bars:rows(await r.json())})}
  const q=await usQuote(symbol),base=q.bars||[];if(tf==="1m")return NextResponse.json({symbol,tf,source:q.source,bars:[],available:false,note:"1m unavailable from configured free feed"});
  const bars=tf==="5m"?base:aggregate(base,tf==="15m"?15:60);return NextResponse.json({symbol,tf,source:q.source,bars,available:bars.length>0});
 }catch(e){return NextResponse.json({symbol,tf,bars:[],available:false,error:e instanceof Error?e.message:"unavailable"},{status:200})}
}
