import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Metric } from "./Metric";
import { api, number } from "../lib/api";
export function Reports({ demo, onImage }) {
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
                date: "روز نمونهٔ " + (i + 1),
                count: i % 5 === 0 ? 0 : (i * 17) % 12,
              })),
            },
            previous: {
              commits: 210,
              pullRequests: 24,
              reviews: 9,
              issues: 14,
            },
          }
        : api("/api/me/activity"),
  });
  const ai = useMutation({
    mutationFn: () => api("/api/me/ai", {}),
    onError: (e) => setStatus(e.message),
    onSuccess: () => setStatus("تحلیل Gemini آماده شد."),
  });
  const image = useMutation({
    mutationFn: () => api("/api/me/image", {}),
    onSuccess: () => {
      onImage();
      setStatus("کاراکتر اختصاصی روی کارت قرار گرفت.");
    },
    onError: (e) => setStatus(e.message),
  });
  const labels = {
    commits: ["تغییر ثبت‌شده", "کامیت: یک بسته تغییر ذخیره‌شده در پروژه."],
    pullRequests: ["پیشنهاد ادغام", "درخواست واردکردن تغییرات به یک پروژه."],
    reviews: ["بازبینی کد", "کمک به بررسی تغییرات دیگران."],
    issues: ["مسئلهٔ مطرح‌شده", "ثبت ایراد، پیشنهاد یا موضوع قابل‌پیگیری."],
  };
  return (
    <>
      <div className="section-heading">
        <div>
          <div className="eyebrow">از عدد به معنی</div>
          <h2>مسیر امسال، کنار پارسال</h2>
        </div>
        <Button
          variant="secondary"
          disabled={report.isFetching}
          onClick={() => report.refetch()}
        >
          دریافت گزارش
        </Button>
      </div>
      <p className="hint">
        {report.data
          ? `${report.data.year} در برابر ${report.data.year - 1} · `
          : ""}
        مقایسهٔ بازه‌های هم‌اندازهٔ تقویم میلادی، از اول سال تا امروز.
      </p>
      <p className="hint" role="status">
        {report.isPending
          ? "در حال خواندن فعالیت‌های GitHub…"
          : report.error?.message ||
            (demo
              ? "داده‌های این مقایسه ساختگی‌اند."
              : "فعالیت‌های قابل‌مشاهده برای اتصال GitHub")}
      </p>
      <div className="metric-grid">
        {report.data &&
          Object.entries(labels).map(([key, [title, hint]]) => {
            const c = report.data.current[key],
              p = report.data.previous[key];
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
                    ? number(((c - p) / p) * 100) + "٪ نسبت به پارسال"
                    : c
                      ? "پارسال در این بازه موردی ثبت نشده"
                      : "بدون تغییر")
                }
                extra={hint}
              />
            );
          })}
      </div>
      <div className="report-columns">
        <section className="surface">
          <h3>ریتم مشارکت امسال</h3>
          <div className="activity-map" aria-label="تقویم فعالیت">
            {report.data?.current.days.map((d, i) => (
              <span
                key={d.date + "-" + i}
                className={
                  d.count > 8
                    ? "level3"
                    : d.count > 3
                      ? "level2"
                      : d.count
                        ? "level1"
                        : ""
                }
                title={d.date + " · " + number(d.count) + " مشارکت"}
              />
            ))}
          </div>
          <p className="hint">
            هر خانه یک روز است؛ رنگ روشن‌تر یعنی مشارکت بیشتر. روز بدون کامیت
            الزاماً روز بدون کار نیست.
          </p>
        </section>
        <section className="surface">
          <h3>چه چیزهایی را می‌شود فهمید؟</h3>
          <p>
            تغییرات ثبت‌شده، پیشنهادهای ادغام، بازبینی‌ها و گفت‌وگو دربارهٔ
            مسئله‌ها، جنبه‌های متفاوت همکاری‌اند.
          </p>
          <p className="hint">
            این عددها ساعت کار، کیفیت کد یا ارزش یک فرد را اندازه نمی‌گیرند.
            مقایسهٔ تاریخی ستاره‌ها و دنبال‌کننده‌ها بدون دادهٔ ذخیره‌شده قابل
            بازسازی دقیق نیست.
          </p>
        </section>
      </div>
      <section className="surface ai-surface">
        <div className="section-heading">
          <div>
            <div className="eyebrow" dir="ltr">
              A SECOND PERSPECTIVE
            </div>
            <h2>تحلیل اختصاصی، با AI</h2>
          </div>
          <Button
            disabled={ai.isPending || image.isPending}
            onClick={() =>
              demo
                ? setStatus("برای تحلیل اطلاعات واقعی، با GitHub وارد شو.")
                : ai.mutate()
            }
          >
            تحلیل مسیر من
          </Button>
        </div>
        <p className="hint">
          با انتخاب این دکمه، اطلاعات عمومی پروژه‌ها و خلاصهٔ زمان ثبت‌شده برای
          تحلیل به Gemini فرستاده می‌شود. این برداشت از فعالیت‌هاست، نه تشخیص
          شخصیت واقعی. در طرح رایگان، داده‌ها ممکن است برای بهبود سرویس استفاده
          شوند.
        </p>
        <p role="status" className="hint">
          {ai.isPending
            ? "در حال بررسی پروژه‌ها و گزارش‌ها…"
            : image.isPending
              ? "ساخت کاراکتر ممکن است کمی زمان ببرد…"
              : status}
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
        <div className="actions">
          <Button
            variant="secondary"
            disabled={image.isPending || ai.isPending}
            onClick={() =>
              demo
                ? setStatus("برای ساخت کاراکتر اختصاصی وارد شو.")
                : image.mutate()
            }
          >
            ساخت کاراکتر از تحلیل
          </Button>
        </div>
        <p className="hint">
          تولید تصویر به سرویس تصویر و سهمیهٔ جداگانه وابسته است. در نبود آن،
          کاراکتر آمادهٔ متناسب با حوزهٔ کارت استفاده می‌شود.
        </p>
      </section>
    </>
  );
}
