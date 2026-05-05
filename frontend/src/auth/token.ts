export const getToken = () => null;
export const setToken = (_token: string) => {};
export const clearToken = () => {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("transapp_token");
  }
};
