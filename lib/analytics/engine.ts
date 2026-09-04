import type { Action, Bar, MarketQuote, TechnicalSnapshot } from "@/lib/types";

const n=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)?v:null;
const clamp=(x:number,a=0,b=100)=>Math.max(a,Math.min(b,x));
export function ema(values:number[], period:number){
  if(values.length<period) return null; const k=2/(period+1); let e=values[0];
  for(let i=1;i<values.length;i++) e=values[i]*k+e*(1-k); return e;
}
export function rsi(bars:Bar[], period=14){
  if(bars.length<period+1) return null; const c=bars.map(b=>b.close); let g=0,l=0;
  for(let i=c.length-period;i<c.length;i++){const d=c[i]-c[i-1]; if(d>=0)g+=d; else l-=d;}
  if(l===0) return 100; const rs=(g/period)/(l/period); return 100-100/(1+rs);
}
export function atr(bars:Bar[], period=14){
  if(bars.length<period+1) return null; let s=0,c=0;
  const v=bars.slice(-(period+1));
  for(let i=1;i<v.length;i++){const tr=Math.max(v[i].high-v[i].low,Math.abs(v[i].high-v[i-1].close),Math.abs(v[i].low-v[i-1].close));s+=tr;c++;}
  return c?s/c:null;
}
function quantile(a:number[],p:number){const v=[...a].sort((x,y)=>x-y); return v[Math.max(0,Math.min(v.length-1,Math.floor((v.length-1)*p)))]}
function nearestSupport(bars:Bar[],price:number){
  const v=bars.slice(-72); if(v.length<12)return null;
  const candidates=[quantile(v.map(x=>x.low),.18),Math.min(...v.slice(-18).map(x=>x.low))];
  return candidates.filter(x=>x<price).sort((a,b)=>price-a-(price-b))[0]??null;
}
function nearestResistance(bars:Bar[],price:number){
  const v=bars.slice(-72); if(v.length<12)return null;
  const candidates=[quantile(v.map(x=>x.high),.82),Math.max(...v.slice(-18).map(x=>x.high))];
  return candidates.filter(x=>x>price).sort((a,b)=>a-price-(b-price))[0]??null;
}
function psych(price:number){const mag=Math.pow(10,Math.max(0,Math.floor(Math.log10(Math.abs(price)))-1));return Math.round(price/mag)*mag}
export function analyze(quote:MarketQuote, opts?:{leveraged?:boolean; sectorBias?:number|null; orderFlow?:number|null; oiChange?:number|null; news?:number|null}):TechnicalSnapshot{
  const price=n(quote.price), bars=quote.bars??[]; if(price==null||bars.length<25||["STALE","DATA UNAVAILABLE"].includes(quote.sessionStatus)){
    return {symbol:quote.symbol,direction:"UNAVAILABLE",confidence:null,support:null,resistance:null,pivot:null,breakoutTrigger:null,breakdownTrigger:null,nextTarget:null,invalidation:null,entryLow:null,entryHigh:null,takeProfitLow:null,takeProfitHigh:null,risk:opts?.leveraged?"HIGH":"—",action:"WAIT",atr:null,rsi:null,ema9:null,ema20:null,ema50:null};
  }
  const closes=bars.map(b=>b.close),e9=ema(closes,9),e20=ema(closes,20),e50=ema(closes,50),rv=rsi(bars),av=atr(bars),sup=nearestSupport(bars,price),res=nearestResistance(bars,price),vw=quote.vwap;
  const p0=psych(price); const psychNear=Math.abs(p0-price) <= (av??price*.005)*1.2 ? p0 : null;
  const support=[sup, vw&&vw<price?vw:null, e20&&e20<price?e20:null, psychNear&&psychNear<price?psychNear:null].filter((x):x is number=>x!=null).sort((a,b)=>price-a-(price-b))[0]??sup;
  const resistance=[res, vw&&vw>price?vw:null, e20&&e20>price?e20:null, psychNear&&psychNear>price?psychNear:null].filter((x):x is number=>x!=null).sort((a,b)=>a-price-(b-price))[0]??res;
  const pivot=vw??e20??((support!=null&&resistance!=null)?(support+resistance)/2:null);
  let score=0, weight=0; const add=(s:number,w:number)=>{score+=s*w;weight+=w};
  if(e20&&e50)add(e20>e50?1:-1,25); if(e9)add(price>e9?1:-1,15); if(rv!=null)add(rv>55?1:rv<45?-1:0,10);
  if(vw)add(price>vw?1:-1,10); const recentVol=bars.slice(-6).reduce((a,b)=>a+b.volume,0)/6,baseVol=bars.slice(-30).reduce((a,b)=>a+b.volume,0)/30;
  if(baseVol>0)add(recentVol>baseVol*1.15?(price>(bars.at(-6)?.close??price)?1:-1):0,15);
  if(opts?.orderFlow!=null)add(Math.sign(opts.orderFlow),10); if(opts?.oiChange!=null)add(Math.sign(opts.oiChange)*(price>(bars.at(-6)?.close??price)?1:-1),5);
  if(opts?.sectorBias!=null)add(Math.sign(opts.sectorBias),5); if(opts?.news!=null)add(Math.sign(opts.news),5);
  const agreement=weight?score/weight:0, confidence=weight?Math.round(clamp(50+Math.abs(agreement)*50)):null;
  const bullish=agreement>=.22 && pivot!=null && price>pivot, bearish=agreement<=-.22 && support!=null && price<support;
  const action:Action=bullish?"BUY BIAS":bearish?"SELL/AVOID":"WAIT"; const direction=agreement>.12?"UP":agreement<-.12?"DOWN":"FLAT";
  const riskDist=av??price*.01; const invalidation=action==="BUY BIAS"?(support??price-riskDist)-riskDist*.15:action==="SELL/AVOID"?(resistance??price+riskDist)+riskDist*.15:null;
  const nextTarget=action==="SELL/AVOID"?(support??price-riskDist*1.5):(resistance??price+riskDist*1.5);
  const volPct=av?100*av/price:0; const risk=opts?.leveraged?(volPct>4?"EXTREME":volPct>2?"VERY HIGH":"HIGH"):(volPct>3?"VERY HIGH":volPct>1.5?"HIGH":volPct>.7?"MODERATE":"LOW");
  return {symbol:quote.symbol,direction,confidence,support:support??null,resistance:resistance??null,pivot,breakoutTrigger:resistance??null,breakdownTrigger:support??null,nextTarget,invalidation,entryLow:action==="BUY BIAS"?Math.max(support??price-riskDist,price-riskDist*.35):null,entryHigh:action==="BUY BIAS"?price+riskDist*.08:null,takeProfitLow:nextTarget,takeProfitHigh:nextTarget&&av?nextTarget+av*.35:null,risk,action,atr:av,rsi:rv,ema9:e9,ema20:e20,ema50:e50};
}
export function distance(price:number|null,level:number|null,side:"down"|"up"){if(price==null||level==null||price<=0)return null;return side==="down"?100*(price-level)/price:100*(level-price)/price}
