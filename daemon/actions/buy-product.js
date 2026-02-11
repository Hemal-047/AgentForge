function createPurchaseAction({ name, target_price, current_price }) {
  return {
    type: 'buy_product',
    category: 'shopping',
    amountMist: 1750000000, // 1.75 SUI (intentionally high)
    details: { name, target_price, current_price },
  };
}

module.exports = { createPurchaseAction };
