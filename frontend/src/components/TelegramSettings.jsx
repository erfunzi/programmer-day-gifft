import { t } from "../lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button } from "./ui/button";
export function TelegramSettings({ demo }) {
  const queryClient = useQueryClient();
  const telegram = useQuery({ queryKey: ["telegram-status"], queryFn: () => api("/api/me/telegram"), enabled: !demo });
  const telegramLink = useMutation({
    mutationFn: () => api("/api/me/telegram/link", {})
  });
  return <section aria-label={t("تنظیمات تلگرام")}>
        {!demo && telegram.data?.configured &&
    <div className="telegram-bridge" dir="rtl">
            <div>
              <strong>{t("کارتت در کانال lyrooDev")}</strong>
              <p>
                {telegram.data.linked ?
          telegram.data.joined ? t("عضویت تأیید شد؛ کارتت در کانال باقی می‌ماند.") : t("برای ماندن کارت، تا ۲ ساعت پس از انتشار عضو کانال شو.") : t("حسابت را به تلگرام وصل کن تا انتشار و وضعیت عضویت قابل‌پیگیری باشد.")


          }
              </p>
            </div>
            <div className="telegram-bridge-actions">
              {!telegram.data.linked && !telegramLink.data &&
        <Button
          variant="secondary"
          disabled={telegramLink.isPending}
          onClick={() => telegramLink.mutate()}>{t("اتصال تلگرام")}


        </Button>
        }
              {telegramLink.data?.url &&
        <Button asChild>
                  <a href={telegramLink.data.url} target="_blank" rel="noreferrer">{t("باز کردن ربات تلگرام ↗")}

          </a>
                </Button>
        }
              {telegramLink.data?.url && !telegram.data.linked &&
        <Button
          variant="ghost"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["telegram-status"] })}>{t("بررسی اتصال")}


        </Button>
        }
              {telegram.data.channelUrl &&
        <Button variant="ghost" asChild>
                  <a href={telegram.data.channelUrl} target="_blank" rel="noreferrer">
                    {telegram.data.joined ? t("مشاهدهٔ کانال") : t("عضویت در کانال ↗")}
                  </a>
                </Button>
        }
            </div>
          </div>
    }
  </section>;
}
