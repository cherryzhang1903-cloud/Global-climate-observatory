export const populationBins=[{max:100000,color:'#d9e7f5',label:'少于10万人'},{max:500000,color:'#9cbde0',label:'10万–50万人'},{max:1000000,color:'#6294c5',label:'50万–100万人'},{max:5000000,color:'#2f679f',label:'100万–500万人'},{max:Infinity,color:'#123e76',label:'500万人及以上'}];
export function populationColor(value){return Number.isFinite(value)&&value>=0?(populationBins.find(b=>value<b.max)||populationBins.at(-1)).color:'#9ca3af';}
export function populationSeries(rows,mode,climate){
 if(mode==='climate')return climate;
 const series={name:'城市人口',type:'scatter',coordinateSystem:'geo',symbol:'circle',symbolSize:mode==='both'?7:5.5,z:1,emphasis:{scale:1.6},data:rows.filter(s=>s.lon!=null&&s.lat!=null).map(s=>({id:s.id,city:s.city,populationLayer:true,value:[s.lon,s.lat],itemStyle:{color:populationColor(s.population),opacity:.88,borderWidth:.4,borderColor:'#fff'}}))};
 return mode==='population'?[series]:[series,...climate.map(s=>({...s,z:3}))];
}
