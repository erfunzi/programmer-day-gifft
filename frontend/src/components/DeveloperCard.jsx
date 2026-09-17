import { t } from "../lib/i18n";
import { toast as setStatus } from "../lib/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "./ui/button";
import { api, number, upload } from "../lib/api";
import { analyze } from "../lib/sample";
import { characterProfile, characterAssetPath } from "../lib/character";
import { exportCard } from "../lib/export-card";

export function DeveloperCard({
  profile,
  demo,
  visitor,
  account,
  holiday,
  theme,
  language = "fa",
  imageVersion
}) {
  const cardRef = useRef(null),
    data = useMemo(() => analyze(profile), [profile]);
  const telegramAutoPublished = useRef(false);
  const introduction = useQuery({ queryKey: ["profile-analysis"], queryFn: () => api("/api/me/ai", {}), enabled: !!account && !visitor && !demo, retry: false, staleTime: 300000, refetchInterval: 300000, refetchOnWindowFocus: true });
  const demoNarrative = {
    title: t("الکس؛ از وب دسترس‌پذیر تا خودکارسازی کارهای روزمره"),
    summary: t("پروژه‌های الکس در این نمونه بر دو مسئله متمرکزند: ساده‌ترکردن استفاده از وب و کاهش کارهای تکراری. accessible-web نمونه‌ای از توجه او به دسترس‌پذیری است."),
    resume: [t("من ابزارهای وب را با TypeScript توسعه می‌دهم و به استفادهٔ آسان‌تر از رابط‌ها توجه دارم."), t("در پروژهٔ accessible-web روی اجزای وب دسترس‌پذیر کار کرده‌ام؛ این رویکرد می‌تواند به تیم‌های محصول برای خدمت‌رسانی به کاربران بیشتر کمک کند."), t("از Python برای ساخت ابزارهای خودکارسازی استفاده می‌کنم؛ پروژهٔ small-automation نمونه‌ای از این مسیر است.")],
    skills: [{ name: "TypeScript", evidence: "accessible-web", source: "project" }, { name: "Python", evidence: "small-automation", source: "project" }], strengths: [], suggestions: []
  };
  const analysis = visitor ? profile.analysis : introduction.data;
  const narrative = demo ? { ...demoNarrative, role: t("توسعه‌دهندهٔ وب"), sloganLead: t("ساختن برای"), slogan: t("همه"), traits: ["TypeScript", "Python", t("وب دسترس‌پذیر")] } : (analysis?.locales?.[language] || (language === "fa" && analysis?.schemaVersion === 2 ? analysis : null));
  const generating = !demo && !visitor && introduction.isFetching && !narrative;
  const config = useQuery({ queryKey: ["config"], queryFn: () => api("/api/config") });
  const generateImage = useMutation({ mutationFn: () => api("/api/me/image", {}), onSuccess: (r) => {setImage(`${r.url}?v=${Date.now()}`);setStatus(r.message || t("کاراکتر آماده شد."));}, onError: (e) => setStatus(e.message) });
  const queryClient = useQueryClient();
  const character = useMemo(() => characterProfile(data), [data]);
  const [qr, setQR] = useState(""),
    [image, setImage] = useState("");
  const localImage = characterAssetPath("neutral", character.kind),
    u = data.user;
  const telegram = useQuery({
    queryKey: ["telegram-status"],
    queryFn: () => api("/api/me/telegram"),
    enabled: !!account && !visitor && !demo
  });
  const telegramPublish = useMutation({
    mutationFn: async (mode = "manual") => {
      const card = await exportCard(cardRef.current, u.login, {
        download: false
      });
      const form = new FormData();
      form.append("mode", mode);
      form.append("theme", theme);
      form.append("image", card, `developer-card-${u.login}.png`);
      return upload("/api/me/telegram/publish", form);
    },
    onSuccess: (result) => {
      if (result.created) setStatus(telegram.data?.joined ? t("کارت در کانال تلگرام منتشر شد ✓") : t("کارتت در کانال تلگرام منتشر شد. برای اینکه حذف نشود، حسابت را از تنظیمات به تلگرام وصل کن و عضو کانال ما شو؛ در غیر این صورت تا ۲ ساعت دیگر حذف می‌شود."));
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
    },
    onError: (error) => {
      if (error?.status === 401) {
        location.assign("/?auth_error=expired");
        return;
      }
      setStatus(error?.message || t("انتشار تلگرام انجام نشد."));
    }
  });
  const shareURL = `${location.origin}/?u=${encodeURIComponent(u.login)}&theme=${encodeURIComponent(theme)}&lang=${language}`;
  useEffect(() => {
    if (!telegram.data?.configured || !telegram.data?.initialPublish || !account || visitor || demo || !qr || !narrative || telegramAutoPublished.current) return;
    telegramAutoPublished.current = true;
    telegramPublish.mutate("initial");
  }, [telegram.data?.configured, telegram.data?.initialPublish, account, visitor, demo, qr, narrative]);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(
      demo ? location.origin + "/" : shareURL,
      { margin: 0, width: 180, errorCorrectionLevel: "M" }
    ).then((url) => {
      if (active) setQR(url);
    });
    return () => {
      active = false;
    };
  }, [shareURL, demo]);
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
        setStatus(t("در حال آماده‌کردن تصویر همین کارت…"));
        await exportCard(cardRef.current, u.login);
        return t("تصویر همین کارت با کیفیت بالا آماده شد ✓");
      }
      try {
        await navigator.clipboard.writeText(shareURL);
        return t("لینک کارت کپی شد. زمان کار و گزارش خصوصی هستند.");
      } catch {
        throw new Error(t("کپی لینک انجام نشد؛ اجازهٔ دسترسی به کلیپ‌بورد را بررسی کن."));
      }
    },
    onSuccess: setStatus,
    onError: (e) => setStatus(e.message)
  });
  return (
    <div className="result-grid" lang={language} dir={language === "fa" ? "rtl" : "ltr"}>
      <article
        ref={cardRef}
        id="dev-card"
        className="dev-card auto-rotate"
        dir="ltr"
        data-archetype={character.kind}
        data-character-style="neutral"
        data-theme={theme}
        style={{
          "--character-hue": character.hue + "deg",
          "--character-tilt": (character.seed % 7 - 3) * 0.35 + "deg",
          "--character-zoom": 1 + (character.seed >> 3) % 5 * 0.012
        }}>
        
        <div className="card-top">
          <span>{t("کارت توسعه‌دهنده")}</span>
          <span className="card-edition">
            {holiday ? "DAY 256" : new Date().getFullYear() + " · " + t("نسخه")}
          </span>
        </div>
        <div className="rating-badge" aria-label={`${t("امتیاز کلی")} ${data.rating.overall} / 100`}>
          <span>OVR</span>
          <strong>{data.rating.overall}</strong>
          <small>/100</small>
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
            }} />
          
          <div>
            <h2>{u.name || u.login}</h2>
            <a
              href={"https://github.com/" + u.login}
              target="_blank"
              rel="noreferrer">
              
              @{u.login}
            </a>
          </div>
        </div>
        <div className="role">{narrative?.role || t("در حال آماده‌سازی…")}</div>
        <div className="character-stage">
          <div className="character-orbit" aria-hidden="true" />
          <img
            id="character"
            src={image || localImage}
            width="420"
            height="420"
            alt={t("کاراکتر الهام‌گرفته از پروژه‌ها · ") + character.title} />
          
          <span className="character-class">{narrative?.role || "…"}</span>
          <span className="character-code">#{character.serial}</span>
        </div>
        <div className="card-celebration" dir={language === "fa" ? "rtl" : "ltr"}>
          <span>{narrative?.sloganLead || "…"}</span>
          <h3>
            {narrative?.slogan || "…"}
            <span className="mint">.</span>
          </h3>
        </div>
        <div className="character-traits">
          {(narrative?.traits || []).map((t) =>
          <span key={t}>{t}</span>
          )}
        </div>
        <div className="rating-grid" aria-label={t("امتیازهای کارت")}>
          {data.rating.fields.map((field) =>
          <div className="rating-item" key={field.key} title={language === "fa" ? field.fa : field.label}>
              <strong>{field.score}</strong>
              <span>{language === "fa" ? field.fa : field.label}</span>
            </div>
          )}
        </div>
        <div className="stats">
          <div>
            <b>{Number(u.public_repos || 0).toLocaleString(language === "fa" ? "fa-IR" : "en-US")}</b>
            <span>{t("پروژهٔ عمومی")}</span>
          </div>
          <div>
            <b>{Number(data.stars || 0).toLocaleString(language === "fa" ? "fa-IR" : "en-US")}</b>
            <span>{t("ستارهٔ پروژه‌ها")}</span>
          </div>
          <div>
            <b>{Number(u.followers || 0).toLocaleString(language === "fa" ? "fa-IR" : "en-US")}</b>
            <span>{t("دنبال‌کننده")}</span>
          </div>
        </div>
        <div className="card-foot">
          <div>
            <span>
              {t("شروع ساختن از")} {new Date(u.created_at).getUTCFullYear()}
            </span>
            <small>{t("بساز و کنجکاو بمان.")}</small>
          </div>
          <div id="qr">
            {qr && <img src={qr} width="96" height="96" alt={t("QR کارت عمومی")} />}
          </div>
        </div>
      </article>
      <div className="story">
        <div className="story-label">{t("// به زبان ساده")}</div>
        <h2>{narrative?.title || `${t("معرفی")} ${u.name || u.login}`}</h2>
        {generating ? <div className="analysis-loading" role="status" aria-busy="true"><div className="loading-orbit" aria-hidden="true">✦</div><strong>{t("در حال ساخت روایت تو…")}</strong><p>{t("پروژه‌ها و READMEها بررسی می‌شوند؛ معرفی فارسی و انگلیسی با هم آماده خواهند شد.")}</p><i /><i /><i /></div> : <p>{narrative?.summary || t("تحلیل این پروفایل هنوز آماده نیست.")}</p>}
        {introduction.isError && !visitor && <Button onClick={() => introduction.refetch()}>{t("تلاش دوباره")}</Button>}

        {narrative?.strengths?.length > 0 && <ul>{narrative.strengths.map((text, i) => <li key={i}>{text}</li>)}</ul>}
        {narrative?.suggestions?.length > 0 && <details><summary>{t("پیشنهادهای رشد")}</summary><ul>{narrative.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul></details>}
        <div className="languages">
          {data.languages.slice(0, 5).map(([language, count]) =>
          <span className="language" key={language}>
              {language} · {number(count)} {t("پروژه")}
          </span>
          )}
        </div>
        {data.top &&
        <a
          className="repo-highlight"
          href={`https://github.com/${u.login}/${data.top.name}`}
          target="_blank"
          rel="noreferrer"
        >
          {t("دیدن")} {data.top.name} {t("در GitHub ↗")}
        </a>
        }
        <div className="rating-explainer">
          <div className="rating-caption" dir="ltr">// {t("ارزیابی توسعه‌دهنده")}</div>
          <div className="rating-explainer-heading">
            <div>
              
              <h3>{t("امتیاز کلی")} <b>{data.rating.overall}</b><small>/100</small></h3>
            </div>
            
          </div>
          <div className="rating-bars">
            {data.rating.fields.map((field) =>
            <div className="rating-bar" key={field.key} title={language === "fa" ? field.description : field.label}>
                <div><span>{language === "fa" ? field.fa : field.label}</span><b>{field.score}</b></div>
                <i><i style={{ width: `${field.score}%` }} /></i>
              </div>
            )}
          </div>
        </div>
        <div className="actions">
          <Button
            disabled={action.isPending || generating}
            onClick={() => action.mutate("download")}>
            
            <Download size={17} /> {t("دانلود کارت PNG")}

          </Button>
          <Button
            variant="secondary"
            disabled={demo || action.isPending}
            onClick={() => action.mutate("share")}>
            
            <Share2 size={17} /> {t("کپی لینک")}

          </Button>
          <Button variant="secondary" onClick={() => window.print()}>{t("چاپ")}

          </Button>
        </div>
        {!demo && !visitor && config.data?.imageReady && <Button variant="secondary" disabled={generateImage.isPending || introduction.isFetching} onClick={() => generateImage.mutate()}>{generateImage.isPending ? t("در حال ساخت کاراکتر…") : t("ساخت کاراکتر از تحلیل")}</Button>}
        {!visitor && !demo && telegram.data?.configured &&
        <Button variant="secondary" disabled={telegramPublish.isPending || !telegram.data.canPublish} onClick={() => telegramPublish.mutate("manual")}>{telegramPublish.isPending ? t("در حال انتشار…") : t("انتشار در کانال تلگرام")}</Button>
        }

      </div>
        {narrative?.resume && <section className="surface developer-introduction" aria-label={t("معرفی حرفه‌ای")}>
          <h3>{t("دربارهٔ")} {u.name || u.login}</h3>
          {narrative.resume.map((line, i) => <p key={i}>{line}</p>)}
          <div className="resume-skills">{narrative.skills?.map((skill, i) => <div key={i}><strong>{skill.name}</strong><p>{skill.evidence}</p><small>{skill.source === "self_reported" ? t("بر اساس معرفی خود فرد") : t("بر اساس پروژه‌ها")}</small></div>)}</div>
        </section>}
    </div>);

}
