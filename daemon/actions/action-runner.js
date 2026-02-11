const crypto = require('crypto');
const { logToWalrus } = require('../walrus-logger');
const { authorizeSpend, reportAction } = require('../sui-client');

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function runAction(action) {
  const payload = {
    type: action.type,
    category: action.category,
    amount_mist: action.amountMist || 0,
    amount_sui: action.amountMist ? action.amountMist / 1_000_000_000 : 0,
    details: action.details || {},
  };

  const { blobId, hash } = await logToWalrus({
    type: 'action_request',
    action: payload,
  });

  if (action.amountMist && action.amountMist > 0) {
    const spendResult = await authorizeSpend(
      action.amountMist,
      action.category || 'general',
      hashPayload(payload),
      blobId,
    );

    if (!spendResult) {
      console.log(`❌ Spend denied for ${action.type}`);
      return { ok: false, denied: true };
    }
  }

  await reportAction(action.type, hash, blobId);
  console.log(`✅ Action reported: ${action.type}`);
  return { ok: true };
}

module.exports = { runAction };
