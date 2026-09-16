import { toast } from "../lib/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
const zones = [...new Set(["Asia/Tehran", "UTC", ...(Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : [])])];
export function TimezoneSettings({demo}) {
  const client = useQueryClient();
  const time = useQuery({queryKey:["time"],queryFn:()=>api("/api/me/time"),enabled:!demo});
  const change = useMutation({
    mutationFn:timezone=>api("/api/me/timezone",{timezone}),
    onSuccess:()=>{toast("منطقهٔ زمانی ذخیره شد."); return Promise.all([client.invalidateQueries({queryKey:["time"]}),client.invalidateQueries({queryKey:["session"]})]);},
  });
  return <section className="surface timezone-settings">
    <h3>زمان و منطقهٔ زمانی</h3>
    <label htmlFor="timezone">منطقهٔ زمانی گزارش</label>
    <select id="timezone" dir="ltr" value={time.data?.timezone || "Asia/Tehran"} disabled={demo || !time.data || change.isPending} onChange={e=>change.mutate(e.target.value)}>
      {zones.map(zone=><option key={zone} value={zone}>{zone === "Asia/Tehran" ? "تهران، ایران — Asia/Tehran" : zone}</option>)}
    </select>
  </section>;
}
