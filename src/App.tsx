import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from "react";
import type { Database } from "sql.js";
import { openDatabase, getAllSessions, updateSession, exportDbFile, type SessionRow } from "./db";
import { CATALOG } from "./catalog";
import { VIDEO_SOURCES } from "./videoSources";
const Player = lazy(() => import("./Player"));
import "./App.css";

const SITE = "https://summittelaviv.awslivestream.com/";
// When building for the Claude Artifact preview (VITE_ARTIFACT_BUILD=true), in-page HLS
// playback can't reach the external streaming host from that sandbox, so "Watch" links out
// to the real site instead of opening the built-in player. The real deployment is unaffected.
const ARTIFACT_BUILD = import.meta.env.VITE_ARTIFACT_BUILD === "true";

function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
function parseTime(str: string): number | null {
  str = str.trim();
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  const m = str.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function bookmarkletSource(baseUrl: string) {
  return `javascript:(function(){var m=location.pathname.match(/^\\/([a-zA-Z0-9-]+)/);if(!m){alert('Could not detect a session id in this URL.');return;}var id=m[1];var v=document.querySelector('video');var t=v?Math.floor(v.currentTime):0;var d=v?Math.floor(v.duration)||0:0;var u='${baseUrl}?vid='+encodeURIComponent(id)+'&t='+t+'&d='+d;window.open(u,'_blank');})();`;
}

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<{ id: string; title: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback((database: Database) => {
    setRows(getAllSessions(database));
  }, []);

  const applyPatch = useCallback(
    (id: string, patch: Partial<Pick<SessionRow, "status" | "position_sec" | "duration_sec" | "notes">>, manualStatus = false) => {
      if (!db) return;
      const current = getAllSessions(db).find((r) => r.id === id);
      const merged = { ...current, ...patch } as SessionRow;
      if (!manualStatus) {
        if (merged.duration_sec > 0 && merged.position_sec >= merged.duration_sec * 0.95) {
          patch.status = "watched";
        } else if (merged.position_sec > 0 && current?.status === "not_started") {
          patch.status = "in_progress";
        }
      }
      updateSession(db, id, patch);
      refresh(db);
    },
    [db, refresh]
  );

  // init db + consume bookmarklet capture params
  useEffect(() => {
    let cancelled = false;
    openDatabase().then((database) => {
      if (cancelled) return;
      setDb(database);
      refresh(database);

      const initialRows = getAllSessions(database);
      const hasInProgress = initialRows.some((r) => r.status === "in_progress");
      setStatusFilter(hasInProgress ? "in_progress" : "not_started");

      const params = new URLSearchParams(window.location.search);
      const vid = params.get("vid");
      if (vid) {
        const known = getAllSessions(database).some((r) => r.id === vid);
        if (!known) {
          showToast(`Unrecognized session id: ${vid}`);
        } else {
          const t = parseInt(params.get("t") || "0", 10) || 0;
          const d = parseInt(params.get("d") || "0", 10) || 0;
          const patch: Partial<SessionRow> = { position_sec: t };
          if (d > 0) patch.duration_sec = d;
          updateSession(database, vid, patch);
          refresh(database);
          showToast(`Captured ${vid} at ${fmtTime(t)}`);
        }
        const clean = window.location.href.split("?")[0];
        window.history.replaceState({}, "", clean);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = useMemo(() => {
    const map: Record<string, SessionRow> = {};
    rows.forEach((r) => (map[r.id] = r));
    return map;
  }, [rows]);

  const counts = useMemo(() => {
    const c = { watched: 0, in_progress: 0, not_started: 0 };
    rows.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  const total = rows.length || 48;
  const pct = total ? Math.round((counts.watched / total) * 100) : 0;
  const pctWithProgress = total ? Math.round(((counts.watched + counts.in_progress) / total) * 100) : 0;
  const circumference = 169.6;

  const baseUrl = window.location.origin + window.location.pathname;
  const bookmarklet = bookmarkletSource(baseUrl);

  const q = search.trim().toLowerCase();

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>AWS Summit Tel Aviv — Watchlist</h1>
          <div className="sub">React + SQLite (sql.js) · persisted locally in this browser</div>
        </div>
      </header>

      <div className="wrap">
        <div className="rail">
          <div className="card stat-card">
            <div className="ring-row">
              <svg className="ring" width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="27" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
                <circle
                  cx="32" cy="32" r="27" fill="none" stroke="var(--progress)" strokeWidth="8"
                  strokeLinecap="round" transform="rotate(-90 32 32)"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * pctWithProgress) / 100}
                />
                <circle
                  cx="32" cy="32" r="27" fill="none" stroke="var(--watched)" strokeWidth="8"
                  strokeLinecap="round" transform="rotate(-90 32 32)"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * pct) / 100}
                />
              </svg>
              <div>
                <div className="ring-num">{pct}%</div>
                <div className="ring-label">of {total} sessions watched</div>
              </div>
            </div>
            <div className="breakdown">
              <div
                className={`breakdown-row ${statusFilter === "watched" ? "active" : ""}`}
                onClick={() => setStatusFilter((f) => (f === "watched" ? "all" : "watched"))}
              ><span className="dot" style={{ background: "var(--watched)" }} />Watched<span className="n">{counts.watched}</span></div>
              <div
                className={`breakdown-row ${statusFilter === "in_progress" ? "active" : ""}`}
                onClick={() => setStatusFilter((f) => (f === "in_progress" ? "all" : "in_progress"))}
              ><span className="dot" style={{ background: "var(--progress)" }} />In progress<span className="n">{counts.in_progress}</span></div>
              <div
                className={`breakdown-row ${statusFilter === "not_started" ? "active" : ""}`}
                onClick={() => setStatusFilter((f) => (f === "not_started" ? "all" : "not_started"))}
              ><span className="dot" style={{ background: "var(--notstarted)" }} />Not started<span className="n">{counts.not_started}</span></div>
            </div>
          </div>

          <div className="card filters">
            <h3>Tracks</h3>
            <div
              className={`chip ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All sessions <span className="n">{counts.watched}/{total}</span>
            </div>
            {CATALOG.map((t) => {
              const ids = t.items.map((i) => i[0]);
              const w = ids.filter((id) => byId[id]?.status === "watched").length;
              return (
                <div
                  key={t.track}
                  className={`chip ${activeFilter === t.track ? "active" : ""}`}
                  onClick={() => setActiveFilter(t.track)}
                >
                  {t.track} <span className="n">{w}/{ids.length}</span>
                </div>
              );
            })}
          </div>

          <div className="card capture">
            <h3>Capture progress</h3>
            <p>
              Drag this to your bookmarks bar. While a session is playing on the real site, click it —
              it reads the player's current position and opens this tracker already updated.
            </p>
            <a className="bookmarklet" href={bookmarklet}>
              📍 Track this session
            </a>
            <details>
              <summary>Or update a session by hand</summary>
              <QuickAdd byId={byId} onSave={(id, sec) => { applyPatch(id, { position_sec: sec }); showToast(`Saved ${id}`); }} onError={showToast} />
            </details>
            <details>
              <summary>Export / backup</summary>
              <button
                className="btn"
                onClick={() => {
                  if (!db) return;
                  const blob = exportDbFile(db);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "summit-watchlist.sqlite";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download .sqlite file
              </button>
            </details>
          </div>
        </div>

        <main>
          <div className="searchbar">
            <input type="text" placeholder="Search sessions…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="statuspills">
              {(["all", "not_started", "in_progress", "watched"] as const).map((key) => {
                const label = key === "all" ? "All" : key === "not_started" ? "Not started" : key === "in_progress" ? "In progress" : "Watched";
                const n = key === "all" ? total : counts[key];
                const color = key === "all" ? "var(--accent)" : key === "not_started" ? "var(--notstarted)" : key === "in_progress" ? "var(--progress)" : "var(--watched)";
                return (
                  <div
                    key={key}
                    className={`statuspill ${statusFilter === key ? "active" : ""}`}
                    onClick={() => setStatusFilter(key)}
                  >
                    <span className="dot" style={{ background: color }} />
                    {label}
                    <span className="n">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {CATALOG.filter((t) => activeFilter === "all" || activeFilter === t.track).map((track) => {
            const items = track.items.filter(([id, title]) => {
              if (statusFilter !== "all" && byId[id]?.status !== statusFilter) return false;
              if (!q) return true;
              return title.toLowerCase().includes(q) || id.toLowerCase().includes(q);
            });
            if (items.length === 0) return null;
            const watchedInTrack = track.items.filter(([id]) => byId[id]?.status === "watched").length;
            const inProgressInTrack = track.items.filter(([id]) => byId[id]?.status === "in_progress").length;
            const trackPct = Math.round((watchedInTrack / track.items.length) * 100);
            const trackProgressPct = Math.round(((watchedInTrack + inProgressInTrack) / track.items.length) * 100);
            const isCollapsed = !!collapsed[track.track];
            return (
              <section key={track.track} className={`track ${isCollapsed ? "collapsed" : ""}`}>
                <div
                  className="track-head"
                  onClick={() => setCollapsed((c) => ({ ...c, [track.track]: !c[track.track] }))}
                >
                  <span className="chev">▾</span>
                  <h2>{track.track}</h2>
                  <span className="tn">{watchedInTrack}/{track.items.length}</span>
                  <span className="bar">
                    <i className="bar-progress" style={{ width: `${trackProgressPct}%` }} />
                    <i className="bar-watched" style={{ width: `${trackPct}%` }} />
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="rows">
                    {items.map(([id, title]) => {
                      const row = byId[id];
                      if (!row) return null;
                      return (
                        <Row
                          key={id}
                          row={row}
                          title={title}
                          onStatus={(status) => applyPatch(id, { status }, true)}
                          onPosition={(sec) => applyPatch(id, { position_sec: sec })}
                          onNotes={(notes) => {
                            if (noteTimers.current[id]) clearTimeout(noteTimers.current[id]);
                            noteTimers.current[id] = setTimeout(() => applyPatch(id, { notes }), 500);
                          }}
                          onBadInput={() => showToast("Use m:ss, e.g. 12:30")}
                          onWatch={() => setPlaying({ id, title })}
                          watchHref={ARTIFACT_BUILD ? SITE + id : undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>

      <footer>
        Stored entirely in this browser's IndexedDB as a real SQLite database (via sql.js) — nothing leaves your machine.
        Use the "Download .sqlite file" button to back it up or move it to another browser.
      </footer>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>

      {playing && VIDEO_SOURCES[playing.id] && (
        <Suspense fallback={null}>
          <Player
            title={playing.title}
            src={VIDEO_SOURCES[playing.id]}
            initialPosition={byId[playing.id]?.position_sec ?? 0}
            onProgress={(sec, dur) => applyPatch(playing.id, { position_sec: sec, duration_sec: dur })}
            onClose={() => setPlaying(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

function QuickAdd({ byId, onSave, onError }: { byId: Record<string, SessionRow>; onSave: (id: string, sec: number) => void; onError: (m: string) => void }) {
  const [id, setId] = useState("");
  const [pos, setPos] = useState("");
  return (
    <div className="quickadd">
      <input className="mono" placeholder="tlv-dvt201" value={id} onChange={(e) => setId(e.target.value)} style={{ maxWidth: 110 }} />
      <input className="mono" placeholder="12:30" value={pos} onChange={(e) => setPos(e.target.value)} style={{ maxWidth: 70 }} />
      <button
        className="btn primary"
        onClick={() => {
          if (!byId[id.trim()]) return onError(`Unknown session id: ${id}`);
          const sec = parseTime(pos);
          if (sec === null) return onError("Use m:ss for position");
          onSave(id.trim(), sec);
          setId("");
          setPos("");
        }}
      >
        Save
      </button>
    </div>
  );
}

function Row({
  row, title, onStatus, onPosition, onNotes, onBadInput, onWatch, watchHref,
}: {
  row: SessionRow; title: string;
  onStatus: (s: SessionRow["status"]) => void;
  onPosition: (sec: number) => void;
  onNotes: (notes: string) => void;
  onBadInput: () => void;
  onWatch: () => void;
  /** When set, "Watch" opens this URL in a new tab instead of the built-in player
   *  (used for the Claude Artifact preview, where in-page HLS playback can't reach
   *  the external streaming host). */
  watchHref?: string;
}) {
  const [posText, setPosText] = useState(fmtTime(row.position_sec));
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState(row.notes);

  useEffect(() => setPosText(fmtTime(row.position_sec)), [row.position_sec]);
  useEffect(() => setNotesText(row.notes), [row.notes]);

  return (
    <div className={`card row status-${row.status}`}>
      <span className="idbadge">●</span>
      <div>
        <div className="title">{title}</div>
        <div className="id mono">{row.id}{row.duration_sec ? ` · ${fmtTime(row.duration_sec)} total` : ""}</div>
      </div>
      <div className="rowmeta">
        <select
          className={`statusselect status-${row.status}`}
          value={row.status}
          onChange={(e) => onStatus(e.target.value as SessionRow["status"])}
        >
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="watched">Watched</option>
        </select>
      </div>
      <div className="rowmeta">
        <input
          className="posinput mono"
          value={posText}
          onChange={(e) => setPosText(e.target.value)}
          onBlur={() => {
            const sec = parseTime(posText);
            if (sec === null) { onBadInput(); setPosText(fmtTime(row.position_sec)); return; }
            onPosition(sec);
          }}
        />
      </div>
      <div className="rowmeta">
        <button className={`notesbtn ${row.notes ? "has" : ""}`} onClick={() => setShowNotes((s) => !s)} title="Notes">✎</button>
        {VIDEO_SOURCES[row.id] ? (
          watchHref ? (
            <a className="watchbtn" target="_blank" rel="noopener noreferrer" href={watchHref} title="Playback isn't available in this preview — opens the original site">
              {row.status === "in_progress" ? "▶ Resume ↗" : "▶ Watch ↗"}
            </a>
          ) : (
            <button className="watchbtn" onClick={onWatch}>
              {row.status === "in_progress" ? "▶ Resume" : "▶ Watch"}
            </button>
          )
        ) : (
          <a className="openlink" target="_blank" rel="noopener noreferrer" href={SITE + row.id}>Open ↗</a>
        )}
      </div>
      {showNotes && (
        <div className="notesbox">
          <textarea
            placeholder="Notes on this session…"
            value={notesText}
            onChange={(e) => { setNotesText(e.target.value); onNotes(e.target.value); }}
          />
        </div>
      )}
    </div>
  );
}
