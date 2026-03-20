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
      const message =
        err.response?.data?.message || "Failed to fetch waitlist users";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist, refreshKey]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-gray-700 font-medium mb-1">
          Something went wrong
        </p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchWaitlist}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">
          Waitlist Users ({totalCount} total)
        </h1>
      </div>

      {/* Empty state */}
      {users.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No waitlist users yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Users who join the waitlist will appear here.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Joined Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr
                    key={user._id || user.userEmail}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {user.userName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.userEmail}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.joinedAt).toLocaleDateString()}
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
