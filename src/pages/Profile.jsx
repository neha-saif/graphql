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
} from "recharts";

// ui helpers 
const LINE_COLORS = [
  "#7aa2ff",
  "#4caf50",
  "#f44336",
  "#ff9800",
  "#9c27b0",
  "#00bcd4",
  "#8bc34a",
  "#795548",
];


function Chip({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: "6px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.15)",
        background: active ? "rgba(122,162,255,0.18)" : "transparent",
        color: "inherit",
        cursor: "pointer",
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


// Quests pie chart 
function QuestsSection({ baseRows }) {
  // only passed quests count toward the distribution
  const passed = useMemo(
    () => baseRows.filter((r) => r.__status === "Passed"),
    [baseRows]
  );

  const pieData = useMemo(() => {
    const map = new Map(); // language count
    for (const r of passed) {
      const lang = r.__lang || "Other";
      map.set(lang, (map.get(lang) || 0) + 1);
    }
    const entries = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    return entries;
  }, [passed]);

  const solvedList = useMemo(
    () =>
      passed
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((p) => ({
          id: p.id,
          name: p.object?.name || "(unnamed quest)",
          lang: p.__lang || "Other",
          at: p.createdAt,
        })),
    [passed]
  );

  return (
    <section className="card" style={{ padding: 12, marginBottom: 16 }}>
      <h3 style={{ margin: 0 }}>Overall Quests Passed </h3>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 12 }}>
        <div style={{ height: 340 }}>
          {pieData.length === 0 ? (
            <div style={{ padding: 12 }}>No passed quests (yet).</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
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

        <div>
          <h4 style={{ margin: "6px 0" }}>Solved Quests</h4>
          {solvedList.length === 0 ? (
            <div>No solved quests (yet).</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 320, overflow: "auto" }}>
              {solvedList.map((q) => (
                <li key={q.id} style={{ marginBottom: 4 }}>
                  <code>{q.name}</code> — {q.lang}{" "}
                  <span style={{ opacity: 0.6 }}>
                    ({new Date(q.at).toLocaleString()})
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

// projects section line chart 
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
    const byLangDay = new Map(); // lang -> day -> count
    const dayAll = new Map(); // day -> count

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

    // cumulative per language
    const byLangCumMap = new Map(); // lang -> day -> cum
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

    // overall cumulative
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
    <section className="card" style={{ padding: 12, marginBottom: 16 }}>
      <h3 style={{ margin: 0 }}>Projects — Cumulative Completions Over Time</h3>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
        <Chip active={showOverall} onClick={() => toggle("Overall")}>Overall</Chip>
        {languages.map((l) => (
          <Chip key={l} active={selected.includes(l)} onClick={() => toggle(l)}>
            {l}
          </Chip>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 12 }}>
        <div style={{ height: 340 }}>
          {chartData.length === 0 ? (
            <div style={{ padding: 12 }}>No data to plot.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {showOverall && (
                  <Line
                    type="monotone"
                    dataKey="All Projects"
                    stroke="#6d28d9"
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
          <h4 style={{ margin: "6px 0" }}>Solved Projects</h4>
          {solvedFiltered.length === 0 ? (
            <div>No solved projects (yet).</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 320, overflow: "auto" }}>
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

// skills xp line chart
function SkillsSection({ xpRows }) {
  // per-day XP totals (by language + overall), then cumulative
  const { byLangDay, dayAll } = useMemo(() => {
    const byLang = new Map(); // lang -> day -> sum XP
    const overall = new Map(); // day -> sum XP
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

  const languages = useMemo(() => Array.from(byLangDay.keys()).sort(), [byLangDay]);

  // unified chip selector with "Overall"
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
    // precompute cumulative per language
    const cumByLang = new Map(); // lang -> day -> cum
    for (const [lang, m] of byLangDay.entries()) {
      let cum = 0;
      const cm = new Map();
      for (const d of allDays) {
        cum += m.get(d) || 0;
        cm.set(d, cum);
      }
      cumByLang.set(lang, cm);
    }

    // overall cumulative
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

  // XP sources list mirrors selection (if you select languages, list only those; Overall only = everything)
  const xpList = useMemo(() => {
    const langs = selected.filter((s) => s !== "Overall");
    return xpRows
      .filter((t) => (langs.length ? langs.includes(t.langPretty || "Other") : true))
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
    <section className="card" style={{ padding: 12, marginBottom: 16 }}>
      <h3 style={{ margin: 0 }}>Skills Progression (Cumulative XP Over Time)</h3>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
        <Chip active={showOverall} onClick={() => toggle("Overall")}>Overall</Chip>
        {languages.map((l) => (
          <Chip key={l} active={selected.includes(l)} onClick={() => toggle(l)}>
            {l}
          </Chip>
        ))}
      </div>

      <div style={{ height: 340, marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={cumTable}>
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {showOverall && (
              <Line
                type="monotone"
                dataKey="All XP"
                stroke="#6d28d9"
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

      <div style={{ marginTop: 12 }}>
        <h4 style={{ margin: "6px 0" }}>Recent XP Sources</h4>
        {xpList.length === 0 ? (
          <div>No XP yet.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 280, overflow: "auto" }}>
            {xpList.slice(0, 80).map((x) => (
              <li key={x.key} style={{ marginBottom: 4 }}>
                <strong>+{x.amount}</strong> XP • {x.lang} • {x.cat} •{" "}
                <code>{x.name}</code>{" "}
                <span style={{ opacity: 0.6 }}>({new Date(x.at).toLocaleString()})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ====================== Page ====================== */

export default function Profile() {
  const navigate = useNavigate();
const [xpUp, setXpUp] = useState(0);
const [xpDown, setXpDown] = useState(0);
  useEffect(() => {
    const token = getToken();
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  const [userId, setUserId] = useState(null);
  const [login, setLogin] = useState("(loading…)");
  const [rows, setRows] = useState([]);     // progress
const [xpRows, setXpRows] = useState([]); // transactions xp
const [xpBase, setXpBase] = useState(0);  // from user.totalUp (for accurate level)
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
const [auditRatio, setAuditRatio] = useState(null);
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");

useEffect(() => {
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

      const xpUpValue = Number(me.totalUp) || 0;
      const xpDownValue = Number(me.totalDown) || 0;
      const ratio = xpDownValue > 0 ? (xpUpValue / xpDownValue).toFixed(2) : "0.00";

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
      setLoading(true);
      setErr("");

const xpTotalsQuery = `
  query XPTotals {
    user {
      id
      login
      totalUp
      totalDown
    }
  }
`;

     const query = `
  query AllData($uid:Int!) {
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




        const prog = Array.isArray(data?.progress) ? data.progress : [];
        setRows(prog);

        const tx = Array.isArray(data?.transaction) ? data.transaction : [];
        const xpNorm = tx.map((t) => ({
          amount: Number(t.amount) || 0,
          createdAt: t.createdAt,
          langPretty: prettyLang(t?.object?.attrs?.language),
          object: t.object || null,
        }));
        setXpRows(xpNorm);
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
      return { ...r, __lang: lang, __kind: kind, __category: cat, __status: stat };
    });
  }, [rows]);

  const questRows = useMemo(() => normalized.filter((r) => r.__category === "Quest"), [normalized]);
  const projectRows = useMemo(() => normalized.filter((r) => r.__category === "Project"), [normalized]);

  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
 <div style={{ padding: "40px 20px", maxWidth: 1200, margin: "0 auto" }}>
  <header
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "white",
      padding: "16px 24px",
      borderRadius: 12,
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      marginBottom: 24,
    }}
  >
    <h2 style={{ color: "#6d28d9", margin: 0 }}>Dashboard</h2>
    <div style={{ color: "#6b7280" }}>
      Logged in as <strong>{login}</strong>
      {loading && " • Loading…"}
    </div>
    <button onClick={logout}>Log out</button>
  </header>

  {err && <div className="error">{err}</div>}

  {userId && (
 <ProfileSummary
   user={{ id: userId, login, firstName, lastName }}
  userid={{ id: userId, login }}
  xpBase={xpBase}
  xpFallback={xpRows.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)}
  auditRatio={auditRatio}
  xpUp={xpUp}
  xpDown={xpDown}
/>  )}

  <QuestsSection baseRows={questRows} />
  <ProjectsSection baseRows={projectRows} />
  <SkillsSection xpRows={xpRows} />
</div>

  );
}

