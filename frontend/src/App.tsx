import { useEffect, useMemo, useState } from 'react'
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import './App.css'
import { CLOCK_ID, CONSTITUTION_ID, PACKAGE_ID, REGISTRY_ID } from './config'
import { decodeBytes, formatMist, formatTimestamp } from './utils/format'

type AnyEvent = {
  id?: { txDigest?: string; eventSeq?: string }
  timestampMs?: string | number
  parsedJson?: Record<string, unknown>
  type?: string
}

type Constitution = {
  owner?: string
  agent?: string
  name?: unknown
  description?: unknown
  daily_spend_limit?: string | number
  per_action_limit?: string | number
  total_spent_today?: string | number
  total_spent_all_time?: string | number
  total_actions?: string | number
  total_heartbeats?: string | number
  is_alive?: boolean
  last_heartbeat?: string | number
  treasury?: { value?: string | number }
}

type Registry = {
  total_agents?: string | number
  total_actions?: string | number
}

const tabs = ['Pulse', 'Actions', 'Capabilities', 'Constitution', 'Treasury']

const actionCatalog = [
  {
    name: 'Send Alert',
    status: 'live',
    description: 'Dispatch alerts when anomalies or budget limits are hit.',
  },
  {
    name: 'System Cleanup',
    status: 'live',
    description: 'Triggered cleanup workflows to keep infra healthy.',
  },
  {
    name: 'Wallet Monitor',
    status: 'live',
    description: 'Tracks balance changes and spend activity.',
  },
  {
    name: 'Server Health',
    status: 'live',
    description: 'Monitors service uptime and heartbeat latency.',
  },
  {
    name: 'Gas Tracker',
    status: 'live',
    description: 'Tracks gas burn and predicts refill needs.',
  },
  {
    name: 'Budget Enforcer',
    status: 'queued',
    description: 'Automated guardrails for spend approvals.',
  },
  {
    name: 'Risk Scoring',
    status: 'queued',
    description: 'Scores actions and flags anomalous patterns.',
  },
  {
    name: 'Audit Exporter',
    status: 'queued',
    description: 'Exports notarized audit trails to external storage.',
  },
]

