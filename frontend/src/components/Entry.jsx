import { t } from "../lib/i18n";
import { useToastMessage } from "../lib/toast";
import { Button } from "./ui/button";
import { LoadingButtonLabel, LoadingState } from "./LoadingState";
export function Entry({ onDemo, status, account, entering, onEnter }) {
  useToastMessage(status);
  return (
    <section id="intro" className="entry">
      <div className="intro-copy">
        <div className="eyebrow" dir="ltr">
          YOUR WORK. IN PERSPECTIVE.
        </div>
        <h1>{t("فقط کد نیست.")}

          <br />{t("مسیرِ")}{" "}
          <em>{t("ساختن توست.")}</em>
        </h1>
        <p className="lead">{t("کارت حرفه‌ای تو، زمان‌هایی که صرف ساختن می‌کنی و تصویری روشن از پیشرفتت؛ قابل‌فهم حتی برای کسی که برنامه‌نویس نیست.")}


        </p>
        <Button className="login-button" disabled={entering} onClick={onEnter} aria-busy={entering}>
          <LoadingButtonLabel pending={entering} pendingLabel={t("در حال ورود…")} label={account ? t("ورود") : <><span dir="ltr">GitHub</span> {t("· ورود و ساخت کارت")}</>} />
        </Button>
        {entering && <LoadingState variant="inline" label={t("در حال ورود…")} />}
        {!account && <p className="hint">{t("ورود رسمی از طریق GitHub؛ بدون دریافت رمز عبور یا درخواست دسترسی به مخزن‌های خصوصی.")}


        </p>}

        <Button variant="ghost" disabled={entering} onClick={onDemo}>{t("دیدن نمونهٔ کارت و گزارش ←")}

        </Button>
        <div className="steps">
          <span>
            <b>01</b> {t("وصل شو")}
          </span>
          <i />
          <span>
            <b>02</b> {t("مسیرت را ببین")}
          </span>
          <i />
          <span>
            <b>03</b> {t("داستانت را به اشتراک بگذار")}
          </span>
        </div>
      </div>
      <div className="preview-scene">
        <article className="preview-card" dir="ltr">
          <div className="card-top">
            <span>DEVELOPER CARD</span>
            <span>PERSONAL EDITION</span>
          </div>
          <div className="preview-symbol">
            {"{"}
            <span>✳</span>
            {"}"}
          </div>
          <div className="preview-heading">
            SMALL STEPS.
            <br />
            <span>REAL IMPACT.</span>
          </div>
          <div className="preview-divider" />
          <div className="preview-bottom">
            <div>
              <strong>Your name. Your craft.</strong>
              <p>Beyond the commit count.</p>
            </div>
            <span className="mini-code">&lt;/&gt;</span>
          </div>
        </article>
        <div className="sample-label">{t("هر پروژه، بخشی از داستان تو")}</div>
      </div>
    </section>);

}
