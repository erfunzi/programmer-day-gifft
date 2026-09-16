import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {api} from "../lib/api";
import {Button} from "./ui/button";
export function TelegramSettings({demo}) {
  const queryClient = useQueryClient();
  const telegram = useQuery({queryKey:["telegram-status"],queryFn:()=>api("/api/me/telegram"),enabled:!demo});
  const telegramLink = useMutation({
    mutationFn: () => api("/api/me/telegram/link", {}),
  });
  return <section aria-label="تنظیمات تلگرام">
        {!demo && telegram.data?.configured && (
          <div className="telegram-bridge" dir="rtl">
            <div>
              <strong>کارتت در کانال lyrooDev</strong>
              <p>
                {telegram.data.linked
                  ? telegram.data.joined
                    ? "عضویت تأیید شد؛ کارت با همین تم در کانال منتشر می‌شود."
                    : "برای ماندن کارت، بعد از اتصال در کانال عضو بمان."
                  : "حسابت را به تلگرام وصل کن تا انتشار و وضعیت عضویت قابل‌پیگیری باشد."}
              </p>
            </div>
            <div className="telegram-bridge-actions">
              {!telegram.data.linked && !telegramLink.data && (
                <Button
                  variant="secondary"
                  disabled={telegramLink.isPending}
                  onClick={() => telegramLink.mutate()}
                >
                  اتصال تلگرام
                </Button>
              )}
              {telegramLink.data?.url && (
                <Button asChild>
                  <a href={telegramLink.data.url} target="_blank" rel="noreferrer">
                    باز کردن ربات تلگرام ↗
                  </a>
                </Button>
              )}
              {telegramLink.data?.url && !telegram.data.linked && (
                <Button
                  variant="ghost"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["telegram-status"] })}
                >
                  بررسی اتصال
                </Button>
              )}
              {telegram.data.channelUrl && (
                <Button variant="ghost" asChild>
                  <a href={telegram.data.channelUrl} target="_blank" rel="noreferrer">
                    {telegram.data.joined ? "مشاهدهٔ کانال" : "عضویت در کانال ↗"}
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
    <p role="status" className="hint">{telegram.error?.message || telegramLink.error?.message}</p>
  </section>;
}
