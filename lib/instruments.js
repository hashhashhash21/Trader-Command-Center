const INSTRUMENTS=Object.freeze({
 BTCUSDT:Object.freeze({symbol:'BTCUSDT',label:'BTC',marketClass:'futures',assetClass:'crypto',venue:'binance-usdm',validationEligible:true,snapshotEndpoint:'/api/snapshot'}),
 ETHUSDT:Object.freeze({symbol:'ETHUSDT',label:'ETH',marketClass:'futures',assetClass:'crypto',venue:'binance-usdm',validationEligible:true,snapshotEndpoint:'/api/snapshot'}),
 BMNRBUSDT:Object.freeze({symbol:'BMNRBUSDT',label:'BMNRB',marketClass:'spot',assetClass:'bstock',venue:'binance-spot',validationEligible:false,snapshotEndpoint:'/api/spot-snapshot'}),
 BMNU:Object.freeze({symbol:'BMNU',label:'BMNU',marketClass:'equity',assetClass:'leveraged-etf',venue:'us-equities',validationEligible:false,snapshotEndpoint:'/api/us-snapshot',leverage:'2x',reset:'daily'}),
 SOXL:Object.freeze({symbol:'SOXL',label:'SOXL',marketClass:'equity',assetClass:'leveraged-etf',venue:'us-equities',validationEligible:false,snapshotEndpoint:'/api/us-snapshot',leverage:'3x',reset:'daily'}),
 SOXS:Object.freeze({symbol:'SOXS',label:'SOXS',marketClass:'equity',assetClass:'inverse-leveraged-etf',venue:'us-equities',validationEligible:false,snapshotEndpoint:'/api/us-snapshot',leverage:'-3x',reset:'daily'})
});
function getInstrument(symbol){return INSTRUMENTS[String(symbol||'').toUpperCase()]||null}
function listInstruments(){return Object.values(INSTRUMENTS)}
function validationSymbols(){return listInstruments().filter(x=>x.validationEligible).map(x=>x.symbol)}
module.exports={INSTRUMENTS,getInstrument,listInstruments,validationSymbols};