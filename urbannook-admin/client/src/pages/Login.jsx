import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 transition-colors duration-300"
      style={{
        background:
          "radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--color-urban-neon) 5%, transparent) 0%, transparent 40%), radial-gradient(circle at 85% 80%, color-mix(in srgb, var(--color-urban-text-muted) 5%, transparent) 0%, transparent 40%), var(--color-urban-base)",
      }}
    >
      {/* Login Card */}
      <div
        className="w-full max-w-[400px] rounded-2xl p-8 md:p-10 relative overflow-hidden"
        style={{
          background: "var(--color-urban-surface)",
          border: "1px solid var(--color-urban-border)",
          boxShadow:
            "0 4px 20px -2px rgba(45,45,42,0.06), 0 12px 40px -4px rgba(63,94,90,0.10)",
        }}
      >
        {/* Decorative blob */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"
          style={{
            background:
              "color-mix(in srgb, var(--color-urban-neon) 8%, transparent)",
          }}
        />

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm"
            style={{
              background:
                "color-mix(in srgb, var(--color-urban-neon) 18%, transparent)",
            }}
          >
            <span className="font-black tracking-tighter text-xl leading-none text-urban-neon">
              UN
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-urban-text mb-1">
            UrbanNook Admin
          </h1>
          <p className="text-sm font-medium text-urban-text-sec">
            Sign in to your dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-[10px] font-bold uppercase tracking-[0.05em] text-urban-text-muted"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              placeholder="admin@urbannook.com"
              className="w-full px-4 py-3.5 rounded-lg text-sm text-urban-text placeholder:text-urban-text-muted/40 focus:outline-none focus:ring-2 focus:ring-urban-neon/40 disabled:opacity-50 transition-all duration-200"
              style={{
                background: "var(--color-urban-raised)",
                border: "1px solid var(--color-urban-border)",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-[10px] font-bold uppercase tracking-[0.05em] text-urban-text-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3.5 rounded-lg text-sm text-urban-text placeholder:text-urban-text-muted/40 focus:outline-none focus:ring-2 focus:ring-urban-neon/40 disabled:opacity-50 transition-all duration-200"
              style={{
                background: "var(--color-urban-raised)",
                border: "1px solid var(--color-urban-border)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 rounded-xl text-sm font-bold text-white transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] mt-2"
            style={{ background: "var(--gradient-urban-accent)" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
