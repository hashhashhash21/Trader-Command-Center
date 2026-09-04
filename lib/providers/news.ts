import type { NewsSnapshot } from "@/lib/types";
const pos=["beats","surge","growth","approval","partnership","record","upgrade","expands","strong","rally","gain"];
const neg=["miss","drop","cut","lawsuit","ban","downgrade","weak","delay","decline","probe","loss"];
function score(headlines:string[]){if(headlines.length<3)return null;let s=0,h=0;for(const x of headlines){const l=x.toLowerCase();for(const w of pos)if(l.includes(w)){s++;h++}for(const w of neg)if(l.includes(w)){s--;h++}}return h?Math.max(-100,Math.min(100,Math.round(100*s/Math.max(3,h)))):0}
export async function companyNews(symbol:string):Promise<NewsSnapshot>{
  const key=process.env.FINNHUB_API_KEY;if(!key)return{score:null,headlines:0,source:"Not configured",items:[]};
  const to=new Date().toISOString().slice(0,10),from=new Date(Date.now()-2*86400000).toISOString().slice(0,10),r=await fetch("https://finnhub.io/api/v1/company-news?symbol="+encodeURIComponent(symbol)+"&from="+from+"&to="+to+"&token="+key,{next:{revalidate:600}});
  if(!r.ok)return{score:null,headlines:0,source:"Finnhub unavailable",items:[]};const j=await r.json();const items=(j??[]).slice(0,12).map((x:any)=>({headline:String(x.headline||""),url:x.url})).filter((x:any)=>x.headline);
  return{score:score(items.map((x:any)=>x.headline)),headlines:items.length,source:"Finnhub",items};
}
