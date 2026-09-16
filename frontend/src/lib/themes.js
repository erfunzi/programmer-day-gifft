export const THEMES = [
  {id:"sky-bloom",name:"شکوفهٔ آسمان",english:"Sky Bloom",description:"آبی روشن، لطیف و شفاف",colors:["#edf6ff","#195c9a","#7150a5"]},
  {id:"cherry-noir",name:"گیلاس نیمه‌شب",english:"Cherry Noir",description:"بلک چری، عمیق و مخملی",colors:["#180d15","#ff91b3","#d6a2ed"]},
  {id:"graphite-core",name:"هستهٔ گرافیتی",english:"Graphite Core",description:"خاکستری تیره، خنثی و صنعتی",colors:["#16181c","#d8dee8","#94a8c4"]},
  {
    id: "aurora-mint",
    name: "شفق نعنایی",
    english: "Aurora Mint",
    description: "مینیمال، آرام و آشنا",
    colors: ["#111a16", "#baff70", "#7de7c0"],
  },
  {
    id: "neon-arcade",
    name: "آرکید نئونی",
    english: "Neon Arcade",
    description: "سایبرپانک، پرانرژی و بازی‌وار",
    colors: ["#120f24", "#ff5bd6", "#55e7ff"],
  },
  {
    id: "solar-forge",
    name: "کورهٔ خورشیدی",
    english: "Solar Forge",
    description: "گرم، جسور و صنعتی",
    colors: ["#21130e", "#ffc857", "#ff745c"],
  },
  {
    id: "deep-ocean",
    name: "اعماق اقیانوس",
    english: "Deep Ocean",
    description: "خنک، دقیق و اکتشافی",
    colors: ["#071923", "#55d6ff", "#6d8cff"],
  },
  {
    id: "violet-orbit",
    name: "مدار بنفش",
    english: "Violet Orbit",
    description: "فانتزی، فضایی و آینده‌نگر",
    colors: ["#171022", "#c596ff", "#ff8ecb"],
  },
  {
    id: "paper-circuit",
    name: "مدار کاغذی",
    english: "Paper Circuit",
    description: "روشن، editorial و متفاوت",
    colors: ["#f2eee4", "#1d6b62", "#d45b3d"],
  },
];

export const DEFAULT_THEME = "aurora-mint";

export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) || THEMES.find((theme) => theme.id === DEFAULT_THEME);
}
