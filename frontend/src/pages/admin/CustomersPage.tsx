import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import ListState from "../../components/ui/ListState";
import TableWrap from "../../components/TableWrap";
import { CustomerAdmin, createCustomer, listCustomers, updateCustomer } from "../../api/customers";

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
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Customers</h1>
            <p className="mt-1 text-sm text-slate-600">Manage customer details and activation status.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-end lg:w-auto">
            <div className="w-full sm:w-[340px]">
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
            <div className="shrink-0">
              <Button variant="primary" size="sm" className="w-full sm:w-auto" onClick={openCreate} disabled={loading}>
                Add customer
              </Button>
            </div>
          </div>
        </div>

        {successMessage && <div className="success">{successMessage}</div>}

        <ListState
          loading={loading}
          hasItems={filteredCustomers.length > 0}
          emptyTitle="No customers"
          emptyMessage="No customers yet."
          errorMessage={error}
        >
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[900px] w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Name
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Org nr
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Email
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Phone
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Address
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
                {filteredCustomers.map((customer) => {
                  const isUpdating = updatingId === customer.id;
                  const isActive = Boolean(customer.active);
                  return (
                    <tr key={customer.id} className={`odd:bg-white even:bg-slate-50/50 ${isActive ? "" : "customers-row--inactive"}`}>
                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-800">{displayValue(customer.name)}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-800">{displayValue(customer.orgNumber)}</td>
                      <td className="customers-truncate border-b border-slate-100 px-3 py-2 text-sm text-slate-800">
                        {displayValue(customer.email)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-800">{displayValue(customer.phone)}</td>
                      <td className="customers-truncate border-b border-slate-100 px-3 py-2 text-sm text-slate-800">
                        {displayValue(customer.address)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-center text-sm text-slate-800">
                        <span className={`customers-status ${isActive ? "" : "inactive"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right text-sm text-slate-800">
                        <div className="inline-flex gap-2 justify-end">
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
          </div>
          <div className="mt-4 grid gap-3 md:hidden">
            {filteredCustomers.map((customer) => {
              const isUpdating = updatingId === customer.id;
              const isActive = Boolean(customer.active);
              return (
                <div key={customer.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{displayValue(customer.name)}</span>
                    <span className={`customers-status ${isActive ? "" : "inactive"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-slate-800">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Org nr</dt>
                      <dd>{displayValue(customer.orgNumber)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Email</dt>
                      <dd>{displayValue(customer.email)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Phone</dt>
                      <dd>{displayValue(customer.phone)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Address</dt>
                      <dd>{displayValue(customer.address)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2 justify-end">
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
              );
            })}
          </div>
        </ListState>
      </div>

      {modalOpen ? (
        <div
          role="presentation"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
                <div className="text-lg font-semibold text-slate-900">
                  {editingCustomer ? "Edit customer" : "Add customer"}
                </div>
                <Button variant="ghost" size="sm" type="button" onClick={closeModal}>
                  Close
                </Button>
              </div>
              {modalError ? <div className="error px-4 pt-3 sm:px-6">{modalError}</div> : null}

              <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700" htmlFor="customer-address">
                      Address
                    </label>
                    <textarea
                      id="customer-address"
                      rows={4}
                      className="mt-1 min-h-[110px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      value={form.address}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                    disabled={saving}
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
                <Button variant="secondary" size="sm" type="button" onClick={closeModal} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingCustomer ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CustomersPage;
