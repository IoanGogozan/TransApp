const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;

const isPasswordValid = (password) => typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH;

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
  isPasswordValid,
};
