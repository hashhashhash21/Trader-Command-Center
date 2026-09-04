const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function mtfCounts(mtf={}){const xs=['m5','m15','h1','h4'].map(k=>mtf[k]?.state);return{up:xs.filter(x=>x==='UP').length,down:xs.filter(x=>x==='DOWN').length,mixed:xs.filter(x=>!['UP','DOWN'].includes(x)).length}}
function confidence(e,q,alignment,marketClass){if(e==null||q==null)return'LOW';const strength=Math.abs(e-50)*2;if(marketClass==='futures'&&q>=90&&strength>=55&&alignment>=3)return'HIGH';if(q>=75&&strength>=30&&alignment>=2)return'MODERATE';return'LOW'}
function deriveDecision({marketClass,evidence,quality,fresh,mtf={},consensus,spreadBps,available=true,liquidityOk=true}){
 if(!available||evidence==null)return{decision:'DATA UNAVAILABLE',reason:'required market snapshot unavailable'};
 const {up,down}=mtfCounts(mtf);
 if(!fresh)return{decision:'NO TRADE',reason:'market snapshot is stale'};
 if(!liquidityOk)return{decision:'NO TRADE',reason:'liquidity gate failed'};
 if(marketClass==='futures'&&quality!=null&&quality<70)return{decision:'NO TRADE',reason:'data quality below minimum'};
 if(spreadBps!=null&&spreadBps>(marketClass==='spot'?18:10))return{decision:'NO TRADE',reason:'spread is abnormally wide'};
 if(up===2&&down===2)return{decision:'WAIT',reason:'timeframes conflict'};
 if(marketClass==='futures'&&consensus==='DIVERGENT')return{decision:'WAIT',reason:'venues disagree'};
 if(evidence>=68&&up>=3)return{decision:'LONG BIAS',reason:'bullish evidence and multi-timeframe alignment'};
 if(evidence<=32&&down>=3)return{decision:'SHORT BIAS',reason:'bearish evidence and multi-timeframe alignment'};
 return{decision:'WAIT',reason:'evidence is not decisive'};
}
function atr(rows,period=14){if(!Array.isArray(rows)||rows.length<period+2)return null;const tail=rows.slice(-(period+1));let sum=0,count=0;for(let i=1;i<tail.length;i++){const h=num(tail[i][2]),l=num(tail[i][3]),pc=num(tail[i-1][4]);if(h==null||l==null||pc==null)continue;sum+=Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc));count++}return count?sum/count:null}
function swingLevels(rows,lookback=36){const v=(rows||[]).slice(-lookback);if(v.length<10)return null;const highs=v.map(x=>num(x[2])).filter(x=>x!=null),lows=v.map(x=>num(x[3])).filter(x=>x!=null);if(highs.length<10||lows.length<10)return null;highs.sort((a,b)=>a-b);lows.sort((a,b)=>a-b);const q=(a,p)=>a[Math.min(a.length-1,Math.max(0,Math.floor((a.length-1)*p)))];return{support:q(lows,.18),resistance:q(highs,.82),low:q(lows,.05),high:q(highs,.95)}}
function tradePlan({decision,price,rows}){price=num(price);const a=atr(rows),levels=swingLevels(rows);if(!price||!a||a<=0||!levels||!['LONG BIAS','SHORT BIAS'].includes(decision))return null;
 const volatilityPct=100*a/price;if(volatilityPct<.03||volatilityPct>6)return null;
 if(decision==='LONG BIAS'){const invalidation=Math.min(levels.support-.18*a,price-1.05*a),risk=price-invalidation;if(risk<=0||risk>4*a)return null;const entryLow=Math.max(levels.support,price-.28*a),entryHigh=price+.08*a,t1=Math.max(levels.resistance,price+1.35*risk),t2=price+2.05*risk;if(entryLow>=entryHigh||t1<=price)return null;return{referencePrice:price,entryZone:[entryLow,entryHigh],invalidation,targets:[t1,t2],support:levels.support,resistance:levels.resistance,riskReward:(t2-price)/risk,atr:a,volatilityPct}}
 const invalidation=Math.max(levels.resistance+.18*a,price+1.05*a),risk=invalidation-price;if(risk<=0||risk>4*a)return null;const entryLow=price-.08*a,entryHigh=Math.min(levels.resistance,price+.28*a),t1=Math.min(levels.support,price-1.35*risk),t2=price-2.05*risk;if(entryLow>=entryHigh||t1>=price)return null;return{referencePrice:price,entryZone:[entryLow,entryHigh],invalidation,targets:[t1,t2],support:levels.support,resistance:levels.resistance,riskReward:(price-t2)/risk,atr:a,volatilityPct}
}
function factors({marketClass,evidence,mtf={},derivatives={},orderflow={}}){const supporting=[],opposing=[],state=evidence>=60?'bull':evidence<=40?'bear':'mixed';for(const [k,label] of [['m5','5m'],['m15','15m'],['h1','1h'],['h4','4h']]){const s=mtf[k]?.state;if(s==='UP')(state==='bull'?supporting:opposing).push(label+' bullish');else if(s==='DOWN')(state==='bear'?supporting:opposing).push(label+' bearish')}
 const taker=num(orderflow.taker);if(taker!=null){if((state==='bull'&&taker>0)||(state==='bear'&&taker<0))supporting.push('taker flow aligned');else if(Math.abs(taker)>5)opposing.push('taker flow opposes')}
 const oi=String(derivatives.oiContext||'');if(/UPSIDE/.test(oi)&&state==='bull')supporting.push('price and OI expanding');if(/DOWNSIDE/.test(oi)&&state==='bear')supporting.push('downside participation with OI');if(/DELEVERAGING/.test(oi))opposing.push('open interest deleveraging');
 if(marketClass==='futures'){const c=derivatives.consensus?.state;if(c==='CONFIRMED')supporting.push('Binance/Bybit confirmed');else if(c==='DIVERGENT')opposing.push('Binance/Bybit divergent')}
 return{supportingFactors:supporting.slice(0,6),opposingFactors:opposing.slice(0,6)}
}
function acceptResponse({selectedSymbol,expectedRequestId,response}){return !!response&&String(response.symbol||'')===String(selectedSymbol||'')&&String(response.requestId||'')===String(expectedRequestId||'')}
module.exports={num,mtfCounts,confidence,deriveDecision,atr,swingLevels,tradePlan,factors,acceptResponse};