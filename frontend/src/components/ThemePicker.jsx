import { t, currentLanguage } from "../lib/i18n";
import { Check, Palette } from "lucide-react";
import { THEMES } from "../lib/themes";

export function ThemePicker({ value, onChange }) {
  const language = currentLanguage();
  const rtl = language === "fa";
  return (
    <section
      className="theme-picker"
      aria-labelledby="theme-picker-title"
      lang={language}
      dir={rtl ? "rtl" : "ltr"}>
      <div className="theme-picker-heading">
        <div>
          <div className="theme-picker-kicker" dir="ltr">
            <Palette size={15} /> CARD ATMOSPHERES
          </div>
          <h2 id="theme-picker-title">{t("حال‌وهوای کارتت را انتخاب کن")}</h2>
        </div>
        <span className="theme-picker-count" dir="ltr">
          {THEMES.length} STYLES
        </span>
      </div>
      <div className="theme-options" role="radiogroup" aria-label={t("تم کارت")}>
        {THEMES.map((theme) => {
          const selected = theme.id === value;
          return (
            <button
              key={theme.id}
              type="button"
              className={`theme-option${selected ? " selected" : ""}`}
              style={{ "--swatch-a": theme.colors[0], "--swatch-b": theme.colors[1], "--swatch-c": theme.colors[2] }}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(theme.id)}>
              <span className="theme-swatch" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="theme-option-copy">
                <strong>{rtl ? theme.name : theme.english}</strong>
                {rtl && <small dir="ltr">{theme.english}</small>}
                <em>{rtl ? theme.description : theme.englishDescription}</em>
              </span>
              {selected && <Check className="theme-check" size={17} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
