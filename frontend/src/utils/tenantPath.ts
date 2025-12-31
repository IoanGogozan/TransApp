export const tenantPath = (companySlug: string | undefined, path: string): string => {
  if (path.startsWith("/c/")) return path;
  if (!companySlug) return path;
  const cleaned = path.startsWith("/") ? path : `/${path}`;
  return `/c/${companySlug}${cleaned}`;
};

