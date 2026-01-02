import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import { CustomerAdmin, createCustomer, listCustomers, updateCustomer } from "../../api/customers";
import "./CustomersPage.css";

const emptyForm = {
  name: "",
  orgNumber: "",
  email: "",
  phone: "",
  address: "",
  active: true,
};

const displayValue = (value?: string | null) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : "-";
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
    return {
      name: trimmedName,
      orgNumber: orgNumber || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      sortOrder: 0,
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
    <div className="page customers-page">
      <style>
        {`
          .customers-page .button {
            width: auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 14px;
            font-size: 14px;
            font-weight: 700;
          }
          .customers-page .customers-actions .button {
            padding: 8px 12px;
            font-size: 14px;
            min-width: 120px;
          }
          .customers-page .customers-header-actions .button {
            min-width: 180px;
          }
          .customers-page .customers-toolbar {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          }
          .customers-page .customers-table-wrap {
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          }
        `}
      </style>
      <div className="customers-container">
        <div className="customers-toolbar">
          <div className="customers-toolbar-row">
            <div className="customers-header">
              <h1>Customers</h1>
              <p className="muted">Manage customer details and activation status.</p>
            </div>
            <div className="customers-toolbar-actions customers-header-actions">
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
              <button className="button" type="button" onClick={openCreate} disabled={loading}>
                Add customer
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}

        <div className="customers-table-desktop">
          <div className="customers-card-container customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Org nr</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="customers-cell-center">
                      Loading...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="customers-cell-center">
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
            <div className="customers-card customers-card-center">Loading...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="customers-card customers-card-center">No customers yet.</div>
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
                  <div className="customers-card-actions">
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
        <div role="presentation" onClick={closeModal} className="customers-modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            className="customers-modal"
          >
            <form onSubmit={handleSubmit}>
              <div className="customers-modal-header">
                <div>
                  <h2>{editingCustomer ? "Edit customer" : "Add customer"}</h2>
                  <p className="muted">
                    {editingCustomer ? "Update customer details." : "Fill in the customer details."}
                  </p>
                </div>
                <button className="button secondary" type="button" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
              </div>

              {modalError && <div className="error customers-modal-error">{modalError}</div>}

              <div className="customers-modal-fields">
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
                <label className="field customers-field-inline">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                    disabled={saving}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="customers-modal-actions">
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
