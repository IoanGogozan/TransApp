import { useEffect, useMemo, useState } from "react";
import { createCompanyUser, listCompanyUsers, resetUserPassword, updateUserActive } from "../api/users";
import { User } from "../types/user";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";

const AdminUsersPage = () => {
  const { user: me } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create user form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "DRIVER" | "">("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Toggle active
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Reset password
  const [resetOpenUserId, setResetOpenUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetSavingUserId, setResetSavingUserId] = useState<string | null>(null);
  const [resetRowErrors, setResetRowErrors] = useState<Record<string, string>>({});
  const [resetRowSuccess, setResetRowSuccess] = useState<Record<string, string>>({});

  // Filters
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const myEmailLower = (me?.email || "").trim().toLowerCase();

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCompanyUsers();
      setUsers(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load users";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setFormError(null);
    setSuccess(null);

    if (!email.trim()) {
      setFormError("Email is required");
      return;
    }
    if (!password || password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    if (!role) {
      setFormError("Role is required");
      return;
    }

    setSaving(true);
    try {
      await createCompanyUser({ email: email.trim(), password, role });
      setEmail("");
      setPassword("");
      setRole("");
      setSuccess("User created");
      await loadUsers();

      // optional: auto clear success so it doesn't stick forever
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create user";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: number | string, currentActive: boolean | undefined) => {
    if (currentActive === undefined) return;

    const idKey = String(userId);
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[idKey];
      return next;
    });

    setTogglingUserId(idKey);
    try {
      await updateUserActive(userId, !currentActive);
      await loadUsers();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update user";
      setRowErrors((prev) => ({ ...prev, [idKey]: msg }));
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleResetPassword = async (userId: number | string) => {
    const idKey = String(userId);

    setResetRowErrors((prev) => {
      const next = { ...prev };
      delete next[idKey];
      return next;
    });
    setResetRowSuccess((prev) => {
      const next = { ...prev };
      delete next[idKey];
      return next;
    });

    if (!resetPasswordValue || resetPasswordValue.length < 8) {
      setResetRowErrors((prev) => ({ ...prev, [idKey]: "Password must be at least 8 characters" }));
      return;
    }
    if (resetPasswordValue !== resetPasswordConfirm) {
      setResetRowErrors((prev) => ({ ...prev, [idKey]: "Passwords do not match" }));
      return;
    }

    setResetSavingUserId(idKey);
    try {
      const res = await resetUserPassword(userId, resetPasswordValue);
      if (!res) {
        setResetRowErrors((prev) => ({ ...prev, [idKey]: "Unexpected response" }));
      } else {
        setResetPasswordValue("");
        setResetPasswordConfirm("");
        setResetOpenUserId(null);
        setResetRowSuccess((prev) => ({ ...prev, [idKey]: "Password updated" }));
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to reset password";
      setResetRowErrors((prev) => ({ ...prev, [idKey]: msg }));
    } finally {
      setResetSavingUserId(null);
    }
  };

  const q = search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const emailValue = (u.email || "").toLowerCase();
      const matchesSearch = q === "" || emailValue.includes(q);
      const includeInactive = showInactive || u.active !== false;
      return matchesSearch && includeInactive;
    });
  }, [users, q, showInactive]);

  const disabledStyle = (disabled: boolean) =>
    disabled
      ? {
          opacity: 0.55,
          cursor: "not-allowed" as const,
          pointerEvents: "none" as const,
        }
      : undefined;

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error}</div>
          <button className="button" style={{ width: "auto" }} onClick={loadUsers} disabled={loading || saving}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Users</h1>

        {myEmailLower ? (
          <div className="muted" style={{ marginBottom: "10px" }}>
            You can’t modify your own account.
          </div>
        ) : null}

        {/* Create user form */}
        <div className="field" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            disabled={saving || loading}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            disabled={saving || loading}
          />

          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "DRIVER" | "")}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            disabled={saving || loading}
          >
            <option value="">Select role</option>
            <option value="DRIVER">DRIVER</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <button className="button" style={{ width: "auto" }} onClick={handleCreate} disabled={saving || loading}>
            {saving ? "Creating..." : "Create user"}
          </button>

          {formError ? <div className="error">{formError}</div> : null}
          {success ? <div className="muted">{success}</div> : null}
        </div>

        {/* Filters */}
        <div className="field" style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="search">Search by email</label>
          <input
            id="search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
          />

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>

          <span className="muted">
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>

        {/* List */}
        {users.length === 0 ? (
          <p className="muted">No users.</p>
        ) : filteredUsers.length === 0 ? (
          <p className="muted">No users match filters.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredUsers.map((u) => {
              const idKey = String(u.id);
              const isSelf = myEmailLower !== "" && (u.email || "").trim().toLowerCase() === myEmailLower;

              const toggleDisabled = isSelf || togglingUserId === idKey || saving || loading;
              const resetDisabled = isSelf || resetSavingUserId === idKey || saving || loading;

              return (
                <div
                  key={u.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 700 }}>{u.email}</span>
                    <span className="muted">Role: {u.role || "-"}</span>
                    {isSelf ? <span className="muted">This is you</span> : null}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    {u.active !== undefined ? (
                      <>
                        <span className="muted" style={{ fontWeight: 600 }}>
                          {u.active ? "Active" : "Inactive"}
                        </span>

                        <button
                          className="button"
                          style={{ width: "auto", ...(disabledStyle(toggleDisabled) || {}) }}
                          onClick={() => handleToggleActive(u.id, u.active)}
                          disabled={toggleDisabled}
                          title={isSelf ? "You can’t modify your own account" : undefined}
                        >
                          {u.active ? "Deactivate" : "Activate"}
                        </button>

                        {rowErrors[idKey] ? (
                          <div className="error" style={{ marginTop: "4px" }}>
                            {rowErrors[idKey]}
                          </div>
                        ) : null}
                      </>
                    ) : null}

                    <button
                      className="button"
                      style={{ width: "auto", ...(disabledStyle(resetDisabled) || {}) }}
                      onClick={() => {
                        setResetOpenUserId((prev) => (prev === idKey ? null : idKey));

                        setResetRowErrors((prev) => {
                          const next = { ...prev };
                          delete next[idKey];
                          return next;
                        });
                        setResetRowSuccess((prev) => {
                          const next = { ...prev };
                          delete next[idKey];
                          return next;
                        });

                        setResetPasswordValue("");
                        setResetPasswordConfirm("");
                      }}
                      disabled={resetDisabled}
                      title={isSelf ? "You can’t modify your own account" : undefined}
                    >
                      Reset password
                    </button>

                    {resetRowErrors[idKey] ? (
                      <div className="error" style={{ marginTop: "4px" }}>
                        {resetRowErrors[idKey]}
                      </div>
                    ) : null}

                    {resetRowSuccess[idKey] ? (
                      <div className="muted" style={{ marginTop: "4px" }}>
                        {resetRowSuccess[idKey]}
                      </div>
                    ) : null}

                    {resetOpenUserId === idKey ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "240px" }}>
                        <input
                          type="password"
                          placeholder="New password"
                          value={resetPasswordValue}
                          onChange={(e) => setResetPasswordValue(e.target.value)}
                          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                          disabled={resetDisabled}
                        />

                        <input
                          type="password"
                          placeholder="Confirm password"
                          value={resetPasswordConfirm}
                          onChange={(e) => setResetPasswordConfirm(e.target.value)}
                          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                          disabled={resetDisabled}
                        />

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="button"
                            style={{ width: "auto", ...(disabledStyle(resetDisabled) || {}) }}
                            onClick={() => handleResetPassword(u.id)}
                            disabled={resetDisabled}
                          >
                            {resetSavingUserId === idKey ? "Saving..." : "Save new password"}
                          </button>

                          <button
                            className="button secondary"
                            style={{ width: "auto" }}
                            onClick={() => {
                              setResetOpenUserId(null);
                              setResetPasswordValue("");
                              setResetPasswordConfirm("");
                              setResetRowErrors((prev) => {
                                const next = { ...prev };
                                delete next[idKey];
                                return next;
                              });
                              setResetRowSuccess((prev) => {
                                const next = { ...prev };
                                delete next[idKey];
                                return next;
                              });
                            }}
                            disabled={resetDisabled}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
