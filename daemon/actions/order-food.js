function createFoodAction(restaurant) {
  return {
    type: 'order_food',
    category: 'food',
    amountMist: 50000000, // 0.05 SUI
    details: { restaurant },
  };
}

module.exports = { createFoodAction };