function App() {
  const client = useSuiClient()
  const account = useCurrentAccount()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const [constitution, setConstitution] = useState<Constitution | null>(null)
  const [registry, setRegistry] = useState<Registry | null>(null)
  const [heartbeats, setHeartbeats] = useState<AnyEvent[]>([])
  const [actions, setActions] = useState<AnyEvent[]>([])
  const [spendApproved, setSpendApproved] = useState<AnyEvent[]>([])
  const [spendDenied, setSpendDenied] = useState<AnyEvent[]>([])
  const [treasuryFunded, setTreasuryFunded] = useState<AnyEvent[]>([])
  const [treasuryWithdrawn, setTreasuryWithdrawn] = useState<AnyEvent[]>([])
  const [activity, setActivity] = useState<AnyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [tab, setTab] = useState(tabs[0])
  const [activityFilter, setActivityFilter] = useState('all')

  const [killReason, setKillReason] = useState('Emergency shutdown')
  const [fundAmount, setFundAmount] = useState('0.25')
  const [withdrawAmount, setWithdrawAmount] = useState('0.1')
  const [dailyLimit, setDailyLimit] = useState('1')
  const [perActionLimit, setPerActionLimit] = useState('0.2')

  const explorerBase = 'https://suiexplorer.com'

  const refresh = async () => {
    try {
      setError(null)
      const fetchObject = async (id: string) => {
        const res = await client.getObject({
          id,
          options: { showContent: true },
        })
        return (res.data?.content as { fields?: Record<string, unknown> })?.fields
      }

      const fetchEvents = async (eventType: string, limit = 20) => {
        const res = await client.queryEvents({
          query: { MoveEventType: eventType },
          order: 'descending',
          limit,
        })
        return res.data as AnyEvent[]
      }

      const [
        constitutionFields,
        registryFields,
        hb,
        act,
        spendOk,
        spendNo,
        funded,
        withdrawn,
        killed,
        revived,
      ] = await Promise.all([
        fetchObject(CONSTITUTION_ID),
        fetchObject(REGISTRY_ID),
        fetchEvents(`${PACKAGE_ID}::constitution::HeartbeatLogged`, 12),
        fetchEvents(`${PACKAGE_ID}::constitution::ActionReported`, 12),
        fetchEvents(`${PACKAGE_ID}::constitution::SpendAuthorized`, 12),
        fetchEvents(`${PACKAGE_ID}::constitution::SpendDenied`, 12),
        fetchEvents(`${PACKAGE_ID}::constitution::TreasuryFunded`, 12),
        fetchEvents(`${PACKAGE_ID}::constitution::TreasuryWithdrawn`, 12),
        fetchEvents(`${PACKAGE_ID}::constitution::AgentKilled`, 6),
        fetchEvents(`${PACKAGE_ID}::constitution::AgentRevived`, 6),
      ])

      setConstitution(constitutionFields as Constitution)
      setRegistry(registryFields as Registry)
      setHeartbeats(hb)
      setActions(act)
      setSpendApproved(spendOk)
      setSpendDenied(spendNo)
      setTreasuryFunded(funded)
      setTreasuryWithdrawn(withdrawn)

      const combined = [
        ...hb,
        ...act,
        ...spendOk,
        ...spendNo,
        ...funded,
        ...withdrawn,
        ...killed,
        ...revived,
      ]
        .map((item) => ({
          ...item,
          _timestamp:
            Number(item.timestampMs) ||
            Number((item.parsedJson?.timestamp as string) ?? 0),
        }))
        .sort((a, b) => b._timestamp - a._timestamp)
        .slice(0, 30)
      setActivity(combined)
    } catch (err) {
      console.error(err)
      setError('Failed to load on-chain data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 15000)
    return () => window.clearInterval(timer)
  }, [])

  const name = useMemo(() => decodeBytes(constitution?.name), [constitution?.name])
  const description = useMemo(
    () => decodeBytes(constitution?.description),
    [constitution?.description],
  )

  const toMist = (value: string) => {
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) return '0'
    return Math.round(num * 1_000_000_000).toString()
  }

  const encodeBytes = (value: string) => {
    const encoder = new TextEncoder()
    return Array.from(encoder.encode(value))
  }

  const handleTx = async (buildTx: (tx: Transaction) => void) => {
    if (!account) {
      setTxStatus('Connect a wallet first.')
      return
    }
    try {
      setTxStatus('Submitting transaction…')
      const tx = new Transaction()
      buildTx(tx)
      const result = await signAndExecute({
        transaction: tx,
      })
      setTxStatus(`Success: ${result.digest}`)
      await refresh()
    } catch (err) {
      console.error(err)
      setTxStatus('Transaction failed. Check console.')
    }
  }

  const onKill = () =>
    handleTx((tx) => {
      tx.moveCall({
        target: `${PACKAGE_ID}::constitution::kill_agent`,
        arguments: [
          tx.object(CONSTITUTION_ID),
          tx.pure.vector('u8', encodeBytes(killReason)),
          tx.object(CLOCK_ID),
        ],
      })
    })

  const onRevive = () =>
    handleTx((tx) => {
      tx.moveCall({
        target: `${PACKAGE_ID}::constitution::revive_agent`,
        arguments: [tx.object(CONSTITUTION_ID), tx.object(CLOCK_ID)],
      })
    })

  const onFund = () =>
    handleTx((tx) => {
      const amount = toMist(fundAmount)
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)])
      tx.moveCall({
        target: `${PACKAGE_ID}::constitution::fund_treasury`,
        arguments: [tx.object(CONSTITUTION_ID), coin, tx.object(CLOCK_ID)],
      })
    })

  const onWithdraw = () =>
    handleTx((tx) => {
      const amount = toMist(withdrawAmount)
      tx.moveCall({
        target: `${PACKAGE_ID}::constitution::withdraw_treasury`,
        arguments: [
          tx.object(CONSTITUTION_ID),
          tx.pure.u64(amount),
          tx.object(CLOCK_ID),
        ],
      })
    })

  const onUpdateBudgets = () =>
    handleTx((tx) => {
      const daily = toMist(dailyLimit)
      const perAction = toMist(perActionLimit)
      tx.moveCall({
        target: `${PACKAGE_ID}::constitution::update_daily_limit`,
        arguments: [tx.object(CONSTITUTION_ID), tx.pure.u64(daily)],
      })
      tx.moveCall({
        target: `${PACKAGE_ID}::constitution::update_action_limit`,
        arguments: [tx.object(CONSTITUTION_ID), tx.pure.u64(perAction)],
      })
    })

  const dailySpent = Number(constitution?.total_spent_today ?? 0)
  const dailyLimitValue = Number(constitution?.daily_spend_limit ?? 0)
  const dailyProgress =
    dailyLimitValue > 0
      ? Math.min(100, (dailySpent / dailyLimitValue) * 100)
      : 0

  const filteredActivity = activity.filter((event) => {
    if (activityFilter === 'all') return true
    return event.type?.includes(activityFilter)
  })

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>AgentForge</h1>
          <p className="sub">Economically autonomous agents on Sui</p>
          <p className="muted">
            {account ? `Connected: ${account.address}` : 'Wallet not connected'}
          </p>
          <div className="kill-switch">
            <input
              value={killReason}
              onChange={(event) => setKillReason(event.target.value)}
              placeholder="Kill switch reason"
            />
            <button onClick={onKill} disabled={!account}>
              Kill Switch
            </button>
            <button onClick={onRevive} disabled={!account}>
              Revive
            </button>
          </div>
        </div>
        <div className="header-actions">
          <div className="ids">
            <a
              href={`${explorerBase}/object/${CONSTITUTION_ID}?network=testnet`}
              target="_blank"
              rel="noreferrer"
            >
              Constitution
            </a>
            <a
              href={`${explorerBase}/object/${REGISTRY_ID}?network=testnet`}
              target="_blank"
              rel="noreferrer"
            >
              Registry
            </a>
            <a
              href={`${explorerBase}/package/${PACKAGE_ID}?network=testnet`}
              target="_blank"
              rel="noreferrer"
            >
              Package
            </a>
          </div>
          <ConnectButton />
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}
      {loading && <div className="banner">Loading on-chain state…</div>}
      {txStatus && <div className="banner">{txStatus}</div>}

      <nav className="tabs">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={item === tab ? 'active' : ''}
          >
            {item}
          </button>
        ))}
      </nav>

      {tab === 'Pulse' && (
        <section className="pulse-grid">
          <div className="pulse-card">
            <div className="pulse-ring" />
            <div>
              <h3>Heartbeat Pulse</h3>
              <p className="big">{Number(constitution?.total_heartbeats ?? 0)}</p>
              <p className="muted">
                Last heartbeat:{' '}
                {formatTimestamp(
                  (constitution?.last_heartbeat as string) ?? '0',
                )}
              </p>
            </div>
          </div>
          <div className="cards">
            <div className="card">
              <h3>Agent</h3>
              <p className="big">{name || 'Unnamed agent'}</p>
              <p className="muted">{description || 'No description set'}</p>
            </div>
            <div className="card">
              <h3>Status</h3>
              <p className={`big ${constitution?.is_alive ? 'ok' : 'bad'}`}>
                {constitution?.is_alive ? 'Alive' : 'Killed'}
              </p>
              <p className="muted">
                Last heartbeat:{' '}
                {formatTimestamp(
                  (constitution?.last_heartbeat as string) ?? '0',
                )}
              </p>
            </div>
            <div className="card">
              <h3>Treasury</h3>
              <p className="big">
                {formatMist(constitution?.treasury?.value ?? 0)} SUI
              </p>
              <p className="muted">
                Total spent:{' '}
                {formatMist(constitution?.total_spent_all_time ?? 0)} SUI
              </p>
            </div>
            <div className="card">
              <h3>Budgets</h3>
              <p className="big">
                {formatMist(constitution?.daily_spend_limit ?? 0)} daily
              </p>
              <p className="muted">
                {formatMist(constitution?.per_action_limit ?? 0)} per action
              </p>
            </div>
            <div className="card">
              <h3>Registry</h3>
              <p className="big">{Number(registry?.total_agents ?? 0)}</p>
              <p className="muted">
                Total actions: {Number(registry?.total_actions ?? 0)}
              </p>
            </div>
            <div className="card">
              <h3>Counts</h3>
              <p className="big">
                {Number(constitution?.total_actions ?? 0)} actions
              </p>
              <p className="muted">
                {Number(constitution?.total_heartbeats ?? 0)} heartbeats
              </p>
            </div>
          </div>
        </section>
      )}

      {tab === 'Actions' && (
        <section className="grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Action Feed</h2>
              <select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="HeartbeatLogged">Heartbeats</option>
                <option value="ActionReported">Action Reports</option>
                <option value="SpendAuthorized">Spend Authorized</option>
                <option value="SpendDenied">Spend Denied</option>
                <option value="TreasuryFunded">Treasury Funded</option>
                <option value="TreasuryWithdrawn">Treasury Withdrawn</option>
                <option value="AgentKilled">Agent Killed</option>
                <option value="AgentRevived">Agent Revived</option>
              </select>
            </div>
            <div className="table">
              {filteredActivity.length === 0 && (
                <p className="muted">No events yet.</p>
              )}
              {filteredActivity.map((event, index) => {
                const parsed = (event.parsedJson ?? {}) as Record<string, any>
                const timestamp =
                  Number(event.timestampMs) || Number(parsed.timestamp ?? 0)
                return (
                  <div className="row" key={`${event.id?.txDigest}-${index}`}>
                    <div className="cell">
                      <span className="tag">
                        {event.type?.split('::').pop()}
                      </span>
                      <p className="muted">
                        {formatTimestamp(timestamp || '0')}
                      </p>
                    </div>
                    <div className="cell">
                      {parsed.category && (
                        <p>
                          <strong>Category:</strong>{' '}
                          {decodeBytes(parsed.category)}
                        </p>
                      )}
                      {parsed.action_type && (
                        <p>
                          <strong>Action:</strong>{' '}
                          {decodeBytes(parsed.action_type)}
                        </p>
                      )}
                      {parsed.amount && (
                        <p>
                          <strong>Amount:</strong>{' '}
                          {formatMist(parsed.amount ?? 0)} SUI
                        </p>
                      )}
                      {parsed.reason && (
                        <p>
                          <strong>Reason:</strong>{' '}
                          {decodeBytes(parsed.reason)}
                        </p>
                      )}
                      {parsed.walrus_blob_id && (
                        <p className="muted">
                          Walrus:{' '}
                          {decodeBytes(parsed.walrus_blob_id).slice(0, 14)}…
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="panel">
            <h2>Heartbeat Stream</h2>
            <div className="table compact">
              {heartbeats.length === 0 && (
                <p className="muted">No heartbeats yet.</p>
              )}
              {heartbeats.map((event, index) => {
                const parsed = (event.parsedJson ?? {}) as Record<string, any>
                return (
                  <div className="row" key={`${event.id?.txDigest}-${index}`}>
                    <div className="cell">
                      <p className="big">#{parsed.heartbeat_number ?? '—'}</p>
                      <p className="muted">
                        {formatTimestamp(parsed.timestamp ?? '0')}
                      </p>
                    </div>
                    <div className="cell">
                      <p>
                        Treasury:{' '}
                        {formatMist(parsed.treasury_balance ?? 0)} SUI
                      </p>
                      <p className="muted">
                        Walrus {decodeBytes(parsed.walrus_blob_id).slice(0, 16)}…
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {tab === 'Capabilities' && (
        <section className="grid">
          <div className="panel">
            <h2>Action Catalog</h2>
            <div className="table">
              {actionCatalog.map((item) => (
                <div className="row" key={item.name}>
                  <div className="cell">
                    <p className="big">{item.name}</p>
                    <p className="muted">{item.description}</p>
                  </div>
                  <div className="cell status-cell">
                    <span className={`status ${item.status}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>Signals Feeding the Agent</h2>
            <ul className="list">
              <li>Wallet balance monitor</li>
              <li>Server uptime & latency</li>
              <li>Gas burn + refill prediction</li>
              <li>Policy and budget enforcement</li>
            </ul>
          </div>
        </section>
      )}

      {tab === 'Constitution' && (
        <section className="grid">
          <div className="panel">
            <h2>Budget Guardrails</h2>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${dailyProgress}%` }} />
            </div>
            <p className="muted">
              {formatMist(dailySpent)} / {formatMist(dailyLimitValue)} SUI spent
              today
            </p>
            <div className="inline-actions">
              <input
                value={dailyLimit}
                onChange={(event) => setDailyLimit(event.target.value)}
                placeholder="Daily limit (SUI)"
              />
              <input
                value={perActionLimit}
                onChange={(event) => setPerActionLimit(event.target.value)}
                placeholder="Per action (SUI)"
              />
              <button onClick={onUpdateBudgets} disabled={!account}>
                Update limits
              </button>
            </div>
          </div>
          <div className="panel">
            <h2>Agent Identity</h2>
            <p>
              <strong>Name:</strong> {name || 'Unnamed agent'}
            </p>
            <p>
              <strong>Owner:</strong> {constitution?.owner ?? '—'}
            </p>
            <p>
              <strong>Agent:</strong> {constitution?.agent ?? '—'}
            </p>
            <p>
              <strong>Description:</strong>{' '}
              {description || 'No description set'}
            </p>
          </div>
        </section>
      )}

      {tab === 'Treasury' && (
        <section className="grid">
          <div className="panel">
            <h2>Fund Treasury</h2>
            <div className="inline-actions">
              <input
                value={fundAmount}
                onChange={(event) => setFundAmount(event.target.value)}
                placeholder="Fund amount (SUI)"
              />
              <button onClick={onFund} disabled={!account}>
                Fund treasury
              </button>
            </div>
            <div className="inline-actions">
              <input
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="Withdraw amount (SUI)"
              />
              <button onClick={onWithdraw} disabled={!account}>
                Withdraw
              </button>
            </div>
            <p className="muted">
              Current balance: {formatMist(constitution?.treasury?.value ?? 0)} SUI
            </p>
          </div>
          <div className="panel">
            <h2>Fund & Withdraw History</h2>
            <div className="table compact">
              {[...treasuryFunded, ...treasuryWithdrawn].length === 0 && (
                <p className="muted">No treasury events yet.</p>
              )}
              {[...treasuryFunded, ...treasuryWithdrawn]
                .sort((a, b) =>
                  Number(b.timestampMs ?? 0) - Number(a.timestampMs ?? 0),
                )
                .slice(0, 12)
                .map((event, index) => {
                  const parsed = (event.parsedJson ?? {}) as Record<string, any>
                  const amount = parsed.amount ?? 0
                  return (
                    <div className="row" key={`${event.id?.txDigest}-${index}`}>
                      <div className="cell">
                        <span className="tag">
                          {event.type?.split('::').pop()}
                        </span>
                        <p className="muted">
                          {formatTimestamp(parsed.timestamp ?? '0')}
                        </p>
                      </div>
                      <div className="cell">
                        <p className="big">{formatMist(amount)} SUI</p>
                        {parsed.new_balance && (
                          <p className="muted">
                            New balance: {formatMist(parsed.new_balance)} SUI
                          </p>
                        )}
                        {parsed.remaining && (
                          <p className="muted">
                            Remaining: {formatMist(parsed.remaining)} SUI
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </section>
      )}

      <section className="grid">
        <div className="panel">
          <h2>Spend Authorizations</h2>
          <div className="table compact">
            {spendApproved.length === 0 && (
              <p className="muted">No approvals yet.</p>
            )}
            {spendApproved.map((event, index) => {
              const parsed = (event.parsedJson ?? {}) as Record<string, any>
              return (
                <div className="row" key={`${event.id?.txDigest}-${index}`}>
                  <div className="cell">
                    <p className="big">{formatMist(parsed.amount ?? 0)} SUI</p>
                    <p className="muted">
                      {formatTimestamp(parsed.timestamp ?? '0')}
                    </p>
                  </div>
                  <div className="cell">
                    <p>Category: {decodeBytes(parsed.category)}</p>
                    <p className="muted">
                      Remaining daily: {formatMist(parsed.remaining_daily ?? 0)} SUI
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="panel">
          <h2>Spend Denials</h2>
          <div className="table compact">
            {spendDenied.length === 0 && <p className="muted">No denials yet.</p>}
            {spendDenied.map((event, index) => {
              const parsed = (event.parsedJson ?? {}) as Record<string, any>
              return (
                <div className="row" key={`${event.id?.txDigest}-${index}`}>
                  <div className="cell">
                    <p className="big">{formatMist(parsed.amount ?? 0)} SUI</p>
                    <p className="muted">
                      {formatTimestamp(parsed.timestamp ?? '0')}
                    </p>
                  </div>
                  <div className="cell">
                    <p>Category: {decodeBytes(parsed.category)}</p>
                    <p className="muted">{decodeBytes(parsed.reason)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
