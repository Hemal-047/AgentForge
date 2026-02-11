function createRideAction() {
  return {
    type: 'book_ride',
    category: 'transport',
    amountMist: 80000000, // 0.08 SUI
    details: { provider: 'Uber', eta_minutes: 6 },
  };
}

module.exports = { createRideAction };
