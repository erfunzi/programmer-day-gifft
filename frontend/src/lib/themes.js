export const THEMES = [
  {id:"sky-bloom",name:"شکوفهٔ آسمان",english:"Sky Bloom",description:"آبی روشن، لطیف و شفاف",englishDescription:"Light blue, soft and clear",colors:["#edf6ff","#195c9a","#68829d"]},
  {id:"cherry-noir",name:"گیلاس نیمه‌شب",english:"Cherry Noir",description:"بلک چری، عمیق و مخملی",englishDescription:"Black cherry, deep and velvety",colors:["#180d15","#d6a0ae","#b5a5b9"]},
  {id:"graphite-core",name:"هستهٔ گرافیتی",english:"Graphite Core",description:"خاکستری تیره، خنثی و صنعتی",englishDescription:"Dark grey, neutral and industrial",colors:["#16181c","#d8dee8","#94a8c4"]},
  {
    id: "aurora-mint",
    name: "شفق نعنایی",
    english: "Aurora Mint",
    description: "مینیمال، آرام و آشنا",
    englishDescription: "Minimal, calm and familiar",
    colors: ["#111a16", "#baff70", "#7de7c0"],
  },
  {
    id: "neon-arcade",
    name: "آرکید نئونی",
    english: "Neon Arcade",
    description: "سایبرپانک، پرانرژی و بازی‌وار",
    englishDescription: "Cyberpunk, energetic and playful",
    colors: ["#120f24", "#ff5bd6", "#55e7ff"],
  },
  {
    id: "solar-forge",
    name: "کورهٔ خورشیدی",
    english: "Solar Forge",
    description: "گرم، جسور و صنعتی",
    englishDescription: "Warm, bold and industrial",
    colors: ["#21130e", "#ffc857", "#ff745c"],
  },
  {
    id: "deep-ocean",
    name: "اعماق اقیانوس",
    english: "Deep Ocean",
    description: "خنک، دقیق و اکتشافی",
    englishDescription: "Cool, precise and exploratory",
    colors: ["#071923", "#55d6ff", "#6d8cff"],
  },
  {
    id: "violet-orbit",
    name: "مدار بنفش",
    english: "Violet Orbit",
    description: "فانتزی، فضایی و آینده‌نگر",
    englishDescription: "Fantasy, cosmic and forward-looking",
    colors: ["#171022", "#c596ff", "#ff8ecb"],
  },
  {
    id: "paper-circuit",
    name: "مدار کاغذی",
    english: "Paper Circuit",
    description: "روشن، editorial و متفاوت",
    englishDescription: "Bright, editorial and distinct",
    colors: ["#f2eee4", "#1d6b62", "#d45b3d"],
  },
];

export const DEFAULT_THEME = "aurora-mint";

export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) || THEMES.find((theme) => theme.id === DEFAULT_THEME);
}
