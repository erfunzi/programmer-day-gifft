import { t } from "../lib/i18n";
import { dismissToast, useToasts } from "../lib/toast";
export function Toasts() {
  const items = useToasts();
  return <div className="toast-region" aria-label={t("اعلان‌ها")} dir="rtl" aria-live="polite" aria-relevant="additions">
    {items.map((item) => <div className="toast" role="status" key={item.id}>
      <span>{item.message}</span>
      <button type="button" aria-label={t("بستن اعلان")} onClick={() => dismissToast(item.id)}>×</button>
    </div>)}
  </div>;
}
