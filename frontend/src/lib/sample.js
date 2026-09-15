export const sample = {
  user: {
    login: "alex-sample",
    name: "Alex Developer",
    id: 100,
    avatar_url: "",
    public_repos: 24,
    followers: 128,
    created_at: "2020-01-01",
    bio: "Builds accessible web tools",
  },
  repos: [
    {
      name: "accessible-web",
      language: "TypeScript",
      stargazers_count: 42,
      topics: ["accessibility", "web"],
      description: "Accessible web components",
      pushed_at: "2026-09-01",
    },
    {
      name: "small-automation",
      language: "Python",
      stargazers_count: 16,
      topics: ["automation"],
    },
    {
      name: "daily-notes",
      language: "TypeScript",
      stargazers_count: 8,
      topics: ["productivity"],
    },
  ],
};

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
const ratio = (value, target) => clamp((Math.log1p(Math.max(0, value)) / Math.log1p(target)) * 100);

export function rateProfile(profile, original, languages, stars) {
  const repos = original.filter((repo) => !repo.archived);
  const now = Date.now();
  const recentlyTouched = repos.filter((repo) => {
    const stamp = Date.parse(repo.pushed_at || repo.updated_at || "");
    return stamp && now - stamp < 1000 * 60 * 60 * 24 * 365;
  }).length;
  const topics = new Set(repos.flatMap((repo) => repo.topics || []));
  const described = repos.filter((repo) => repo.description || repo.readme).length;
  const readmes = (profile.profileReadme ? 1 : 0) + (profile.projectReadmes || []).length;
  const publicRepos = Number(profile.user?.public_repos || repos.length || 0);
  const breadth = clamp((languages.length / 6) * 65 + (topics.size / 12) * 35);
  const craft = clamp((described / Math.max(1, repos.length)) * 55 + Math.min(45, readmes * 15));
  const impact = clamp(ratio(stars, 700) * 0.7 + ratio(profile.user?.followers || 0, 500) * 0.3);
  const momentum = clamp((recentlyTouched / Math.max(1, repos.length)) * 70 + ratio(publicRepos, 80) * 0.3);
  const consistency = clamp(Math.min(70, repos.length * 7) + Math.min(30, topics.size * 3));
  const overall = clamp(
    breadth * 0.2 + craft * 0.2 + impact * 0.2 + momentum * 0.2 + consistency * 0.2,
  );
  return {
    overall,
    fields: [
      { key: "breadth", label: "RANGE", fa: "تنوع پروژه", score: breadth },
      { key: "craft", label: "CRAFT", fa: "کیفیت ساخت", score: craft },
      { key: "impact", label: "IMPACT", fa: "اثرگذاری", score: impact },
      { key: "momentum", label: "MOMENTUM", fa: "شتاب فعالیت", score: momentum },
      { key: "consistency", label: "DEPTH", fa: "عمق مسیر", score: consistency },
    ],
  };
}

export function analyze(p) {
  const original = p.repos.filter((r) => !r.fork),
    counts = {};
  original.forEach((r) => {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  });
  const languages = Object.entries(counts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const result = {
    ...p,
    original,
    languages,
    lang: languages[0]?.[0],
    stars: original.reduce((n, r) => n + (r.stargazers_count || 0), 0),
    top: [...original].sort(
      (a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0),
    )[0],
  };
  result.rating = rateProfile(p, original, languages, result.stars);
  return result;
}
