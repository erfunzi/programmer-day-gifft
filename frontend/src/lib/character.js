const CHARACTER_STYLES = ["neutral", "feminine", "masculine"];
const CHARACTER_KINDS = ["maker", "web", "data", "mobile", "game", "systems"];
/** AI-made character pack: style → kind → file (falls back to style base). */
const CHARACTER_PACK = {
  neutral: {
    maker: "neutral.png",
    web: "neutral-web.png",
    data: "neutral-data.png",
    mobile: "neutral-mobile.png",
    game: "neutral-game.png",
    systems: "neutral-systems.png",
  },
  feminine: {
    maker: "feminine.png",
    web: "feminine-web.png",
    data: "feminine-data.png",
    mobile: "feminine-mobile.png",
    game: "feminine-game.png",
    systems: "feminine-systems.png",
  },
  masculine: {
    maker: "masculine.png",
    web: "masculine-web.png",
    data: "masculine-data.png",
    mobile: "masculine-mobile.png",
    game: "masculine-game.png",
    systems: "masculine-systems.png",
  },
};
const STYLE_LABEL = { neutral: "ربات", feminine: "زنانه", masculine: "مردانه" };
let lockCharacterStyleFromUrl = false;
let characterLoadToken = 0;
let selectedCharacterStyle = "neutral";

function characterStyle() {
  return CHARACTER_STYLES.includes(selectedCharacterStyle)
    ? selectedCharacterStyle
    : "neutral";
}
function setCharacterStyle(style) {
  selectedCharacterStyle = CHARACTER_STYLES.includes(style) ? style : "neutral";
}

/** Infer appearance only from clear profile signals; otherwise stay genderless. */
function inferCharacterStyle(user) {
  const raw = [user?.name, user?.bio, user?.login].filter(Boolean).join("\n");
  const text = raw.toLowerCase();
  if (
    /\bthey\s*\/\s*them\b|\bpronouns?\s*[:：]\s*they\b|\bnon[- ]?binary\b|\bagender\b|\bgenderqueer\b|\bgender[- ]?neutral\b/.test(
      text,
    )
  )
    return "neutral";
  let feminine = 0,
    masculine = 0;
  if (
    /she\s*\/\s*hers?|\bpronouns?\s*[:：]\s*she\b|\bi(?:'|\u2019)?m a (?:woman|girl|female)\b/.test(
      text,
    ) ||
    /خانم|بانو|(?:^|[^\u0600-\u06FF])زن(?:[^\u0600-\u06FF]|$)/m.test(raw)
  )
    feminine++;
  if (
    /he\s*\/\s*him|\bpronouns?\s*[:：]\s*he\b|\bi(?:'|\u2019)?m a (?:man|boy|male)\b/.test(
      text,
    ) ||
    /آقای|آقا(?:\s|$|،|,|:)|(?:^|[^\u0600-\u06FF])مرد(?:[^\u0600-\u06FF]|$)/m.test(
      raw,
    )
  )
    masculine++;
  if (feminine && !masculine) return "feminine";
  if (masculine && !feminine) return "masculine";
  return "neutral";
}
function applyInferredCharacterStyle(user) {
  if (lockCharacterStyleFromUrl) {
    lockCharacterStyleFromUrl = false;
    return characterStyle();
  }
  const style = inferCharacterStyle(user);
  setCharacterStyle(style);
  return style;
}

