import { useEffect, useState, useCallback } from "react";
import { Users, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useEnv } from "../context/EnvContext";

export default function Waitlist() {
  const { showToast } = useToast();
  const { refreshKey } = useEnv();
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/joined/waitlist");
      const data = res.data.data;
      setUsers(data.users || []);
      setTotalCount(data.totalJoinedUserWaitList || 0);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to fetch waitlist users";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-urban-neon)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <div>
          <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>Something went wrong</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-urban-text-sec)" }}>{error}</p>
        </div>
        <button
          onClick={fetchWaitlist}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--gradient-urban-accent)" }}
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--color-urban-neon) 12%, transparent)" }}
          >
            <Users className="h-5 w-5" style={{ color: "var(--color-urban-neon)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
              Waitlist Users
            </h1>
            <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
              {totalCount} total members
            </p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {users.length === 0 ? (
        <div
          className="rounded-xl p-16 flex flex-col items-center text-center"
          style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)" }}
        >
          <Users className="h-12 w-12 mb-4" style={{ color: "var(--color-urban-border)" }} />
          <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>No waitlist users yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-urban-text-sec)" }}>
            Users who join the waitlist will appear here.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-urban-surface)",
            border: "1px solid var(--color-urban-border)",
            boxShadow: "var(--shadow-urban-card)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--color-urban-raised) 80%, transparent)" }}>
                  {["Name", "Email", "Joined Date"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id || user.userEmail}
                    style={{ borderTop: "1px solid var(--color-urban-border)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in srgb, var(--color-urban-neon) 4%, transparent)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    className="transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: "color-mix(in srgb, var(--color-urban-neon) 15%, transparent)",
                            color: "var(--color-urban-neon)",
                          }}
                        >
                          {(user.userName || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold" style={{ color: "var(--color-urban-text)" }}>
                          {user.userName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: "var(--color-urban-text-sec)" }}>
                      {user.userEmail}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "var(--color-urban-text-muted)" }}>
                      {new Date(user.joinedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
