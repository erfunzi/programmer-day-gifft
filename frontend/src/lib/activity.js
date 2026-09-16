export function activityStats(period) {
  const days = [...(period.days || [])].sort((a,b)=>a.date.localeCompare(b.date));
  let longest = 0, streak = 0, last = 0;
  for (const day of days) {
    const stamp = Date.parse(day.date);
    streak = day.count > 0 ? (stamp - last === 86400000 ? streak + 1 : 1) : 0;
    longest = Math.max(longest, streak); last = stamp;
  }
  return {...period, bestDay: days.reduce((n,d)=>Math.max(n,d.count),0), total: days.reduce((n,d)=>n+d.count,0), activeDays: days.filter(d=>d.count>0).length, longest};
}
export function exportReport(data, analysis) {
  const blob = new Blob([JSON.stringify({generatedAt:new Date().toISOString(), ...data, current:activityStats(data.current), previous:activityStats(data.previous), analysis:analysis || null},null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=`developer-report-${data.year}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
