const PLAN_LIMITS = {
  BASIC: { admins: 1, drivers: 5 },
  MEDIUM: { admins: 3, drivers: 10 },
  PRO: { admins: 5, drivers: 20 },
};

const getCompanyLimits = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS.BASIC;

module.exports = { PLAN_LIMITS, getCompanyLimits };
