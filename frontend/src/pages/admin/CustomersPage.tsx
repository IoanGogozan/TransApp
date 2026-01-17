import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import ListState from "../../components/ui/ListState";
import SectionHeader from "../../components/ui/SectionHeader";
import ModalShell from "../../components/ui/ModalShell";
import TableWrap from "../../components/TableWrap";
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
    <div className="customers-page">
      <style>
        {`
          .customers-page {
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px;
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
        <Card className="customers-toolbar">
          <div className="customers-toolbar-row">
            <div className="customers-header">
              <SectionHeader
                title="Customers"
                subtitle="Manage customer details and activation status."
              />
            </div>
            <div className="customers-toolbar-actions customers-header-actions">
              <div className="customers-search">
                <FormField label="Search" htmlFor="customers-search-input">
                  <Input
                    id="customers-search-input"
                    type="text"
                    placeholder="Name, org nr, email, phone"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </FormField>
              </div>
              <Button variant="primary" size="sm" onClick={openCreate} disabled={loading}>
                Add customer
              </Button>
            </div>
          </div>
        </Card>

        {successMessage && <div className="success">{successMessage}</div>}

        <ListState
          loading={loading}
          hasItems={filteredCustomers.length > 0}
          emptyTitle="No customers"
          emptyMessage="No customers yet."
          errorMessage={error}
        >
          <div className="customers-table-desktop">
            <TableWrap className="customers-card-container customers-table-wrap">
              <table className="customers-table min-w-[900px] w-full">
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
                  {filteredCustomers.map((customer) => {
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
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openEdit(customer)}
                              disabled={isUpdating}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleActive(customer)}
                              disabled={isUpdating}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>

          <div className="customers-cards-mobile">
            {filteredCustomers.map((customer) => {
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(customer)}
                        disabled={isUpdating}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleActive(customer)}
                        disabled={isUpdating}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ListState>
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
              <ModalShell
                title={editingCustomer ? "Edit customer" : "Add customer"}
                onClose={closeModal}
                footer={(
                  <>
                    <Button variant="secondary" size="sm" type="button" onClick={closeModal} disabled={saving}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" disabled={saving}>
                      {saving ? "Saving..." : editingCustomer ? "Save" : "Create"}
                    </Button>
                  </>
                )}
              >
                {modalError && <div className="error customers-modal-error">{modalError}</div>}

                <div className="customers-modal-fields">
                  <FormField label="Name *">
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="Org nr">
                    <Input
                      value={form.orgNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, orgNumber: e.target.value }))}
                      placeholder="9 digits"
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="Email">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="Phone">
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      disabled={saving}
                    />
                  </FormField>
                  <FormField label="Address">
                    <textarea
                      rows={3}
                      value={form.address}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                      disabled={saving}
                    />
                  </FormField>
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
              </ModalShell>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CustomersPage;
