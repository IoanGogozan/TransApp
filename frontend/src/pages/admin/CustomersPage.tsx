import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import { CustomerAdmin, createCustomer, listCustomers, updateCustomer } from "../../api/customers";

const emptyForm = {
  name: "",
  orgNumber: "",
  email: "",
  phone: "",
  address: "",
  sortOrder: "0",
  active: true,
};

const displayValue = (value?: string | null) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : "—";
};

const CustomersPage = () => {
  const [customers, setCustomers] = useState<CustomerAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerAdmin | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.orgNumber,
        customer.email,
        customer.phone,
        customer.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [customers, search]);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingCustomer(null);
    setModalError(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setError(null);
    setSuccessMessage(null);
    setEditingCustomer(null);
    setModalError(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (customer: CustomerAdmin) => {
    setError(null);
    setSuccessMessage(null);
    setEditingCustomer(customer);
    setModalError(null);
    setForm({
      name: customer.name ?? "",
      orgNumber: customer.orgNumber ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      sortOrder: String(customer.sortOrder ?? 0),
      active: customer.active ?? true,
    });
    setModalOpen(true);
  };

  const validateForm = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setModalError("Name is required");
      return null;
    }
    const orgNumber = form.orgNumber.trim();
    if (orgNumber && !/^\d{9}$/.test(orgNumber)) {
      setModalError("Org nr must be 9 digits");
      return null;
    }
    const parsedSort = Number.parseInt(form.sortOrder, 10);
    if (Number.isNaN(parsedSort) || parsedSort < 0) {
      setModalError("Sort order must be an integer >= 0");
      return null;
    }
    return {
      name: trimmedName,
      orgNumber: orgNumber || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      sortOrder: parsedSort,
      active: form.active,
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSuccessMessage(null);
    const payload = validateForm();
    if (!payload) return;

    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
      } else {
        await createCustomer(payload);
      }
      closeModal();
      await loadCustomers();
      setSuccessMessage(editingCustomer ? "Customer updated." : "Customer created.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save customer";
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (customer: CustomerAdmin) => {
    if (saving || updatingId) return;
    setError(null);
    setSuccessMessage(null);
    setUpdatingId(customer.id);
    try {
      await updateCustomer(customer.id, { active: !customer.active });
      await loadCustomers();
      setSuccessMessage(customer.active ? "Customer deactivated." : "Customer activated.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update customer";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page">
      <style>
        {`
          .customers-container {
            margin: 0 auto;
            max-width: 1280px;
            padding: 32px 24px;
          }
          .customers-topbar {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 20px;
          }
          .customers-header {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .customers-header-actions {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
          }
          .customers-search {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 240px;
          }
          .customers-table-wrap {
            overflow: auto;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #fff;
          }
          .customers-table {
            width: 100%;
            border-collapse: collapse;
          }
          .customers-table thead th {
            position: sticky;
            top: 0;
            background: #f9fafb;
            z-index: 1;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            text-align: left;
            padding: 10px 12px;
          }
          .customers-table tbody td {
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          .customers-table tbody tr:nth-child(even) {
            background: #fcfcfd;
          }
          .customers-row--inactive {
            color: #6b7280;
          }
          .customers-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .customers-truncate {
            max-width: 220px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .customers-status {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            background: #eef2ff;
            color: #3730a3;
          }
          .customers-status.inactive {
            background: #f3f4f6;
            color: #6b7280;
          }
          .customers-table-desktop {
            display: none;
          }
          .customers-cards-mobile {
            display: block;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .customers-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 12px;
            background: #fff;
          }
          .customers-card h3 {
            margin: 0 0 6px 0;
          }
          .customers-card-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 13px;
            margin-bottom: 4px;
          }
          .customers-card-row span {
            color: #6b7280;
          }
          @media (min-width: 768px) {
            .customers-table-desktop {
              display: block;
            }
            .customers-cards-mobile {
              display: none;
            }
            .customers-topbar {
              align-items: center;
            }
          }
        `}
      </style>
      <div className="customers-container">
        <div className="customers-topbar">
          <div className="customers-header">
            <h1 style={{ margin: 0 }}>Customers</h1>
            <p className="muted" style={{ margin: 0 }}>
              Manage customer details and activation status.
            </p>
            <div className="customers-header-actions">
              <button className="button" type="button" onClick={openCreate} disabled={loading}>
                Add customer
              </button>
            </div>
          </div>
          <div className="customers-search">
            <label htmlFor="customers-search-input">Search</label>
            <input
              id="customers-search-input"
              type="text"
              placeholder="Name, org nr, email, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}

        <div className="customers-table-desktop">
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Org nr</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Sort</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center" }}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center" }}>
                      No customers yet.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const isUpdating = updatingId === customer.id;
                    const isActive = Boolean(customer.active);
                    return (
                      <tr key={customer.id} className={isActive ? "" : "customers-row--inactive"}>
                        <td>{displayValue(customer.name)}</td>
                        <td>{displayValue(customer.orgNumber)}</td>
                        <td className="customers-truncate">{displayValue(customer.email)}</td>
                        <td>{displayValue(customer.phone)}</td>
                        <td className="customers-truncate">{displayValue(customer.address)}</td>
                        <td>{Number.isFinite(customer.sortOrder) ? customer.sortOrder : 0}</td>
                        <td>
                          <span className={`customers-status ${isActive ? "" : "inactive"}`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="customers-actions">
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => openEdit(customer)}
                              disabled={isUpdating}
                            >
                              Edit
                            </button>
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => handleToggleActive(customer)}
                              disabled={isUpdating}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="customers-cards-mobile">
          {loading ? (
            <div className="customers-card" style={{ textAlign: "center" }}>
              Loading...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="customers-card" style={{ textAlign: "center" }}>
              No customers yet.
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const isUpdating = updatingId === customer.id;
              const isActive = Boolean(customer.active);
              return (
                <div key={customer.id} className={`customers-card ${isActive ? "" : "customers-row--inactive"}`}>
                  <h3>{displayValue(customer.name)}</h3>
                  <div className="customers-card-row">
                    <span>Org nr</span>
                    <strong>{displayValue(customer.orgNumber)}</strong>
                  </div>
                  <div className="customers-card-row">
                    <span>Email</span>
                    <strong>{displayValue(customer.email)}</strong>
                  </div>
                  <div className="customers-card-row">
                    <span>Phone</span>
                    <strong>{displayValue(customer.phone)}</strong>
                  </div>
                  <div className="customers-card-row">
                    <span>Address</span>
                    <strong>{displayValue(customer.address)}</strong>
                  </div>
                  <div className="customers-card-row">
                    <span>Sort</span>
                    <strong>{Number.isFinite(customer.sortOrder) ? customer.sortOrder : 0}</strong>
                  </div>
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`customers-status ${isActive ? "" : "inactive"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    <div className="customers-actions">
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => openEdit(customer)}
                        disabled={isUpdating}
                      >
                        Edit
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => handleToggleActive(customer)}
                        disabled={isUpdating}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {modalOpen ? (
        <div
          role="presentation"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 50,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "520px",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <h2 style={{ margin: 0 }}>{editingCustomer ? "Edit customer" : "Add customer"}</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {editingCustomer ? "Update customer details." : "Fill in the customer details."}
                  </p>
                </div>
                <button className="button secondary" type="button" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
              </div>

              {modalError && <div className="error" style={{ marginTop: "12px" }}>{modalError}</div>}

              <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
                <label className="field">
                  <span>Name *</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  <span>Org nr</span>
                  <input
                    value={form.orgNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, orgNumber: e.target.value }))}
                    placeholder="9 digits"
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  <span>Address</span>
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    disabled={saving}
                  />
                </label>
                <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                    disabled={saving}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <button className="button secondary" type="button" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button className="button" type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingCustomer ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CustomersPage;
