import { t, locale } from "../lib/i18n";
import { toast as setStatus } from "../lib/toast";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Metric } from "./Metric";
import { api, dayKey, duration, hours, number } from "../lib/api";
export function Timer({ demo }) {
  const client = useQueryClient(),
    [now, setNow] = useState(Date.now()),
    [demoState, setDemo] = useState({ active: null, total: 0, history: [] });
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const query = useQuery({
    queryKey: ["time"],
    queryFn: () => api("/api/me/time"),
    enabled: !demo,
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });
  const timerData = demo ?
  {
    ...demoState,
    serverNow: now,
    timezone: "Asia/Tehran",
    daily: { [dayKey(now, "Asia/Tehran")]: demoState.total },
    today: demoState.total,
    elapsedDays: 1,
    averagePerCalendarDay: demoState.total,
    activeDays: demoState.total ? 1 : 0
  } :
  query.data;
  const action = useMutation({
    mutationFn: () =>
    api(
      "/api/me/time/" + (timerData.active ? "stop" : "start"),
      timerData.active ? { id: timerData.active.id } : {}
    ),
    onSuccess: (value) => {
      client.setQueryData(["time"], value);
      setStatus(
        value.active ? t("تایمر روشن است؛ با بستن صفحه هم ادامه دارد.") : t("زمان جلسه ذخیره شد.")


      );
    },
    onError: (e) => setStatus(e.message)
  });
  const toggle = () => {
    if (!demo) return action.mutate();
    setDemo((s) =>
    s.active ?
    {
      active: null,
      total: s.total + now - s.active.started,
      history: [{ ...s.active, ended: now }, ...s.history]
    } :
    { ...s, active: { id: String(now), started: now } }
    );
    setStatus(t("تایمر نمونه است؛ چیزی در حساب ذخیره نمی‌شود."));
  };
  const serverNow = timerData ? now + (timerData.serverNow - query.dataUpdatedAt || 0) : now;
  const today = dayKey(now, timerData?.timezone || "Asia/Tehran"),
    days = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.parse(today + "T12:00:00Z") - (6 - i) * 86400000).
    toISOString().
    slice(0, 10)
    ),
    max = Math.max(3600000, ...days.map((d) => timerData?.daily[d] || 0));
  return (
    <>
      <div className="timer-layout">
        <section className="focus-timer surface">
          <div className="eyebrow" dir="ltr">
            MAKE ROOM FOR FOCUS
          </div>
          <h2>{t("زمانِ ساختن")}</h2>
          <div className={"timer-orbit" + (timerData?.active ? " running" : "")}>
            <span id="timer-clock" dir="ltr">
              {timerData?.active ?
              duration((demo ? now : serverNow) - timerData.active.started) :
              "00:00:00"}
            </span>
            <span id="timer-state">
              {timerData?.active ? t("زمان در حال ثبت است") : t("آمادهٔ شروع")}
            </span>
          </div>
          <Button disabled={!timerData || action.isPending} onClick={toggle}>
            {timerData?.active ? <Square size={17} /> : <Play size={17} />}{" "}
            {timerData?.active ? t("توقف و ثبت زمان") : t("شروع کار")}
          </Button>

        </section>
        <div>
          <div className="metric-grid time-metrics">
            {timerData &&
            <>
                <Metric
                label={t("امروز")}
                value={hours(timerData.today)}
                detail={t("زمان ثبت‌شده با تایمر")} />
              
                <Metric
                label={t("میانگین هر روز")}
                value={hours(timerData.averagePerCalendarDay)}
                detail={number(timerData.elapsedDays) + t(" روز تقویمی از اولین ورود")} />
              
                <Metric
                label={t("روزهای ثبت زمان")}
                value={number(timerData.activeDays)}
                detail={t("روزهایی که تایمر کار کرده است")} />
              
                <Metric
                label={t("کل زمان ثبت‌شده")}
                value={hours(timerData.total)}
                detail={t("از شروع استفاده از حساب")} />
              
              </>
            }
          </div>
          <section className="surface">
            <h3>{t("هفت روز اخیر")}</h3>
            <div className="weekly-time">
              {days.map((d) =>
              <div className="day-bar" key={d}>
                  <small>
                    {Number((timerData?.daily[d] || 0) / 3600000).toLocaleString(
                    locale(),
                    { maximumFractionDigits: 1 }
                  )}
                  </small>
                  <i
                  style={{
                    height: Math.max(3, (timerData?.daily[d] || 0) / max * 110)
                  }}
                  title={d + " · " + hours(timerData?.daily[d] || 0)} />
                
                  <span>
                    {new Date(d + "T12:00:00Z").toLocaleDateString(locale(), {
                    weekday: "short",
                    timeZone: "UTC"
                  })}
                  </span>
                </div>
              )}
            </div>
            <p className="hint">{t("میانگین روزانه از اولین ورود تا امروز حساب می‌شود و روزهای بدون زمان ثبت‌شده را هم شامل می‌شود. زمان تایمر خوداظهاری است.")}


            </p>
          </section>
        </div>
      </div>
      <section className="surface">
        <h3>{t("جلسه‌های اخیر")}</h3>
        {timerData?.history.length ?
        timerData.history.map((r) =>
        <div className="history-row" key={r.id}>
              <span>
                {new Date(r.started).toLocaleString(locale(), {
              timeZone: timerData.timezone
            })}
              </span>
              <span dir="ltr">
                {duration((r.ended ?? (demo ? now : serverNow)) - r.started)}
                {r.ended ? "" : t(" • در حال اجرا")}
              </span>
            </div>
        ) :

        <p className="hint">{t("اولین جلسه را شروع کن؛ زمان ثبت‌شده اینجا می‌ماند.")}

        </p>
        }
      </section>
    </>);

}
