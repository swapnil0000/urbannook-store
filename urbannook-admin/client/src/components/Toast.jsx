import { useEffect } from "react";
import { X } from "lucide-react";

const typeStyles = {
  success: "bg-green-50 border-green-500 text-green-800",
  error: "bg-red-50 border-red-500 text-red-800",
  info: "bg-blue-50 border-blue-500 text-blue-800",
};

const AUTO_DISMISS_MS = 4000;

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const style = typeStyles[toast.type] || typeStyles.info;

  return (
    <div
      className={`flex items-start gap-2 border-l-4 px-4 py-3 rounded shadow-md ${style}`}
      role="alert"
    >
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function Toast({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}
