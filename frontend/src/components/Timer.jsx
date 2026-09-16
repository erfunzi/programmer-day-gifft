import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Metric } from "./Metric";
import { api, dayKey, duration, hours, number } from "../lib/api";
export function Timer({ demo }) {
  const client = useQueryClient(),
    [now, setNow] = useState(Date.now()),
    [status, setStatus] = useState(""),
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
    refetchOnWindowFocus: true,
  });
  const t = demo
    ? {
        ...demoState,
        serverNow: now,
        timezone: "Asia/Tehran",
        daily: { [dayKey(now, "Asia/Tehran")]: demoState.total },
        today: demoState.total,
        elapsedDays: 1,
        averagePerCalendarDay: demoState.total,
        activeDays: demoState.total ? 1 : 0,
      }
    : query.data;
  const action = useMutation({
    mutationFn: () =>
      api(
        "/api/me/time/" + (t.active ? "stop" : "start"),
        t.active ? { id: t.active.id } : {},
      ),
    onSuccess: (value) => {
      client.setQueryData(["time"], value);
      setStatus(
        value.active
          ? "تایمر روشن است؛ با بستن صفحه هم ادامه دارد."
          : "زمان جلسه ذخیره شد.",
      );
    },
    onError: (e) => setStatus(e.message),
  });
  const toggle = () => {
    if (!demo) return action.mutate();
    setDemo((s) =>
      s.active
        ? {
            active: null,
            total: s.total + now - s.active.started,
            history: [{ ...s.active, ended: now }, ...s.history],
          }
        : { ...s, active: { id: String(now), started: now } },
    );
    setStatus("تایمر نمونه است؛ چیزی در حساب ذخیره نمی‌شود.");
  };
  const serverNow = t ? now + (t.serverNow - query.dataUpdatedAt || 0) : now;
  const today = dayKey(now, t?.timezone || "Asia/Tehran"),
    days = Array.from({ length: 7 }, (_, i) =>
      new Date(Date.parse(today + "T12:00:00Z") - (6 - i) * 86400000)
        .toISOString()
        .slice(0, 10),
    ),
    max = Math.max(3600000, ...days.map((d) => t?.daily[d] || 0));
  return (
    <>
      <div className="timer-layout">
        <section className="focus-timer surface">
          <div className="eyebrow" dir="ltr">
            MAKE ROOM FOR FOCUS
          </div>
          <h2>زمانِ ساختن</h2>
          <div className={"timer-orbit" + (t?.active ? " running" : "")}>
            <span id="timer-clock" dir="ltr">
              {t?.active
                ? duration((demo ? now : serverNow) - t.active.started)
                : "00:00:00"}
            </span>
            <span id="timer-state">
              {t?.active ? "زمان در حال ثبت است" : "آمادهٔ شروع"}
            </span>
          </div>
          <Button disabled={!t || action.isPending} onClick={toggle}>
            {t?.active ? <Square size={17} /> : <Play size={17} />}{" "}
            {t?.active ? "توقف و ثبت زمان" : "شروع کار"}
          </Button>
          <p className="hint" role="status">
            {status ||
              query.error?.message ||
              "تا وقتی توقف را نزنی، زمان ادامه دارد؛ حتی با بستن این صفحه."}
          </p>
        </section>
        <div>
          <div className="metric-grid time-metrics">
            {t && (
              <>
                <Metric
                  label="امروز"
                  value={hours(t.today)}
                  detail="زمان ثبت‌شده با تایمر"
                />
                <Metric
                  label="میانگین هر روز"
                  value={hours(t.averagePerCalendarDay)}
                  detail={number(t.elapsedDays) + " روز تقویمی از اولین ورود"}
                />
                <Metric
                  label="روزهای ثبت زمان"
                  value={number(t.activeDays)}
                  detail="روزهایی که تایمر کار کرده است"
                />
                <Metric
                  label="کل زمان ثبت‌شده"
                  value={hours(t.total)}
                  detail="از شروع استفاده از حساب"
                />
              </>
            )}
          </div>
          <section className="surface">
            <h3>هفت روز اخیر</h3>
            <div className="weekly-time">
              {days.map((d) => (
                <div className="day-bar" key={d}>
                  <small>
                    {Number((t?.daily[d] || 0) / 3600000).toLocaleString(
                      "fa-IR",
                      { maximumFractionDigits: 1 },
                    )}
                  </small>
                  <i
                    style={{
                      height: Math.max(3, ((t?.daily[d] || 0) / max) * 110),
                    }}
                    title={d + " · " + hours(t?.daily[d] || 0)}
                  />
                  <span>
                    {new Date(d + "T12:00:00Z").toLocaleDateString("fa-IR", {
                      weekday: "short",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
              ))}
            </div>
            <p className="hint">
              میانگین روزانه از اولین ورود تا امروز حساب می‌شود و روزهای بدون
              زمان ثبت‌شده را هم شامل می‌شود. زمان تایمر خوداظهاری است.
            </p>
          </section>
        </div>
      </div>
      <section className="surface">
        <h3>جلسه‌های اخیر</h3>
        {t?.history.length ? (
          t.history.map((r) => (
            <div className="history-row" key={r.id}>
              <span>
                {new Date(r.started).toLocaleString("fa-IR", {
                  timeZone: t.timezone,
                })}
              </span>
              <span dir="ltr">
                {duration((r.ended ?? (demo ? now : serverNow)) - r.started)}
                {r.ended ? "" : " • در حال اجرا"}
              </span>
            </div>
          ))
        ) : (
          <p className="hint">
            اولین جلسه را شروع کن؛ زمان ثبت‌شده اینجا می‌ماند.
          </p>
        )}
      </section>
    </>
  );
}
