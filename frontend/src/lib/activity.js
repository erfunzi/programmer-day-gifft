import {currentLanguage} from "./i18n";
export function activityStats(period) {
  const days = [...(period.days || [])].sort((a,b)=>a.date.localeCompare(b.date));
  let longest = 0, streak = 0, last = 0, streakStart = null, longestRange = null;
  for (const day of days) {
    const stamp = Date.parse(day.date);
    streak = day.count > 0 ? (stamp - last === 86400000 ? streak + 1 : 1) : 0;
    if (streak === 1) streakStart = day.date;
    if (streak > longest) longestRange = [streakStart, day.date];
    longest = Math.max(longest, streak); last = stamp;
  }
  const bestDay = days.reduce((n,d)=>Math.max(n,d.count),0);
  return {...period, bestDay, bestDates: days.filter(d=>bestDay > 0 && d.count===bestDay).map(d=>d.date), longestRange, total: days.reduce((n,d)=>n+d.count,0), activeDays: days.filter(d=>d.count>0).length, longest};
}
export function exportReport(data, analysis) {
  const blob = new Blob([JSON.stringify({generatedAt:new Date().toISOString(), ...data, current:activityStats(data.current), previous:activityStats(data.previous), language:currentLanguage(), analysis:analysis?.locales?.[currentLanguage()] || null},null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=`developer-report-${data.year}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
