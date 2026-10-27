export const populationBins=[{max:100000,color:'#d9e7f5',label:'少于10万人'},{max:500000,color:'#9cbde0',label:'10万–50万人'},{max:1000000,color:'#6294c5',label:'50万–100万人'},{max:5000000,color:'#2f679f',label:'100万–500万人'},{max:Infinity,color:'#123e76',label:'500万人及以上'}];
export function populationColor(value){return Number.isFinite(value)&&value>=0?(populationBins.find(b=>value<b.max)||populationBins.at(-1)).color:'transparent';}
export function visibleCities(cities,stationIds){return cities.filter(c=>c.stationIds.some(id=>stationIds.has(id)));}
export function cityRegions(cities,mode,stationIds){
 const visible=new Set(visibleCities(cities,stationIds).map(c=>c.name));
 return cities.map(c=>{const show=mode!=='climate'&&visible.has(c.name),color=show?populationColor(c.population):'transparent';return {name:c.name,itemStyle:{areaColor:color,borderColor:show?'#52718e':'transparent',borderWidth:show?.5:0},emphasis:{label:{show:false},itemStyle:{areaColor:show?'#e0ae45':'transparent',borderColor:show?'#29455d':'transparent'}},select:{label:{show:false},itemStyle:{areaColor:color,borderColor:show?'#29455d':'transparent'}}};});
}
