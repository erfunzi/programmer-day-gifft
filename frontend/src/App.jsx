import { TelegramSettings } from "./components/TelegramSettings";
import { TimezoneSettings } from "./components/TimezoneSettings";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./lib/api";
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
  const requested = params.get("u"),
    visitor = !!requested;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("developer-card-theme", theme);
    const next = new URL(location.href);
    next.searchParams.set("theme", theme);
    history.replaceState(null, "", next);
  }, [theme]);
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => api("/api/config"),
  });
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api("/api/me"),
  });
  const account = session.data?.user;
  const sessionPending = session.isLoading || session.isFetching;
  const profile = useQuery({
    queryKey: ["profile", requested, account?.id],
    queryFn: () =>
      api(
        visitor
          ? "/api/cards/" + encodeURIComponent(requested)
          : "/api/me/profile",
      ),
    enabled: !demo && (visitor || !!account),
  });
  const data = demo ? sample : profile.data;
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", {}),
    onSuccess: () => {
      client.clear();
      location.assign("/");
    },
  });
  const d = new Date(),
    holiday =
      Math.floor(
        (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
          Date.UTC(d.getFullYear(), 0, 1)) /
          86400000,
      ) +
        1 ===
      256;
  const errors = {
    not_configured: "ورود GitHub هنوز تنظیم نشده است.",
    state: "درخواست ورود منقضی یا نامعتبر بود. دوباره وارد شو.",
    cancelled: "ورود تکمیل نشد. هر وقت خواستی دوباره امتحان کن.",
    exchange: "ارتباط ورود با GitHub کامل نشد. Client ID و Client Secret اپ OAuth را دوباره چک کن.",
  };
  // Logged-in users never see the GitHub login entry again until logout/expiry.
  const showEntry =
    !demo && !visitor && !account && !sessionPending && !data;
  const openingWorkspace =
    !demo && !visitor && !!account && !data && !profile.error;
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
            {account ? "@" + account.login : "داستانِ آدم‌های سازنده"}
          </span>
          {account && (
            <Button
              variant="ghost"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              خروج
            </Button>
          )}
        </div>
      </header>
      <main>
        {showEntry && (
          <Entry
            onDemo={() => setDemo(true)}
            status={
              errors[params.get("auth_error")] ||
              config.error?.message ||
              (config.data && !config.data.loginReady
                ? "ورود GitHub در حال آماده‌سازی است؛ فعلاً نمونه را ببین."
                : "")
            }
          />
        )}
        {(sessionPending || openingWorkspace) && (
          <p role="status" className="hint">
            {sessionPending
              ? "در حال بررسی وضعیت ورود…"
              : "وارد شدی؛ کارت و گزارش‌ها آماده‌ می‌شوند…"}
          </p>
        )}
        <p role="status" className="hint">
          {profile.error?.message ||
            session.error?.message ||
            logout.error?.message ||
            (profile.isFetching && data ? "در حال به‌روز کردن پروفایل GitHub…" : "")}
        </p>
        {data && (
          <section id="workspace">
            <div className="workspace-heading">
              <div>
                <div className="eyebrow" dir="ltr">
                  DEVELOPER WORKSPACE
                </div>
                <h1>
                  این مسیرِ <em>{data.user.name || data.user.login}</em> است.
                </h1>
              </div>
              {demo && (
                <Button variant="ghost" onClick={() => setDemo(false)}>
                  خروج از نمونه ←
                </Button>
              )}
              {visitor && (
                <Button variant="ghost" asChild>
                  <a href="/">{account ? "کارت خودم ↗" : "بازگشت ↗"}</a>
                </Button>
              )}
            </div>
            {holiday && (
              <div className="occasion-banner">
                ✳ امروز روز برنامه‌نویس است؛ به افتخار ایده‌هایی که به واقعیت
                تبدیل می‌کنی!
              </div>
            )}
            {demo && (
              <div className="demo-banner">
                حالت نمونه • تمام نام‌ها، فعالیت‌ها و زمان‌های این گزارش
                ساختگی‌اند. تایمر نمونه چیزی ذخیره نمی‌کند.
              </div>
            )}
            {visitor && (
              <div className="visitor-invite">
                <div>
                  <strong>این کارتِ یک توسعه‌دهنده است.</strong>
                  <p>
                    {account
                      ? "برای دیدن کارت و گزارش خودت، برو به فضای کار شخصی‌ات."
                      : "داستان خودت را هم بساز؛ با حساب GitHub وارد شو."}
                  </p>
                </div>
                <Button asChild>
                  {account ? (
                    <a href="/">برو به کارت خودم ↗</a>
                  ) : (
                    <a href="/auth/github">کارت خودم را بساز</a>
                  )}
                </Button>
              </div>
            )}
            <Tabs defaultValue="card" dir="rtl">
              <TabsList aria-label="بخش‌های پروفایل">
                <TabsTrigger value="card">کارت و معرفی</TabsTrigger>
                {!visitor && (
                  <>
                    <TabsTrigger value="reports">گزارش پیشرفت</TabsTrigger>
                    <TabsTrigger value="time">زمان کار</TabsTrigger>
                  </>
                )}
                <TabsTrigger value="settings">تنظیمات</TabsTrigger>
              </TabsList>
              <TabsContent value="card">
                <DeveloperCard
                  profile={data}
                  demo={demo}
                  visitor={visitor}
                  account={account}
                  holiday={holiday}
                  theme={theme}
                  imageVersion={imageVersion}
                  onPublished={(published) =>
                    client.setQueryData(["session"], (old) => ({
                      ...old,
                      user: { ...old.user, published },
                    }))
                  }
                />
              </TabsContent>
              {!visitor && (
                <>
                  <TabsContent value="reports">
                    <Reports
                      demo={demo}
                      onImage={() => setImageVersion(Date.now())}
                    />
                  </TabsContent>
                  <TabsContent value="time" forceMount>
                    <Timer demo={demo} />
                  </TabsContent>
                </>
              )}
              <TabsContent value="settings">
                <ThemePicker value={theme} onChange={setTheme} />
                {!visitor && <TimezoneSettings demo={demo} />}
                {!visitor && <TelegramSettings demo={demo} />}
              </TabsContent>
            </Tabs>
          </section>
        )}
      </main>
      <footer>
        <div className="creator-credit">
          <a
            href="https://github.com/erfunzi"
            target="_blank"
            rel="noreferrer"
            dir="ltr"
          >
            developed by <span>@erfunzi</span>
          </a>
        </div>
        <p>
          {holiday ? "۲۵۶مین روز سال؛ به افتخار تو ✳" : "برای آدم‌های پشت کد ✳"}
        </p>
      </footer>
    </>
  );
}
