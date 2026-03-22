import { useState, useEffect, useCallback, useRef } from "react";
import { Shield, RefreshCw, Loader2, AlertCircle, ChevronDown, KeyRound, Eye, EyeOff, Users, Ban, CheckCircle, Search, UserPlus, ShieldPlus } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useEnv } from "../context/EnvContext";

const RESOURCES = ["products","orders","users","coupons","shipments","testimonials","waitlist","instagram_orders","abandoned_carts"];
const bitsToString = (b) => [b&4?"r":"-", b&2?"w":"-", b&1?"d":"-"].join("");
const bitsBadge = (bits) => {
  if (bits === 7) return "bg-green-500/10 text-green-400";
  if (bits >= 4)  return "bg-yellow-500/10 text-yellow-400";
  if (bits > 0)   return "bg-orange-500/10 text-orange-400";
  return "bg-urban-border text-urban-text-muted";
};

function PermTooltip({ show, label, children }) {
  if (!show) return children;
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg z-50 pointer-events-none">
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

const TABS = ["Admins", "Users"];

export default function AdminManagement() {
  const { showToast } = useToast();
  const { user, can } = useAuth();
  const { refreshKey } = useEnv();
  const isSuperAdmin = user?.role === "super_admin";
  const canDelete = can("users", "delete");

  const [activeTab, setActiveTab] = useState("Admins");

  // Admins state
  const [admins, setAdmins]             = useState([]);
  const [counts, setCounts]             = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [changingRole, setChangingRole] = useState(null);
  const [changingPerm, setChangingPerm] = useState({});
  const [pwdModal, setPwdModal]         = useState(null);
  const [pwdValue, setPwdValue]         = useState("");
  const [pwdShow, setPwdShow]           = useState(false);
  const [pwdLoading, setPwdLoading]     = useState(false);

  // Users state
  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch]     = useState("");
  const [userPage, setUserPage]         = useState(1);
  const [userPagination, setUserPagination] = useState({});
  const [suspending, setSuspending]     = useState(null);
  const debounceRef = useRef(null);

  // Create modals
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createAdminModal, setCreateAdminModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", mobileNumber: "", role: "admin", firstName: "", lastName: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createPwdShow, setCreatePwdShow] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await apiClient.get("/admin/admins");
      setAdmins(r.data.data.admins);
      setCounts(r.data.data.counts);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch");
    } finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async (page = 1, search = "") => {
    setUsersLoading(true);
    try {
      const r = await apiClient.get("/admin/users", { params: { page, limit: 20, search } });
      setUsers(r.data.data.users);
      setUserPagination(r.data.data.pagination);
    } catch { /* silent */ }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);

  // Fetch users when tab switches to Users or page changes
  useEffect(() => {
    if (activeTab === "Users") fetchUsers(userPage, userSearch);
  }, [activeTab, userPage]); // eslint-disable-line

  // Debounced search — 400ms, no jitter
  const handleUserSearch = (e) => {
    const val = e.target.value;
    setUserSearch(val);
    setUserPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(1, val), 400);
  };

  const handleAdminSuspend = async (adminId, suspend) => {
    setSuspending(adminId);
    try {
      await apiClient.patch(`/admin/admins/${adminId}/${suspend ? "suspend" : "unsuspend"}`);
      showToast(suspend ? "Admin suspended" : "Admin unsuspended", "success");
      setAdmins((prev) => prev.map((a) => a._id === adminId ? { ...a, isSuspended: suspend } : a));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed", "error");
    } finally { setSuspending(null); }
  };

  const handleSuspend = async (userId, suspend) => {
    setSuspending(userId);
    try {
      await apiClient.patch(`/admin/users/${userId}/${suspend ? "suspend" : "unsuspend"}`);
      showToast(suspend ? "User suspended" : "User unsuspended", "success");
      setUsers((prev) => prev.map((u) => u.userId === userId ? { ...u, isSuspended: suspend } : u));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed", "error");
    } finally { setSuspending(null); }
  };

  const handleRoleChange = async (adminId, newRole) => {
    setChangingRole(adminId);
    try {
      await apiClient.patch(`/admin/admins/${adminId}/role`, { role: newRole });
      showToast(`Role updated to ${newRole}`, "success");
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || "Failed", "error"); }
    finally { setChangingRole(null); }
  };

  const handlePermChange = async (adminUid, resource, bits) => {
    const key = `${adminUid}-${resource}`;
    setChangingPerm((p) => ({ ...p, [key]: true }));
    try {
      await apiClient.patch("/admin/permissions", { adminUid, resource, bits: Number(bits) });
      showToast(`${resource}: ${bitsToString(Number(bits))} (${bits})`, "success");
      setAdmins((prev) => prev.map((a) =>
        a.adminUid !== adminUid ? a : { ...a, resources: { ...a.resources, [resource]: Number(bits) } }
      ));
    } catch (err) { showToast(err.response?.data?.message || "Failed", "error"); }
    finally { setChangingPerm((p) => { const n = { ...p }; delete n[key]; return n; }); }
  };

  const openCreateUser = () => {
    setCreateForm({ name: "", email: "", password: "", mobileNumber: "", role: "admin" });
    setCreatePwdShow(false);
    setCreateUserModal(true);
  };

  const openCreateAdmin = () => {
    setCreateForm({ name: "", email: "", password: "", mobileNumber: "", role: "admin", firstName: "", lastName: "" });
    setCreatePwdShow(false);
    setCreateAdminModal(true);
  };

  const handleCreateUser = async () => {
    if (!createForm.name.trim()) { showToast("Name is required", "error"); return; }
    if (!createForm.email.trim()) { showToast("Email is required", "error"); return; }
    if (createForm.password.length < 6) { showToast("Password min 6 chars", "error"); return; }
    setCreateLoading(true);
    try {
      await apiClient.post("/admin/users/create", {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        mobileNumber: createForm.mobileNumber || undefined,
      });
      showToast("User created successfully", "success");
      setCreateUserModal(false);
      fetchUsers(userPage, userSearch);
      fetchAll(); // refresh counts
    } catch (err) { showToast(err.response?.data?.message || "Failed", "error"); }
    finally { setCreateLoading(false); }
  };

  const handleCreateAdmin = async () => {
    const first = createForm.firstName.trim();
    const last  = createForm.lastName.trim();
    if (!first) { showToast("First name is required", "error"); return; }
    if (!last)  { showToast("Last name is required", "error"); return; }
    if (createForm.password.length < 6) { showToast("Password min 6 chars", "error"); return; }
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@urbannook.com`;
    setCreateLoading(true);
    try {
      await apiClient.post("/admin/admins/create", {
        email,
        password: createForm.password,
        role: createForm.role,
      });
      showToast("Admin created successfully", "success");
      setCreateAdminModal(false);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || "Failed", "error"); }
    finally { setCreateLoading(false); }
  };

  const handlePasswordChange = async () => {    if (!pwdValue || pwdValue.length < 6) { showToast("Min 6 characters", "error"); return; }
    setPwdLoading(true);
    try {
      await apiClient.patch(`/admin/admins/${pwdModal}/password`, { password: pwdValue });
      showToast("Password updated", "success");
      setPwdModal(null); setPwdValue(""); setPwdShow(false);
    } catch (err) { showToast(err.response?.data?.message || "Failed", "error"); }
    finally { setPwdLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-urban-text-muted" /></div>;
  if (error) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] text-center">
      <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
      <p className="text-urban-text font-medium mb-4">{error}</p>
      <button onClick={fetchAll} className="inline-flex items-center gap-2 px-4 py-2 bg-urban-neon text-black rounded-lg text-sm font-medium"><RefreshCw className="h-4 w-4" /> Retry</button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-urban-text" />
          <h1 className="text-2xl font-bold text-urban-text">Admin Management</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Create User — admin + super_admin */}
          <button
            onClick={openCreateUser}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-urban-border rounded-lg bg-urban-sidebar text-urban-text-sec hover:bg-urban-neon/5 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" /> Create User
          </button>
          {/* Create Admin — super_admin only */}
          {user?.role === "super_admin" && (
            <button
              onClick={openCreateAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-purple-500/30 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              <ShieldPlus className="h-3.5 w-3.5" /> Create Admin
            </button>
          )}
          <button onClick={fetchAll} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-urban-text-sec border border-urban-border rounded-lg hover:bg-urban-neon/5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Admins",  value: counts.total,       color: "text-urban-text",  bg: "bg-urban-card"    },
          { label: "Super Admins",  value: counts.super_admin, color: "text-purple-400",  bg: "bg-purple-500/10" },
          { label: "Admins",        value: counts.admin,       color: "text-blue-400",    bg: "bg-blue-500/10"   },
          { label: "Total Users",   value: counts.users,       color: "text-green-400",   bg: "bg-green-500/10"  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-urban-border p-4`}>
            <p className="text-xs text-urban-text-muted mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-urban-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-urban-neon text-urban-neon"
                : "border-transparent text-urban-text-muted hover:text-urban-text"
            }`}
          >
            {tab}
            {tab === "Admins" && <span className="ml-1.5 text-xs opacity-60">({counts.total ?? 0})</span>}
            {tab === "Users"  && <span className="ml-1.5 text-xs opacity-60">({counts.users ?? 0})</span>}
          </button>
        ))}
      </div>

      {/* ── Admins Tab ── */}
      {activeTab === "Admins" && (
        <div className="space-y-4">
          {admins.map((a) => {
            const isSelf       = a.email === user?.email;
            const isAdminSuper = a.role === "super_admin";
            return (
              <div key={a._id} className="bg-urban-card rounded-xl border border-urban-border overflow-hidden">
                <div className={`px-4 py-3 flex items-center justify-between border-b border-urban-border ${isAdminSuper ? "bg-purple-500/10" : "bg-blue-500/10"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className={`h-4 w-4 shrink-0 ${isAdminSuper ? "text-purple-400" : "text-blue-400"}`} />
                    <span className="font-semibold text-sm text-urban-text truncate">{a.email}</span>
                    {isSelf && <span className="text-xs text-urban-text-muted shrink-0">(you)</span>}
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${isAdminSuper ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {a.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Password — self always; super_admin can change others too */}
                    {(isSelf || isSuperAdmin) && (
                      <button
                        onClick={() => { setPwdModal(a._id); setPwdValue(""); setPwdShow(false); }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1.5 border border-urban-border rounded-lg bg-urban-sidebar text-urban-text-sec hover:bg-urban-neon/5"
                      >
                        <KeyRound className="h-3 w-3" /> Password
                      </button>
                    )}
                    {!isSelf && (
                      <>
                        {!isAdminSuper && (
                          <PermTooltip show={!canDelete} label="super_admin only">
                            <button
                              onClick={() => canDelete && handleAdminSuspend(a._id, !a.isSuspended)}
                              disabled={suspending === a._id || !canDelete}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                                a.isSuspended
                                  ? "border-green-500/20 text-green-400 bg-green-500/10 hover:bg-green-500/20"
                                  : "border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                              }`}
                            >
                              {suspending === a._id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : a.isSuspended ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                              {a.isSuspended ? "Unsuspend" : "Suspend"}
                            </button>
                          </PermTooltip>
                        )}
                        <PermTooltip show={!canDelete} label="super_admin only">
                          <div className="relative">
                            <select
                              value={a.role}
                              onChange={(e) => canDelete && handleRoleChange(a._id, e.target.value)}
                              disabled={changingRole === a._id || !canDelete}
                              className="text-xs border border-urban-border rounded-lg px-2 py-1.5 pr-7 bg-urban-sidebar text-urban-text focus:outline-none appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <option value="admin">admin</option>
                              <option value="super_admin">super_admin</option>
                            </select>
                            {changingRole === a._id
                              ? <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-2 text-urban-text-muted pointer-events-none" />
                              : <ChevronDown className="h-3 w-3 absolute right-2 top-2 text-urban-text-muted pointer-events-none" />}
                          </div>
                        </PermTooltip>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                  {RESOURCES.map((resource) => {
                    const bits = a.resources?.[resource] ?? 0;
                    const key  = `${a.adminUid}-${resource}`;
                    const busy = !!changingPerm[key];
                    return (
                      <div key={resource} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-urban-border bg-urban-sidebar">
                        <span className="text-[10px] text-urban-text-muted truncate w-full text-center leading-tight">{resource.replace("_", " ")}</span>
                        <span className={`font-mono text-sm font-bold px-1.5 py-0.5 rounded ${bitsBadge(bits)}`}>{bits}</span>
                        <span className="font-mono text-[10px] text-urban-text-muted">{bitsToString(bits)}</span>
                        {!isAdminSuper && (
                          <PermTooltip show={!canDelete} label="super_admin only">
                            <div className="relative mt-0.5">
                              <select
                                value={bits}
                                onChange={(e) => canDelete && handlePermChange(a.adminUid, resource, e.target.value)}
                                disabled={busy || !canDelete}
                                className="text-[10px] border border-urban-border rounded px-1 py-0.5 pr-4 bg-urban-card text-urban-text-sec appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
                              >
                                <option value={0}>0 ---</option>
                                <option value={4}>4 r--</option>
                                <option value={6}>6 rw-</option>
                                <option value={7}>7 rwx</option>
                              </select>
                              {busy
                                ? <Loader2 className="h-2.5 w-2.5 animate-spin absolute right-0.5 top-1 text-urban-text-muted pointer-events-none" />
                                : <ChevronDown className="h-2.5 w-2.5 absolute right-0.5 top-1 text-urban-text-muted pointer-events-none" />}
                            </div>
                          </PermTooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === "Users" && (
        <div className="bg-urban-card rounded-xl border border-urban-border overflow-hidden">
          <div className="px-4 py-3 border-b border-urban-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-urban-text-sec" />
              <p className="text-sm font-semibold text-urban-text">Users</p>
              <span className="text-xs text-urban-text-muted">({userPagination.total ?? 0})</span>
            </div>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-urban-text-muted" />
              <input
                value={userSearch}
                onChange={handleUserSearch}
                placeholder="Search name / email"
                className="text-xs pl-7 pr-3 py-1.5 border border-urban-border rounded-lg bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-1 focus:ring-urban-neon w-48"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-urban-text-muted" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-urban-border bg-urban-sidebar">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-urban-text-muted uppercase">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-urban-text-muted uppercase">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-urban-text-muted uppercase">Mobile</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-urban-text-muted uppercase">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-urban-text-muted uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-urban-border">
                {users.map((u) => (
                  <tr key={u.userId} className="hover:bg-urban-neon/5">
                    <td className="px-4 py-2.5 text-xs font-medium text-urban-text">{u.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-urban-text-sec">{u.email ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-urban-text-sec">{u.mobileNumber ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isSuspended ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                        {u.isSuspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <PermTooltip show={!canDelete} label="super_admin only">
                        <button
                          onClick={() => canDelete && handleSuspend(u.userId, !u.isSuspended)}
                          disabled={suspending === u.userId || !canDelete}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.isSuspended
                              ? "border-green-500/20 text-green-400 bg-green-500/10 hover:bg-green-500/20"
                              : "border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                          }`}
                        >
                          {suspending === u.userId
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : u.isSuspended ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          {u.isSuspended ? "Unsuspend" : "Suspend"}
                        </button>
                      </PermTooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {userPagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-urban-border flex items-center justify-between">
              <p className="text-xs text-urban-text-muted">Page {userPagination.page} of {userPagination.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1} className="px-3 py-1 text-xs border border-urban-border rounded-lg text-urban-text-sec hover:bg-urban-neon/5 disabled:opacity-40">Prev</button>
                <button onClick={() => setUserPage((p) => Math.min(userPagination.totalPages, p + 1))} disabled={userPage === userPagination.totalPages} className="px-3 py-1 text-xs border border-urban-border rounded-lg text-urban-text-sec hover:bg-urban-neon/5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Password modal */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-urban-card rounded-xl shadow-xl border border-urban-border w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-urban-text" />
              <h2 className="text-base font-semibold text-urban-text">Change Password</h2>
            </div>
            <p className="text-xs text-urban-text-muted">{admins.find((a) => a._id === pwdModal)?.email}</p>
            <div className="relative">
              <input
                type={pwdShow ? "text" : "password"}
                value={pwdValue}
                onChange={(e) => setPwdValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordChange()}
                placeholder="New password (min 6 chars)"
                className="w-full border border-urban-border rounded-lg px-3 py-2 pr-10 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
              />
              <button type="button" onClick={() => setPwdShow((v) => !v)} className="absolute right-2.5 top-2.5 text-urban-text-muted hover:text-urban-text">
                {pwdShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setPwdModal(null); setPwdValue(""); }} className="px-4 py-2 text-sm text-urban-text-sec border border-urban-border rounded-lg hover:bg-urban-neon/5">Cancel</button>
              <button onClick={handlePasswordChange} disabled={pwdLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-urban-neon text-black font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                {pwdLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User modal */}
      {createUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-urban-card rounded-xl shadow-xl border border-urban-border w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-urban-text" />
              <h2 className="text-base font-semibold text-urban-text">Create User</h2>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-urban-border rounded-lg px-3 py-2 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
              />
              <input
                type="email"
                placeholder="Email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-urban-border rounded-lg px-3 py-2 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
              />
              <input
                type="text"
                placeholder="Mobile number (optional)"
                value={createForm.mobileNumber}
                onChange={(e) => setCreateForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                className="w-full border border-urban-border rounded-lg px-3 py-2 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
              />
              <div className="relative">
                <input
                  type={createPwdShow ? "text" : "password"}
                  placeholder="Password (min 6 chars)"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
                  className="w-full border border-urban-border rounded-lg px-3 py-2 pr-10 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
                />
                <button type="button" onClick={() => setCreatePwdShow((v) => !v)} className="absolute right-2.5 top-2.5 text-urban-text-muted hover:text-urban-text">
                  {createPwdShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreateUserModal(false)} className="px-4 py-2 text-sm text-urban-text-sec border border-urban-border rounded-lg hover:bg-urban-neon/5">Cancel</button>
              <button onClick={handleCreateUser} disabled={createLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-urban-neon text-black font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin modal — super_admin only */}
      {createAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-urban-card rounded-xl shadow-xl border border-urban-border w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldPlus className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-semibold text-urban-text">Create Admin</h2>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="First name"
                autoComplete="off"
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full border border-urban-border rounded-lg px-3 py-2 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
              />
              <input
                type="text"
                placeholder="Last name"
                autoComplete="off"
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full border border-urban-border rounded-lg px-3 py-2 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
              />
              <p className="text-xs text-urban-text-muted px-0.5">
                Username would be{" "}
                <span className="font-mono text-urban-neon">
                  {createForm.firstName.trim() || createForm.lastName.trim()
                    ? `${createForm.firstName.trim().toLowerCase() || "firstname"}.${createForm.lastName.trim().toLowerCase() || "lastname"}@urbannook.com`
                    : "firstname.lastname@urbannook.com"}
                </span>
              </p>
              <div className="relative">
                <input
                  type={createPwdShow ? "text" : "password"}
                  placeholder="Password (min 6 chars)"
                  autoComplete="new-password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateAdmin()}
                  className="w-full border border-urban-border rounded-lg px-3 py-2 pr-10 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
                />
                <button type="button" onClick={() => setCreatePwdShow((v) => !v)} className="absolute right-2.5 top-2.5 text-urban-text-muted hover:text-urban-text">
                  {createPwdShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-urban-text-muted">Role:</span>
                {["admin", "super_admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCreateForm((f) => ({ ...f, role: r }))}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      createForm.role === r
                        ? r === "super_admin"
                          ? "border-purple-500/50 bg-purple-500/20 text-purple-400"
                          : "border-blue-500/50 bg-blue-500/20 text-blue-400"
                        : "border-urban-border text-urban-text-muted hover:border-urban-neon/30"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreateAdminModal(false)} className="px-4 py-2 text-sm text-urban-text-sec border border-urban-border rounded-lg hover:bg-urban-neon/5">Cancel</button>
              <button onClick={handleCreateAdmin} disabled={createLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-500 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