function characterSeed(login) {
  return [...String(login || "dev")].reduce(
    (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
    0,
  );
}
function pickTrait(seed, list) {
  return list[(seed >>> 0) % list.length];
}

function composeCharacterTraits(data, kind, now = Date.now()) {
  const user = data.user || {};
  const repos = data.original || [];
  const langs = data.languages || [];
  const lang = data.lang;
  const top = data.top;
  const seed = characterSeed(user.login);
  const year = new Date(user.created_at).getUTCFullYear();
  const years = Math.max(
    1,
    new Date().getUTCFullYear() -
      (Number.isFinite(year) ? year : new Date().getUTCFullYear()),
  );
  const recent = repos.filter(
    (r) =>
      !r.archived &&
      Number.isFinite(Date.parse(r.pushed_at)) &&
      now - Date.parse(r.pushed_at) >= 0 &&
      now - Date.parse(r.pushed_at) < 90 * 86400000,
  ).length;
  const stars = Number(data.stars) || 0;
  const followers = Number(user.followers) || 0;
  const bag = [];

  if (lang) {
    const langTraits = {
      JavaScript: ["جادوی DOM", "وب‌باز شب‌بیدار", "رابط‌ساز"],
      TypeScript: ["تایپ‌باز دقیق", "معمار تایپ‌ها", "خطایاب سخت‌گیر"],
      Python: ["جادوگر اسکریپت", "کاشف داده", "پایتون‌نویس آزاد"],
      Go: ["ساده‌نویس سریع", "نگهبان سرویس", "گوفر مصمم"],
      Rust: ["دقت‌طلب بی‌رحم", "حافظه‌بان", "کامپایل‌چَمپ"],
      Swift: ["سازندهٔ لمسی", "اپ‌نویس اپل", "تجربه‌ساز جیبی"],
      Kotlin: ["حلّال اندروید", "کاتلین‌نویس", "اپ‌ساز چابک"],
      Java: ["پایه‌گذار محکم", "ماشین پایدار", "معمار کلاسیک"],
      Dockerfile: ["محیط‌ساز", "کپسول‌چی ران‌تایم", "کشتی‌بان کانتینر"],
      Shell: ["اتوماسیون‌چی", "چسب ابزارها", "اسکریپت‌باز شب"],
      HTML: ["ساختارنویس", "اسکلت‌ساز وب"],
      CSS: ["استایل‌پرداز", "جزئیات‌دوست"],
      PHP: ["وب‌پشت‌صحنه", "سرورنویس کهنه‌کار"],
      Ruby: ["ظریف‌نویس", "خوانایی‌دوست"],
      C: ["نزدیک‌به‌فلز", "کنترل‌طلب"],
      "C++": ["قدرت‌طلب دقیق", "موتورنویس"],
      "C#": ["سیستم‌ساز قابل‌اتکا"],
      Dart: ["اپ‌نویس همه‌جا", "فلوترباز"],
      Vue: ["کامپوننت‌چین", "رابط‌ساز ماژولار"],
    };
    bag.push(pickTrait(seed, langTraits[lang] || [lang + " در خونش"]));
  } else if (langs.length) {
    bag.push(
      pickTrait(seed, [
        "چندنوازی کد",
        langs[0][0] + " · شروع داستان",
        "جعبه ابزار باز",
      ]),
    );
  } else {
    bag.push(
      pickTrait(seed, [
        "فصل اول هنوز بازه",
        "ایده قبل از زبان",
        "آزمایشگاه شخصی",
      ]),
    );
  }

  if (top?.name) {
    bag.push(
      pickTrait(seed >> 2, [
        "امضای «" + top.name + "»",
        "اثر انگشت: " + top.name,
        "قهرمان صحنه: " + top.name,
      ]),
    );
  } else if (repos.length === 1) {
    bag.push(
      pickTrait(seed >> 2, [
        "تک‌پروژهٔ ویژه",
        "یک شعله، یک داستان",
        "اولین مخزن، اولین امضا",
      ]),
    );
  } else if (repos.length) {
    bag.push(
      pickTrait(seed >> 2, [
        repos.length + " آزمایشگاه باز",
        "کارگاه " + repos.length + " پروژه‌ای",
        "سازندهٔ چندمسیره",
      ]),
    );
  } else {
    bag.push(
      pickTrait(seed >> 2, [
        "صفحهٔ سفید شجاع",
        "commit بعدی مال توئه",
        "هنوز فصل مقدمه",
      ]),
    );
  }

  if (recent >= 5)
    bag.push(
      pickTrait(seed >> 4, [
        "نبض فعال ۹۰روزه",
        "در حال ساختنِ همین الان",
        "دست گرم، مخزن زنده",
      ]),
    );
  else if (recent >= 1)
    bag.push(
      pickTrait(seed >> 4, [
        "هنوز وسط ماجرا",
        "به‌روزرسانی تازه",
        "شعله خاموش نشده",
      ]),
    );
  else
    bag.push(
      pickTrait(seed >> 4, [
        "در حال شارژ ایده‌ها",
        "وقفهٔ خلاق",
        years + " سال مسیر باز",
      ]),
    );

  if (stars >= 50)
    bag.push(
      pickTrait(seed >> 5, [
        "ستاره‌جمع‌کن",
        "ایده‌های دیده‌شده",
        stars + " ستاره در کارنامه",
      ]),
    );
  else if (followers >= 20)
    bag.push(
      pickTrait(seed >> 5, [
        "دنبال‌شونده",
        followers + " شاهد مسیر",
        "صدا در اکوسیستم",
      ]),
    );
  else if (user.bio)
    bag.push(
      pickTrait(seed >> 5, [
        "بیو پُر از ساختن",
        "داستان روی پروفایل",
        "هویتِ نوشته‌شده",
      ]),
    );
  else {
    const vibe = {
      maker: ["سازندهٔ کنجکاو", "جعبه ابزار شخصی", "از هیچ تا چیزی"],
      web: ["معمار تجربه", "پیکسل‌دوست", "رابط در خونش"],
      data: ["کاوشگر الگو", "نقشه‌کش داده", "کنجکاوِ عدد"],
      mobile: ["دنیای جیبی", "لمس‌محور", "اپ در دست"],
      game: ["جهان‌ساز", "پیکسل‌باز", "داستان‌باز تعاملی"],
      systems: ["نگهبان سیستم", "ابزارساز زیرپوست", "زیرساخت‌دوست"],
    };
    bag.push(pickTrait(seed >> 5, vibe[kind] || vibe.maker));
  }

  if (Number.isFinite(year) && years >= 3)
    bag.push(
      pickTrait(seed >> 6, [
        "از " + year + " تا امروز",
        "کهنه‌کار صبور",
        years + " سال خط‌به‌خط",
      ]),
    );

  const unique = [];
  for (const t of bag) {
    if (t && !unique.includes(t)) unique.push(t);
    if (unique.length === 4) break;
  }
  while (unique.length < 3)
    unique.push(
      pickTrait(seed + unique.length, [
        "کنجکاوِ تمام‌وقت",
        "سازندهٔ روز ۲۵۶",
        "داستانِ ناتمامِ قشنگ",
      ]),
    );
  return unique.slice(0, 4);
}

function characterProfile(data, now = Date.now()) {
  const repos = data.original;
  const topics = repos.flatMap((r) =>
    Array.isArray(r.topics) ? r.topics : [],
  );
  const corpus = topics.join(" ").toLowerCase();
  const lang = data.lang;
  let kind = "maker",
    label = "OPEN SOURCE MAKER",
    title = "سازندهٔ کنجکاو",
    hue = 0,
    reason = "از پروژه‌های عمومی و زبان‌های استفاده‌شده الهام گرفته است.";
  if (
    /machine-learning|data-science|artificial-intelligence|deep-learning/.test(
      corpus,
    ) ||
    ["Python", "R", "Julia", "Jupyter Notebook"].includes(lang)
  ) {
    kind = "data";
    label = "DATA EXPLORER";
    title = "کاوشگر داده";
    hue = 75;
    reason =
      "زبان‌ها یا موضوع‌های مرتبط با داده در پروژه‌های عمومی دیده می‌شوند.";
  } else if (
    /android|ios|flutter|react-native/.test(corpus) ||
    ["Swift", "Kotlin", "Dart"].includes(lang)
  ) {
    kind = "mobile";
    label = "POCKET WORLD BUILDER";
    title = "سازندهٔ دنیای همراه";
    hue = 180;
    reason =
      "زبان‌ها یا موضوع‌های مرتبط با اپ‌های موبایل در پروژه‌ها دیده می‌شوند.";
  } else if (/gamedev|game-development|unity|unreal|godot/.test(corpus)) {
    kind = "game";
    label = "WORLD BUILDER";
    title = "جهان‌ساز";
    hue = 230;
    reason = "موضوع‌های مرتبط با ساخت بازی در پروژه‌ها دیده می‌شوند.";
  } else if (
    ["JavaScript", "TypeScript", "CSS", "HTML", "Vue", "Svelte"].includes(lang)
  ) {
    kind = "web";
    label = "INTERFACE ARCHITECT";
    title = "معمار رابط‌ها";
    hue = 0;
    reason = "زبان غالب مخزن‌های غیرفورک به ساخت تجربه‌های وب مرتبط است.";
  } else if (
    ["Go", "Rust", "C", "C++", "Java", "C#", "PHP", "Ruby", "Shell"].includes(
      lang,
    )
  ) {
    kind = "systems";
    label = "SYSTEM GUARDIAN";
    title = "نگهبان سیستم‌ها";
    hue = 125;
    reason =
      "از زبان غالب مخزن‌های غیرفورک و دنیای ابزارها و سیستم‌ها الهام گرفته است.";
  } else if (lang === "Dockerfile") {
    kind = "systems";
    label = "RUNTIME CAPTAIN";
    title = "کشتی‌بان اجرا";
    hue = 125;
    reason = "از Dockerfile و دنیای محیط اجرا الهام گرفته است.";
  }
  const traits = composeCharacterTraits(data, kind, now);
  const seed = characterSeed(data.user.login);
  return {
    kind,
    label,
    title,
    hue,
    reason,
    traits,
    serial: seed.toString(16).toUpperCase().padStart(8, "0"),
    seed,
  };
}

function characterAssetPath(style, kind) {
  const pack = CHARACTER_PACK[style] || CHARACTER_PACK.neutral;
  const file = pack[kind] || pack.maker || "neutral.png";
  return "characters/" + file + "?v=cutout";
}

export { characterProfile, characterAssetPath };
