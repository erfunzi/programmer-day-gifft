export async function api(path, data) {
  const response = await fetch(path, {
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
  if (response.status === 413) {
    const error = Error("سرور حجم تصویر کارت را نپذیرفت؛ محدودیت آپلود سرور باید افزایش یابد.");
    error.status = 413;
    throw error;
  }
  let body;
  try { body = await response.json(); }
  catch { throw Error("پاسخ سرور کامل نبود؛ دوباره امتحان کن."); }
  if (!response.ok) {
    const error = Error(body.message || "درخواست انجام نشد.");
    error.status = response.status;
    error.retryAfter = Number(response.headers.get("Retry-After")) || null;
    throw error;
  }
  return body;
}
export async function upload(path, formData) {
  const image = formData.get("image");
  if (image instanceof Blob && image.size > 10 * 1024 * 1024) {
    throw Error("حجم تصویر کارت بیشتر از ۱۰ مگابایت است.");
  }
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
    signal: AbortSignal.timeout(200000),
  });
  if (response.status === 413) {
    const error = Error("سرور حجم تصویر کارت را نپذیرفت؛ محدودیت آپلود سرور باید افزایش یابد.");
    error.status = 413;
    throw error;
  }
  let body;
  try { body = await response.json(); }
  catch { throw Error("پاسخ سرور کامل نبود؛ دوباره امتحان کن."); }
  if (!response.ok) {
    const error = Error(body.message || "درخواست انجام نشد.");
    error.status = response.status;
    error.retryAfter = Number(response.headers.get("Retry-After")) || null;
    throw error;
  }
  return body;
}
export const number = (n) => Number(n || 0).toLocaleString("fa-IR");
export const hours = (n) =>
  Number(n / 3600000).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) +
  " ساعت";
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
