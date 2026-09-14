export function dayKey(ms,timezone='UTC'){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(ms).map(p=>[p.type,p.value]));
 return `${p.year}-${p.month}-${p.day}`;
}
export function summarizeTime(rows,timezone,now,joined){
 const daily={};
 for(const row of rows){
  let cursor=row.started;const end=Math.min(row.ended??now,now);
  while(cursor<end){
   const key=dayKey(cursor,timezone);let next=Math.min(end,cursor+36*3600000);
   if(dayKey(next-1,timezone)!==key){let lo=cursor+1,hi=next;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(dayKey(mid,timezone)===key)lo=mid+1;else hi=mid}next=lo}
   daily[key]=(daily[key]||0)+(next-cursor);cursor=next;
  }
 }
 const today=dayKey(now,timezone),since=dayKey(joined,timezone);
 const elapsedDays=Math.max(1,Math.round((Date.parse(today)-Date.parse(since))/86400000)+1);
 const total=Object.values(daily).reduce((a,b)=>a+b,0),activeDays=Object.keys(daily).length;
 return {daily,total,today:daily[today]||0,activeDays,elapsedDays,averagePerCalendarDay:total/elapsedDays,averagePerTrackedDay:activeDays?total/activeDays:0,since,timezone};
}
export function comparisonWindows(now=new Date()){
 const year=now.getUTCFullYear(),start=Date.UTC(year,0,1),elapsed=now.getTime()-start;
 // Compare an equal elapsed duration, including leap years.
 return {year,current:{from:new Date(start).toISOString(),to:now.toISOString()},previous:{from:new Date(Date.UTC(year-1,0,1)).toISOString(),to:new Date(Date.UTC(year-1,0,1)+elapsed).toISOString()}};
}
