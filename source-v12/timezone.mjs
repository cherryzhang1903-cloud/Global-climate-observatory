function localFormatter(timezone){if(!timezone)throw Error('本站缺少当地时区，不能将UTC当作当地时间');try{return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});}catch{throw Error('本站时区无效或浏览器暂不支持：'+timezone);}}
function localStamp(formatter,ms){const p=Object.fromEntries(formatter.formatToParts(new Date(ms)).map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;}
export function boundaryYears(year,timezone){const f=localFormatter(timezone),start=Date.UTC(year,0,1),end=Date.UTC(year+1,0,1);const offset=ms=>Date.parse(localStamp(f,ms)+'Z')-ms;return [...new Set([...(offset(start)>0?[year-1]:[]),...(offset(end-3600000)<0?[year+1]:[])])];}
export function localizeAnnualData(dumps,year,timezone){
 const f=localFormatter(timezone),source=new Map(),present=new Set(),model=new Set();
 for(const d of dumps){for(const row of d.rows)source.set(row[0],row);for(const i of d.presentIndices||[])present.add(d.rows[i][0]);for(const i of d.modelIndices||[])model.add(d.rows[i][0]);}
 const rows=[],utcTimes=[];let presentHours=0,modelHours=0;const start=Date.UTC(year,0,1)-86400000,end=Date.UTC(year+1,0,1)+86400000;
 for(let ms=start;ms<end;ms+=3600000){const local=localStamp(f,ms);if(Number(local.slice(0,4))!==year)continue;const utc=new Date(ms).toISOString().slice(0,19),r=source.get(utc)||[utc,null,null,null,null,null,null];rows.push([local,...r.slice(1)]);utcTimes.push(utc+'Z');if(present.has(utc))presentHours++;if(model.has(utc))modelHours++;}
 return {rows,utcTimes,presentHours,missingHours:rows.length-presentHours,modelHours,year,timezone};
}
