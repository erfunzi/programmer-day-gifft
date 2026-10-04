import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { currentLanguage } from "../lib/i18n";
import { Button } from "./ui/button";
import { LoadingState } from "./LoadingState";
export const words = (fa, en) => (currentLanguage() === "en" ? en : fa);
const labels = {
  role: ["عنوان نقش", "Role"],
  sloganLead: ["آغاز شعار", "Slogan lead"],
  slogan: ["شعار", "Slogan"],
  title: ["عنوان معرفی", "Headline"],
  summary: ["معرفی", "Summary"],
  telegramText: ["متن تلگرام", "Telegram introduction"],
};
const limits = {
  role: 100,
  sloganLead: 60,
  slogan: 32,
  title: 240,
  summary: 2000,
  telegramText: 420,
};

export function StudioEditor({ profile }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["editor"],
    queryFn: () => api("/api/me/editor"),
  });
  const [edit, setEdit] = useState(null);
  const [lang, setLang] = useState("fa");
  const value = edit || query.data?.value;
  const save = useMutation({
    mutationFn: ({ action, revision }) =>
      api("/api/me/editor", {
        action,
        revision,
        version: query.data.version,
        value,
      }),
    onSuccess: (data) => {
      client.setQueryData(["editor"], data);
      setEdit(null);
      client.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const update = (patch) => setEdit({ ...value, ...patch });
  if (!value)
    return query.isError ? (
      <Button onClick={() => query.refetch()}>
        {words("تلاش دوباره", "Retry")}
      </Button>
    ) : (
      <LoadingState label={words("آماده‌سازی ویرایشگر…", "Loading editor…")} />
    );
  const projectUpdate = (index, patch) =>
    update({
      projects: value.projects.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    });
  return (
    <section className="surface studio-editor">
      <h2>{words("ویرایش کارت", "Card editor")}</h2>
      <p>
        {words(
          "متن دستی جایگزین نمایش می‌شود؛ متن اصلی AI محفوظ می‌ماند. خالی‌کردن فیلد، متن AI را برمی‌گرداند.",
          "Manual text overrides the display; the AI original stays intact. Clear a field to use the AI text.",
        )}
      </p>
      <fieldset disabled={save.isPending}>
        <label>
          {words("زبان متن", "Content language")}
          <select
            className="report-year-select"
            aria-label={words("زبان متن", "Content language")}
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </select>
        </label>
        <div className="studio-fields" dir={lang === "fa" ? "rtl" : "ltr"}>
          {Object.entries(labels).map(([key, label]) => (
            <label key={key}>
              {words(...label)}
              <textarea
                rows={key === "summary" ? 4 : 2}
                maxLength={limits[key]}
                value={value.locales?.[lang]?.[key] || ""}
                placeholder={
                  query.data?.generated?.locales?.[lang]?.[key] || ""
                }
                onChange={(e) =>
                  update({
                    locales: {
                      ...value.locales,
                      [lang]: {
                        ...value.locales?.[lang],
                        [key]: e.target.value,
                      },
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
        <details>
          <summary>
            {words("متن‌های تکمیلی معرفی", "More introduction fields")}
          </summary>
          {Object.entries({
            resume: [
              "بندهای معرفی حرفه‌ای · حداکثر ۵",
              "Professional introduction · up to 5 paragraphs",
            ],
            strengths: ["نقاط قوت · حداکثر ۸", "Strengths · up to 8"],
            suggestions: ["پیشنهادها · حداکثر ۸", "Suggestions · up to 8"],
            traits: ["ویژگی‌های کارت · حداکثر ۴", "Card traits · up to 4"],
          }).map(([key, label]) => (
            <label key={key}>
              {words(...label)}
              <small>
                {words(
                  "هر مورد در یک خط؛ خالی برای استفاده از متن اصلی",
                  "One item per line; leave blank to use the original",
                )}
              </small>
              <textarea
                rows={4}
                dir={lang === "fa" ? "rtl" : "ltr"}
                value={(value.locales?.[lang]?.[key] || []).join("\n")}
                placeholder={(
                  query.data?.generated?.locales?.[lang]?.[key] || []
                ).join("\n")}
                onChange={(e) =>
                  update({
                    locales: {
                      ...value.locales,
                      [lang]: {
                        ...value.locales?.[lang],
                        [key]: e.target.value ? e.target.value.split("\n") : [],
                      },
                    },
                  })
                }
              />
            </label>
          ))}
        </details>
        <h3>{words("لینک‌های سفارشی", "Custom links")}</h3>
        {value.links.map((link, index) => (
          <div className="studio-row" key={index}>
            <input
              aria-label={words("عنوان لینک", "Link label")}
              maxLength={80}
              value={link.label}
              onChange={(e) =>
                update({
                  links: value.links.map((l, i) =>
                    i === index ? { ...l, label: e.target.value } : l,
                  ),
                })
              }
            />
            <input
              aria-label="HTTPS URL"
              type="url"
              dir="ltr"
              value={link.url}
              onChange={(e) =>
                update({
                  links: value.links.map((l, i) =>
                    i === index ? { ...l, url: e.target.value } : l,
                  ),
                })
              }
            />
            <Button
              variant="ghost"
              onClick={() =>
                update({ links: value.links.filter((_, i) => i !== index) })
              }
            >
              {words("حذف", "Remove")}
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          disabled={value.links.length >= 5}
          onClick={() =>
            update({ links: [...value.links, { label: "", url: "https://" }] })
          }
        >
          {words("افزودن لینک", "Add link")}
        </Button>
        <h3>
          {words("پروژه‌های شاخص · حداکثر ۳", "Featured projects · up to 3")}
        </h3>
        {value.projects.map((project, index) => (
          <fieldset className="studio-case" key={project.name}>
            <legend>{project.name}</legend>
            {["problem", "approach", "outcome"].map((key, i) => (
              <label key={key}>
                {words(
                  ...[
                    ["مسئله", "Problem"],
                    ["راهکار", "Approach"],
                    ["نتیجه", "Outcome"],
                  ][i],
                )}
                <textarea
                  maxLength={600}
                  value={project[lang]?.[key] || ""}
                  onChange={(e) =>
                    projectUpdate(index, {
                      [lang]: { ...project[lang], [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            <Button
              variant="ghost"
              onClick={() =>
                update({
                  projects: value.projects.filter((_, i) => i !== index),
                })
              }
            >
              {words("برداشتن پین", "Unpin")}
            </Button>
          </fieldset>
        ))}
        <select
          className="report-year-select"
          aria-label={words("پین پروژه", "Pin project")}
          value=""
          disabled={value.projects.length >= 3}
          onChange={(e) =>
            e.target.value &&
            update({
              projects: [
                ...value.projects,
                { name: e.target.value, fa: {}, en: {} },
              ],
            })
          }
        >
          <option value="">
            {words("انتخاب پروژهٔ عمومی", "Choose a public repository")}
          </option>
          {profile.repos
            .filter(
              (r) =>
                !r.private && !value.projects.some((p) => p.name === r.name),
            )
            .map((r) => (
              <option key={r.name}>{r.name}</option>
            ))}
        </select>
        <div className="studio-row">
          <Button
            variant="secondary"
            onClick={() => save.mutate({ action: "draft" })}
          >
            {words("ذخیرهٔ پیش‌نویس", "Save draft")}
          </Button>
          <Button onClick={() => save.mutate({ action: "apply" })}>
            {words("اعمال روی کارت عمومی", "Apply to public card")}
          </Button>
        </div>
        <details>
          <summary>
            {words("تاریخچه و بازگردانی", "History and restore")}
          </summary>
          {query.data.revisions.map((r) => (
            <div className="studio-row" key={r.number}>
              <span>
                #{r.number} · {new Date(r.created).toLocaleString()}
              </span>
              <Button
                variant="secondary"
                onClick={() =>
                  save.mutate({ action: "restore", revision: r.number })
                }
              >
                {words("بازگردانی به نسخهٔ جدید", "Restore as new revision")}
              </Button>
            </div>
          ))}
        </details>
      </fieldset>
      {save.isPending && (
        <LoadingState
          variant="inline"
          label={words("در حال ذخیره…", "Saving…")}
        />
      )}
      {save.error && <p role="alert">{save.error.message}</p>}
      {save.isSuccess && !edit && (
        <p role="status">{words("ذخیره شد", "Saved")}</p>
      )}
    </section>
  );
}

export function Showcase({ editor, language, login, repos = [] }) {
  if (!editor) return null;
  return (
    <section className="surface studio-showcase">
      <div className="studio-row">
        {editor.links?.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.label} ↗
          </a>
        ))}
      </div>
      {editor.projects?.map((p) => (
        <article key={p.name}>
          <h3>
            <a
              href={`https://github.com/${encodeURIComponent(login)}/${encodeURIComponent(p.name)}`}
              target="_blank"
              rel="noreferrer"
            >
              {p.name} ↗
            </a>
          </h3>
          {["problem", "approach", "outcome"].map(
            (key, i) =>
              p[language]?.[key] && (
                <p key={key}>
                  <strong>
                    {words(
                      ...[
                        ["مسئله", "Problem"],
                        ["راهکار", "Approach"],
                        ["نتیجه", "Outcome"],
                      ][i],
                    )}
                    :{" "}
                  </strong>
                  {p[language][key]}
                </p>
              ),
          )}
        </article>
      ))}
      <details>
        <summary>
          {words("منابع عمومی معرفی", "Public profile sources")}
        </summary>
        {repos
          .filter((r) => !r.private)
          .map((r) => (
            <p key={r.name}>
              <a
                href={`https://github.com/${encodeURIComponent(login)}/${encodeURIComponent(r.name)}`}
                target="_blank"
                rel="noreferrer"
              >
                {r.name} ↗
              </a>
            </p>
          ))}
        <p>
          {words(
            "این‌ها منابع پروژه‌اند؛ هر جملهٔ معرفی لزوماً از همهٔ این منابع تأیید نمی‌شود.",
            "These are project sources, not verification of every claim in the introduction.",
          )}
        </p>
      </details>
    </section>
  );
}
