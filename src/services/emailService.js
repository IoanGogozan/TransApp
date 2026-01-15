const env = require("../config/env");
const logger = require("../config/logger");

let transport = null;

const getTransport = () => {
  if (transport) return transport;
  if (!env.smtpHost) return null;

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      logger.warn("nodemailer not installed; skipping email send");
      return null;
    }
    throw error;
  }

  transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  });

  return transport;
};

const sendEmail = async ({ to, subject, text }) => {
  if (!to || !subject || !text) {
    logger.warn("Email send skipped due to missing fields");
    return;
  }

  const smtp = getTransport();
  if (!smtp) {
    logger.warn("SMTP not configured; email not sent. Logging email content for development.");
    logger.info({ to, subject, text }, "EMAIL_PREVIEW");
    return;
  }

  try {
    await smtp.sendMail({ from: env.emailFrom, to, subject, text });
  } catch (err) {
    logger.error({ err: err?.message, to, subject }, "Email send failed");
  }
};

module.exports = { sendEmail };
