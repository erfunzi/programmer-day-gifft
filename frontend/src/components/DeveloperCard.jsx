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
  imageVersion,
}) {
  const cardRef = useRef(null),
    data = useMemo(() => analyze(profile), [profile]);
  const telegramAutoPublished = useRef(false);
  const introduction = useQuery({queryKey:["profile-analysis"],queryFn:()=>api("/api/me/ai",{}),enabled:!!account && !visitor && !demo,retry:false,staleTime:Infinity});
  const narrative = demo ? {
    title:"الکس؛ از وب دسترس‌پذیر تا خودکارسازی کارهای روزمره",
    summary:"پروژه‌های الکس در این نمونه بر دو مسئله متمرکزند: ساده‌ترکردن استفاده از وب و کاهش کارهای تکراری. accessible-web نمونه‌ای از توجه او به دسترس‌پذیری است.",
    resume:["من ابزارهای وب را با TypeScript توسعه می‌دهم و به استفادهٔ آسان‌تر از رابط‌ها توجه دارم.","در پروژهٔ accessible-web روی اجزای وب دسترس‌پذیر کار کرده‌ام؛ این رویکرد می‌تواند به تیم‌های محصول برای خدمت‌رسانی به کاربران بیشتر کمک کند.","از Python برای ساخت ابزارهای خودکارسازی استفاده می‌کنم؛ پروژهٔ small-automation نمونه‌ای از این مسیر است."],
    skills:[{name:"TypeScript",evidence:"accessible-web",source:"project"},{name:"Python",evidence:"small-automation",source:"project"}], strengths:[],suggestions:[]
  } : visitor ? profile.analysis : introduction.data;
  const config = useQuery({queryKey:["config"],queryFn:()=>api("/api/config")});
  const generateImage = useMutation({mutationFn:()=>api("/api/me/image",{}),onSuccess:r=>{setImage(`${r.url}?v=${Date.now()}`);setStatus(r.message || "کاراکتر آماده شد.")},onError:e=>setStatus(e.message)});
  const queryClient = useQueryClient();
  const character = useMemo(() => characterProfile(data), [data]);
  const [qr, setQR] = useState(""),
    [image, setImage] = useState("");
  const localImage = characterAssetPath("neutral", character.kind),
    u = data.user;
  const telegram = useQuery({
    queryKey: ["telegram-status"],
    queryFn: () => api("/api/me/telegram"),
    enabled: !!account && !visitor && !demo,
  });
  const telegramPublish = useMutation({
    mutationFn: async () => {
      const card = await exportCard(cardRef.current, u.login, {
        download: false,
      });
      const form = new FormData();
      form.append("theme", theme);
      form.append("image", card, `developer-card-${u.login}.png`);
      return upload("/api/me/telegram/publish", form);
    },
    onSuccess: () => {
      setStatus("کارت در کانال تلگرام منتشر شد ✓");
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
    },
    onError: (error) => {
      if (error?.status === 401) {
        location.assign("/?auth_error=expired");
        return;
      }
      setStatus(error?.message || "انتشار تلگرام انجام نشد.");
    },
  });
  const shareURL = `${location.origin}/?u=${encodeURIComponent(u.login)}&theme=${encodeURIComponent(theme)}`;
  useEffect(() => {
    if (
      !telegram.data?.configured ||
      !telegram.data?.linked ||
      (telegram.data?.required && !telegram.data?.joined) ||
      !account ||
      visitor ||
      demo ||
      telegramAutoPublished.current
    )
      return;
    telegramAutoPublished.current = true;
    (async () => {
      try {
        const card = await exportCard(cardRef.current, u.login, {
          download: false,
        });
        const form = new FormData();
        form.append("theme", theme);
        form.append("image", card, `developer-card-${u.login}.png`);
        await upload("/api/me/telegram/publish", form);
        setStatus("کارت در کانال تلگرام منتشر شد ✓");
        queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
      } catch (error) {
        if (error?.status === 401) {
          location.assign("/?auth_error=expired");
          return;
        }
        setStatus(
          error?.message ||
            "انتشار تلگرام انجام نشد؛ اتصال تلگرام و عضویت کانال را چک کن.",
        );
      }
    })();
  }, [
    telegram.data?.configured,
    telegram.data?.linked,
    telegram.data?.joined,
    telegram.data?.required,
    account,
    visitor,
    demo,
    theme,
    u.login,
    queryClient,
  ]);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(
      demo ? location.origin + "/" : shareURL,
      { margin: 0, width: 180, errorCorrectionLevel: "M" },
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
        setStatus("در حال آماده‌کردن تصویر همین کارت…");
        await exportCard(cardRef.current, u.login);
        return "تصویر همین کارت با کیفیت بالا آماده شد ✓";
      }
      try {
        await navigator.clipboard.writeText(shareURL);
        return "لینک کارت کپی شد. زمان کار و گزارش خصوصی هستند.";
      } catch {
        throw new Error("کپی لینک انجام نشد؛ اجازهٔ دسترسی به کلیپ‌بورد را بررسی کن.");
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
        data-theme={theme}
        style={{
          "--character-hue": character.hue + "deg",
          "--character-tilt": ((character.seed % 7) - 3) * 0.35 + "deg",
          "--character-zoom": 1 + ((character.seed >> 3) % 5) * 0.012,
        }}
      >
        <div className="card-top">
          <span>DEVELOPER CARD</span>
          <span className="card-edition">
            {holiday ? "DAY 256" : new Date().getFullYear() + " EDITION"}
          </span>
        </div>
        <div className="rating-badge" aria-label={`امتیاز کلی ${data.rating.overall} از 100`}>
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
        <div className="rating-grid" aria-label="امتیازهای کارت">
          {data.rating.fields.map((field) => (
            <div className="rating-item" key={field.key} title={field.fa}>
              <strong>{field.score}</strong>
              <span>{field.label}</span>
            </div>
          ))}
        </div>
        <div className="stats">
          <div>
            <b>{Number(u.public_repos || 0).toLocaleString("en-US")}</b>
            <span>public projects</span>
          </div>
          <div>
            <b>{Number(data.stars || 0).toLocaleString("en-US")}</b>
            <span>project stars</span>
          </div>
          <div>
            <b>{Number(u.followers || 0).toLocaleString("en-US")}</b>
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
        <h2>{narrative?.title || `معرفی ${u.name || u.login}`}</h2>
        <p>{narrative?.summary || (introduction.isFetching ? "در حال تحلیل پروفایل و READMEها…" : "تحلیل این پروفایل هنوز آماده نیست.")}</p>

        {narrative?.strengths?.length > 0 && <ul>{narrative.strengths.map((text,i)=><li key={i}>{text}</li>)}</ul>}
        {narrative?.suggestions?.length > 0 && <details><summary>پیشنهادهای رشد</summary><ul>{narrative.suggestions.map((text,i)=><li key={i}>{text}</li>)}</ul></details>}
        <div className="languages">
          {data.languages.slice(0, 5).map(([language, count]) => (
            <span className="language" key={language}>
              {language} · {number(count)} پروژه
            </span>
          ))}
        </div>
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
        <div className="rating-explainer">
          <div className="rating-explainer-heading">
            <div>
              <span className="story-label">// DEVELOPER RATING</span>
              <h3>امتیاز کلی <b>{data.rating.overall}</b><small>/100</small></h3>
            </div>
            <span className="hint">برداشت‌شده از داده‌های عمومی GitHub</span>
          </div>
          <div className="rating-bars">
            {data.rating.fields.map((field) => (
              <div className="rating-bar" key={field.key} title={field.description}>
                <div><span>{field.fa}</span><b>{field.score}</b></div>
                <i><i style={{ width: `${field.score}%` }} /></i>
              </div>
            ))}
          </div>
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
            کپی لینک
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            چاپ
          </Button>
        </div>
        {narrative?.resume && <section className="surface developer-introduction" aria-label="معرفی حرفه‌ای">
          <h3>دربارهٔ {u.name || u.login}</h3>
          {narrative.resume.map((line,i)=><p key={i}>{line}</p>)}
          <div className="resume-skills">{narrative.skills?.map((skill,i)=><div key={i}><strong>{skill.name}</strong><p>{skill.evidence}</p><small>{skill.source === "self_reported" ? "بر اساس معرفی خود فرد" : "بر اساس پروژه‌ها"}</small></div>)}</div>
        </section>}
        {!demo && !visitor && config.data?.imageReady && <Button variant="secondary" disabled={generateImage.isPending || introduction.isFetching} onClick={()=>generateImage.mutate()}>{generateImage.isPending ? "در حال ساخت کاراکتر…" : "ساخت کاراکتر از تحلیل"}</Button>}
        {!visitor && !demo && telegram.data?.configured && telegram.data.linked && (
          <Button variant="secondary" disabled={telegramPublish.isPending} onClick={() => telegramPublish.mutate()}>انتشار با این تم در تلگرام</Button>
        )}

      </div>
    </div>
  );
}
