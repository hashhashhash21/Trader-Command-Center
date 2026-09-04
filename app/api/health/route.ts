import { NextResponse } from "next/server";
import { alpacaConfigured } from "@/lib/providers/alpaca";
export const runtime="nodejs";
export async function GET(){
  const start=Date.now();let binance:"LIVE"|"DEGRADED"="LIVE";try{const r=await fetch("https://fapi.binance.com/fapi/v1/ping",{cache:"no-store"});if(!r.ok)binance="DEGRADED"}catch{binance="DEGRADED"}
  return NextResponse.json({generatedAt:new Date().toISOString(),providers:[
    {name:"Binance",state:binance,latencyMs:Date.now()-start,detail:"Futures/Spot public"},
    {name:"Alpaca",state:alpacaConfigured()?"IEX":"NOT CONFIGURED",latencyMs:null,detail:alpacaConfigured()?"IEX feed":"Set ALPACA_API_KEY / ALPACA_API_SECRET"},
    {name:"News",state:process.env.FINNHUB_API_KEY?"LIVE":"NOT CONFIGURED",latencyMs:null,detail:process.env.FINNHUB_API_KEY?"Finnhub":"Optional"}
  ]})
}
