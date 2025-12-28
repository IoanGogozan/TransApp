const { randomUUID } = require("crypto");

const requestId = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && incoming.trim() ? incoming.trim() : randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);

  next();
};

module.exports = requestId;
