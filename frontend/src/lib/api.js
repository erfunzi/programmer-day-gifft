import {locale, currentLanguage, t} from "./i18n";

const NETWORK =
  "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.";
const TIMEOUT =
  "درخواست بیش از حد طول کشید. لطفاً دوباره تلاش کن.";
const SERVER =
  "مشکلی در سمت سرور پیش آمده؛ عذر می‌خواهیم. کمی بعد دوباره تلاش کن یا با پشتیبانی ارتباط بگیر.";
const GENERIC =
  "مشکلی پیش آمد؛ عذر می‌خواهیم. دوباره تلاش کن و اگر ادامه داشت با پشتیبانی ارتباط بگیر.";
const BAD_RESPONSE = "پاسخ سرور کامل نبود؛ دوباره امتحان کن.";
const REQUEST_FAILED = "درخواست انجام نشد.";

const ENGLISH_ERROR_MAP = {
  "failed to fetch": NETWORK,
  "networkerror when attempting to fetch resource.": NETWORK,
  "network error": NETWORK,
  "load failed": NETWORK,
  "the internet connection appears to be offline.": NETWORK,
  "networkrequestfailed": NETWORK,
  "aborted": TIMEOUT,
  "the operation was aborted.": TIMEOUT,
  "the operation was aborted due to timeout.": TIMEOUT,
  "timeout": TIMEOUT,
  "signal timed out": TIMEOUT,
  "request timed out": TIMEOUT,
};

function isTechnicalMessage(message) {
  if (!message) return true;
  const lower = message.toLowerCase();
  if (ENGLISH_ERROR_MAP[lower]) return true;
  return /failed to fetch|networkerror|load failed|network request failed|offline|timeout|aborted|typeerror|syntaxerror|cors|internal server error|bad gateway|service unavailable|gateway timeout|http error|status code/i.test(
    message,
  );
}

export function friendlyError(error) {
  if (error == null) return t(GENERIC);
  const status = Number(error?.status) || 0;
  const retryAfter = Number(error?.retryAfter) || 0;
  const raw = String(error?.message || (typeof error === "string" ? error : "") || "").trim();
  const lower = raw.toLowerCase();
  const name = String(error?.name || "");

  if (status === 429) {
    if (retryAfter > 0) {
      return currentLanguage() === "en"
        ? `We are a bit busy. Please try again in about ${retryAfter} seconds.`
        : `کمی شلوغ است؛ حدود ${retryAfter} ثانیه دیگر دوباره تلاش کن.`;
    }
    return t("کمی شلوغ است؛ لطفاً کمی بعد دوباره تلاش کن.");
  }
  if (status === 401 || status === 403) {
    return t(raw && !isTechnicalMessage(raw) ? raw : "نشست منقضی شده یا دسترسی نداری؛ دوباره وارد شو.");
  }
  if (status === 404) {
    return t(raw && !isTechnicalMessage(raw) ? raw : "مورد درخواستی پیدا نشد. صفحه را تازه کن یا دوباره تلاش کن.");
  }
  if (status === 413) {
    return t(raw && !isTechnicalMessage(raw) ? raw : "حجم فایل بیش از حد مجاز است.");
  }
  if (status >= 500) {
    return t(SERVER);
  }

  if (name === "AbortError" || name === "TimeoutError" || /timeout|aborted/i.test(lower)) {
    return t(TIMEOUT);
  }
  if (name === "TypeError" || ENGLISH_ERROR_MAP[lower] || /failed to fetch|networkerror|load failed|offline/i.test(lower)) {
    return t(ENGLISH_ERROR_MAP[lower] || NETWORK);
  }
  if (!raw) return t(GENERIC);
  if (isTechnicalMessage(raw)) return t(GENERIC);
  return t(raw);
}

export function toastMessage(value) {
  if (value && typeof value === "object") return friendlyError(value);
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isTechnicalMessage(raw)) return friendlyError({ message: raw });
  return raw;
}

async function request(path, init) {
  let response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    const mapped = Error(friendlyError(error));
    mapped.cause = error;
    throw mapped;
  }
  if (response.status === 413) {
    const error = Error(t("سرور حجم تصویر کارت را نپذیرفت؛ محدودیت آپلود سرور باید افزایش یابد."));
    error.status = 413;
    throw error;
  }
  let body;
  try {
    body = await response.json();
  } catch {
    const error = Error(t(response.status >= 500 ? SERVER : BAD_RESPONSE));
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const retryAfter = Number(response.headers.get("Retry-After")) || null;
    const message = friendlyError({
      message: body?.message || (response.status >= 500 ? SERVER : REQUEST_FAILED),
      status: response.status,
      retryAfter,
    });
    const error = Error(message);
    error.status = response.status;
    error.retryAfter = retryAfter;
    throw error;
  }
  return body;
}

export async function api(path, data) {
  return request(path, {
    credentials: "same-origin",
    ...(data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
    signal: AbortSignal.timeout(path === "/api/me/image" ? 200000 : 75000),
  });
}
export async function upload(path, formData) {
  const image = formData.get("image");
  if (image instanceof Blob && image.size > 10 * 1024 * 1024) {
    throw Error(t("حجم تصویر کارت بیشتر از ۱۰ مگابایت است."));
  }
  return request(path, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
    signal: AbortSignal.timeout(200000),
  });
}
export const number = (n) => Number(n || 0).toLocaleString(locale());
export const hours = (n) =>
  Number(n / 3600000).toLocaleString(locale(), { maximumFractionDigits: 1 }) +
  (currentLanguage() === "en" ? " hours" : " ساعت");
export function duration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
export const dayKey = (ms, tz) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(ms)
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
};
