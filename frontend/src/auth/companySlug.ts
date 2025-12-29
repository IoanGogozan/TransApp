const STORAGE_KEY = "transapp_company_slug";

export const getCompanySlug = () => (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);

export const setCompanySlug = (slug: string) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, slug);
  }
};

export const clearCompanySlug = () => {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
};
