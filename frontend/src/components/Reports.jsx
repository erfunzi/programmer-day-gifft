import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Metric } from "./Metric";
import { api, number } from "../lib/api";
import { activityStats, exportReport } from "../lib/activity";
import { ActivityCharts } from "./ActivityCharts";
export function Reports({ demo, onImage, createdAt }) {
  const [status, setStatus] = useState("");
  const report = useQuery({
    queryKey: ["activity", demo],
    queryFn: () =>
      demo
        ? {
            year: new Date().getFullYear(),
            current: {
              commits: 280,
              pullRequests: 32,
              reviews: 18,
              issues: 12,
              days: Array.from({ length: 180 }, (_, i) => ({
                date: new Date(Date.UTC(new Date().getFullYear(), 0, i + 1)).toISOString().slice(0,10),
                count: i % 5 === 0 ? 0 : (i * 17) % 12,
              })),
            },
            previous: {
              days: Array.from({length:180},(_,i)=>({date:new Date(Date.UTC(new Date().getFullYear()-1,0,i+1)).toISOString().slice(0,10),count:i%4===0?0:(i*7)%9})),
              commits: 210,
              pullRequests: 24,
              reviews: 9,
              issues: 14,
            },
          }
        : api("/api/me/activity"),
  });
  const config = useQuery({queryKey:["config"],queryFn:()=>api("/api/config")});
  const ai = useQuery({queryKey:["analysis",demo],queryFn:()=>api("/api/me/ai",{}),enabled:!demo,retry:false,staleTime:Infinity});
  const image = useMutation({
    mutationFn: () => api("/api/me/image", {}),
    onSuccess: (result) => {
      onImage();
      setStatus(result.message || "کاراکتر اختصاصی روی کارت قرار گرفت.");
    },
    onError: (e) => setStatus(e.message),
  });
  const labels = {
    bestDay: ["پرمشارکت‌ترین روز", "بیشترین تعداد مشارکت ثبت‌شده در یک روز."],
    total: ["کل مشارکت‌ها", "تمام مشارکت‌های ثبت‌شده در تقویم GitHub."],
    activeDays: ["روزهای فعال", "روزهایی با حداقل یک مشارکت."],
    longest: ["بیشترین تداوم", "بیشترین روزهای متوالی با مشارکت ثبت‌شده."],
    commits: ["تغییر ثبت‌شده", "کامیت: یک بسته تغییر ذخیره‌شده در پروژه."],
    pullRequests: ["پیشنهاد ادغام", "درخواست واردکردن تغییرات به یک پروژه."],
    reviews: ["بازبینی کد", "کمک به بررسی تغییرات دیگران."],
    issues: ["مسئلهٔ مطرح‌شده", "ثبت ایراد، پیشنهاد یا موضوع قابل‌پیگیری."],
  };
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>مسیر امسال، کنار پارسال</h2>
        </div>
        <Button
          variant="secondary"
          disabled={!report.data || report.isFetching}
          onClick={() => exportReport({...report.data, demo}, ai.data)}
        >
          دریافت گزارش
        </Button>
      </div>
      {(report.isPending || report.error) && <p className="hint" role="status">{report.error?.message || "در حال خواندن فعالیت‌های GitHub…"}</p>}
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
                  "پارسال: " +
                  number(p) +
                  " · " +
                  (p
                    ? number(Math.round(((c - p) / p) * 1000) / 10) + "٪ نسبت به پارسال"
                    : c
                      ? "پارسال در این بازه موردی ثبت نشده"
                      : "بدون تغییر")
                }
                extra={hint}
              />
            );
          })}
      </div>
      {report.data && <ActivityCharts report={report.data} demo={demo} createdAt={createdAt} />}
      <section className="surface ai-surface">
        <div className="section-heading">
          <div>
            <div className="eyebrow" dir="ltr">
              A SECOND PERSPECTIVE
            </div>
            <h2>تحلیل اختصاصی، با AI</h2>
          </div>
        </div>
        <p role="status" className="hint">
          {ai.isFetching
            ? "در حال بررسی پروژه‌ها و گزارش‌ها…"
            : image.isPending
              ? "ساخت کاراکتر ممکن است کمی زمان ببرد…"
              : ai.error?.message || status}
        </p>
        {ai.data && (
          <div>
            <p>{ai.data.summary}</p>
            {[
              ["نکات قابل‌مشاهده", ai.data.strengths],
              ["پیشنهادهای قابل‌اجرا", ai.data.suggestions],
            ].map(([title, list]) => (
              <section key={title}>
                <h3>{title}</h3>
                <ul>
                  {list.map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {!demo && config.data?.imageReady && <div className="actions">
          <Button
            variant="secondary"
            disabled={image.isPending || ai.isFetching}
            onClick={() =>
              demo
                ? setStatus("برای ساخت کاراکتر اختصاصی وارد شو.")
                : image.mutate()
            }
          >
            ساخت کاراکتر از تحلیل
          </Button>
        </div>}
      </section>
    </>
  );
}
