const H={'Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
const {getInstrument}=require('../lib/instruments');
const {num,confidence,deriveDecision,tradePlan,factors,mtfCounts}=require('../lib/pretrade');
function base(){return process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:null)}
async function j(path,timeout=6500){const b=base();if(!b)throw new Error('deployment host unavailable');const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(b+path,{signal:c.signal,cache:'no-store',headers:{Accept:'application/json'}}),x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(x.error||('HTTP '+r.status));return x}finally{clearTimeout(t)}}
module.exports=async function(req,res){Object.entries(H).forEach(([k,v])=>res.setHeader(k,v));res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const symbol=String(req.query?.symbol||'BTCUSDT').toUpperCase(),instrument=getInstrument(symbol);if(!instrument)return res.status(400).json({error:'unsupported symbol'});
 try{
  const market=instrument.marketClass;
  const snapPath=instrument.snapshotEndpoint+'?symbol='+encodeURIComponent(symbol);
  const tickerPath=market==='futures'?'/fapi/v1/ticker/price?symbol='+symbol:'/api/v3/ticker/price?symbol='+symbol;
  const candlePath=(market==='futures'?'/fapi/v1/klines?':'/api/v3/klines?')+'symbol='+symbol+'&interval=5m&limit=120';
  const [snap,ticker,candles]=await Promise.all([
    j(snapPath),
    j('/api/market?market='+market+'&path='+encodeURIComponent(tickerPath)),
    j('/api/market?market='+market+'&path='+encodeURIComponent(candlePath))
  ]);
  const core=market==='futures'?(snap.snapshot||{}):snap,available=market==='futures'?!!snap.available:!!snap.available;
  const px=num(ticker.data?.price??ticker.data?.lastPrice??core.price),rows=Array.isArray(candles.data)?candles.data:[];
  const observedAt=market==='futures'?(core.observed_at||null):new Date().toISOString(),ageMs=market==='futures'?(snap.ageMs??null):0,fresh=market==='futures'?!!snap.fresh:true;
  const evidence=num(core.evidence_score),quality=market==='futures'?num(core.quality_score):(available?85:null),mtf=core.mtf||{},der=core.derivatives||{},of=core.orderflow||{},consensus=der.consensus?.state||null,spread=num(of.spread);
  const baseDecision=deriveDecision({marketClass:market,evidence,quality,fresh,mtf,consensus,spreadBps:spread,available:available&&px!=null});
  const counts=mtfCounts(mtf),align=Math.max(counts.up,counts.down),conf=confidence(evidence,quality,align,market);
  const ff=factors({marketClass:market,evidence,mtf,derivatives:der,orderflow:of}),plan=tradePlan({decision:baseDecision.decision,price:px,rows});
  const decision=(['LONG BIAS','SHORT BIAS'].includes(baseDecision.decision)&&!plan)?'WAIT':baseDecision.decision;
  return res.status(200).json({
   version:'v74',symbol,marketType:market,decision,decisionReason:decision==='WAIT'&&baseDecision.decision!==decision?'no valid volatility/structure trade plan':baseDecision.reason,
   evidenceScore:evidence,confidenceClass:decision==='NO TRADE'||decision==='DATA UNAVAILABLE'?'LOW':conf,qualityScore:quality,regime:core.regime||null,mtfAlignment:mtf.alignment||null,
   referencePrice:px,entryZone:plan?.entryZone||null,invalidation:plan?.invalidation||null,targets:plan?.targets||null,riskReward:plan?.riskReward||null,support:plan?.support||null,resistance:plan?.resistance||null,atr5m:plan?.atr||null,
   supportingFactors:ff.supportingFactors,opposingFactors:ff.opposingFactors,consensus:market==='futures'?consensus:null,freshness:{fresh,ageMs},validationMaturity:{eligible:instrument.validationEligible},
   provenance:{snapshot:market==='futures'?(core.provenance||null):(snap.source||null),ticker:ticker.source||null,candles:candles.source||null},
   observedAt,generatedAt:new Date().toISOString(),guardrail:'Decision-support bias only. No certainty is implied; NO TRADE/WAIT gates take precedence when evidence or data quality is insufficient.'
  });
 }catch(e){return res.status(503).json({version:'v74',symbol,decision:'DATA UNAVAILABLE',error:'pre-trade snapshot unavailable',detail:e.message})}
};