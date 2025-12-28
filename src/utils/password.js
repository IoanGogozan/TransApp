const bcrypt = require("bcrypt");
const env = require("../config/env");

const hashPassword = async (plain) => {
  const saltRounds = env.bcryptRounds;
  return bcrypt.hash(plain, saltRounds);
};

const comparePassword = async (plain, hash) => bcrypt.compare(plain, hash);

module.exports = {
  hashPassword,
  comparePassword,
};
