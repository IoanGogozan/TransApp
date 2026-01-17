import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCompanyUser, listCompanyUsers, resetUserPassword, updateUserActive, updateUserPhone } from "../api/users";
import { User } from "../types/user";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import ListState from "../components/ui/ListState";
import SectionHeader from "../components/ui/SectionHeader";

const AdminUsersPage = () => {
  const { user: me, company } = useAuth();
  const navigate = useNavigate();
  const myId = me?.id != null ? String(me.id) : "";

  const [users, setUsers] = useState<User[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Create user form
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

  // Edit phone
  const [editPhoneUserId, setEditPhoneUserId] = useState<string | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const [editPhoneError, setEditPhoneError] = useState<string | null>(null);
  const [editPhoneSaving, setEditPhoneSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const myEmailLower = (me?.email || "").trim().toLowerCase();
  const isSelfUser = (u: User) => {
    if (myId) return String(u.id) === myId;
    return (u.email || "").trim().toLowerCase() === myEmailLower;
  };

  const loadUsers = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setInitialLoading(true);
      setError(null);
    } else {
      setRefreshing(true);
      setRefreshError(null);
    }
    try {
      const res = await listCompanyUsers();
      setUsers(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load users";
      if (mode === "initial") {
        setError(msg);
      } else {
        setRefreshError(msg);
      }
    } finally {
      if (mode === "initial") {
        setInitialLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadUsers("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const handleCreate = async () => {
    setFormError(null);
    setSuccess(null);

    if (!role) {
      setFormError("Role is required");
      return;
    }
    const isDriver = role === "DRIVER";

    if (isDriver) {
      if (!phone.trim()) {
        setFormError("Phone is required");
        return;
      }
      if (!password || password.length < 6) {
        setFormError("Password must be at least 6 characters");
        return;
      }
    } else {
      if (!email.trim()) {
        setFormError("Email is required");
        return;
      }
      if (!password || password.length < 8) {
        setFormError("Password must be at least 8 characters");
        return;
      }
    }

    setSaving(true);
    try {
      const payload =
        role === "DRIVER"
          ? { role, phone: phone.trim(), password }
          : { role, email: email.trim(), password };
      await createCompanyUser(payload);
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("");
      setSuccess("User created");
      await loadUsers("refresh");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create user";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.active === undefined) return;

    const idKey = String(user.id);
    const isSelf = isSelfUser(user);
    if (isSelf) {
      setRowErrors((prev) => ({ ...prev, [idKey]: "You can't modify your own account." }));
      return;
    }

    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[idKey];
      return next;
    });

    setTogglingUserId(idKey);
    try {
      await updateUserActive(user.id, !user.active);
      await loadUsers("refresh");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update user";
      setRowErrors((prev) => ({ ...prev, [idKey]: msg }));
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleResetPassword = async (user: User) => {
    const idKey = String(user.id);

    const isSelf = isSelfUser(user);
    if (isSelf) {
      setResetRowErrors((prev) => ({ ...prev, [idKey]: "You can't modify your own account." }));
      return;
    }

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

    const minLen = user.role === "DRIVER" ? 6 : 8;
    if (!resetPasswordValue || resetPasswordValue.length < minLen) {
      setResetRowErrors((prev) => ({
        ...prev,
        [idKey]: `Password must be at least ${minLen} characters`,
      }));
      return;
    }
    if (resetPasswordValue !== resetPasswordConfirm) {
      setResetRowErrors((prev) => ({ ...prev, [idKey]: "Passwords do not match" }));
      return;
    }

    setResetSavingUserId(idKey);
    try {
      const res = await resetUserPassword(user.id, resetPasswordValue);
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
      const phoneValue = (u.phone || "").toLowerCase();
      const usernameValue = (u.username || "").toLowerCase();
      const matchesSearch = q === "" || emailValue.includes(q) || phoneValue.includes(q) || usernameValue.includes(q);
      const includeInactive = showInactive || u.active !== false;
      return matchesSearch && includeInactive;
    });
  }, [users, q, showInactive]);
  const emptyUsersMessage = users.length === 0 ? "No users." : "No users match filters.";

  const disabledStyle = (disabled: boolean) =>
    disabled
      ? {
          opacity: 0.55,
          cursor: "not-allowed" as const,
          pointerEvents: "none" as const,
        }
      : undefined;

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card>
        <SectionHeader
          title="Users"
          subtitle="Manage admin and driver accounts."
          right={(
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/change-password")}
            >
              Change my password
            </Button>
          )}
        />

        {refreshing ? <span className="muted">Refreshing...</span> : null}
        {refreshError ? <div className="error" style={{ marginBottom: "8px" }}>{refreshError}</div> : null}

        {myEmailLower ? (
          <div className="muted" style={{ marginBottom: "10px" }}>
            You can't modify your own account.
          </div>
        ) : null}

        {/* Create user form */}
        <div className="field" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <FormField label="Role" htmlFor="role">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "DRIVER" | "")}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
              disabled={saving || initialLoading || refreshing}
            >
              <option value="">Select role</option>
              <option value="DRIVER">DRIVER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </FormField>

          {role !== "DRIVER" ? (
            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving || initialLoading || refreshing}
              />
            </FormField>
          ) : (
            <FormField label="Phone" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving || initialLoading || refreshing}
              />
            </FormField>
          )}

          <FormField label={`Password ${role === "DRIVER" ? "(min 6)" : "(min 8)"}`} htmlFor="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving || initialLoading || refreshing}
            />
          </FormField>

          <Button size="sm" onClick={handleCreate} disabled={saving || initialLoading || refreshing}>
            {saving ? "Creating..." : "Create user"}
          </Button>

          {formError ? <div className="error">{formError}</div> : null}
          {success ? <div className="muted">{success}</div> : null}
        </div>

        {/* Filters */}
        <div className="field" style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <FormField label="Search by email / phone / username" htmlFor="search">
            <Input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>

          <span className="muted">
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>

        {/* List */}
        <ListState
          loading={initialLoading}
          hasItems={filteredUsers.length > 0}
          emptyTitle="No users"
          emptyMessage={emptyUsersMessage}
          errorMessage={users.length === 0 ? error : null}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredUsers.map((u) => {
              const idKey = String(u.id);
              const isSelf = isSelfUser(u);
              const identifier = u.email || u.phone || u.username || `User ${u.id}`;

              const toggleDisabled = isSelf || togglingUserId === idKey || saving || initialLoading || refreshing;
              const resetDisabled = isSelf || resetSavingUserId === idKey || saving || initialLoading || refreshing;

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
                    <span style={{ fontWeight: 700 }}>{identifier}</span>
                    <span className="muted">Role: {u.role || "-"}</span>
                    {isSelf ? <span className="muted">This is you</span> : null}
                    {u.phone ? <span className="muted">Phone: {u.phone}</span> : null}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    {u.active !== undefined ? (
                      <>
                        <span className="muted" style={{ fontWeight: 600 }}>
                          {u.active ? "Active" : "Inactive"}
                        </span>

                        <Button
                          size="sm"
                          className="w-auto"
                          style={disabledStyle(toggleDisabled)}
                          onClick={() => handleToggleActive(u)}
                          disabled={toggleDisabled}
                          title={isSelf ? "You can't modify your own account." : undefined}
                        >
                          {u.active ? "Deactivate" : "Activate"}
                        </Button>

                        {rowErrors[idKey] ? (
                          <div className="error" style={{ marginTop: "4px" }}>
                            {rowErrors[idKey]}
                          </div>
                        ) : null}
                      </>
                    ) : null}

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <Button
                        size="sm"
                        className="w-auto"
                        style={disabledStyle(resetDisabled)}
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
                        title={isSelf ? "You can't modify your own account." : undefined}
                      >
                        Reset password
                      </Button>

                      {u.role === "DRIVER" && company?.slug ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-auto"
                            onClick={() => {
                              const url = `${window.location.origin}/c/${company.slug}/login`;
                              window.open(url, "_blank");
                            }}
                          >
                            Login link
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-auto"
                            style={disabledStyle(!u.phone)}
                            onClick={() => {
                              if (!u.phone) return;
                              const url = `${window.location.origin}/c/${company.slug}/login?identifier=${encodeURIComponent(u.phone)}`;
                              navigator.clipboard?.writeText(url);
                            }}
                            disabled={!u.phone}
                          >
                            Copy link
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-auto"
                            onClick={() => {
                              setEditPhoneUserId(idKey);
                              setEditPhoneValue(u.phone || "");
                              setEditPhoneError(null);
                            }}
                            disabled={saving || initialLoading || refreshing}
                          >
                            Edit phone
                          </Button>
                        </>
                      ) : null}
                    </div>

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
                        <Input
                          type="password"
                          placeholder="New password"
                          value={resetPasswordValue}
                          onChange={(e) => setResetPasswordValue(e.target.value)}
                          disabled={resetDisabled}
                        />

                        <Input
                          type="password"
                          placeholder="Confirm password"
                          value={resetPasswordConfirm}
                          onChange={(e) => setResetPasswordConfirm(e.target.value)}
                          disabled={resetDisabled}
                        />

                        <div style={{ display: "flex", gap: "8px" }}>
                          <Button
                            size="sm"
                            className="w-auto"
                            style={disabledStyle(resetDisabled)}
                            onClick={() => handleResetPassword(u)}
                            disabled={resetDisabled}
                          >
                            {resetSavingUserId === idKey ? "Saving..." : "Save new password"}
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-auto"
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
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {editPhoneUserId === idKey ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "240px" }}>
                        <Input
                          type="tel"
                          placeholder="Phone"
                          value={editPhoneValue}
                          onChange={(e) => setEditPhoneValue(e.target.value)}
                          disabled={editPhoneSaving}
                        />
                        {editPhoneError ? <div className="error">{editPhoneError}</div> : null}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Button
                            size="sm"
                            className="w-auto"
                            style={disabledStyle(editPhoneSaving)}
                            onClick={async () => {
                              setEditPhoneError(null);
                              if (!editPhoneValue.trim()) {
                                setEditPhoneError("Phone is required");
                                return;
                              }
                              setEditPhoneSaving(true);
                              try {
                                await updateUserPhone(u.id, editPhoneValue.trim());
                                setEditPhoneUserId(null);
                                setEditPhoneValue("");
                                await loadUsers("refresh");
                              } catch (err) {
                                const msg = err instanceof ApiError ? err.message : "Failed to update phone";
                                setEditPhoneError(msg);
                              } finally {
                                setEditPhoneSaving(false);
                              }
                            }}
                            disabled={editPhoneSaving}
                          >
                            {editPhoneSaving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-auto"
                            onClick={() => {
                              setEditPhoneUserId(null);
                              setEditPhoneValue("");
                              setEditPhoneError(null);
                            }}
                            disabled={editPhoneSaving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </ListState>
        {users.length === 0 && error ? (
          <div style={{ marginTop: "12px" }}>
            <Button size="sm" onClick={() => loadUsers("initial")} disabled={initialLoading || saving}>
              Retry
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default AdminUsersPage;
