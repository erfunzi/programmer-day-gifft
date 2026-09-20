import { t } from "../lib/i18n";

export function LoadingState({ label, detail, variant = "panel" }) {
  return <div className={`loading-state loading-state--${variant}`} role="status" aria-live="polite" aria-busy="true">
    <div className="loading-state-heading">
      <span className="loading-spinner" aria-hidden="true"><i /></span>
      <div><strong>{label}</strong>{detail && <p>{detail}</p>}</div>
    </div>
    {variant !== "inline" && <div className="loading-lines" aria-hidden="true"><i /><i /><i /></div>}
    {variant === "report" && <div className="loading-metrics" aria-hidden="true">{Array.from({length:8}, (_, i)=><div key={i}><i /><i /><i /></div>)}</div>}
  </div>;
}

export function LoadingButtonLabel({ pending, label, pendingLabel }) {
  return <>{pending && <span className="loading-spinner loading-spinner--small" aria-hidden="true"><i /></span>}{pending ? pendingLabel || t("در حال آماده‌سازی…") : label}</>;
}
