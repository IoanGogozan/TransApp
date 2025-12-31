import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import { RouteOptionAdmin, createRoute, listRoutes, updateRoute } from "../../api/routes";

const RoutesPage = () => {
  const [routes, setRoutes] = useState<RouteOptionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("0");
  const [editActive, setEditActive] = useState(true);

  const loadRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRoutes();
      setRoutes(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load routes";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedRoutes = useMemo(() => {
    return [...routes].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
  }, [routes]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    const parsedSort = Number.parseInt(sortOrder, 10);
    setSaving(true);
    try {
      await createRoute({
        name: trimmed,
        sortOrder: Number.isNaN(parsedSort) ? 0 : parsedSort,
        active,
      });
      setName("");
      setSortOrder("0");
      setActive(true);
      await loadRoutes();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create route";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (route: RouteOptionAdmin, nextActive: boolean) => {
    if (saving || updatingId) return;
    setError(null);
    setUpdatingId(route.id);
    try {
      const updated = await updateRoute(route.id, { active: nextActive });
      setRoutes((prev) => prev.map((r) => (r.id === route.id ? updated : r)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update route";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const startEdit = (route: RouteOptionAdmin) => {
    setEditingId(route.id);
    setEditName(route.name);
    setEditSortOrder(String(route.sortOrder ?? 0));
    setEditActive(Boolean(route.active));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditSortOrder("0");
    setEditActive(true);
  };

  const saveEdit = async (routeId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    setError(null);
    setUpdatingId(routeId);
    try {
      const parsedSort = Number.parseInt(editSortOrder, 10);
      const updated = await updateRoute(routeId, {
        name: trimmed,
        sortOrder: Number.isNaN(parsedSort) ? 0 : parsedSort,
        active: editActive,
      });
      setRoutes((prev) => prev.map((r) => (r.id === routeId ? updated : r)));
      cancelEdit();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update route";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Routes</h1>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleCreate} style={{ marginBottom: "16px" }}>
          <div className="field">
            <label htmlFor="route-name">Name</label>
            <input
              id="route-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving || loading}
            />
          </div>
          <div className="field">
            <label htmlFor="route-sort">Sort order</label>
            <input
              id="route-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={saving || loading}
            />
          </div>
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
            <input
              id="route-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={saving || loading}
              style={{ width: "16px", height: "16px" }}
            />
            <label htmlFor="route-active">Active</label>
          </div>
          <button className="button" type="submit" disabled={saving || loading}>
            {saving ? "Creating..." : "Create route"}
          </button>
        </form>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Sort order</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    Loading...
                  </td>
                </tr>
              ) : sortedRoutes.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    No routes yet.
                  </td>
                </tr>
              ) : (
                sortedRoutes.map((route) => {
                  const isEditing = editingId === route.id;
                  const isUpdating = updatingId === route.id;
                  return (
                    <tr key={route.id}>
                      <td>
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={isUpdating}
                          />
                        ) : (
                          route.name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editSortOrder}
                            onChange={(e) => setEditSortOrder(e.target.value)}
                            disabled={isUpdating}
                          />
                        ) : (
                          route.sortOrder
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            disabled={isUpdating}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={route.active}
                            onChange={(e) => handleToggleActive(route, e.target.checked)}
                            disabled={isUpdating || saving || loading}
                          />
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              className="button"
                              type="button"
                              onClick={() => saveEdit(route.id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? "Saving..." : "Save"}
                            </button>
                            <button className="button secondary" type="button" onClick={cancelEdit} disabled={isUpdating}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="button" type="button" onClick={() => startEdit(route)} disabled={isUpdating}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoutesPage;
