import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import { CustomerAdmin, createCustomer, listCustomers, updateCustomer } from "../../api/customers";

const CustomersPage = () => {
  const [customers, setCustomers] = useState<CustomerAdmin[]>([]);
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

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load customers";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
  }, [customers]);

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
      await createCustomer({
        name: trimmed,
        sortOrder: Number.isNaN(parsedSort) ? 0 : parsedSort,
        active,
      });
      setName("");
      setSortOrder("0");
      setActive(true);
      await loadCustomers();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create customer";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (customer: CustomerAdmin, nextActive: boolean) => {
    if (saving || updatingId) return;
    setError(null);
    setUpdatingId(customer.id);
    try {
      const updated = await updateCustomer(customer.id, { active: nextActive });
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? updated : c)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update customer";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const startEdit = (customer: CustomerAdmin) => {
    setEditingId(customer.id);
    setEditName(customer.name);
    setEditSortOrder(String(customer.sortOrder ?? 0));
    setEditActive(Boolean(customer.active));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditSortOrder("0");
    setEditActive(true);
  };

  const saveEdit = async (customerId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    setError(null);
    setUpdatingId(customerId);
    try {
      const parsedSort = Number.parseInt(editSortOrder, 10);
      const updated = await updateCustomer(customerId, {
        name: trimmed,
        sortOrder: Number.isNaN(parsedSort) ? 0 : parsedSort,
        active: editActive,
      });
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? updated : c)));
      cancelEdit();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update customer";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Customers</h1>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleCreate} style={{ marginBottom: "16px" }}>
          <div className="field">
            <label htmlFor="customer-name">Name</label>
            <input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving || loading}
            />
          </div>
          <div className="field">
            <label htmlFor="customer-sort">Sort order</label>
            <input
              id="customer-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={saving || loading}
            />
          </div>
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
            <input
              id="customer-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={saving || loading}
              style={{ width: "16px", height: "16px" }}
            />
            <label htmlFor="customer-active">Active</label>
          </div>
          <button className="button" type="submit" disabled={saving || loading}>
            {saving ? "Creating..." : "Create customer"}
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
              ) : sortedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    No customers yet.
                  </td>
                </tr>
              ) : (
                sortedCustomers.map((customer) => {
                  const isEditing = editingId === customer.id;
                  const isUpdating = updatingId === customer.id;
                  return (
                    <tr key={customer.id}>
                      <td>
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={isUpdating}
                          />
                        ) : (
                          customer.name
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
                          customer.sortOrder
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
                            checked={customer.active}
                            onChange={(e) => handleToggleActive(customer, e.target.checked)}
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
                              onClick={() => saveEdit(customer.id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? "Saving..." : "Save"}
                            </button>
                            <button className="button secondary" type="button" onClick={cancelEdit} disabled={isUpdating}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="button" type="button" onClick={() => startEdit(customer)} disabled={isUpdating}>
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

export default CustomersPage;
