"use client";
import {useEffect,useMemo,useState} from "react";
import {LineChart,Line,ResponsiveContainer,XAxis,YAxis,Tooltip,ReferenceLine} from "recharts";
import type {AssetSnapshot,Bar} from "@/lib/types";

export default function MarketChart({assets}:{assets:AssetSnapshot[]}){
 const [symbol,setSymbol]=useState("BTCUSDT"),[tf,setTf]=useState("5m"),[bars,setBars]=useState<Bar[]>([]),[source,setSource]=useState("—"),[loading,setLoading]=useState(false);
 const a=useMemo(()=>assets.find(x=>x.symbol===symbol),[assets,symbol]);
 useEffect(()=>{let active=true;setLoading(true);fetch("/api/market/chart?symbol="+encodeURIComponent(symbol)+"&tf="+tf,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(active){setBars(j.bars||[]);setSource(j.source||"—")}}).finally(()=>active&&setLoading(false));return()=>{active=false}},[symbol,tf]);
 const data=bars.map(b=>({time:new Date(b.time).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),price:b.close}));
 return <div className="panel rounded-xl p-3">
  <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><select value={symbol} onChange={e=>setSymbol(e.target.value)} className="subpanel rounded-md bg-transparent px-2 py-1 text-[10px]">{assets.map(x=><option key={x.symbol} value={x.symbol}>{x.label}</option>)}</select><div className="flex gap-1">{["1m","5m","15m","1h"].map(x=><button key={x} onClick={()=>setTf(x)} className={"rounded-md border px-2 py-1 text-[9px] "+(tf===x?"border-[var(--blue)] info":"border-[var(--line)] muted")}>{x}</button>)}</div></div><div className="muted text-[9px]">{loading?"Loading…":source}</div></div>
  <div className="h-64 w-full">{data.length?<ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="time" hide/><YAxis domain={["auto","auto"]} width={54} tick={{fontSize:9}}/><Tooltip contentStyle={{background:"var(--panel2)",border:"1px solid var(--line)",fontSize:10}}/><Line type="monotone" dataKey="price" stroke="var(--blue)" dot={false} strokeWidth={1.6}/>{a?.technical.support!=null&&<ReferenceLine y={a.technical.support} stroke="var(--red)" strokeDasharray="4 4"/>}{a?.technical.pivot!=null&&<ReferenceLine y={a.technical.pivot} stroke="var(--amber)" strokeDasharray="4 4"/>}{a?.technical.resistance!=null&&<ReferenceLine y={a.technical.resistance} stroke="var(--green)" strokeDasharray="4 4"/>}</LineChart></ResponsiveContainer>:<div className="flex h-full items-center justify-center muted text-[11px]">DATA UNAVAILABLE</div>}</div>
 </div>
}
