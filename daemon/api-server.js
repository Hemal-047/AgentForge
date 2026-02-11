const express = require('express');
const cors = require('cors');
const { runAction } = require('./actions/action-runner');
const { createFoodAction } = require('./actions/order-food');
const { createRideAction } = require('./actions/book-ride');
const { createRefillAction } = require('./actions/pharmacy-refill');
const { createBackupAction } = require('./actions/git-backup');
const { createPurchaseAction } = require('./actions/buy-product');

function startApiServer() {
  const app = express();
  app.use(
    cors({
      origin: ['https://agentforge-prime.vercel.app'],
      methods: ['POST', 'OPTIONS'],
    }),
  );
  app.use(express.json());

  app.post('/api/actions/order-food', async (_req, res) => {
    try {
      const result = await runAction(createFoodAction('Curry House'));
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/actions/book-ride', async (_req, res) => {
    try {
      const result = await runAction(createRideAction());
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/actions/pharmacy-refill', async (_req, res) => {
    try {
      const result = await runAction(
        createRefillAction({ name: 'Vitamin D', pharmacy: 'CVS #4521' }),
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/actions/git-backup', async (_req, res) => {
    try {
      const result = await runAction(createBackupAction());
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/actions/buy-product', async (_req, res) => {
    try {
      const result = await runAction(
        createPurchaseAction({
          name: 'RTX 5090',
          target_price: 1799,
          current_price: 1750,
        }),
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`🚀 AgentForge API listening on port ${port}`);
  });
}

module.exports = { startApiServer };

if (require.main === module) {
  startApiServer();
}
