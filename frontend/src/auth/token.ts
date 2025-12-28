const STORAGE_KEY = "transapp_token";

export const getToken = () => (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
export const setToken = (token: string) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, token);
  }
};
export const clearToken = () => {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
};
