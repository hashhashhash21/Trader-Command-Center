const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function mtfCounts(mtf={}){const xs=['m5','m15','h1','h4'].map(k=>mtf[k]?.state);return{up:xs.filter(x=>x==='UP').length,down:xs.filter(x=>x==='DOWN').length,mixed:xs.filter(x=>!['UP','DOWN'].includes(x)).length}}
function confidence(e,q,alignment,marketClass){if(e==null||q==null)return'LOW';const strength=Math.abs(e-50)*2;if(marketClass==='futures'&&q>=90&&strength>=55&&alignment>=3)return'HIGH';if(q>=75&&strength>=30&&alignment>=2)return'MODERATE';return'LOW'}
function deriveDecision({marketClass,evidence,quality,fresh,mtf={},consensus,spreadBps,available=true}){
 if(!available||evidence==null)return{decision:'DATA UNAVAILABLE',reason:'required market snapshot unavailable'};
 const {up,down}=mtfCounts(mtf),alignment=Math.max(up,down);
 if(!fresh)return{decision:'NO TRADE',reason:'market snapshot is stale'};
 if(marketClass==='futures'&&quality!=null&&quality<65)return{decision:'NO TRADE',reason:'data quality below minimum'};
 if(spreadBps!=null&&spreadBps>12)return{decision:'NO TRADE',reason:'spread is abnormally wide'};
 if(up===2&&down===2)return{decision:'WAIT',reason:'timeframes conflict'};
 if(marketClass==='futures'&&consensus==='DIVERGENT')return{decision:'WAIT',reason:'venues disagree'};
 if(evidence>=65&&up>=2)return{decision:'LONG BIAS',reason:'bullish evidence and timeframe alignment'};
 if(evidence<=35&&down>=2)return{decision:'SHORT BIAS',reason:'bearish evidence and timeframe alignment'};
 return{decision:'WAIT',reason:'evidence is not decisive'};
}
function atr(rows,period=14){if(!Array.isArray(rows)||rows.length<period+2)return null;const tail=rows.slice(-(period+1));let sum=0,count=0;for(let i=1;i<tail.length;i++){const h=num(tail[i][2]),l=num(tail[i][3]),pc=num(tail[i-1][4]);if(h==null||l==null||pc==null)continue;sum+=Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc));count++}return count?sum/count:null}
function tradePlan({decision,price,rows}){price=num(price);const a=atr(rows);if(!price||!a||a<=0||!['LONG BIAS','SHORT BIAS'].includes(decision))return null;const recent=(rows||[]).slice(-30),low=Math.min(...recent.map(x=>num(x[3])).filter(x=>x!=null)),high=Math.max(...recent.map(x=>num(x[2])).filter(x=>x!=null));if(!Number.isFinite(low)||!Number.isFinite(high))return null;
 if(decision==='LONG BIAS'){const entryLow=price-.12*a,entryHigh=price+.08*a,invalidation=Math.min(price-.95*a,low-.08*a),risk=price-invalidation;if(risk<=0)return null;const t1=price+1.45*risk,t2=price+2.15*risk;return{referencePrice:price,entryZone:[entryLow,entryHigh],invalidation,targets:[t1,t2],support:low,resistance:high,riskReward:2.15,atr:a}}
 const entryLow=price-.08*a,entryHigh=price+.12*a,invalidation=Math.max(price+.95*a,high+.08*a),risk=invalidation-price;if(risk<=0)return null;const t1=price-1.45*risk,t2=price-2.15*risk;return{referencePrice:price,entryZone:[entryLow,entryHigh],invalidation,targets:[t1,t2],support:low,resistance:high,riskReward:2.15,atr:a}
}
function factors({marketClass,evidence,mtf={},derivatives={},orderflow={}}){const supporting=[],opposing=[],state=evidence>=60?'bull':evidence<=40?'bear':'mixed';for(const [k,label] of [['m5','5m'],['m15','15m'],['h1','1h'],['h4','4h']]){const s=mtf[k]?.state;if(s==='UP')(state==='bull'?supporting:opposing).push(label+' bullish');else if(s==='DOWN')(state==='bear'?supporting:opposing).push(label+' bearish')}
 const taker=num(orderflow.taker);if(taker!=null){if((state==='bull'&&taker>0)||(state==='bear'&&taker<0))supporting.push('taker flow aligned');else if(Math.abs(taker)>5)opposing.push('taker flow opposes')}
 const oi=String(derivatives.oiContext||'');if(/UPSIDE/.test(oi)&&state==='bull')supporting.push('price and OI expanding');if(/DOWNSIDE/.test(oi)&&state==='bear')supporting.push('downside participation with OI');if(/DELEVERAGING/.test(oi))opposing.push('open interest deleveraging');
 if(marketClass==='futures'){const c=derivatives.consensus?.state;if(c==='CONFIRMED')supporting.push('Binance/Bybit confirmed');else if(c==='DIVERGENT')opposing.push('Binance/Bybit divergent')}
 return{supportingFactors:supporting.slice(0,6),opposingFactors:opposing.slice(0,6)}
}
module.exports={num,mtfCounts,confidence,deriveDecision,atr,tradePlan,factors};