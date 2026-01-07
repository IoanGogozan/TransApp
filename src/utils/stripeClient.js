const Stripe = require("stripe");

let stripeInstance;

const getStripe = () => {
  if (process.env.NODE_ENV === "test" && global.__stripeMock) {
    return global.__stripeMock;
  }
  if (stripeInstance) return stripeInstance;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required to initialize Stripe");
  }
  stripeInstance = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  return stripeInstance;
};

module.exports = { getStripe };
