import {useState} from 'react';
import {number} from '../lib/api';
export function ActivityCharts({report}) {
 const [selected,setSelected]=useState(null);
 const current=report.current.days || [], previous=report.previous.days || [];
 const cumulative=days=>{let sum=0;return days.map(d=>sum+=d.count>0?1:0)};
 const lines=[cumulative(current),cumulative(previous)];
 const max=Math.max(1,...lines.flat()), length=Math.max(2,current.length,previous.length);
 const points=values=>values.map((v,i)=>`${40+i/(length-1)*680},${210-v/max*170}`).join(' ');
 const offset=current.length?new Date(current[0].date+'T00:00:00Z').getUTCDay():0;
 const detail=d=>`${new Date(d.date+'T00:00:00Z').toLocaleDateString('fa-IR',{dateStyle:'full',timeZone:'UTC'})} · ${d.date} · ${number(d.count)} مشارکت`;
 return <>
 <section className="surface persistence-chart">
 <h3>پشتکار؛ تداوم مشارکت امسال و پارسال</h3>
 <p className="hint">تعداد تجمعی روزهای دارای مشارکت در بازه‌های مقایسه؛ محور افقی روزهای سپری‌شده از ابتدای سال است.</p>
 <div className="chart-legend"><span>● {report.year}</span><span>● {report.year-1}</span></div>
 <svg viewBox="0 0 760 250" role="img" aria-label="نمودار مقایسهٔ روزهای فعال تجمعی" dir="ltr">
 {[0,.5,1].map(t=><g key={t}><line x1="40" x2="720" y1={210-t*170} y2={210-t*170} stroke="var(--theme-line)"/><text x="30" y={214-t*170} textAnchor="end" fill="var(--theme-muted)" fontSize="12">{Math.round(max*t)}</text></g>)}
 {lines.map((values,i)=><polyline key={i} points={points(values)} fill="none" stroke={i?'var(--theme-accent-2)':'var(--theme-accent)'} strokeWidth="3" strokeDasharray={i?'7 4':undefined}/>)}
 <text x="40" y="238" fill="var(--theme-muted)" fontSize="12">1</text><text x="720" y="238" textAnchor="end" fill="var(--theme-muted)" fontSize="12">{length}</text>
 </svg>
 </section>
 <section className="surface contribution-calendar">
 <h3>ریتم مشارکت امسال</h3>
 <div className="calendar-scroll"><div className="calendar-cells" style={{gridTemplateColumns:`repeat(${Math.ceil((offset+current.length)/7)},14px)`}} dir="ltr">
 {Array.from({length:offset},(_,i)=><span key={'pad'+i}/>)}
 {current.map(d=><button key={d.date} type="button" className={`day-cell level-${d.count>8?3:d.count>3?2:d.count?1:0}`} aria-label={detail(d)} title={detail(d)} onMouseEnter={()=>setSelected(d)} onFocus={()=>setSelected(d)} onClick={()=>setSelected(d)}/>)}
 </div></div>
 <p className="calendar-detail" role="status">{selected?detail(selected):'برای جزئیات، روی یک روز برو یا آن را لمس کن.'}</p>
 <p className="hint">تعداد مشارکت‌ها شامل فعالیت‌های تقویم GitHub است و فقط کامیت‌ها نیست.</p>
 </section>
 </>;
}
