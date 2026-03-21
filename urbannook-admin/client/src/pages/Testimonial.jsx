import { useState } from "react";
import { MessageSquare, Check, X, RefreshCw, Loader2, AlertCircle, Star } from "lucide-react";
import { useTestimonials } from "../hooks/useTestimonials";
import { useToast } from "../context/ToastContext";

const STATUS_TABS = ["all", "pending", "approved"];

// isApproved: true = approved, false = pending
const getStatus = (t) => (t.isApproved ? "approved" : "pending");

const statusColors = {
  pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
};

export default function Testimonial() {
  const { testimonials, loading, error, approve, decline, refetch } = useTestimonials();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null);

  const filtered = activeTab === "all"
    ? testimonials
    : testimonials.filter((t) => getStatus(t) === activeTab);

  const handleApprove = async (id) => {
    setActionLoading(id + "_approve");
    try {
      await approve(id);
      showToast("Testimonial approved", "success");
    } catch {
      showToast("Failed to approve", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id) => {
    setActionLoading(id + "_decline");
    try {
      await decline(id);
      showToast("Testimonial declined", "success");
    } catch {
      showToast("Failed to decline", "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-gray-700 font-medium mb-4">{error}</p>
        <button onClick={refetch} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const count = tab === "all"
            ? testimonials.length
            : testimonials.filter((t) => getStatus(t) === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab} <span className="ml-1 text-xs text-gray-400">({count})</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No {activeTab === "all" ? "" : activeTab} testimonials</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const status = getStatus(t);
            return (
              <div
                key={t._id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4"
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                  {t.userName?.[0]?.toUpperCase() ?? "?"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-gray-900">{t.userName}</p>
                    {t.colorTheme && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 font-mono">
                        {t.colorTheme}
                      </span>
                    )}
                    {t.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    )}
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border capitalize ${statusColors[status]}`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{t.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {status === "pending" && (
                    <button
                      onClick={() => handleApprove(t._id)}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
                    >
                      {actionLoading === t._id + "_approve"
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Check className="h-3 w-3" />}
                      Approve
                    </button>
                  )}
                  {(status === "pending" || status === "approved") && (
                    <button
                      onClick={() => handleDecline(t._id)}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      {actionLoading === t._id + "_decline"
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <X className="h-3 w-3" />}
                      Decline
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
