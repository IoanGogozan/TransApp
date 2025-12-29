/**
 * Slugify a name using simple ASCII rules and append a numeric suffix if needed to avoid collisions.
 * @param {string} name
 * @param {Set<string>} existing - optional set of already-used slugs for collision avoidance
 */
function slugify(name, existing = new Set()) {
  const base = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "") || "company";

  let candidate = base;
  let suffix = 1;
  while (existing.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  existing.add(candidate);
  return candidate;
}

module.exports = { slugify };
