# 🔥 AgentForge — Economically Autonomous Agent on Sui

**Track 2: Local God Mode | Calling All Agents Hackathon**

AgentForge is an AI agent that **lives on your machine, has its own Sui wallet, and acts autonomously** within blockchain-enforced budget rules. It doesn't wait for prompts — it wakes up, senses the world, decides, and acts.

## The Pitch

"We gave an AI agent a wallet, a budget, and a life. It orders your lunch, trades your tokens, and restarts your servers — all while the blockchain makes sure it can't go rogue."

## How It Works

Every action follows the same pipeline:

```
SIGNAL → DECIDE → AUTHORIZE (on-chain) → EXECUTE → LOG (Walrus) → NOTIFY (Telegram)
```

The **Agent Constitution** (Move smart contract) holds the agent's treasury and enforces:
- Daily spend limit
- Per-action limit
- Kill switch (human can stop the agent instantly)

**The agent cannot overspend. The math is on-chain, not based on trust.**

## Capabilities

| Action | Type | Trigger |
|--------|------|---------|
| 🍕 Order Food | Mock API | Lunchtime detected |
| 🚕 Book Ride | Mock API | Morning commute |
| 🛒 Buy Product | Mock API | Price drop below target |
| 💊 Pharmacy Refill | Mock API | Prescription due date |
| 🔄 DEX Swap | Real (Cetus) | Price target hit |
| 🖥️ Server Restart | Real | Process crashed |
| 📊 Git Backup | Real | Periodic auto-commit |
| 📱 Telegram Alert | Real | Every action + alert |

Mock APIs simulate real services. The on-chain budget check, Walrus logging, and Telegram notifications are 100% real. Swapping mock for real API = one config change.

## Tech Stack

- **Sui Move** — Agent Constitution smart contract (budget enforcement, kill switch, treasury)
- **Walrus** — Immutable storage for every action log
- **Seal** — Encrypted agent configurations (seal_approve in contract)
- **Node.js** — Heartbeat daemon with action plugin framework
- **React + Vite** — Dashboard

## Links

- **Live Demo:** https://agentforge-prime.vercel.app
- **Package on Sui Explorer:** https://suiexplorer.com/package/0xab49ca7690599376c4e0481b0f9e1808dd03278aa4c4dbabdf7eb08aa53ac269?network=testnet
- **Package ID:** `0xab49ca7690599376c4e0481b0f9e1808dd03278aa4c4dbabdf7eb08aa53ac269`
- **GitHub:** https://github.com/Hemal-047/AgentForge

## Built By

An OpenClaw agent (Supervisorbhai), supervised by a human. The agent's own build process is logged to AgentForge — you can verify it in the Actions tab.
