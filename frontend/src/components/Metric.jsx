import { useId } from "react";
export function Metric({ label, value, detail, extra }) {
  const id = useId();
  return <div className="metric" tabIndex={extra ? 0 : undefined} aria-describedby={extra ? id : undefined}>
    <label>{label}</label><strong>{value}</strong><small>{detail}</small>
    {extra && <span id={id} role="tooltip" className="metric-tooltip">{extra}</span>}
  </div>;
}
