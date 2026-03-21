import { useEffect, useState, useCallback } from "react";
import { Users, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useEnv } from "../context/EnvContext";

const TABS = ["all", "pending", "sent"];
const LIMIT = 20;

export default function Waitlist() {
  const { showToast } = useToast();
  const { refreshKey } = useEnv();
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ all: 0, sent: 0, pending: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/joined/waitlist", {
        params: { tab: activeTab, page, limit: LIMIT },
      });
      const data = res.data.data;
      setUsers(data.users || []);
      setPagination(data.pagination);
      setCounts(data.counts);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to fetch waitlist users";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, showToast]);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist, refreshKey]);

  // Reset to page 1 on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-gray-700 font-medium mb-1">Something went wrong</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={fetchWaitlist} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>
          <span className="text-sm text-gray-400">({counts.all} total)</span>
        </div>
        <button onClick={fetchWaitlist} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab} <span className="ml-1 text-xs text-gray-400">({counts[tab] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No {activeTab === "all" ? "" : activeTab} users</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Joined</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Email Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.userName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.userEmail}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.waitListEmailSent ? "bg-green-100 text-green-700" : "bg-yellow-50 text-yellow-700"
                      }`}>
                        {user.waitListEmailSent ? "Sent" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * LIMIT + 1}–{Math.min(pagination.page * LIMIT, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={pagination.page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
