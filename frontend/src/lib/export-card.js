import { toBlob, getFontEmbedCSS } from "html-to-image";
export async function exportCard(card, login) {
  await document.fonts.ready;
  await Promise.all(
    [...card.querySelectorAll("img")].map((img) => img.decode()),
  );
  const clone = card.cloneNode(true);
  clone.classList.remove("auto-rotate");
  clone.classList.add("export-snapshot");
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;pointer-events:none;";
  clone.style.cssText = card.style.cssText;
  Object.assign(clone.style, {
    width: card.offsetWidth + "px",
    transform: "none",
    animation: "none",
    transition: "none",
    margin: "0",
  });
  container.append(clone);
  document.body.append(container);
  try {
    for (const img of clone.querySelectorAll("img")) {
      const response = await fetch(img.src);
      if (!response.ok) throw Error("تصویر کارت بارگذاری نشد.");
      const blob = await response.blob();
      img.src = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      await img.decode();
    }
    const fontEmbedCSS = await getFontEmbedCSS(clone);
    const exportBackground = getComputedStyle(card)
      .getPropertyValue("--theme-export-bg")
      .trim() || "#111c17";
    const blob = await toBlob(clone, {
      pixelRatio: 3,
      fontEmbedCSS,
      backgroundColor: exportBackground,
      width: clone.offsetWidth,
      height: clone.offsetHeight,
      style: { transform: "none", animation: "none", transition: "none" },
    });
    if (!blob) throw Error("خروجی تصویر ساخته نشد.");
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `developer-card-${login}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } finally {
    container.remove();
  }
}
