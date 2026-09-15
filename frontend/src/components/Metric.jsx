export function Metric({ label, value, detail, extra }) {
  return (
    <div className="metric">
      <label>{label}</label>
      <strong>{value}</strong>
      <small>{detail}</small>
      {extra && <small>{extra}</small>}
    </div>
  );
}
