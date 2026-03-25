import { Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

// ── FilterChip ─────────────────────────────────────────────────────────────────

export function FilterChip({ label, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap"
      style={
        active
          ? { background: "var(--color-urban-neon)", color: "#0f0f0f" }
          : { background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)", border: "1px solid var(--color-urban-border)" }
      }
    >
      {Icon && <Icon className="h-2.5 w-2.5 shrink-0" />}
      {label}
    </button>
  );
}

// ── Table atom helpers ─────────────────────────────────────────────────────────

export function Th({ children, right }) {
  return (
    <th
      className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${right ? "text-right" : "text-left"}`}
      style={{ color: "var(--color-urban-text-muted)" }}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

export function TableEmpty({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-7 gap-2 text-center px-4">
      <Inbox className="h-6 w-6" style={{ color: "var(--color-urban-border)" }} />
      <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>{message}</p>
    </div>
  );
}

// ── TableCard ──────────────────────────────────────────────────────────────────
//
// Props:
//   title       {string}
//   icon        {LucideIcon}
//   accent      {string}  hex colour for the icon badge
//   t           {object}  return value of useTableState
//   filterBar   {ReactNode}  filter chips to render in second header row
//   children    {ReactNode}  the <table> body

export default function TableCard({ title, icon: Icon, accent, t, filterBar, children }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl h-full"
      style={{ border: "1px solid var(--color-urban-border)", background: "var(--color-urban-surface)" }}
    >
      {/* ── Title + search row ── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{
          borderBottom: filterBar ? "none" : "1px solid var(--color-urban-border)",
          background: "var(--color-urban-raised)",
        }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
          style={{ background: `${accent}25`, border: `1px solid ${accent}45` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        </div>

        <span className="text-xs font-bold truncate" style={{ color: "var(--color-urban-text)" }}>
          {title}
        </span>

        {/* Total count badge (raw — before filters) */}
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums"
          style={{ background: "var(--color-urban-surface)", color: "var(--color-urban-text-muted)", border: "1px solid var(--color-urban-border)" }}
        >
          {t.total}
        </span>

        {/* Search */}
        <div
          className="ml-auto flex items-center gap-1.5 px-2 py-1.5 rounded-lg shrink-0"
          style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)", width: 140 }}
        >
          <Search className="h-2.5 w-2.5 shrink-0" style={{ color: "var(--color-urban-text-muted)" }} />
          <input
            type="text"
            placeholder="Name or ID…"
            value={t.search}
            onChange={(e) => t.setSearch(e.target.value)}
            className="text-xs bg-transparent outline-none min-w-0 flex-1"
            style={{ color: "var(--color-urban-text)" }}
          />
        </div>
      </div>

      {/* ── Filter chip row (optional) ── */}
      {filterBar && (
        <div
          className="flex flex-wrap items-center gap-1.5 px-3 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)" }}
        >
          {filterBar}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 overflow-x-auto">{children}</div>

      {/* ── Pagination (only when more than one page) ── */}
      {t.totalPages > 1 && (
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{ borderTop: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)" }}
        >
          <span className="text-[10px]" style={{ color: "var(--color-urban-text-muted)" }}>
            {t.page}/{t.totalPages} · {t.totalFiltered}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => t.setPage((p) => Math.max(1, p - 1))}
              disabled={t.page === 1}
              className="p-1 rounded disabled:opacity-30"
              style={{ color: "var(--color-urban-text-muted)" }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => t.setPage((p) => Math.min(t.totalPages, p + 1))}
              disabled={t.page === t.totalPages}
              className="p-1 rounded disabled:opacity-30"
              style={{ color: "var(--color-urban-text-muted)" }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
