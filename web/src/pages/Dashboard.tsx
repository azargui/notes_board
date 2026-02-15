import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllNotesDashboard, getAllUsers } from "../api";
import type { Note, Colors, Position } from "../types";
import {
  formatDate,
  initialsFromEmail,
  safeJsonParse,
  cleanBody,
  startOfToday,
  startOfWeekMonday,
} from "../utils";

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
import { toast } from "react-toastify";

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

export default function Dashboard() {
  const [rawNotes, setRawNotes] = useState<Note[]>([]);
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
    (async () => {
      try {
        setLoadingNotes(true);
        setErrNotes(null);
        const data = await getAllNotesDashboard();
        setRawNotes(data);
      } catch (error) {
        if (error instanceof Error) {
          toast.error("ERROR: " + error.message);
          setErrNotes(error.message);
        } else {
          const message = "Unknown error occuered";
          toast.error("ERROR: " + message);
          setErrNotes(message);
        }
      } finally {
        setLoadingNotes(false);
      }
    })();
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
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )
      .slice(0, 6);
  }, [filteredNotes]);

  const recentUpdated = useMemo(() => {
    return [...filteredNotes]
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? 0).getTime() -
          new Date(a.updatedAt ?? 0).getTime(),
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
          backgroundColor: [
            "rgba(99, 102, 241, 0.85)",
            "rgba(148, 163, 184, 0.85)",
          ],
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
          backgroundColor: [
            "rgba(16, 185, 129, 0.85)",
            "rgba(59, 130, 246, 0.85)",
            "rgba(245, 158, 11, 0.85)",
          ],
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
    <div className="dashboard">
      {/* HEADER */}
      <div className="topHeader">
        <div className="topHeader-left-side">
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.2 }}>
            Dashboard
          </h1>

          <div className="searchBox">
            <span style={{ fontSize: 16, opacity: 0.7 }}>Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="notes, color id, user email, role…"
              className="searchInput"
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/notes">
            <button className="btnStyle">Notes</button>
          </Link>
          <button
            type="button"
            className="btnStyle"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>

          <div title={currentEmail || "Guest"} className="userBadge">
            {currentInitials}
          </div>
        </div>
      </div>

      {isLoading && <div className="cardStyle">Loading…</div>}

      {!isLoading && (errNotes || errUsers) && (
        <div
          className="cardStyle"
          style={{ border: "1px solid rgba(239,68,68,0.35)" }}
        >
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
          <section className="kpiGrid">
            <Stat
              title="Total notes"
              value={stats.total}
              bg="rgba(99, 102, 241, 0.95)"
            />
            <Stat
              title="Created today"
              value={stats.createdToday}
              bg="rgba(16, 185, 129, 0.95)"
            />
            <Stat
              title="Created this week"
              value={stats.createdThisWeek}
              bg="rgba(245, 158, 11, 0.95)"
            />
            <Stat
              title="Updated today"
              value={stats.updatedToday}
              bg="rgba(59, 130, 246, 0.95)"
            />
            <Stat
              title="With text"
              value={stats.withBody}
              bg="rgba(31, 41, 55, 0.92)"
            />
            <Stat
              title="Empty"
              value={stats.emptyBody}
              bg="rgba(148, 163, 184, 0.95)"
            />
            <Stat
              title="Top color"
              value={stats.topColor ?? "—"}
              bg="rgba(236, 72, 153, 0.95)"
            />
          </section>

          {/* CHARTS */}
          <section className="chartsGrid">
            <div className="cardStyle">
              <div className="cardHeaderRow">
                <h3 className="cardTitle">Notes by color</h3>
                <span className="cardBadge">
                  {Object.keys(stats.colorsCount).length} colors
                </span>
              </div>

              <div style={{ height: 220 }}>
                {Object.keys(stats.colorsCount).length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.75 }}>No data yet.</p>
                ) : (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                )}
              </div>

              <div className="miniLegend">
                {Object.entries(stats.colorsCount)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([k, v]) => (
                    <div key={k} className="miniLegendItem">
                      <span className="dot" />
                      <span style={{ fontFamily: "monospace" }}>{k}</span>
                      <span style={{ opacity: 0.75 }}>({v})</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="cardStyle">
              <div className="cardHeaderRow">
                <h3 className="cardTitle">With text vs Empty</h3>
                <span className="cardBadge">quality</span>
              </div>
              <div style={{ height: 220 }}>
                <Bar data={contentBarData} options={chartOptionsBase} />
              </div>
            </div>

            <div className="cardStyle">
              <div className="cardHeaderRow">
                <h3 className="cardTitle">Activity</h3>
                <span className="cardBadge">today / week</span>
              </div>
              <div style={{ height: 220 }}>
                <Bar data={activityBarData} options={chartOptionsBase} />
              </div>
            </div>

            <div className="cardStyle">
              <div className="cardHeaderRow">
                <h3 className="cardTitle">Created trend</h3>
                <span className="cardBadge">last 7 days</span>
              </div>
              <div style={{ height: 220 }}>
                <Line data={createdLineData} options={chartOptionsBase} />
              </div>
            </div>
          </section>

          {/* NOTES LISTS */}
          <section className="listsGrid">
            <div className="cardStyle">
              <div className="cardHeaderRow">
                <h3 className="cardTitle">Recently created</h3>
                <span className="cardBadge">top 6</span>
              </div>
              {recentCreated.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.75 }}>No notes yet.</p>
              ) : (
                <ul className="cleanUl">
                  {recentCreated.map((n) => (
                    <li key={n._id} className="listItem">
                      <div className="listMeta">{formatDate(n.createdAt)}</div>
                      <div className="listMain">
                        <span className="mono">
                          {n.body.slice(0, 70) || "(empty body)"}
                        </span>
                        <span className="sep">•</span>
                        <span className="dim">{n.colors?.id ?? "unknown"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="cardStyle">
              <div className="cardHeaderRow">
                <h3 className="cardTitle">Recently updated</h3>
                <span className="cardBadge">top 6</span>
              </div>
              {recentUpdated.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.75 }}>No notes yet.</p>
              ) : (
                <ul className="cleanUl">
                  {recentUpdated.map((n) => (
                    <li key={n._id} className="listItem">
                      <div className="listMeta">{formatDate(n.updatedAt)}</div>
                      <div className="listMain">
                        <span className="mono">
                          {n.body.slice(0, 70) || "(empty body)"}
                        </span>
                        <span className="sep">•</span>
                        <span className="dim">{n.colors?.id ?? "unknown"}</span>
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
        <div className="cardStyle">
          <div className="cardHeaderRow">
            <h3 className="cardTitle">Users</h3>
            <span className="cardBadge">
              {loadingUsers ? "loading…" : `${filteredUsers.length} users`}
            </span>
          </div>

          {loadingUsers ? (
            <p style={{ margin: 0, opacity: 0.75 }}>Loading users…</p>
          ) : errUsers ? (
            <p style={{ margin: 0, opacity: 0.85 }}>
              Users not available. Add a backend route like{" "}
              <code>GET /api/users</code>.
            </p>
          ) : filteredUsers.length === 0 ? (
            <p style={{ margin: 0, opacity: 0.75 }}>No users found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tableStyle">
                <thead>
                  <tr>
                    <th className="thStyle">User</th>
                    <th className="thStyle">Email</th>
                    <th className="thStyle">Role</th>
                    <th className="thStyle">Total Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const init = initialsFromEmail(u.email);
                    const total = notesCountByUser[u._id] ?? 0;
                    return (
                      <tr key={u._id}>
                        <td className="tdStyle">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div className="userBadgeSmall">{init}</div>
                            <span
                              style={{ fontFamily: "monospace", opacity: 0.8 }}
                            >
                              {u._id.slice(0, 8)}…
                            </span>
                          </div>
                        </td>
                        <td className="tdStyle">{u.email ?? "—"}</td>
                        <td className="tdStyle">{u.role ?? "—"}</td>
                        <td className="tdStyle">
                          <b>{total}</b>
                        </td>
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
    <div className="kpiCard" style={{ background: bg }}>
      <div style={{ fontSize: 12, opacity: 0.9 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{value}</div>
    </div>
  );
}
