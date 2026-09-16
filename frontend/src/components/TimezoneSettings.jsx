import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
const zones = [...new Set(["Asia/Tehran", "UTC", ...(Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : [])])];
export function TimezoneSettings({demo}) {
  const client = useQueryClient();
  const time = useQuery({queryKey:["time"],queryFn:()=>api("/api/me/time"),enabled:!demo});
  const change = useMutation({
    mutationFn:timezone=>api("/api/me/timezone",{timezone}),
    onSuccess:()=>Promise.all([client.invalidateQueries({queryKey:["time"]}),client.invalidateQueries({queryKey:["session"]})]),
  });
  return <section className="surface timezone-settings">
    <h3>زمان و منطقهٔ زمانی</h3>
    <label htmlFor="timezone">منطقهٔ زمانی گزارش</label>
    <select id="timezone" dir="ltr" value={time.data?.timezone || "Asia/Tehran"} disabled={demo || !time.data || change.isPending} onChange={e=>change.mutate(e.target.value)}>
      {zones.map(zone=><option key={zone} value={zone}>{zone === "Asia/Tehran" ? "تهران، ایران — Asia/Tehran" : zone}</option>)}
    </select>
    <p className="hint" role="status">{change.error?.message || time.error?.message || (change.isPending ? "در حال ذخیره…" : change.isSuccess ? "منطقهٔ زمانی ذخیره شد." : "")}</p>
  </section>;
}
