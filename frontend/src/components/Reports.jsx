import { t, locale } from "../lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "./LoadingState";
import { Button } from "./ui/button";
import { Metric } from "./Metric";
import { api, number } from "../lib/api";
import { activityStats, exportReport } from "../lib/activity";
import { ActivityCharts } from "./ActivityCharts";
export function Reports({ demo, onImage, createdAt, selection, setSelection }) {
  const year = new Date().getUTCFullYear();
  const firstYear = Math.min(year, new Date(createdAt).getUTCFullYear() || year);
  const years = Array.from({length: year - firstYear}, (_, i) => year - i - 1);
  const comparisonYear = years.includes(selection) ? selection : years[0];
  const report = useQuery({
    queryKey: ["activity", demo, comparisonYear],
    queryFn: () =>
    demo ?
    {
      year: new Date().getFullYear(),
      comparisonYear,
      current: {
        commits: 280,
        pullRequests: 32,
        reviews: 18,
        issues: 12,
        days: Array.from({ length: 180 }, (_, i) => ({
          date: new Date(Date.UTC(year, 0, i + 1)).toISOString().slice(0, 10),
          count: i % 5 === 0 ? 0 : i * 17 % 12
        }))
      },
      previous: {
        days: Array.from({ length: 180 }, (_, i) => ({ date: new Date(Date.UTC(comparisonYear || year, 0, i + 1)).toISOString().slice(0, 10), count: i % 4 === 0 ? 0 : (i * 7 + year - 1 - (comparisonYear || year)) % 9 })),
        commits: 210 - (year - 1 - (comparisonYear || year)) * 18,
        pullRequests: 24 - (year - 1 - (comparisonYear || year)) * 2,
        reviews: 9 - (year - 1 - (comparisonYear || year)),
        issues: 14 + (year - 1 - (comparisonYear || year))
      }
    } :
    api(comparisonYear && comparisonYear !== year - 1 ? `/api/me/activity?compare=${comparisonYear}` : "/api/me/activity")
  });
  const date = value => value ? new Date(value.slice(0,10) + "T00:00:00Z").toLocaleDateString(locale(), {dateStyle:"medium", timeZone:"UTC"}) : "—";
  const context = (period, key) => {
    const stats = activityStats(period);
    const days = period.days || [];
    const range = `${date(period.from || days[0]?.date)} — ${date(period.to || days.at(-1)?.date)}`;
    const specific = key === "bestDay" ? stats.bestDates.map(date).join("، ") : key === "longest" ? stats.longestRange?.map(date).join(" — ") : null;
    return `${range}\n${number(stats[key])}${specific ? ` · ${specific}` : ""}`;
  };
  const ai = useQuery({ queryKey: ["profile-analysis"], enabled: false });
  const labels = {
    bestDay: [t("پرمشارکت‌ترین روز"), t("بیشترین تعداد مشارکت ثبت‌شده در یک روز.")],
    total: [t("کل مشارکت‌ها"), t("تمام مشارکت‌های ثبت‌شده در تقویم GitHub.")],
    activeDays: [t("روزهای فعال"), t("روزهایی با حداقل یک مشارکت.")],
    longest: [t("بیشترین تداوم"), t("بیشترین روزهای متوالی با مشارکت ثبت‌شده.")],
    commits: [t("تغییر ثبت‌شده"), t("کامیت: یک بسته تغییر ذخیره‌شده در پروژه.")],
    pullRequests: [t("پیشنهاد ادغام"), t("درخواست واردکردن تغییرات به یک پروژه.")],
    reviews: [t("بازبینی کد"), t("کمک به بررسی تغییرات دیگران.")],
    issues: [t("مسئلهٔ مطرح‌شده"), t("ثبت ایراد، پیشنهاد یا موضوع قابل‌پیگیری.")]
  };
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{t(comparisonYear === year - 1 ? "مسیر امسال، کنار پارسال" : "مسیر امسال و سال انتخاب‌شده")}</h2>
          {years.length ? <label className="settings-field report-year">{t("سال مقایسه")}
            <select aria-label={t("سال مقایسه")} value={comparisonYear} onChange={event=>setSelection(Number(event.target.value))}>
              {years.map(value=><option key={value} value={value}>{value}</option>)}
            </select>
          </label> : <p>{t("هنوز سال پیشینی برای مقایسه وجود ندارد.")}</p>}
        </div>
        <Button
          variant="secondary"
          disabled={!report.data || report.isFetching}
          onClick={() => exportReport({ ...report.data, demo }, ai.data)}>{t("دریافت گزارش")}


        </Button>
      </div>
      {report.isFetching && <LoadingState variant={report.data ? "inline" : "report"} label={t("در حال خواندن فعالیت‌های GitHub…")} />}
      {report.isError && <Button variant="secondary" onClick={()=>report.refetch()}>{t("تلاش دوباره")}</Button>}
      <div className="metric-grid">
        {report.data &&
        Object.entries(labels).map(([key, [title, hint]]) => {
          const c = activityStats(report.data.current)[key],
            p = activityStats(report.data.previous)[key];
          return (
            <Metric
              key={key}
              label={title}
              value={number(c)}
              detail={
              comparisonYear ? comparisonYear + ": " +
              number(p) +
              " · " + (
              p ?
              number(Math.round((c - p) / p * 1000) / 10) + t("٪ نسبت به سال انتخاب‌شده") :
              c ? t("در بازهٔ مقایسه موردی ثبت نشده") : t("بدون تغییر")) : ""


              }
              extra={`${hint}\n${t("امسال")}: ${context(report.data.current, key)}${comparisonYear ? `\n${comparisonYear}: ${context(report.data.previous, key)}` : ""}`} />);


        })}
      </div>
      {report.data && <ActivityCharts report={{...report.data, comparisonYear, previous: comparisonYear ? report.data.previous : {days:[]}}} demo={demo} createdAt={createdAt} />}
    </>);

}
