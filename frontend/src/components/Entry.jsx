import { useToastMessage } from "../lib/toast";
import { Button } from "./ui/button";
export function Entry({ onDemo, status }) {
  useToastMessage(status);
  return (
    <section id="intro" className="entry">
      <div className="intro-copy">
        <div className="eyebrow" dir="ltr">
          YOUR WORK. IN PERSPECTIVE.
        </div>
        <h1>
          فقط کد نیست.
          <br />
          مسیرِ <em>ساختن توست.</em>
        </h1>
        <p className="lead">
          کارت حرفه‌ای تو، زمان‌هایی که صرف ساختن می‌کنی و تصویری روشن از
          پیشرفتت؛ قابل‌فهم حتی برای کسی که برنامه‌نویس نیست.
        </p>
        <Button asChild className="login-button">
          <a href="/auth/github">
            <span dir="ltr">GitHub</span> · ورود و ساخت کارت
          </a>
        </Button>
        <p className="hint">
          ورود رسمی از طریق GitHub؛ بدون دریافت رمز عبور یا درخواست دسترسی به
          مخزن‌های خصوصی.
        </p>

        <Button variant="ghost" onClick={onDemo}>
          دیدن نمونهٔ کارت و گزارش ←
        </Button>
        <div className="steps">
          <span>
            <b>01</b> وصل شو
          </span>
          <i />
          <span>
            <b>02</b> مسیرت را ببین
          </span>
          <i />
          <span>
            <b>03</b> داستانت را به اشتراک بگذار
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
        <div className="sample-label">هر پروژه، بخشی از داستان تو</div>
      </div>
    </section>
  );
}
