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
export function analyze(p) {
  const original = p.repos.filter((r) => !r.fork),
    counts = {};
  original.forEach((r) => {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  });
  const languages = Object.entries(counts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  return {
    ...p,
    original,
    languages,
    lang: languages[0]?.[0],
    stars: original.reduce((n, r) => n + (r.stargazers_count || 0), 0),
    top: [...original].sort(
      (a, b) => b.stargazers_count - a.stargazers_count,
    )[0],
  };
}
