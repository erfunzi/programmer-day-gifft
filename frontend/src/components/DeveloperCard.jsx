import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "./ui/button";
import { api, number } from "../lib/api";
import { analyze } from "../lib/sample";
import { characterProfile, characterAssetPath } from "../lib/character";
import { exportCard } from "../lib/export-card";

export function DeveloperCard({
  profile,
  demo,
  visitor,
  account,
  holiday,
  imageVersion,
  onPublished,
}) {
  const cardRef = useRef(null),
    data = useMemo(() => analyze(profile), [profile]);
  const character = useMemo(() => characterProfile(data), [data]);
  const [status, setStatus] = useState(""),
    [qr, setQR] = useState(""),
    [image, setImage] = useState("");
  const localImage = characterAssetPath("neutral", character.kind),
    u = data.user;
  const shareURL = `${location.origin}/?u=${encodeURIComponent(u.login)}`;
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(
      visitor || account?.published ? shareURL : location.origin + "/",
      { margin: 0, width: 180, errorCorrectionLevel: "M" },
    ).then((url) => {
      if (active) setQR(url);
    });
    return () => {
      active = false;
    };
  }, [shareURL, visitor, account?.published]);
  useEffect(() => {
    let active = true;
    setImage(localImage);
    if (!demo) {
      const source = `${visitor ? "/api/cards/" + encodeURIComponent(u.login) + "/image" : "/api/me/image"}?v=${imageVersion}`;
      const candidate = new Image();
      candidate.onload = () => {
        if (active) setImage(source);
      };
      candidate.src = source;
    }
    return () => {
      active = false;
    };
  }, [demo, visitor, u.login, localImage, imageVersion]);
  const action = useMutation({
    mutationFn: async (kind) => {
      if (kind === "download") {
        setStatus("در حال آماده‌کردن تصویر همین کارت…");
        await exportCard(cardRef.current, u.login);
        return "تصویر همین کارت با کیفیت بالا آماده شد ✓";
      }
      if (kind === "unshare") {
        await api("/api/me/share", { publish: false });
        onPublished(false);
        return "کارت دیگر برای مهمان‌ها قابل‌مشاهده نیست.";
      }
      if (!visitor) {
        await api("/api/me/share", { publish: true });
        onPublished(true);
      }
      try {
        await navigator.clipboard.writeText(shareURL);
        return "لینک کارت کپی شد. زمان کار و گزارش خصوصی هستند.";
      } catch {
        return "لینک کارت: " + shareURL;
      }
    },
    onSuccess: setStatus,
    onError: (e) => setStatus(e.message),
  });
  const descriptions = {
    web: [
      "توسعه‌دهندهٔ وب",
      "ابزارها و تجربه‌هایی برای وب می‌سازد؛ چیزهایی که در مرورگر با آن‌ها کار می‌کنیم.",
    ],
    data: [
      "سازندهٔ ابزارهای داده",
      "در پروژه‌ها نشانه‌هایی از کار با داده یا ابزارهای پایتون دیده می‌شود؛ برای تشخیص دقیق کاربرد، توضیحات هر پروژه مهم است.",
    ],
    mobile: [
      "توسعه‌دهندهٔ موبایل",
      "روی تجربه‌هایی کار می‌کند که می‌توان با تلفن همراه از آن‌ها استفاده کرد.",
    ],
    game: [
      "سازندهٔ تجربه‌های تعاملی",
      "موضوع‌های پروژه‌ها به ساخت بازی و دنیاهای تعاملی اشاره دارند.",
    ],
    systems: [
      "سازندهٔ سیستم و ابزار",
      "روی بخش‌هایی کار می‌کند که نرم‌افزارها را اجرا می‌کنند یا کارهای تکراری را ساده‌تر می‌کنند.",
    ],
    maker: [
      "سازندهٔ نرم‌افزار",
      "پروژه‌های عمومی، بخشی از تجربه‌ها و ایده‌های او برای ساختن نرم‌افزار را نشان می‌دهند.",
    ],
  };
  const [title, description] = descriptions[character.kind];
  return (
    <div className="result-grid">
      <article
        ref={cardRef}
        id="dev-card"
        className="dev-card auto-rotate"
        dir="ltr"
        data-archetype={character.kind}
        data-character-style="neutral"
        style={{
          "--character-hue": character.hue + "deg",
          "--character-tilt": ((character.seed % 7) - 3) * 0.35 + "deg",
          "--character-zoom": 1 + ((character.seed >> 3) % 5) * 0.012,
        }}
      >
        <div className="card-top">
          <span>DEVELOPER CARD</span>
          <span>
            {holiday ? "DAY 256" : new Date().getFullYear() + " EDITION"}
          </span>
        </div>
        <div className="identity">
          <img
            src={u.avatar_url || "/favicon.svg"}
            alt=""
            width="70"
            height="70"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/favicon.svg";
            }}
          />
          <div>
            <h2>{u.name || u.login}</h2>
            <a
              href={"https://github.com/" + u.login}
              target="_blank"
              rel="noreferrer"
            >
              @{u.login}
            </a>
          </div>
        </div>
        <div className="role">{title}</div>
        <div className="character-stage">
          <div className="character-orbit" aria-hidden="true" />
          <img
            id="character"
            src={image || localImage}
            width="420"
            height="420"
            alt={"کاراکتر الهام‌گرفته از پروژه‌ها · " + character.title}
          />
          <span className="character-class">{character.label}</span>
          <span className="character-code">#{character.serial}</span>
        </div>
        <div className="card-celebration">
          <span>{holiday ? "HAPPY PROGRAMMER’S" : "BUILT WITH"}</span>
          <h3>
            {holiday ? "DAY" : "CARE"}
            <span className="mint">.</span>
          </h3>
        </div>
        <div className="character-traits">
          {character.traits.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="stats">
          <div>
            <b>{number(u.public_repos)}</b>
            <span>public projects</span>
          </div>
          <div>
            <b>{number(data.stars)}</b>
            <span>project stars</span>
          </div>
          <div>
            <b>{number(u.followers)}</b>
            <span>followers</span>
          </div>
        </div>
        <div className="card-foot">
          <div>
            <span>
              BUILDING SINCE {new Date(u.created_at).getUTCFullYear()}
            </span>
            <small>KEEP BUILDING. STAY CURIOUS.</small>
          </div>
          <div id="qr">
            {qr && <img src={qr} width="96" height="96" alt="QR کارت عمومی" />}
          </div>
        </div>
      </article>
      <div className="story">
        <div className="story-label">// به زبان ساده</div>
        <h2>{title}، به روایت پروژه‌ها</h2>
        <p>
          {description}
          {data.top &&
            ` پروژهٔ «${data.top.name}» یکی از نمونه‌های قابل‌مشاهدهٔ این مسیر است.`}
        </p>
        <div className="languages">
          {data.languages.slice(0, 5).map(([language, count]) => (
            <span className="language" key={language}>
              {language} · {number(count)} پروژه
            </span>
          ))}
        </div>
        <p className="hint">
          {demo
            ? "اطلاعات نمایشی"
            : number(profile.repos.length) + " مخزن عمومی بررسی‌شده"}
          ؛ حوزهٔ کاری برداشتی از موضوع‌ها و زبان‌هاست. پروژه‌های خصوصی و کارهای
          خارج از GitHub در این تصویر نیستند.
        </p>
        {data.top && (
          <a
            className="repo-highlight"
            href={`https://github.com/${u.login}/${data.top.name}`}
            target="_blank"
            rel="noreferrer"
          >
            دیدن {data.top.name} در GitHub ↗
          </a>
        )}
        <div className="plain-guide">
          <h3>این عددها چه می‌گویند؟</h3>
          <p>
            <strong>پروژه:</strong> جایی برای ساختن یک ابزار، محصول یا آزمایش.
            همهٔ پروژه‌ها محصول تمام‌شده نیستند.
          </p>
          <p>
            <strong>ستاره:</strong> کسی این پروژه را پسندیده یا برای بعد ذخیره
            کرده؛ معادل تعداد مشتری یا کیفیت قطعی نیست.
          </p>
          <p>
            <strong>دنبال‌کننده:</strong> افرادی که می‌خواهند فعالیت این
            توسعه‌دهنده را دنبال کنند.
          </p>
        </div>
        <div className="actions">
          <Button
            disabled={action.isPending}
            onClick={() => action.mutate("download")}
          >
            <Download size={17} />
            دانلود کارت PNG
          </Button>
          <Button
            variant="secondary"
            disabled={demo || action.isPending}
            onClick={() => action.mutate("share")}
          >
            <Share2 size={17} />
            {visitor ? "کپی لینک کارت" : "انتشار و کپی لینک"}
          </Button>
          {account?.published && !visitor && (
            <Button
              variant="ghost"
              disabled={action.isPending}
              onClick={() => action.mutate("unshare")}
            >
              توقف اشتراک‌گذاری
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            چاپ
          </Button>
        </div>
        {!visitor && (
          <p className="hint">
            فقط کارت و اطلاعات عمومی منتشر می‌شود؛ گزارش‌ها و زمان کار خصوصی
            می‌مانند.
          </p>
        )}
        <p className="hint" role="status">
          {status ||
            (demo ? "نمونهٔ نمایشی؛ اشتراک‌گذاری پس از ورود فعال می‌شود." : "")}
        </p>
      </div>
    </div>
  );
}
