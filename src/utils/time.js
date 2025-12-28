// Project rule: store all timestamps in UTC in the database; convert to Europe/Oslo only at presentation.

const nowUtcIso = () => new Date().toISOString();

const toUtcIso = (date) => new Date(date).toISOString();

const toEuropeOsloString = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(date));

const osloDateOnly = (input) => {
  const d = input ? new Date(input) : new Date();
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .split("-");
  return `${year}-${month}-${day}`;
};

module.exports = {
  nowUtcIso,
  toUtcIso,
  toEuropeOsloString,
  osloDateOnly,
};
