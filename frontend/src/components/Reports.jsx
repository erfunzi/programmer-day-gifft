import { t } from "../lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "./LoadingState";
import { Button } from "./ui/button";
import { Metric } from "./Metric";
import { api, number } from "../lib/api";
import { activityStats, exportReport } from "../lib/activity";
import { ActivityCharts } from "./ActivityCharts";
export function Reports({ demo, onImage, createdAt }) {
  const report = useQuery({
    queryKey: ["activity", demo],
    queryFn: () =>
    demo ?
    {
      year: new Date().getFullYear(),
      current: {
        commits: 280,
        pullRequests: 32,
        reviews: 18,
        issues: 12,
        days: Array.from({ length: 180 }, (_, i) => ({
          date: new Date(Date.UTC(new Date().getFullYear(), 0, i + 1)).toISOString().slice(0, 10),
          count: i % 5 === 0 ? 0 : i * 17 % 12
        }))
      },
      previous: {
        days: Array.from({ length: 180 }, (_, i) => ({ date: new Date(Date.UTC(new Date().getFullYear() - 1, 0, i + 1)).toISOString().slice(0, 10), count: i % 4 === 0 ? 0 : i * 7 % 9 })),
        commits: 210,
        pullRequests: 24,
        reviews: 9,
        issues: 14
      }
    } :
    api("/api/me/activity")
  });
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
          <h2>{t("مسیر امسال، کنار پارسال")}</h2>
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
              t("پارسال: ") +
              number(p) +
              " · " + (
              p ?
              number(Math.round((c - p) / p * 1000) / 10) + t("٪ نسبت به پارسال") :
              c ? t("پارسال در این بازه موردی ثبت نشده") : t("بدون تغییر"))


              }
              extra={hint} />);


        })}
      </div>
      {report.data && <ActivityCharts report={report.data} demo={demo} createdAt={createdAt} />}
    </>);

}
