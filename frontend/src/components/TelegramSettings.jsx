import { t } from "../lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { words } from "./StudioEditor";
import { useState } from "react";
export function TelegramSettings({ demo, previewEnabled = true }) {
  const [showPreview, setShowPreview] = useState(false);
  const preview = useQuery({
    queryKey: ["telegram-preview"],
    queryFn: () => api("/api/me/telegram/preview"),
    enabled: !demo && showPreview && previewEnabled,
  });
  const jobs = useQuery({
    queryKey: ["studio-jobs"],
    queryFn: () => api("/api/me/jobs"),
    enabled: !demo,
    refetchInterval: 10000,
  });
  const queryClient = useQueryClient();
  const telegram = useQuery({
    queryKey: ["telegram-status"],
    queryFn: () => api("/api/me/telegram"),
    enabled: !demo,
  });
  const telegramLink = useMutation({
    mutationFn: () => api("/api/me/telegram/link", {}),
  });
  return (
    <section aria-label={t("تنظیمات تلگرام")}>
      {!demo && previewEnabled && (
        <div className="surface">
          <h3>
            {words("پیش‌نمایش و وضعیت ارسال", "Publication preview and status")}
          </h3>
          <Button
            variant="secondary"
            onClick={() => setShowPreview(!showPreview)}
          >
            {words("پیش‌نمایش متن تلگرام", "Preview Telegram text")}
          </Button>
          {showPreview && (
            <>
              <p>
                {words(
                  "تصویر کارت به انگلیسی ارسال می‌شود.",
                  "The card image is sent in English.",
                )}
              </p>
              <pre className="telegram-preview">
                {preview.data?.plainCaption ||
                  words("در حال دریافت…", "Loading…")}
              </pre>
              {preview.error && <p role="alert">{preview.error.message}</p>}
            </>
          )}
          {jobs.data?.jobs
            .filter((j) => j.kind === "telegram")
            .slice(0, 3)
            .map((j) => (
              <p key={j.id}>
                #{j.id} ·{" "}
                {
                  {
                    pending: words("در صف", "Queued"),
                    running: words("در حال ارسال", "Sending"),
                    succeeded: words("ارسال تأیید شد", "Confirmed"),
                    failed: words("ارسال نشد", "Failed"),
                    unknown: words(
                      "نتیجه نامشخص؛ نیازمند بررسی مدیر، بدون ارسال دوباره",
                      "Unknown; requires administrator reconciliation, no retry",
                    ),
                  }[j.state]
                }
              </p>
            ))}
        </div>
      )}
      {!demo && telegram.data?.configured && (
        <div className="telegram-bridge">
          <div>
            <strong>{t("کارتت در کانال lyrooDev")}</strong>
            <p>
              {telegram.data.linked
                ? telegram.data.joined
                  ? t("عضویت تأیید شد؛ کارتت در کانال باقی می‌ماند.")
                  : t("برای ماندن کارت، تا ۲ ساعت پس از انتشار عضو کانال شو.")
                : t(
                    "حسابت را به تلگرام وصل کن تا انتشار و وضعیت عضویت قابل‌پیگیری باشد.",
                  )}
            </p>
          </div>
          <div className="telegram-bridge-actions">
            {!telegram.data.linked && !telegramLink.data && (
              <Button
                variant="secondary"
                disabled={telegramLink.isPending}
                onClick={() => telegramLink.mutate()}
              >
                {t("اتصال تلگرام")}
              </Button>
            )}
            {telegramLink.data?.url && (
              <Button asChild>
                <a
                  href={telegramLink.data.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("باز کردن ربات تلگرام ↗")}
                </a>
              </Button>
            )}
            {telegramLink.data?.url && !telegram.data.linked && (
              <Button
                variant="ghost"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["telegram-status"],
                  })
                }
              >
                {t("بررسی اتصال")}
              </Button>
            )}
            {telegram.data.channelUrl && (
              <Button variant="ghost" asChild>
                <a
                  href={telegram.data.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {telegram.data.joined
                    ? t("مشاهدهٔ کانال")
                    : t("عضویت در کانال ↗")}
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
