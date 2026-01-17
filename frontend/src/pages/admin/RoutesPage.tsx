import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import TableWrap from "../../components/TableWrap";
import { RouteOptionAdmin, createRoute, listRoutes, updateRoute } from "../../api/routes";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import ListState from "../../components/ui/ListState";
import SectionHeader from "../../components/ui/SectionHeader";

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
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card>
        <SectionHeader title="Routes" subtitle="Manage route options for work entries." />

        {error && sortedRoutes.length > 0 ? <div className="error">{error}</div> : null}

        <form onSubmit={handleCreate} style={{ marginBottom: "16px" }}>
          <FormField label="Name" htmlFor="route-name">
            <Input
              id="route-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving || loading}
            />
          </FormField>
          <FormField label="Sort order" htmlFor="route-sort">
            <Input
              id="route-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={saving || loading}
            />
          </FormField>
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
          <Button type="submit" disabled={saving || loading}>
            {saving ? "Creating..." : "Create route"}
          </Button>
        </form>

        <ListState
          loading={loading}
          hasItems={sortedRoutes.length > 0}
          emptyTitle="No routes"
          emptyMessage="No routes yet."
          errorMessage={sortedRoutes.length === 0 ? error : null}
        >
          <TableWrap>
            <table className="min-w-[700px] w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sort order</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRoutes.map((route) => {
                  const isEditing = editingId === route.id;
                  const isUpdating = updatingId === route.id;
                  return (
                    <tr key={route.id}>
                      <td>
                        {isEditing ? (
                          <Input
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
                          <Input
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
                            <Button
                              size="sm"
                              onClick={() => saveEdit(route.id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? "Saving..." : "Save"}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={cancelEdit} disabled={isUpdating}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => startEdit(route)} disabled={isUpdating}>
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </ListState>
      </Card>
    </div>
  );
};

export default RoutesPage;
