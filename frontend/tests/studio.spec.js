import { test, expect } from "@playwright/test";
import { sample } from "../src/lib/sample.js";

test("editor saves a private draft, applies bilingual overrides and preserves originals", async ({
  page,
}) => {
  let head = { locales: {}, links: [], projects: [] };
  let draft = {
    version: 0,
    value: head,
    revisions: [],
    generated: {
      locales: { fa: { role: "متن اصلی" }, en: { role: "Original" } },
    },
  };
  const posts = [];
  await page.route("**/api/config", (r) =>
    r.fulfill({ json: { loginReady: true } }),
  );
  await page.route("**/api/me", (r) =>
    r.fulfill({
      json: {
        user: {
          id: 1,
          login: sample.user.login,
          preferences: { language: "fa", theme: "solar-forge" },
        },
      },
    }),
  );
  await page.route("**/api/me/profile", (r) =>
    r.fulfill({ json: { ...sample, editor: head } }),
  );
  await page.route("**/api/me/ai", (r) => r.fulfill({ json: draft.generated }));
  await page.route("**/api/me/image?*", (r) =>
    r.fulfill({ status: 404, body: "" }),
  );
  await page.route("**/api/me/telegram", (r) =>
    r.fulfill({ json: { configured: false } }),
  );
  await page.route("**/api/me/jobs", (r) => r.fulfill({ json: { jobs: [] } }));
  await page.route("**/api/me/time", (r) =>
    r.fulfill({
      json: {
        timezone: "Asia/Tehran",
        active: null,
        history: [],
        daily: {},
        total: 0,
        today: 0,
        elapsedDays: 1,
        averagePerCalendarDay: 0,
        activeDays: 0,
      },
    }),
  );
  await page.route("**/api/me/goal", (r) =>
    r.fulfill({ json: { week: "2026-09-28", minutes: null, completed: 0 } }),
  );
  await page.route("**/api/me/editor", async (r) => {
    if (r.request().method() === "POST") {
      const data = r.request().postDataJSON();
      posts.push(data);
      draft = { ...draft, version: draft.version + 1, value: data.value };
      if (data.action === "apply") {
        head = data.value;
        draft.revisions = [{ number: 1, created: Date.now() }];
      }
    }
    await r.fulfill({ json: draft });
  });
  await page.goto("/?tab=settings");
  await expect(
    page.getByRole("heading", { name: "ویرایش کارت" }),
  ).toBeVisible();
  await page.getByLabel("عنوان نقش", { exact: true }).fill("سازنده ابزار");
  await page.getByLabel("زبان متن", { exact: true }).selectOption("en");
  await page.getByLabel("عنوان نقش", { exact: true }).fill("Tool builder");
  await page
    .getByRole("button", { name: "ذخیرهٔ پیش‌نویس", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "ذخیره شد" }),
  ).toBeVisible();
  expect(head.locales).toEqual({});
  await page.getByRole("button", { name: "اعمال روی کارت عمومی" }).click();
  await expect.poll(() => posts.length).toBe(2);
  expect(posts[1].version).toBe(1);
  expect(head.locales.en.role).toBe("Tool builder");
  expect(draft.generated.locales.en.role).toBe("Original");
  await page.getByRole("tab", { name: "کارت و معرفی", exact: true }).click();
  await expect(page.locator("#dev-card .role")).toHaveText("سازنده ابزار");
  await page.getByRole("tab", { name: "تنظیمات", exact: true }).click();
  await page.screenshot({
    path: `test-results/studio-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("public card uses overrides without requesting private studio resources", async ({
  page,
}) => {
  const privateRequests = [];
  page.on("request", (r) => {
    if (/\/api\/me\//.test(r.url())) privateRequests.push(r.url());
  });
  await page.route("**/api/config", (r) => r.fulfill({ json: {} }));
  await page.route("**/api/me", (r) => r.fulfill({ json: { user: null } }));
  await page.route("**/api/cards/alex-sample", (r) =>
    r.fulfill({
      json: {
        ...sample,
        preferences: { language: "en", theme: "paper-circuit" },
        editor: {
          locales: { en: { role: "Public override" } },
          links: [],
          projects: [],
        },
        analysis: {
          locales: { en: { role: "Generated", resume: [], skills: [] } },
        },
      },
    }),
  );
  await page.route("**/api/cards/alex-sample/image?*", (r) =>
    r.fulfill({ status: 404, body: "" }),
  );
  await page.goto("/?u=alex-sample");
  await expect(page.locator("#dev-card .role")).toHaveText("Public override");
  await expect(page.getByRole("tab", { name: "Settings" })).toHaveCount(0);
  expect(privateRequests).toEqual([]);
});
