import { setLocale, t } from "./lib/i18n";
import { TelegramSettings } from "./components/TelegramSettings";
import { TimezoneSettings } from "./components/TimezoneSettings";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, toastMessage } from "./lib/api";
import { sample } from "./lib/sample";
import { Entry } from "./components/Entry";
import { DeveloperCard } from "./components/DeveloperCard";
import { Reports } from "./components/Reports";
import { Timer } from "./components/Timer";
import { ThemePicker } from "./components/ThemePicker";
import { DEFAULT_THEME, getTheme } from "./lib/themes";
import { Button } from "./components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
export default function App() {
  const client = useQueryClient(),
    [demo, setDemo] = useState(false),
    [imageVersion, setImageVersion] = useState(0),
    params = new URLSearchParams(location.search),
    [theme, setTheme] = useState(() => {
      const fromURL = new URLSearchParams(location.search).get("theme");
      return getTheme(fromURL || localStorage.getItem("developer-card-theme") || DEFAULT_THEME).id;
    });
  const [language, setLanguage] = useState(() => localStorage.getItem("developer-card-language") === "en" ? "en" : "fa");
  setLocale(language);
  const requested = params.get("u"),
    visitor = !!requested;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (!visitor) localStorage.setItem("developer-card-theme", theme);
    if (!visitor) localStorage.setItem("developer-card-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
    const next = new URL(location.href);
    next.searchParams.set("theme", theme);
    next.searchParams.set("lang", language);
    history.replaceState(null, "", next);
  }, [theme, language, visitor]);
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => api("/api/config")
  });
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api("/api/me")
  });
  const account = session.data?.user;
  const sessionPending = session.isLoading || session.isFetching;
  const profile = useQuery({
    queryKey: ["profile", requested, account?.id],
    queryFn: () =>
    api(
      visitor ?
      "/api/cards/" + encodeURIComponent(requested) :
      "/api/me/profile"
    ),
    enabled: !demo && (visitor || !!account)
  });
  const data = demo ? sample : profile.data;
  const savedPreferences = visitor ? profile.data?.preferences : !demo ? account?.preferences : null;
  useEffect(() => {
    if (!savedPreferences) return;
    setTheme(getTheme(savedPreferences.theme).id);
    setLanguage(savedPreferences.language === "en" ? "en" : "fa");
  }, [savedPreferences?.theme, savedPreferences?.language]);
  const savePreferences = useMutation({
    mutationFn: (value) => api("/api/me/preferences", value),
    onSuccess: (value) => {
      setTheme(value.theme);setLanguage(value.language);
      client.setQueryData(["session"], (old) => ({ ...old, user: { ...old.user, preferences: value } }));
    }
  });
  const choosePreferences = (value) => {
    const next = { theme, language, ...value };
    setTheme(next.theme);
    setLanguage(next.language);
    if (account && !demo && !visitor) savePreferences.mutate(next);
  };
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", {}),
    onSuccess: () => {
      client.clear();
      location.assign("/");
    }
  });
  const d = new Date(),
    holiday =
    Math.floor(
      (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(d.getFullYear(), 0, 1)) /
      86400000
    ) +
    1 ===
    256;
  const errors = {
    not_configured: t("ورود GitHub هنوز تنظیم نشده است."),
    state: t("درخواست ورود منقضی یا نامعتبر بود. دوباره وارد شو."),
    cancelled: t("ورود تکمیل نشد. هر وقت خواستی دوباره امتحان کن."),
    exchange: t("ارتباط ورود با GitHub کامل نشد. Client ID و Client Secret اپ OAuth را دوباره چک کن."),
    expired: t("نشست GitHub منقضی شده؛ دوباره وارد شو تا کارت و تلگرام کار کنند.")
  };
  useEffect(() => {
    if (profile.error?.status === 401 && !visitor && !demo) {
      client.clear();
      location.assign("/?auth_error=expired");
    }
  }, [profile.error, visitor, demo, client]);
  // Logged-in users never see the GitHub login entry again until logout/expiry.
  const showEntry =
  !demo && !visitor && !account && !sessionPending && !data;
  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <header>
        <a className="brand" href="/" dir="ltr">
          <span className="brand-icon">&lt;/&gt;</span> developer
          <span className="brand-light">card</span>
          <span className="version">STUDIO</span>
        </a>
        <div className="account">
          <span>
            {account ? "@" + account.login : t("داستانِ آدم‌های سازنده")}
          </span>
          {account &&
          <Button
            variant="ghost"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}>{t("خروج")}


          </Button>
          }
        </div>
      </header>
      <main>
        {showEntry &&
        <Entry
          onDemo={() => setDemo(true)}
          status={
          errors[params.get("auth_error")] ||
          (config.error ? toastMessage(config.error) : "") || (
          config.data && !config.data.loginReady ? t("ورود GitHub در حال آماده‌سازی است؛ فعلاً نمونه را ببین.") :

          "")
          } />

        }
        {sessionPending && <p role="status" className="hint">{t("در حال بررسی وضعیت ورود…")}</p>}

        {data &&
        <section id="workspace">
            <div className="workspace-heading">
              <div>

                <h1>{t("این مسیرِ")}
                <em>{data.user.name || data.user.login}</em>{t("است.")}
              </h1>
              </div>
              {demo &&
            <Button variant="ghost" onClick={() => setDemo(false)}>{t("خروج از نمونه ←")}

            </Button>
            }
              {visitor &&
            <Button variant="ghost" asChild>
                  <a href="/">{account ? t("کارت خودم ↗") : t("بازگشت ↗")}</a>
                </Button>
            }
            </div>
            {holiday &&
          <div className="occasion-banner">{t("✳ امروز روز برنامه‌نویس است؛ به افتخار ایده‌هایی که به واقعیت تبدیل می‌کنی!")}


          </div>
          }
            {demo &&
          <div className="demo-banner">{t("حالت نمونه • تمام نام‌ها، فعالیت‌ها و زمان‌های این گزارش ساختگی‌اند. تایمر نمونه چیزی ذخیره نمی‌کند.")}


          </div>
          }
            {visitor &&
          <div className="visitor-invite">
                <div>
                  <strong>{t("این کارتِ یک توسعه‌دهنده است.")}</strong>
                  <p>
                    {account ? t("برای دیدن کارت و گزارش خودت، برو به فضای کار شخصی‌ات.") : t("داستان خودت را هم بساز؛ با حساب GitHub وارد شو.")

                }
                  </p>
                </div>
                <Button asChild>
                  {account ?
              <a href="/">{t("برو به کارت خودم ↗")}</a> :

              <a href="/auth/github">{t("کارت خودم را بساز")}</a>
              }
                </Button>
              </div>
          }
            <Tabs defaultValue="card" dir={language === "fa" ? "rtl" : "ltr"}>
              <TabsList aria-label={t("بخش‌های پروفایل")}>
                <TabsTrigger value="card">{t("کارت و معرفی")}</TabsTrigger>
                {!visitor &&
              <>
                    <TabsTrigger value="reports">{t("گزارش پیشرفت")}</TabsTrigger>
                    <TabsTrigger value="time">{t("زمان کار")}</TabsTrigger>
                  </>
              }
                {!visitor && <TabsTrigger value="settings">{t("تنظیمات")}</TabsTrigger>}
              </TabsList>
              <TabsContent value="card">
                <DeveloperCard
                profile={data}
                demo={demo}
                visitor={visitor}
                account={account}
                holiday={holiday}
                theme={theme}
                language={language}
                imageVersion={imageVersion} />
              
              </TabsContent>
              {!visitor &&
            <>
                  <TabsContent value="reports">
                    <Reports
                  createdAt={data.user.created_at}
                  demo={demo}
                  onImage={() => setImageVersion(Date.now())} />
                
                  </TabsContent>
                  <TabsContent value="time" forceMount>
                    <Timer demo={demo} />
                  </TabsContent>
                </>
            }
              {!visitor && <TabsContent value="settings">
                <section className="surface settings-locale">
                  <fieldset disabled={savePreferences.isPending} className="preference-fields settings-pair">
                    <div className="settings-field language-settings">
                      <label htmlFor="language">{t("زبان")}</label>
                      <select id="language" value={language} onChange={(e) => choosePreferences({ language: e.target.value })}>
                        <option value="fa">{t("فارسی")}</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <TimezoneSettings demo={demo} />
                  </fieldset>
                </section>
                <fieldset disabled={savePreferences.isPending} className="preference-fields">
                  <ThemePicker value={theme} onChange={(theme) => choosePreferences({ theme })} />
                </fieldset>
                <TelegramSettings demo={demo} />
              </TabsContent>}
            </Tabs>
          </section>
        }
      </main>
      <footer>
        <div className="creator-credit">
          <a
            href="https://github.com/erfunzi"
            target="_blank"
            rel="noreferrer"
            dir="ltr">
            
            developed by <span>@erfunzi</span>
          </a>
        </div>
        <p>
          {holiday ? t("۲۵۶مین روز سال؛ به افتخار تو ✳") : t("برای آدم‌های پشت کد ✳")}
        </p>
      </footer>
    </>);

}
