const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");

const port = env.port || 3000;

app.listen(port, () => {
  logger.info({ port, env: env.nodeEnv }, `Server running on http://localhost:${port}`);
});
