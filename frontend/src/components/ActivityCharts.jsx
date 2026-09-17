import { t, locale } from "../lib/i18n";
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { number, api } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
export function ActivityCharts({ report, demo, createdAt }) {
  const [tip, setTip] = useState(null),[index, setIndex] = useState(null);
  const [selectedYear, setSelectedYear] = useState(report.year);
  const parsedYear = new Date(createdAt).getUTCFullYear();
  const firstYear = Number.isFinite(parsedYear) ? Math.min(parsedYear, report.year) : report.year;
  const years = Array.from({ length: report.year - firstYear + 1 }, (_, i) => report.year - i);
  const calendar = useQuery({ queryKey: ['calendar', demo, selectedYear], enabled: selectedYear !== report.year,
    queryFn: () => demo ? { current: { days: Array.from({ length: (Date.UTC(selectedYear + 1, 0, 1) - Date.UTC(selectedYear, 0, 1)) / 86400000 }, (_, i) => ({ date: new Date(Date.UTC(selectedYear, 0, i + 1)).toISOString().slice(0, 10), count: (i * 17 + selectedYear) % 12 })) } } : api(`/api/me/activity?year=${selectedYear}`) });
  const calendarDays = selectedYear === report.year ? report.current.days : calendar.data?.current.days || [];
  const current = report.current.days || [],previous = report.previous.days || [];
  const cumulative = (days) => {let sum = 0;return days.map((d) => sum += d.count > 0 ? 1 : 0);};
  const lines = [cumulative(current), cumulative(previous)];
  const max = Math.max(1, ...lines.flat()),length = Math.max(2, current.length, previous.length);
  const points = (values) => values.map((v, i) => `${40 + i / (length - 1) * 680},${210 - v / max * 170}`).join(' ');
  const offset = calendarDays.length ? new Date(calendarDays[0].date + 'T00:00:00Z').getUTCDay() : 0;
  const detail = (d) => `${new Date(d.date + 'T00:00:00Z').toLocaleDateString(locale(), { dateStyle: 'full', timeZone: 'UTC' })} · ${d.date} · ${number(d.count)} ${t("مشارکت")}`;
  const show = (text, x, y) => setTip({ text, x: Math.max(12, Math.min(x - 140, window.innerWidth - 292)), y: Math.max(12, Math.min(y + 18, window.innerHeight - 100)) });
  const hide = () => {setTip(null);setIndex(null);};
  const chartTip = (i, x, y) => {setIndex(i);show([0, 1].map((j) => `${report.year - j} · ${(j ? previous : current)[i]?.date || '—'} · ${lines[j][i] ?? '—'} ${t("روز فعال")}`).join('\n'), x, y);};
  return <>
 <section className="surface persistence-chart">
 <h3>{t("پشتکار؛ تداوم مشارکت امسال و پارسال")}</h3>
 <div className="chart-legend"><span><i />{t("امسال ·")}{" "}{report.year}</span><span><i />{t("پارسال ·")}{" "}{report.year - 1}</span></div>
 <svg viewBox="0 0 760 250" role="img" aria-label={t("نمودار مقایسهٔ روزهای فعال تجمعی")} dir="ltr" tabIndex={0}
      onMouseMove={(e) => {const r = e.currentTarget.getBoundingClientRect();const i = Math.max(0, Math.min(length - 1, Math.round(((e.clientX - r.left) / r.width * 760 - 40) / 680 * (length - 1))));chartTip(i, e.clientX, e.clientY);}} onMouseLeave={hide} onBlur={hide}
      onKeyDown={(e) => {if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {e.preventDefault();const i = Math.max(0, Math.min(length - 1, (index ?? 0) + (e.key === 'ArrowRight' ? 1 : -1)));const r = e.currentTarget.getBoundingClientRect();chartTip(i, r.left + r.width / 2, r.top);}}}>
 {[0, .5, 1].map((t) => <g key={t}><line x1="40" x2="720" y1={210 - t * 170} y2={210 - t * 170} stroke="var(--theme-line)" /><text x="30" y={214 - t * 170} textAnchor="end" fill="var(--theme-muted)" fontSize="12">{Math.round(max * t)}</text></g>)}
 {lines.map((values, i) => <polyline key={i} points={points(values)} fill="none" stroke={i ? 'var(--chart-previous)' : 'var(--chart-current)'} strokeWidth="3" strokeDasharray={i ? '7 4' : undefined} />)}
 {index !== null && <line x1={40 + index / (length - 1) * 680} x2={40 + index / (length - 1) * 680} y1="35" y2="210" stroke="var(--theme-muted)" strokeDasharray="3 3" />}
 <text x="40" y="238" fill="var(--theme-muted)" fontSize="12">1</text><text x="720" y="238" textAnchor="end" fill="var(--theme-muted)" fontSize="12">{length}</text>
 </svg>
 </section>
 <section className="surface contribution-calendar">
 <h3>{t("ریتم مشارکت")}{" "}{selectedYear}</h3>
 <div className="calendar-layout">
 <nav className="calendar-years" aria-label={t("سال مشارکت‌ها")}>{years.map((year) => <button type="button" key={year} aria-pressed={selectedYear === year} onClick={() => {hide();setSelectedYear(year);}}>{year}</button>)}</nav>
 <div className="calendar-content">
 {selectedYear !== report.year && calendar.isPending && <p role="status">{t("در حال دریافت مشارکت‌ها…")}</p>}
 <div className="calendar-scroll"><div className="calendar-cells" style={{ gridTemplateColumns: `repeat(${Math.ceil((offset + calendarDays.length) / 7)},14px)` }} dir="ltr">
 {Array.from({ length: offset }, (_, i) => <span key={'pad' + i} />)}
 {calendarDays.map((d) => <button key={d.date} type="button" className={`day-cell level-${d.count > 8 ? 3 : d.count > 3 ? 2 : d.count ? 1 : 0}`} aria-label={detail(d)} onMouseLeave={hide} onBlur={hide} onMouseEnter={(e) => show(detail(d), e.clientX, e.clientY)} onFocus={(e) => {const r = e.currentTarget.getBoundingClientRect();show(detail(d), r.left, r.bottom);}} onClick={(e) => {const r = e.currentTarget.getBoundingClientRect();show(detail(d), r.left, r.bottom);}} />)}
 </div></div>
 </div></div>
 </section>
 {tip && createPortal(<div className="activity-tooltip" role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>, document.body)}
 </>;
}
