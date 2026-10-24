export const colors=['#89959c','#326b50','#8aad68','#d4bb4f','#d68b52','#a43d4d'];
export function decodeStation(value){try{return decodeURIComponent(value);}catch{return null;}}
export function riskLevel(value){return value==null||!Number.isFinite(value)?0:Math.min(5,Math.max(1,Math.floor(value/20)+1));}
export function shapeFor(type=''){return /^AH/.test(type)?'dry':/^HH/.test(type)?'humid':type.includes('混合')?'mixed':'mild';}
export function filterStations(rows,{query='',continent='',level='',shape=''}={}){const q=query.trim().toLowerCase();return rows.filter(s=>(!q||[s.city,s.country,s.id].join(' ').toLowerCase().includes(q))&&(!continent||s.continent===continent)&&(level===''||s.level===Number(level))&&(!shape||s.shape===shape));}
