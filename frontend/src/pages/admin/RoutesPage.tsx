import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import TableWrap from "../../components/TableWrap";
import { RouteOptionAdmin, createRoute, listRoutes, updateRoute } from "../../api/routes";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import ListState from "../../components/ui/ListState";

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
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-5xl">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Routes</h1>
          <p className="mt-1 text-sm text-slate-600">Manage route options for work entries.</p>
        </div>

        <div className="mt-4 grid gap-4">
          <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Create route</h2>

            {error && sortedRoutes.length > 0 ? <div className="error">{error}</div> : null}

            <form onSubmit={handleCreate}>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
                <div className="md:col-span-6">
                  <FormField label="Name" htmlFor="route-name">
                    <Input
                      id="route-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={saving || loading}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-3">
                  <FormField label="Sort order" htmlFor="route-sort">
                    <Input
                      id="route-sort"
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      disabled={saving || loading}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-3">
                  <FormField label="Active" htmlFor="route-active">
                    <div className="flex items-center gap-2">
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
                  </FormField>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="submit"
                  className="w-full md:ml-auto md:min-w-[160px] md:w-auto"
                  disabled={saving || loading}
                >
                  {saving ? "Creating..." : "Create route"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Routes list</h2>
            <div className="mt-4">
              <ListState
                loading={loading}
                hasItems={sortedRoutes.length > 0}
                emptyTitle="No routes"
                emptyMessage="No routes yet."
                errorMessage={sortedRoutes.length === 0 ? error : null}
              >
                <>
                  <div className="mt-4 hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-[700px] w-full border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Name
                          </th>
                          <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Sort order
                          </th>
                          <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Active
                          </th>
                          <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRoutes.map((route) => {
                          const isEditing = editingId === route.id;
                          const isUpdating = updatingId === route.id;
                          return (
                            <tr key={route.id} className="odd:bg-white even:bg-slate-50/50">
                              <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-800">
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
                              <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-800">
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
                              <td className="border-b border-slate-100 px-3 py-2 text-center text-sm text-slate-800">
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
                              <td className="border-b border-slate-100 px-3 py-2 text-right text-sm text-slate-800">
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
                                  <span className="inline-flex">
                                    <Button size="sm" onClick={() => startEdit(route)} disabled={isUpdating}>
                                      Edit
                                    </Button>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid gap-3 md:hidden">
                    {sortedRoutes.map((route) => {
                      const isUpdating = updatingId === route.id;
                      return (
                        <div
                          key={route.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-900">{route.name}</span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                              {route.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="text-xs font-medium text-slate-600">Sort order</div>
                            <div className="text-sm text-slate-800">{route.sortOrder}</div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              className="px-3 py-2 text-sm rounded-xl"
                              onClick={() => startEdit(route)}
                              disabled={isUpdating}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              </ListState>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoutesPage;
