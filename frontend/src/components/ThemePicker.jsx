import { Check, Palette } from "lucide-react";
import { THEMES } from "../lib/themes";

export function ThemePicker({ value, onChange }) {
  return (
    <section className="theme-picker" aria-labelledby="theme-picker-title">
      <div className="theme-picker-heading">
        <div>
          <div className="theme-picker-kicker" dir="ltr">
            <Palette size={15} /> CARD ATMOSPHERES
          </div>
          <h2 id="theme-picker-title">حال‌وهوای کارتت را انتخاب کن</h2>
          <p>تم انتخاب‌شده در کارت، صفحه و لینک اشتراکی تو حفظ می‌شود.</p>
        </div>
        <span className="theme-picker-count" dir="ltr">
          {THEMES.length} STYLES
        </span>
      </div>
      <div className="theme-options" role="radiogroup" aria-label="تم کارت">
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
              onClick={() => onChange(theme.id)}
            >
              <span className="theme-swatch" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="theme-option-copy">
                <strong>{theme.name}</strong>
                <small dir="ltr">{theme.english}</small>
                <em>{theme.description}</em>
              </span>
              {selected && <Check className="theme-check" size={17} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
