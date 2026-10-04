import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, number } from "../lib/api";
import { words } from "./StudioEditor";
import { Button } from "./ui/button";

export function SnapshotTrends() {
  const query = useQuery({
    queryKey: ["snapshots"],
    queryFn: () => api("/api/me/snapshots"),
  });
  const [period, setPeriod] = useState("");
  const rows = query.data?.snapshots || [];
  const periods = [...new Set(rows.map((r) => r.period))];
  const chosen = periods.includes(period) ? period : periods[0];
  const selected = rows
    .filter((r) => r.period === chosen)
    .slice()
    .reverse();
  const totals = selected.map((r) =>
    r.current.days.reduce((sum, d) => sum + d.count, 0),
  );
  const max = Math.max(1, ...totals);
  return (
    <section className="surface studio-insights">
      <h3>{words("روند گزارش‌های ذخیره‌شده", "Saved report trends")}</h3>
      <p>
        {words(
          "از اولین گزارش ذخیره می‌شود؛ دادهٔ گذشته ساخته نمی‌شود. هر ستون جمع مشارکت‌های دوره در زمان ثبت است.",
          "History starts with your first saved report. Each bar shows the period’s contribution total at capture time.",
        )}
      </p>
      {query.isError && (
        <Button onClick={() => query.refetch()}>
          {words("تلاش دوباره", "Retry")}
        </Button>
      )}
      {!rows.length ? (
        <p>
          {words(
            "پس از دریافت گزارش، اولین نقطهٔ روند ظاهر می‌شود.",
            "Your first trend point appears after loading a report.",
          )}
        </p>
      ) : (
        <>
          <select
            className="report-year-select"
            aria-label={words("دورهٔ روند", "Trend period")}
            value={chosen}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periods.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <div className="snapshot-bars">
            {selected.map((r, i) => (
              <div key={r.id} title={`${r.day}: ${totals[i]}`}>
                <span
                  style={{ height: `${Math.max(2, (totals[i] / max) * 100)}%` }}
                />
                <small>{r.day}</small>
                <b>{number(totals[i])}</b>
              </div>
            ))}
          </div>
          <a href="/api/me/snapshots?format=csv">
            {words("دریافت CSV", "Download CSV")} ↓
          </a>
        </>
      )}
    </section>
  );
}

export function WeeklyTarget() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["goal"],
    queryFn: () => api("/api/me/goal"),
    refetchInterval: 30000,
  });
  const [minutes, setMinutes] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/me/goal", { minutes: Number(minutes) }),
    onSuccess: (r) => client.setQueryData(["goal"], r),
  });
  return (
    <section className="surface studio-insights">
      <h3>{words("یک هدف برای این هفته", "One goal for this week")}</h3>
      <p>
        {words(
          "هفته از دوشنبه و بر اساس منطقهٔ زمانی حساب محاسبه می‌شود.",
          "Weeks start Monday in your account time zone.",
        )}
      </p>
      <label>
        {words("زمان هدف به دقیقه", "Target minutes")}
        <input
          type="number"
          min="1"
          max="10080"
          value={minutes}
          placeholder={String(query.data?.minutes || 60)}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </label>
      <Button
        disabled={mutation.isPending || !minutes}
        onClick={() => mutation.mutate()}
      >
        {words("ثبت هدف", "Save goal")}
      </Button>
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
      {query.data?.minutes && (
        <>
          <p>
            {number(Math.floor(query.data.completed))} /{" "}
            {number(query.data.minutes)}
          </p>
          <progress
            aria-label={words("پیشرفت هدف هفتگی", "Weekly goal progress")}
            max={query.data.minutes}
            value={Math.min(query.data.completed, query.data.minutes)}
          />
        </>
      )}
    </section>
  );
}
