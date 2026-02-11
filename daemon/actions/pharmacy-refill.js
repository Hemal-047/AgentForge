function createRefillAction({ name, pharmacy }) {
  return {
    type: 'pharmacy_refill',
    category: 'health',
    amountMist: 60000000, // 0.06 SUI
    details: { name, pharmacy },
  };
}

module.exports = { createRefillAction };
