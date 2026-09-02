const INSTRUMENTS=Object.freeze({
  BTCUSDT:Object.freeze({symbol:'BTCUSDT',label:'BTC',marketClass:'futures',venue:'binance-usdm',validationEligible:true,snapshotEndpoint:'/api/snapshot'}),
  ETHUSDT:Object.freeze({symbol:'ETHUSDT',label:'ETH',marketClass:'futures',venue:'binance-usdm',validationEligible:true,snapshotEndpoint:'/api/snapshot'}),
  BMNRBUSDT:Object.freeze({symbol:'BMNRBUSDT',label:'BMNRB',marketClass:'spot',venue:'binance-spot',validationEligible:false,snapshotEndpoint:'/api/spot-snapshot'})
});
function getInstrument(symbol){return INSTRUMENTS[String(symbol||'').toUpperCase()]||null}
function listInstruments(){return Object.values(INSTRUMENTS)}
function validationSymbols(){return listInstruments().filter(x=>x.validationEligible).map(x=>x.symbol)}
module.exports={INSTRUMENTS,getInstrument,listInstruments,validationSymbols};