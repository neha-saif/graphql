import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getToken, clearToken } from "../lib/auth.js";
import { gqlFetch } from "../graphql.js";
import ProfileSummary from "./ProfileSummary.jsx";

import {
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// 🌑 Unified Dark Neon Purple Palette
export const COLOR_PALETTE = {
  // purples
  purpleDarker: "#2e1065",
  purpleDark: "#4c1d95",
  purple: "#a855f7",       // main neon
  purpleMid: "#7c3aed",
  purpleLight: "#c084fc",
  purpleSoft: "#e9d5ff",

  // neutrals for dark UI
  bg: "#020617",
  cardBg: "#020617",
  cardBorder: "#1f2937",
  textMain: "#e5e7eb",
  textMuted: "#9ca3af",

  // muted language colors (if you use them elsewhere)
  gray: "#64748b",
  grayLight: "#cbd5e1",
  grayDark: "#475569",
  go: "#8fb8ff",
  javascript: "#ffe9a5",
  sql: "#b4f5cc",
  python: "#bcd7ff",
  docker: "#9ed0ff",
  shell: "#f7b3d6",
  other: "#cbd5e1",
};

// Distinct but cohesive chart colors (purples / pink / indigo)
const LINE_COLORS = [
  "#a855f7", // neon purple
  "#7c3aed", // indigo-purple
  "#c084fc", // light purple
  "#e879f9", // bright pinkish purple
  "#f472b6", // pink
  "#6366f1", // indigo
  "#4c1d95", // deep purple
  "#e9d5ff", // pale lavender
];

// language → color mapping (kept as-is but using palette)
export function colorForLang(lang) {
  if (!lang) return COLOR_PALETTE.other;
  const key = lang.toLowerCase().trim();

  if (key.includes("go")) return COLOR_PALETTE.go;
  if (key.includes("javascript") || key.includes("js")) return COLOR_PALETTE.javascript;
  if (key.includes("sql")) return COLOR_PALETTE.sql;
  if (key.includes("python") || key.includes("py")) return COLOR_PALETTE.python;
  if (key.includes("docker")) return COLOR_PALETTE.docker;
  if (key.includes("shell") || key.includes("sh") || key.includes("bash")) return COLOR_PALETTE.shell;

  return COLOR_PALETTE.other;
}

function Chip({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: "6px 10px",
        borderRadius: 12,
        border: `1px solid rgba(148, 163, 184, 0.4)`,
        background: active ? "rgba(168, 85, 247, 0.18)" : "transparent",
        color: COLOR_PALETTE.textMain,
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}

// ui clean up rules to fix names from db
const PASS_THRESHOLD = Number(import.meta.env.VITE_PASS_THRESHOLD ?? 1);

function prettyLang(s) {
  if (!s) return "Other";
  const v = String(s).toLowerCase();
  if (!v || v === "unknown") return "Piscine";
  if (v === "dom") return "JavaScript";
  if (["sh", "bash", "shell"].includes(v)) return "Shell";
  if (v === "js" || v === "javascript") return "JavaScript";
  if (v === "ts" || v === "typescript") return "TypeScript";
  if (v === "py" || v === "python") return "Python";
  if (v === "go" || v === "golang") return "Go";
  if (v.includes("rust")) return "Rust";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function prettyKind(type) {
  if (!type) return "(unknown)";
  const t = String(type).toLowerCase();
  if (t === "exercise" || t === "quest") return "Quest";
  if (t === "project") return "Project";
  if (t === "checkpoint" || t === "exam") return "Checkpoint";
  if (t === "raid") return "Raid";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function computeCategoryFromRow(row) {
  const rawLang = row?.object?.attrs?.language || "";
  if (rawLang === "unknown") return "Piscine";
  const t = String(row?.object?.type || "").toLowerCase();
  if (t === "exercise" || t === "quest") return "Quest";
  if (t === "project") return "Project";
  if (t === "checkpoint" || t === "exam") return "Checkpoint";
  return "Other";
}

function statusFromRow(row, threshold = PASS_THRESHOLD) {
  const direct = row?.grade;
  const fromAttempts = row?.results_aggregate?.aggregate?.max?.grade;
  const effective = direct ?? fromAttempts;
  const done = !!row?.isDone;
  if (!done || effective === null || effective === undefined) return "Pending";
  return Number(effective) >= threshold ? "Passed" : "Failed";
}

/* =============== Quests Section (Pie) =============== */

function QuestsSection({ baseRows }) {
  const passed = useMemo(
    () => baseRows.filter((r) => r.__status === "Passed"),
    [baseRows]
  );

  const pieData = useMemo(() => {
    const map = new Map();
    for (const r of passed) {
      const lang = r.__lang || "Other";
      map.set(lang, (map.get(lang) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [passed]);

  return (
    <section
      className="card"
      style={{
        padding: 12,
        marginBottom: 16,
        background: COLOR_PALETTE.cardBg,
        border: `1px solid ${COLOR_PALETTE.cardBorder}`,
        color: COLOR_PALETTE.textMain,
        borderRadius: 12,
      }}
    >
      <h3 style={{ margin: 0, color: COLOR_PALETTE.purpleLight }}>Overall Quests Passed</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div style={{ height: 340 }}>
          {pieData.length === 0 ? (
            <div style={{ padding: 12, color: COLOR_PALETTE.textMuted }}>
              No passed quests yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
             <Tooltip
  contentStyle={{
    backgroundColor: COLOR_PALETTE.cardBg,
    color: COLOR_PALETTE.textMain,
    borderColor: COLOR_PALETTE.cardBorder,
    borderRadius: 8,
  }}
  labelStyle={{ color: COLOR_PALETTE.textMain }}
  itemStyle={{ color: COLOR_PALETTE.textMain }}
/>

                <Legend wrapperStyle={{ color: COLOR_PALETTE.textMuted }} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  label={({ name, value }) => `${name} • ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={LINE_COLORS[i % LINE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============ Projects Section (Line + List) ============ */

function ProjectsSection({ baseRows }) {
  const passed = useMemo(
    () => baseRows.filter((r) => r.__status === "Passed"),
    [baseRows]
  );

  const languages = useMemo(() => {
    const set = new Set(passed.map((r) => r.__lang || "Other"));
    return Array.from(set).sort();
  }, [passed]);

  const [selected, setSelected] = useState(["Overall"]);
  const showOverall = selected.includes("Overall");

  useEffect(() => {
    if (languages.length && selected.length === 0) {
      setSelected(["Overall"]);
    }
  }, [languages, selected.length]);

  function toggle(val) {
    setSelected((curr) =>
      curr.includes(val) ? curr.filter((x) => x !== val) : [...curr, val]
    );
  }

  const { byLangCum, overallCum, allDays } = useMemo(() => {
    const byLangDay = new Map();
    const dayAll = new Map();

    for (const r of passed) {
      const lang = r.__lang || "Other";
      const day = new Date(r.createdAt).toISOString().slice(0, 10);
      if (!byLangDay.has(lang)) byLangDay.set(lang, new Map());
      const m = byLangDay.get(lang);
      m.set(day, (m.get(day) || 0) + 1);
      dayAll.set(day, (dayAll.get(day) || 0) + 1);
    }

    const days = Array.from(
      new Set([
        ...Array.from(dayAll.keys()),
        ...Array.from([...byLangDay.values()].flatMap((m) => [...m.keys()])),
      ])
    ).sort();

    const byLangCumMap = new Map();
    for (const [lang, m] of byLangDay.entries()) {
      let cum = 0;
      const cm = new Map();
      for (const d of days) {
        const inc = m.get(d) || 0;
        cum += inc;
        cm.set(d, cum);
      }
      byLangCumMap.set(lang, cm);
    }

    let cumAll = 0;
    const overall = new Map();
    for (const d of days) {
      cumAll += dayAll.get(d) || 0;
      overall.set(d, cumAll);
    }

    return { byLangCum: byLangCumMap, overallCum: overall, allDays: days };
  }, [passed]);

  const chartData = useMemo(() => {
    return allDays.map((d) => {
      const row = { date: d };
      if (showOverall) row["All Projects"] = overallCum.get(d) || 0;
      for (const lang of languages) {
        if (selected.includes(lang)) {
          row[lang] = byLangCum.get(lang)?.get(d) || 0;
        }
      }
      return row;
    });
  }, [allDays, overallCum, byLangCum, languages, selected, showOverall]);

  const solvedFiltered = useMemo(() => {
    const langs = selected.filter((s) => s !== "Overall");
    const list = passed
      .filter((p) => (langs.length ? langs.includes(p.__lang || "Other") : true))
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((p) => ({
        id: p.id,
        name: p.object?.name || "(unnamed project)",
        lang: p.__lang || "Other",
        at: p.createdAt,
      }));
    return list;
  }, [passed, selected]);

  return (
    <section
      className="card"
      style={{
        padding: 12,
        marginBottom: 16,
        background: COLOR_PALETTE.cardBg,
        border: `1px solid ${COLOR_PALETTE.cardBorder}`,
        color: COLOR_PALETTE.textMain,
        borderRadius: 12,
      }}
    >
      <h3 style={{ margin: 0, color: COLOR_PALETTE.purpleLight }}>
        Projects — Cumulative Completions Over Time
      </h3>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Chip active={showOverall} onClick={() => toggle("Overall")}>
          Overall
        </Chip>
        {languages.map((l) => (
          <Chip key={l} active={selected.includes(l)} onClick={() => toggle(l)}>
            {l}
          </Chip>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginTop: 12,
        }}
      >
        <div style={{ height: 340 }}>
          {chartData.length === 0 ? (
            <div style={{ padding: 12, color: COLOR_PALETTE.textMuted }}>
              No data to plot.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
           <XAxis
  dataKey="date"
  stroke={COLOR_PALETTE.textMain}
  tick={{ fill: COLOR_PALETTE.textMain, fontSize: 12 }}
/>

<YAxis
  allowDecimals={false}
  stroke={COLOR_PALETTE.textMain}
  tick={{ fill: COLOR_PALETTE.textMain, fontSize: 12 }}
/>

              <Tooltip
  contentStyle={{
    backgroundColor: COLOR_PALETTE.cardBg,
    color: COLOR_PALETTE.textMain,
    borderColor: COLOR_PALETTE.cardBorder,
    borderRadius: 8,
  }}
  labelStyle={{ color: COLOR_PALETTE.textMain }}
  itemStyle={{ color: COLOR_PALETTE.textMain }}
/>

                <Legend wrapperStyle={{ color: COLOR_PALETTE.textMuted }} />
                {showOverall && (
                  <Line
                    type="monotone"
                    dataKey="All Projects"
                    stroke={COLOR_PALETTE.purple}
                    strokeWidth={3}
                    dot={false}
                    legendType="plainline"
                  />
                )}
                {languages
                  .filter((l) => selected.includes(l))
                  .map((lang, idx) => (
                    <Line
                      key={lang}
                      type="monotone"
                      dataKey={lang}
                      stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div>
          <h4 style={{ margin: "6px 0", color: COLOR_PALETTE.purpleSoft }}>
            Solved Projects
          </h4>
          {solvedFiltered.length === 0 ? (
            <div style={{ color: COLOR_PALETTE.textMuted }}>
              No solved projects (yet).
            </div>
          ) : (
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                maxHeight: 320,
                overflow: "auto",
                fontSize: 13,
              }}
            >
              {solvedFiltered.map((p) => (
                <li key={p.id} style={{ marginBottom: 4 }}>
                  <code>{p.name}</code> — {p.lang}{" "}
                  <span style={{ opacity: 0.6 }}>
                    ({new Date(p.at).toLocaleString()})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============ Skills Section (XP Line + List) ============ */

function SkillsSection({ xpRows }) {
  const { byLangDay, dayAll } = useMemo(() => {
    const byLang = new Map();
    const overall = new Map();
    for (const t of xpRows) {
      const day = new Date(t.createdAt).toISOString().slice(0, 10);
      const lang = t.langPretty || "Other";
      const amt = Number(t.amount) || 0;
      if (!byLang.has(lang)) byLang.set(lang, new Map());
      const m = byLang.get(lang);
      m.set(day, (m.get(day) || 0) + amt);
      overall.set(day, (overall.get(day) || 0) + amt);
    }
    return { byLangDay: byLang, dayAll: overall };
  }, [xpRows]);

  const languages = useMemo(
    () => Array.from(byLangDay.keys()).sort(),
    [byLangDay]
  );

  const [selected, setSelected] = useState(["Overall"]);
  const showOverall = selected.includes("Overall");

  useEffect(() => {
    if (languages.length && selected.length === 0) {
      setSelected(["Overall"]);
    }
  }, [languages, selected.length]);

  function toggle(val) {
    setSelected((curr) =>
      curr.includes(val) ? curr.filter((x) => x !== val) : [...curr, val]
    );
  }

  const allDays = useMemo(() => {
    const set = new Set();
    for (const m of byLangDay.values()) for (const d of m.keys()) set.add(d);
    for (const d of dayAll.keys()) set.add(d);
    return Array.from(set).sort();
  }, [byLangDay, dayAll]);

  const cumTable = useMemo(() => {
    const cumByLang = new Map();
    for (const [lang, m] of byLangDay.entries()) {
      let cum = 0;
      const cm = new Map();
      for (const d of allDays) {
        cum += m.get(d) || 0;
        cm.set(d, cum);
      }
      cumByLang.set(lang, cm);
    }

    let cumAll = 0;
    const overallMap = new Map();
    for (const d of allDays) {
      cumAll += dayAll.get(d) || 0;
      overallMap.set(d, cumAll);
    }

    const rows = [];
    for (const d of allDays) {
      const row = { date: d };
      if (showOverall) row["All XP"] = overallMap.get(d) || 0;
      for (const l of languages) {
        if (selected.includes(l)) row[l] = cumByLang.get(l)?.get(d) || 0;
      }
      rows.push(row);
    }
    return rows;
  }, [allDays, byLangDay, dayAll, languages, selected, showOverall]);

  const xpList = useMemo(() => {
    const langs = selected.filter((s) => s !== "Overall");
    return xpRows
      .filter((t) =>
        langs.length ? langs.includes(t.langPretty || "Other") : true
      )
      .map((t, i) => ({
        key: `${t.createdAt}-${i}`,
        amount: Number(t.amount) || 0,
        lang: t.langPretty || "Other",
        cat: prettyKind(t?.object?.type),
        name: t?.object?.name || "(unnamed)",
        at: t.createdAt,
      }))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [xpRows, selected]);

  return (
    <section
      className="card"
      style={{
        padding: 12,
        marginBottom: 16,
        background: COLOR_PALETTE.cardBg,
        border: `1px solid ${COLOR_PALETTE.cardBorder}`,
        color: COLOR_PALETTE.textMain,
        borderRadius: 12,
      }}
    >
      <h3 style={{ margin: 0, color: COLOR_PALETTE.purpleLight }}>
        Skills Progression (Cumulative XP Over Time)
      </h3>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Chip active={showOverall} onClick={() => toggle("Overall")}>
          Overall
        </Chip>
        {languages.map((l) => (
          <Chip
            key={l}
            active={selected.includes(l)}
            onClick={() => toggle(l)}
          >
            {l}
          </Chip>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginTop: 12,
        }}
      >
        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumTable}>
<XAxis
  dataKey="date"
  stroke={COLOR_PALETTE.textMain}
  tick={{ fill: COLOR_PALETTE.textMain, fontSize: 12 }}
/>

<YAxis
  allowDecimals={false}
  stroke={COLOR_PALETTE.textMain}
  tick={{ fill: COLOR_PALETTE.textMain, fontSize: 12 }}
/>


            <Tooltip
  contentStyle={{
    backgroundColor: COLOR_PALETTE.cardBg,
    color: COLOR_PALETTE.textMain,
    borderColor: COLOR_PALETTE.cardBorder,
    borderRadius: 8,
  }}
  labelStyle={{ color: COLOR_PALETTE.textMain }}
  itemStyle={{ color: COLOR_PALETTE.textMain }}
/>

              <Legend wrapperStyle={{ color: COLOR_PALETTE.textMuted }} />
              {showOverall && (
                <Line
                  type="monotone"
                  dataKey="All XP"
                  stroke={COLOR_PALETTE.purple}
                  strokeWidth={3}
                  dot={false}
                  legendType="plainline"
                />
              )}
              {languages
                .filter((l) => selected.includes(l))
                .map((lang, idx) => (
                  <Line
                    key={lang}
                    type="monotone"
                    dataKey={lang}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    dot={false}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 style={{ margin: "6px 0", color: COLOR_PALETTE.purpleSoft }}>
            Recent XP Sources
          </h4>
          {xpList.length === 0 ? (
            <div style={{ color: COLOR_PALETTE.textMuted }}>No XP yet.</div>
          ) : (
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                maxHeight: 320,
                overflow: "auto",
                fontSize: 13,
              }}
            >
              {xpList.slice(0, 80).map((x) => (
                <li key={x.key} style={{ marginBottom: 4 }}>
                  <strong style={{ color: COLOR_PALETTE.purple }}>
                    +{x.amount}
                  </strong>{" "}
                  XP • {x.lang} • {x.cat} • <code>{x.name}</code>{" "}
                  <span style={{ opacity: 0.6 }}>
                    ({new Date(x.at).toLocaleString()})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============ Grade By Category (Bar) ============ */

function GradeByCategoryChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <section
        className="card"
        style={{
          padding: 12,
          marginBottom: 16,
          background: COLOR_PALETTE.cardBg,
          border: `1px solid ${COLOR_PALETTE.cardBorder}`,
          color: COLOR_PALETTE.textMain,
          borderRadius: 12,
        }}
      >
        <h3 style={{ margin: 0, color: COLOR_PALETTE.purpleLight }}>
          Grades by Category
        </h3>
        <div style={{ padding: 12, color: COLOR_PALETTE.textMuted }}>
          No grade data available.
        </div>
      </section>
    );
  }

  return (
    <section
      className="card"
      style={{
        padding: 12,
        marginBottom: 16,
        background: COLOR_PALETTE.cardBg,
        border: `1px solid ${COLOR_PALETTE.cardBorder}`,
        color: COLOR_PALETTE.textMain,
        borderRadius: 12,
      }}
    >
      <h3 style={{ margin: 0, color: COLOR_PALETTE.purpleLight }}>
        Grades by Category
      </h3>

      <div style={{ height: 300, marginTop: 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <defs>
              <linearGradient id="gradeCategoryBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_PALETTE.purple} />
                <stop offset="100%" stopColor={COLOR_PALETTE.purpleLight} />
              </linearGradient>
            </defs>
          <XAxis
  dataKey="category"
  stroke={COLOR_PALETTE.textMain}
  tick={{ fill: COLOR_PALETTE.textMain, fontSize: 12 }}
/>

<YAxis
  allowDecimals={false}
  stroke={COLOR_PALETTE.textMain}
  tick={{ fill: COLOR_PALETTE.textMain, fontSize: 12 }}
/>

            <Tooltip
  contentStyle={{
    backgroundColor: COLOR_PALETTE.cardBg,
    color: COLOR_PALETTE.textMain,
    borderColor: COLOR_PALETTE.cardBorder,
    borderRadius: 8,
  }}
  labelStyle={{ color: COLOR_PALETTE.textMain }}
  itemStyle={{ color: COLOR_PALETTE.textMain }}
/>

            <Legend wrapperStyle={{ color: COLOR_PALETTE.textMuted }} />

            <Bar
              dataKey="total"
              fill="url(#gradeCategoryBar)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ============ Top Ten Grades (Bar) ============ */

function TopTenGradesChart({ rows }) {
  const allLanguages = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const lang = prettyLang(r?.object?.attrs?.language);
      if (lang) set.add(lang);
    });
    return ["Overall", ...Array.from(set).sort()];
  }, [rows]);

  const [selectedLang, setSelectedLang] = useState("Overall");

  const topTen = useMemo(() => {
    const list = rows.map((r) => {
      const direct = Number(r.grade) || 0;
      const attempt = Number(
        r?.results_aggregate?.aggregate?.max?.grade
      ) || 0;
      const grade = Math.max(direct, attempt);
      const lang = prettyLang(r?.object?.attrs?.language);
      const category = prettyKind(r?.object?.type);

      return {
        name: r?.object?.name || "(unnamed)",
        lang,
        grade,
        category,
      };
    });

    let filtered = list.filter((i) => i.grade > 0);
    if (selectedLang !== "Overall") {
      filtered = filtered.filter((i) => i.lang === selectedLang);
    }

    return filtered.sort((a, b) => b.grade - a.grade).slice(0, 10);
  }, [rows, selectedLang]);

  const maxGrade = topTen.length > 0 ? topTen[0].grade : 0;

  return (
    <section
      className="card"
      style={{
        padding: 20,
        background: COLOR_PALETTE.cardBg,
        border: `1px solid ${COLOR_PALETTE.cardBorder}`,
        color: COLOR_PALETTE.textMain,
        borderRadius: 12,
      }}
    >
      <h3 style={{ marginBottom: 16, color: COLOR_PALETTE.purpleLight }}>
        Top 10 Grades
      </h3>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {allLanguages.map((lang) => (
          <Chip
            key={lang}
            active={selectedLang === lang}
            onClick={() => setSelectedLang(lang)}
          >
            {lang}
          </Chip>
        ))}
      </div>

      {topTen.length === 0 ? (
        <div style={{ padding: 12, color: COLOR_PALETTE.textMuted }}>
          No graded tasks found.
        </div>
      ) : (
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topTen}>
              <defs>
                <linearGradient id="topTenBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_PALETTE.purple} />
                  <stop offset="100%" stopColor={COLOR_PALETTE.purpleLight} />
                </linearGradient>
              </defs>

              <XAxis dataKey="name" hide />
             <YAxis
  stroke={COLOR_PALETTE.textMain}
  tick={{ fill: COLOR_PALETTE.textMain, fontSize: 12 }}
/>

           <Tooltip
  contentStyle={{
    backgroundColor: COLOR_PALETTE.cardBg,
    color: COLOR_PALETTE.textMain,
    borderColor: COLOR_PALETTE.cardBorder,
    borderRadius: 8,
  }}
  labelStyle={{ color: COLOR_PALETTE.textMain }}
  itemStyle={{ color: COLOR_PALETTE.textMain }}
/>


              <Bar
                dataKey="grade"
                radius={[8, 8, 0, 0]}
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const isMax = payload.grade === maxGrade;

                  return (
                    <g>
                      {isMax && (
                        <rect
                          x={x - 6}
                          y={y - 6}
                          width={width + 12}
                          height={height + 12}
                          rx={10}
                          fill="rgba(168, 85, 247, 0.25)"
                        >
                          <animate
                            attributeName="opacity"
                            values="0.2;0.6;0.2"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </rect>
                      )}

                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill="url(#topTenBar)"
                        rx={6}
                      />

                      <text
                        x={x + width / 2}
                        y={y + height + 16}
                        textAnchor="middle"
                        fill={COLOR_PALETTE.textMuted}
                        fontSize="11px"
                      >
                        {payload.category}
                      </text>

                      <title>
                        {payload.name} — {payload.category} ({payload.lang})
                      </title>
                    </g>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/* ============ Grades By Language (Pie) ============ */

function GradesByLanguageChart({ data }) {
  return (
    <section
      className="card"
      style={{
        padding: 12,
        marginBottom: 16,
        background: COLOR_PALETTE.cardBg,
        border: `1px solid ${COLOR_PALETTE.cardBorder}`,
        color: COLOR_PALETTE.textMain,
        borderRadius: 12,
      }}
    >
      <h3 style={{ marginBottom: 12, color: COLOR_PALETTE.purpleLight }}>
        Grades by Language
      </h3>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
       <Tooltip
  contentStyle={{
    backgroundColor: COLOR_PALETTE.cardBg,
    color: COLOR_PALETTE.textMain,
    borderColor: COLOR_PALETTE.cardBorder,
    borderRadius: 8,
  }}
  labelStyle={{ color: COLOR_PALETTE.textMain }}
  itemStyle={{ color: COLOR_PALETTE.textMain }}
/>

<Legend
  wrapperStyle={{ color: COLOR_PALETTE.textMain }}
  formatter={(value) => (
    <span style={{ color: COLOR_PALETTE.textMain }}>{value}</span>
  )}
/>
            <Pie
              data={data}
              dataKey="total"
              nameKey="language"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
            label={{ fill: COLOR_PALETTE.textMain, fontSize: 12 }}

            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={LINE_COLORS[idx % LINE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function detectLanguage(name) {
  if (!name) return "other";

  const n = name.toLowerCase();

  if (n.includes("go") || n.includes("lem") || n.includes("net-cat") || n.includes("forum"))
    return "go";

  if (n.includes("js") || n.includes("javascript")) return "javascript";

  if (n.includes("sql") || n.includes("tell-me") || n.includes("group-price"))
    return "sql";

  if (n.includes("docker") || n.includes("ascii-art-web")) return "docker";

  if (n.includes("sh") || n.includes("shell") || n.includes("bash")) return "shell";

  return "other";
}

/* ====================== Page ====================== */

export default function Profile() {
  const navigate = useNavigate();
  const [xpUp, setXpUp] = useState(0);
  const [xpDown, setXpDown] = useState(0);
  const [level, setLevel] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  const [userId, setUserId] = useState(null);
  const [login, setLogin] = useState("(loading…)");
  const [rows, setRows] = useState([]); // progress
  const [xpRows, setXpRows] = useState([]); // transactions xp
  const [xpBase, setXpBase] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [auditRatio, setAuditRatio] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

useEffect(() => {
  const token = getToken();
  if (!token) return;   // prevents bad request fallback to graphql/graphql
  async function loadMe() {

      try {
        setErr("");
        const data = await gqlFetch(`
  query Me {
    user {
      id
      login
      firstName
      lastName
      totalUp
      totalDown
    }
  }
`);

        const me = data?.user?.[0];
        if (!me?.id) throw new Error("Could not resolve authenticated user.");
        // NOTE: event_user wasn't fetched here previously; level handled below.

        const xpUpValue = Number(me.totalUp) || 0;
        const xpDownValue = Number(me.totalDown) || 0;
        const ratio =
          xpDownValue > 0 ? (xpUpValue / xpDownValue).toFixed(2) : "0.00";

        setUserId(me.id);
        setLogin(me.login || "(unknown)");
        setFirstName(me.firstName || "");
        setLastName(me.lastName || "");
        setXpBase(xpUpValue);
        setXpUp(xpUpValue);
        setXpDown(xpDownValue);
        setAuditRatio(ratio);
      } catch (e) {
        setErr(e?.message || "Failed to load user.");
      }
    }
    loadMe();
  }, []);

  useEffect(() => {
    if (userId == null) return;

    async function loadAll() {
      const token = getToken();
      if (!token) return;

      setLoading(true);
      setErr("");

      const query = `
query GetUserData($uid: Int!) {
  event_user(
    where: { userId: { _eq: $uid }, level: { _gt: 0 } }
    order_by: { level: desc }
    limit: 1
  ) {
    level
  }

  progress(
    where: { userId: { _eq: $uid } }
    order_by: { createdAt: asc }
    limit: 2000
  ) {
    id
    grade
    isDone
    createdAt
    object { id name type attrs }
    results_aggregate { aggregate { max { grade } } }
  }

  transaction(
    where: { userId: { _eq: $uid }, type: { _eq: "xp" } }
    order_by: { createdAt: asc }
    limit: 5000
  ) {
    amount
    createdAt
    object { id name type attrs }
  }
}
`;

      try {
        const data = await gqlFetch(query, { uid: userId });
        setLevel(data?.event_user?.[0]?.level ?? null);

        const prog = data.progress || [];
        setRows(prog);

        const tx = data.transaction || [];
        setXpRows(
          tx.map((t) => ({
            amount: Number(t.amount),
            createdAt: t.createdAt,
            langPretty: prettyLang(t?.object?.attrs?.language),
            object: t.object,
          }))
        );
      } catch (e) {
        setRows([]);
        setXpRows([]);
        setErr(e?.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [userId]);

  const normalized = useMemo(() => {
    return rows.map((r) => {
      const lang = prettyLang(r?.object?.attrs?.language);
      const kind = prettyKind(r?.object?.type);
      const cat = computeCategoryFromRow(r);
      const stat = statusFromRow(r);
      return {
        ...r,
        __lang: lang,
        __kind: kind,
        __category: cat,
        __status: stat,
      };
    });
  }, [rows]);

  const totalProjectGrade = useMemo(() => {
    const projectGrades = normalized
      .filter((r) => r?.object?.type === "project" && r?.isDone)
      .map((r) => {
        const direct = r.grade;
        const attemptGrade = r.results_aggregate?.aggregate?.max?.grade;
        return direct ?? attemptGrade ?? 0;
      });

    if (projectGrades.length === 0) return 0;

    const sum = projectGrades.reduce((a, b) => a + Number(b), 0);
    return Math.round(sum * 100) / 100;
  }, [normalized]);

  const totalGrade = useMemo(() => {
    return rows.reduce((sum, r) => {
      const direct = Number(r?.grade) || 0;
      const attempt =
        Number(r?.results_aggregate?.aggregate?.max?.grade) || 0;
      const effective = Math.max(direct, attempt);
      return sum + effective;
    }, 0);
  }, [rows]);

  const gradeByCategory = useMemo(() => {
    const map = new Map();

    for (const r of rows) {
      const type = (r?.object?.type || "other").toLowerCase();

      const direct = Number(r?.grade) || 0;
      const attempt =
        Number(r?.results_aggregate?.aggregate?.max?.grade) || 0;
      const effective = Math.max(direct, attempt);

      if (effective <= 0) continue;

      map.set(type, (map.get(type) || 0) + effective);
    }

    return Array.from(map.entries()).map(([category, total]) => ({
      category,
      total: Math.round(total * 100) / 100,
    }));
  }, [rows]);

  const gradesByLanguage = useMemo(() => {
    const totals = {};

    rows.forEach((r) => {
      const lang = prettyLang(r?.object?.attrs?.language);
      const direct = Number(r.grade) || 0;
      const attempt =
        Number(r?.results_aggregate?.aggregate?.max?.grade) || 0;
      const grade = Math.max(direct, attempt);

      if (grade <= 0) return;

      totals[lang] = (totals[lang] || 0) + grade;
    });

    return Object.entries(totals).map(([language, total]) => ({
      language,
      total: Math.round(total * 100) / 100,
    }));
  }, [rows]);

  const questRows = useMemo(
    () => normalized.filter((r) => r.__category === "Quest"),
    [normalized]
  );
  const projectRows = useMemo(
    () => normalized.filter((r) => r.__category === "Project"),
    [normalized]
  );

  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        padding: "40px 20px",
        maxWidth: 1200,
        margin: "0 auto",
        background: `radial-gradient(circle at top, #111827 0, ${COLOR_PALETTE.bg} 55%, #000 100%)`,
        minHeight: "100vh",
        color: COLOR_PALETTE.textMain,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: COLOR_PALETTE.cardBg,
          padding: "16px 24px",
          borderRadius: 16,
          boxShadow: "0 18px 45px rgba(15,23,42,0.9)",
          marginBottom: 24,
          border: `1px solid ${COLOR_PALETTE.cardBorder}`,
        }}
      >
        <h2
          style={{
            color: COLOR_PALETTE.purple,
            margin: 0,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          Dashboard
        </h2>
        <div style={{ color: COLOR_PALETTE.textMuted, fontSize: 14 }}>
          Logged in as <strong style={{ color: COLOR_PALETTE.textMain }}>
            {login}
          </strong>
          {loading && " • Loading…"}
        </div>
        <button
          onClick={logout}
          style={{
            background: COLOR_PALETTE.purpleDark,
            color: COLOR_PALETTE.textMain,
            borderRadius: 999,
            border: "none",
            padding: "8px 14px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Log out
        </button>
      </header>

      <ProfileSummary
        user={{ id: userId, login, firstName, lastName }}
        auditRatio={auditRatio}
        progress={normalized}
        xpBase={xpBase}
        xpDown={xpDown}
        xpUp={xpUp}
        level={level}
        totalProjectGrade={totalProjectGrade}
        totalGrade={totalGrade}
      />

      {err && <div className="error">{err}</div>}

      <SkillsSection xpRows={xpRows} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <ProjectsSection baseRows={projectRows} />
        <QuestsSection baseRows={questRows} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <TopTenGradesChart rows={rows} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <GradeByCategoryChart data={gradeByCategory} />
        <GradesByLanguageChart data={gradesByLanguage} />
      </div>
    </div>
  );
}
