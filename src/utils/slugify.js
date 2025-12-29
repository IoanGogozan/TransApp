const slugifyBase = (name) => {
  const base = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return base || "company";
};

/**
 * Generate a slug for a name, appending numeric suffixes if needed to avoid collisions.
 * @param {string} name
 * @param {(candidate: string) => Promise<boolean>} existsFn async predicate to check if slug exists
 */
const generateUniqueSlug = async (name, existsFn) => {
  const base = slugifyBase(name);
  let candidate = base;
  let suffix = 1;
  while (await existsFn(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

module.exports = { generateUniqueSlug };
