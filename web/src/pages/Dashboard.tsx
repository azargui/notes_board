import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllNotesDashboard, getAllUsers } from "../api";
import type { Note, Colors, Position } from "../types";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

type DashboardNote = Note & {
  createdAt?: string;
  updatedAt?: string;
  user_id?: string; // may exist in backend response
};

type ParsedNote = {
  _id: string;
  body: string;
  colors: Colors | null;
  position: Position | null;
  createdAt?: string;
  updatedAt?: string;
  user_id?: string;
};

type User = {
  _id: string;
  email?: string;
  role?: string;
};

type Stats = {
  total: number;
  withBody: number;
  emptyBody: number;
  createdToday: number;
  createdThisWeek: number;
  updatedToday: number;
  colorsCount: Record<string, number>;
  topColor: string | null;
};

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function cleanBody(raw: string) {
  const t = (raw ?? "").trim();
  // your DB example: "\"first\"" => JSON.parse => "first"
  try {
    const parsed = JSON.parse(t);
    if (typeof parsed === "string") return parsed.trim();
    return String(parsed ?? "").trim();
  } catch {
    return t;
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeekMonday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

function formatDate(dt?: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

function initialsFromEmail(email?: string) {
  const s = (email ?? "").trim();
  if (!s) return "GU";
  const left = s.split("@")[0] ?? s;
  const parts = left.split(/[._\- ]+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? left[0] ?? "G").toUpperCase();
  const b = (parts[1]?.[0] ?? left[1] ?? "U").toUpperCase();
  return `${a}${b}`;
}

export default function Dashboard() {
  const [rawNotes, setRawNotes] = useState<DashboardNote[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errNotes, setErrNotes] = useState<string | null>(null);
  const [errUsers, setErrUsers] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // current user (simple)
  const currentEmail =
    localStorage.getItem("email") ||
    localStorage.getItem("userEmail") ||
    localStorage.getItem("userName") ||
    "";
  const currentInitials = initialsFromEmail(currentEmail);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingNotes(true);
        setErrNotes(null);

        const data = (await getAllNotesDashboard()) as unknown as DashboardNote[];
        if (!mounted) return;
        setRawNotes(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (mounted) setErrNotes(e?.message ?? "Failed to load notes");
      } finally {
        if (mounted) setLoadingNotes(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingUsers(true);
        setErrUsers(null);

        const data = (await getAllUsers()) as User[];
        if (!mounted) return;
        setUsers(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (mounted) setErrUsers(e?.message ?? "Failed to load users");
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const notes: ParsedNote[] = useMemo(() => {
    return rawNotes.map((n) => ({
      _id: n._id,
      body: cleanBody(n.body),
      colors: safeJsonParse<Colors | null>(n.colors, null),
      position: safeJsonParse<Position | null>(n.position, null),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      user_id: n.user_id,
    }));
  }, [rawNotes]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const body = (n.body ?? "").toLowerCase();
      const colorId = (n.colors?.id ?? "").toLowerCase();
      return body.includes(q) || colorId.includes(q);
    });
  }, [notes, search]);

  const stats: Stats = useMemo(() => {
    const today = startOfToday();
    const weekStart = startOfWeekMonday();

    let withBody = 0;
    let emptyBody = 0;
    let createdToday = 0;
    let createdThisWeek = 0;
    let updatedToday = 0;

    const colorsCount: Record<string, number> = {};

    for (const n of filteredNotes) {
      if (n.body.length > 0) withBody++;
      else emptyBody++;

      const key = n.colors?.id ?? "unknown";
      colorsCount[key] = (colorsCount[key] ?? 0) + 1;

      const cAt = n.createdAt ? new Date(n.createdAt).getTime() : NaN;
      const uAt = n.updatedAt ? new Date(n.updatedAt).getTime() : NaN;

      if (!Number.isNaN(cAt)) {
        if (cAt >= today) createdToday++;
        if (cAt >= weekStart) createdThisWeek++;
      }
      if (!Number.isNaN(uAt)) {
        if (uAt >= today) updatedToday++;
      }
    }

    let topColor: string | null = null;
    let top = -1;
    for (const [k, v] of Object.entries(colorsCount)) {
      if (v > top) {
        top = v;
        topColor = k;
      }
    }

    return {
      total: filteredNotes.length,
      withBody,
      emptyBody,
      createdToday,
      createdThisWeek,
      updatedToday,
      colorsCount,
      topColor,
    };
  }, [filteredNotes]);

  const recentCreated = useMemo(() => {
    return [...filteredNotes]
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      )
      .slice(0, 6);
  }, [filteredNotes]);

  const recentUpdated = useMemo(() => {
    return [...filteredNotes]
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime(),
      )
      .slice(0, 6);
  }, [filteredNotes]);

  // ----------- CHARTS (clean style) -----------

  const chartOptionsBase = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#98A2B3", font: { size: 11 } },
        },
        y: {
          grid: { color: "rgba(152, 162, 179, 0.18)" },
          ticks: { color: "#98A2B3", font: { size: 11 } },
        },
      },
    }),
    [],
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      cutout: "70%",
    }),
    [],
  );

  const doughnutData = useMemo(() => {
    const labels = Object.keys(stats.colorsCount);
    const data = Object.values(stats.colorsCount);

    // Minimal + nicer palette (not too flashy)
    const bg = [
      "rgba(99, 102, 241, 0.85)",
      "rgba(16, 185, 129, 0.85)",
      "rgba(245, 158, 11, 0.85)",
      "rgba(236, 72, 153, 0.85)",
      "rgba(59, 130, 246, 0.85)",
      "rgba(148, 163, 184, 0.85)",
    ];

    return {
      labels,
      datasets: [
        {
          label: "Notes by color",
          data,
          backgroundColor: labels.map((_, i) => bg[i % bg.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [stats.colorsCount]);

  const contentBarData = useMemo(() => {
    return {
      labels: ["With text", "Empty"],
      datasets: [
        {
          label: "Notes content",
          data: [stats.withBody, stats.emptyBody],
          borderRadius: 10,
          backgroundColor: ["rgba(99, 102, 241, 0.85)", "rgba(148, 163, 184, 0.85)"],
          borderWidth: 0,
        },
      ],
    };
  }, [stats.withBody, stats.emptyBody]);

  const activityBarData = useMemo(() => {
    return {
      labels: ["Created today", "Updated today", "Created this week"],
      datasets: [
        {
          label: "Activity",
          data: [stats.createdToday, stats.updatedToday, stats.createdThisWeek],
          borderRadius: 10,
          backgroundColor: ["rgba(16, 185, 129, 0.85)", "rgba(59, 130, 246, 0.85)", "rgba(245, 158, 11, 0.85)"],
          borderWidth: 0,
        },
      ],
    };
  }, [stats.createdToday, stats.updatedToday, stats.createdThisWeek]);

  const createdLineData = useMemo(() => {
    const days = 7;
    const labels: string[] = [];
    const counts = new Array(days).fill(0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels.push(d.toLocaleDateString());
    }

    for (const n of notes) {
      if (!n.createdAt) continue;
      const d = new Date(n.createdAt);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays < days) {
        counts[days - 1 - diffDays] += 1;
      }
    }

    return {
      labels,
      datasets: [
        {
          label: "Created (7 days)",
          data: counts,
          tension: 0.35,
          fill: true,
          borderWidth: 2,
          borderColor: "rgba(99, 102, 241, 0.95)",
          backgroundColor: "rgba(99, 102, 241, 0.12)",
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "rgba(99, 102, 241, 0.95)",
        },
      ],
    };
  }, [notes]);

  // ----------- USERS (bottom) -----------

  const notesCountByUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notes) {
      const uid = n.user_id;
      if (!uid) continue;
      map[uid] = (map[uid] ?? 0) + 1;
    }
    return map;
  }, [notes]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = (u.email ?? "").toLowerCase();
      const role = (u.role ?? "").toLowerCase();
      return email.includes(q) || role.includes(q);
    });
  }, [users, search]);

  const isLoading = loadingNotes || loadingUsers;

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }} className="dashboard">
      {/* HEADER */}
      <div style={topHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.2 }}>Dashboard</h1>

          <div style={searchBox}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="notes, color id, user email, role…"
              style={searchInput}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/notes" style={btnStyle}>
            Notes
          </Link>
          <button type="button" style={btnStyle} onClick={() => window.location.reload()}>
            Refresh
          </button>

          <div title={currentEmail || "Guest"} style={userBadge}>
            {currentInitials}
          </div>
        </div>
      </div>

      {isLoading && <div style={cardStyle}>Loading…</div>}

      {!isLoading && (errNotes || errUsers) && (
        <div style={{ ...cardStyle, border: "1px solid rgba(239,68,68,0.35)" }}>
          <h3 style={{ marginTop: 0 }}>Some data couldn’t load</h3>
          {errNotes && <p style={{ margin: "6px 0" }}>Notes: {errNotes}</p>}
          {errUsers && <p style={{ margin: "6px 0" }}>Users: {errUsers}</p>}
          <p style={{ marginTop: 10, opacity: 0.75 }}>
            Users section requires a backend route like <code>/api/users</code>.
          </p>
        </div>
      )}

      {!isLoading && !errNotes && (
        <>
          {/* KPI CARDS */}
          <section style={kpiGrid}>
            <Stat title="Total notes" value={stats.total} bg="rgba(99, 102, 241, 0.95)" />
            <Stat title="Created today" value={stats.createdToday} bg="rgba(16, 185, 129, 0.95)" />
            <Stat title="Created this week" value={stats.createdThisWeek} bg="rgba(245, 158, 11, 0.95)" />
            <Stat title="Updated today" value={stats.updatedToday} bg="rgba(59, 130, 246, 0.95)" />
            <Stat title="With text" value={stats.withBody} bg="rgba(31, 41, 55, 0.92)" />
            <Stat title="Empty" value={stats.emptyBody} bg="rgba(148, 163, 184, 0.95)" />
            <Stat title="Top color" value={stats.topColor ?? "—"} bg="rgba(236, 72, 153, 0.95)" />
          </section>

          {/* CHARTS */}
          <section style={chartsGrid}>
            <div style={cardStyle}>
              <div style={cardHeaderRow}>
                <h3 style={cardTitle}>Notes by color</h3>
                <span style={cardBadge}>{Object.keys(stats.colorsCount).length} colors</span>
              </div>

              <div style={{ height: 220 }}>
                {Object.keys(stats.colorsCount).length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.75 }}>No data yet.</p>
                ) : (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                )}
              </div>

              <div style={miniLegend}>
                {Object.entries(stats.colorsCount)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([k, v]) => (
                    <div key={k} style={miniLegendItem}>
                      <span style={dot} />
                      <span style={{ fontFamily: "monospace" }}>{k}</span>
                      <span style={{ opacity: 0.75 }}>({v})</span>
                    </div>
                  ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardHeaderRow}>
                <h3 style={cardTitle}>With text vs Empty</h3>
                <span style={cardBadge}>quality</span>
              </div>
              <div style={{ height: 220 }}>
                <Bar data={contentBarData} options={chartOptionsBase} />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardHeaderRow}>
                <h3 style={cardTitle}>Activity</h3>
                <span style={cardBadge}>today / week</span>
              </div>
              <div style={{ height: 220 }}>
                <Bar data={activityBarData} options={chartOptionsBase} />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardHeaderRow}>
                <h3 style={cardTitle}>Created trend</h3>
                <span style={cardBadge}>last 7 days</span>
              </div>
              <div style={{ height: 220 }}>
                <Line data={createdLineData} options={chartOptionsBase} />
              </div>
            </div>
          </section>

          {/* NOTES LISTS */}
          <section style={listsGrid}>
            <div style={cardStyle}>
              <div style={cardHeaderRow}>
                <h3 style={cardTitle}>Recently created</h3>
                <span style={cardBadge}>top 6</span>
              </div>
              {recentCreated.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.75 }}>No notes yet.</p>
              ) : (
                <ul style={cleanUl}>
                  {recentCreated.map((n) => (
                    <li key={n._id} style={listItem}>
                      <div style={listMeta}>{formatDate(n.createdAt)}</div>
                      <div style={listMain}>
                        <span style={mono}>{n.body.slice(0, 70) || "(empty body)"}</span>
                        <span style={sep}>•</span>
                        <span style={dim}>{n.colors?.id ?? "unknown"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={cardStyle}>
              <div style={cardHeaderRow}>
                <h3 style={cardTitle}>Recently updated</h3>
                <span style={cardBadge}>top 6</span>
              </div>
              {recentUpdated.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.75 }}>No notes yet.</p>
              ) : (
                <ul style={cleanUl}>
                  {recentUpdated.map((n) => (
                    <li key={n._id} style={listItem}>
                      <div style={listMeta}>{formatDate(n.updatedAt)}</div>
                      <div style={listMain}>
                        <span style={mono}>{n.body.slice(0, 70) || "(empty body)"}</span>
                        <span style={sep}>•</span>
                        <span style={dim}>{n.colors?.id ?? "unknown"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {/* USERS TABLE */}
      <section style={{ marginTop: 14 }}>
        <div style={cardStyle}>
          <div style={cardHeaderRow}>
            <h3 style={cardTitle}>Users</h3>
            <span style={cardBadge}>
              {loadingUsers ? "loading…" : `${filteredUsers.length} users`}
            </span>
          </div>

          {loadingUsers ? (
            <p style={{ margin: 0, opacity: 0.75 }}>Loading users…</p>
          ) : errUsers ? (
            <p style={{ margin: 0, opacity: 0.85 }}>
              Users not available. Add a backend route like <code>GET /api/users</code>.
            </p>
          ) : filteredUsers.length === 0 ? (
            <p style={{ margin: 0, opacity: 0.75 }}>No users found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Total Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const init = initialsFromEmail(u.email);
                    const total = notesCountByUser[u._id] ?? 0;
                    return (
                      <tr key={u._id}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={userBadgeSmall}>{init}</div>
                            <span style={{ fontFamily: "monospace", opacity: 0.8 }}>
                              {u._id.slice(0, 8)}…
                            </span>
                          </div>
                        </td>
                        <td style={tdStyle}>{u.email ?? "—"}</td>
                        <td style={tdStyle}>{u.role ?? "—"}</td>
                        <td style={tdStyle}><b>{total}</b></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  title,
  value,
  bg,
}: {
  title: string;
  value: string | number;
  bg: string;
}) {
  return (
    <div style={{ ...kpiCard, background: bg }}>
      <div style={{ fontSize: 12, opacity: 0.9 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{value}</div>
    </div>
  );
}

// ---------- STYLES ----------
const topHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: "14px 14px",
  borderRadius: 16,
  background: "rgba(15, 23, 42, 0.92)",
  color: "white",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
};

const searchBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.14)",
};

const searchInput: React.CSSProperties = {
  width: 320,
  maxWidth: "70vw",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "white",
  fontSize: 13,
};

const userBadge: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  fontWeight: 900,
  letterSpacing: 0.5,
};

const userBadgeSmall: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  background: "rgba(15, 23, 42, 0.06)",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  fontWeight: 900,
  letterSpacing: 0.5,
};

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 12,
  textDecoration: "none",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.16)",
  fontWeight: 700,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(15, 23, 42, 0.08)",
  borderRadius: 16,
  padding: 14,
  background: "white",
  boxShadow: "0 10px 30px rgba(2, 6, 23, 0.06)",
};

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  marginTop: 14,
};

const kpiCard: React.CSSProperties = {
  borderRadius: 16,
  padding: 14,
  color: "white",
  boxShadow: "0 10px 30px rgba(2, 6, 23, 0.10)",
};

const chartsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const listsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const cardHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const cardTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  letterSpacing: 0.2,
};

const cardBadge: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(15, 23, 42, 0.06)",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  opacity: 0.9,
};

const miniLegend: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 10,
  opacity: 0.9,
};

const miniLegendItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
};

const dot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "rgba(99, 102, 241, 0.85)",
  display: "inline-block",
};

const cleanUl: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const listItem: React.CSSProperties = {
  padding: "10px 10px",
  borderRadius: 12,
  border: "1px solid rgba(15, 23, 42, 0.06)",
  background: "rgba(15, 23, 42, 0.02)",
  marginBottom: 10,
};

const listMeta: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  marginBottom: 6,
};

const listMain: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const mono: React.CSSProperties = {
  fontFamily: "monospace",
  opacity: 0.95,
};

const dim: React.CSSProperties = {
  opacity: 0.75,
};

const sep: React.CSSProperties = {
  opacity: 0.35,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 740,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  opacity: 0.75,
  padding: "10px 12px",
  borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 12px",
  borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
  fontSize: 13,
};
