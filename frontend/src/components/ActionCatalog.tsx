const CAPABILITIES = [
  {
    name: 'Order Food',
    emoji: '🍕',
    status: 'active',
    description: 'Auto-order meals when schedule or hunger signals fire.',
    trigger: 'Lunch time or calorie threshold',
    budget: '0.05 SUI',
    api: 'Mock DoorDash API',
    action: 'order-food',
  },
  {
    name: 'Book Ride',
    emoji: '🚕',
    status: 'active',
    description: 'Calls a ride when commute or calendar triggers fire.',
    trigger: 'Calendar commute event',
    budget: '0.08 SUI',
    api: 'Mock Uber API',
    action: 'book-ride',
  },
  {
    name: 'Buy Product',
    emoji: '🛒',
    status: 'active',
    description: 'Purchases items once price drops below target.',
    trigger: 'Price alert matched',
    budget: '1.75 SUI',
    api: 'Mock shopping API',
    action: 'buy-product',
  },
  {
    name: 'Pharmacy Refill',
    emoji: '💊',
    status: 'active',
    description: 'Schedules prescription refills automatically.',
    trigger: 'Prescription due date',
    budget: '0.06 SUI',
    api: 'Mock pharmacy API',
    action: 'pharmacy-refill',
  },
  {
    name: 'DEX Swap',
    emoji: '🔄',
    status: 'planned',
    description: 'Executes swaps when target prices are met.',
    trigger: 'Price target hit',
    budget: 'Variable',
    api: 'Cetus (real)',
  },
  {
    name: 'Server Restart',
    emoji: '🖥️',
    status: 'active',
    description: 'Restarts or cleans servers when health alerts fire.',
    trigger: 'CPU/Disk thresholds exceeded',
    budget: 'Free (no spend)',
    api: 'Shell scripts',
  },
  {
    name: 'Git Backup',
    emoji: '📊',
    status: 'active',
    description: 'Auto-commits and backs up repositories.',
    trigger: 'Scheduled interval',
    budget: 'Free (no spend)',
    api: 'Git CLI',
    action: 'git-backup',
  },
  {
    name: 'Telegram Alert',
    emoji: '📱',
    status: 'active',
    description: 'Notifies humans about every action and alert.',
    trigger: 'Every action, denial, alert, and heartbeat',
    budget: 'Free (no spend)',
    api: 'Telegram Bot API (real)',
  },
]

const statusColors: Record<string, string> = {
  active: 'status live',
  planned: 'status queued',
  disabled: 'status disabled',
}

import { useState } from 'react'
import { API_BASE } from '../config'

export default function ActionCatalog() {
  const [status, setStatus] = useState<Record<string, string>>({})

  const triggerAction = async (action: string) => {
    setStatus((prev) => ({ ...prev, [action]: 'Running...' }))
    try {
      const res = await fetch(`${API_BASE}/api/actions/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed')

      const verdict = data.denied ? 'DENIED' : 'APPROVED'
      const digest = data.spendDigest || data.reportDigest || 'n/a'
      const walrus = data.walrusBlobId ? data.walrusBlobId.slice(0, 16) : 'n/a'

      setStatus((prev) => ({
        ...prev,
        [action]: `${verdict} • tx ${digest} • Walrus ${walrus}`,
      }))
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        [action]: `Error: ${error.message}`,
      }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2>Agent Capabilities</h2>
        <p className="muted">
          Everything AgentForge can do autonomously. Each action goes through the
          Constitution's budget check before execution.
        </p>
      </div>

      <div className="pipeline">
        <h3>Universal Action Pipeline</h3>
        <div className="pipeline-steps">
          {[
            { step: 'SIGNAL', emoji: '📡' },
            { step: '→' },
            { step: 'DECIDE', emoji: '🧠' },
            { step: '→' },
            { step: 'AUTHORIZE', emoji: '⛓️' },
            { step: '→' },
            { step: 'EXECUTE', emoji: '⚡' },
            { step: '→' },
            { step: 'LOG', emoji: '📦' },
            { step: '→' },
            { step: 'NOTIFY', emoji: '📱' },
          ].map((s, i) =>
            s.step === '→' ? (
              <span key={i} className="pipeline-arrow">→</span>
            ) : (
              <span key={i} className="pipeline-chip">
                {s.emoji} {s.step}
              </span>
            ),
          )}
        </div>
        <p className="muted">
          Every action — real or mock — passes through on-chain budget authorization.
          The blockchain enforces limits regardless of the API endpoint.
        </p>
      </div>

      <div className="grid">
        {CAPABILITIES.map((cap, i) => (
          <div key={i} className="panel">
            <div className="cap-header">
              <div className="cap-title">
                <span className="cap-emoji">{cap.emoji}</span>
                <h3>{cap.name}</h3>
              </div>
              <span className={statusColors[cap.status]}>{cap.status}</span>
            </div>
            <p className="muted">{cap.description}</p>
            <div className="cap-meta">
              <p>⏰ Trigger: {cap.trigger}</p>
              <p>💰 Budget: {cap.budget}</p>
              <p>🔗 API: {cap.api}</p>
            </div>
            {cap.action && (
              <div className="try-actions">
                <button onClick={() => triggerAction(cap.action)}>
                  Try It
                </button>
                {status[cap.action] && (
                  <p className="muted">{status[cap.action]}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>🎭 Mock vs Real APIs</h3>
        <p className="muted">
          Some actions use mock APIs for demo purposes (food ordering, ride booking,
          shopping). The mock server simulates realistic responses. The critical
          insight: the on-chain budget enforcement, Walrus logging, and Telegram
          notifications are 100% real regardless of whether the final API is mock
          or live. Swapping a mock endpoint for a real DoorDash API is a one-line
          config change — the entire pipeline stays identical.
        </p>
      </div>
    </div>
  )
}
