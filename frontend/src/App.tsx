import { useEffect, useMemo, useState } from 'react'
import { SuiClient } from '@mysten/sui/client'
import './App.css'
import { CONSTITUTION_ID, PACKAGE_ID, REGISTRY_ID, RPC_URL } from './config'
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

const client = new SuiClient({ url: RPC_URL })

function App() {
  const [constitution, setConstitution] = useState<Constitution | null>(null)
  const [registry, setRegistry] = useState<Registry | null>(null)
  const [heartbeats, setHeartbeats] = useState<AnyEvent[]>([])
  const [actions, setActions] = useState<AnyEvent[]>([])
  const [spendApproved, setSpendApproved] = useState<AnyEvent[]>([])
  const [spendDenied, setSpendDenied] = useState<AnyEvent[]>([])
  const [activity, setActivity] = useState<AnyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const explorerBase = 'https://suiexplorer.com'

  useEffect(() => {
    let mounted = true
    let timer: number | undefined

    const fetchObject = async (id: string) => {
      const res = await client.getObject({
        id,
        options: { showContent: true },
      })
      return (res.data?.content as { fields?: Record<string, unknown> })?.fields
    }

    const fetchEvents = async (eventType: string, limit = 15) => {
      const res = await client.queryEvents({
        query: { MoveEventType: eventType },
        order: 'descending',
        limit,
      })
      return res.data as AnyEvent[]
    }

    const refresh = async () => {
      try {
        setError(null)
        const [constitutionFields, registryFields, hb, act, spendOk, spendNo] =
          await Promise.all([
            fetchObject(CONSTITUTION_ID),
            fetchObject(REGISTRY_ID),
            fetchEvents(`${PACKAGE_ID}::constitution::HeartbeatLogged`, 12),
            fetchEvents(`${PACKAGE_ID}::constitution::ActionReported`, 12),
            fetchEvents(`${PACKAGE_ID}::constitution::SpendAuthorized`, 12),
            fetchEvents(`${PACKAGE_ID}::constitution::SpendDenied`, 12),
          ])

        if (!mounted) return
        setConstitution(constitutionFields as Constitution)
        setRegistry(registryFields as Registry)
        setHeartbeats(hb)
        setActions(act)
        setSpendApproved(spendOk)
        setSpendDenied(spendNo)

        const combined = [...hb, ...act, ...spendOk, ...spendNo]
          .map((item) => ({
            ...item,
            _timestamp:
              Number(item.timestampMs) ||
              Number((item.parsedJson?.timestamp as string) ?? 0),
          }))
          .sort((a, b) => b._timestamp - a._timestamp)
          .slice(0, 20)
        setActivity(combined)
      } catch (err) {
        console.error(err)
        if (mounted) setError('Failed to load on-chain data')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    refresh()
    timer = window.setInterval(refresh, 15000)

    return () => {
      mounted = false
      if (timer) window.clearInterval(timer)
    }
  }, [])

  const name = useMemo(() => decodeBytes(constitution?.name), [constitution?.name])
  const description = useMemo(
    () => decodeBytes(constitution?.description),
    [constitution?.description],
  )

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>AgentForge</h1>
          <p className="sub">Economically autonomous agents on Sui</p>
        </div>
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
      </header>

      {error && <div className="banner error">{error}</div>}
      {loading && <div className="banner">Loading on-chain state…</div>}

      <section className="cards">
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
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Recent Activity</h2>
          <div className="table">
            {activity.length === 0 && <p className="muted">No events yet.</p>}
            {activity.map((event, index) => {
              const parsed = event.parsedJson ?? {}
              const timestamp =
                Number(event.timestampMs) || Number(parsed.timestamp ?? 0)
              return (
                <div className="row" key={`${event.id?.txDigest}-${index}`}>
                  <div className="cell">
                    <span className="tag">{event.type?.split('::').pop()}</span>
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
                        {formatMist(parsed.amount as string)} SUI
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
          <h2>Heartbeats</h2>
          <div className="table compact">
            {heartbeats.length === 0 && <p className="muted">No heartbeats yet.</p>}
            {heartbeats.map((event, index) => {
              const parsed = event.parsedJson ?? {}
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
        <div className="panel">
          <h2>Spend Authorizations</h2>
          <div className="table compact">
            {spendApproved.length === 0 && (
              <p className="muted">No approvals yet.</p>
            )}
            {spendApproved.map((event, index) => {
              const parsed = event.parsedJson ?? {}
              return (
                <div className="row" key={`${event.id?.txDigest}-${index}`}>
                  <div className="cell">
                    <p className="big">{formatMist(parsed.amount ?? 0)} SUI</p>
                    <p className="muted">
                      {formatTimestamp(parsed.timestamp ?? '0')}
                    </p>
                  </div>
                  <div className="cell">
                    <p>
                      Category: {decodeBytes(parsed.category)}
                    </p>
                    <p className="muted">
                      Remaining daily:{' '}
                      {formatMist(parsed.remaining_daily ?? 0)} SUI
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
            {spendDenied.length === 0 && (
              <p className="muted">No denials yet.</p>
            )}
            {spendDenied.map((event, index) => {
              const parsed = event.parsedJson ?? {}
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
        <div className="panel">
          <h2>Action Reports</h2>
          <div className="table compact">
            {actions.length === 0 && (
              <p className="muted">No reported actions yet.</p>
            )}
            {actions.map((event, index) => {
              const parsed = event.parsedJson ?? {}
              return (
                <div className="row" key={`${event.id?.txDigest}-${index}`}>
                  <div className="cell">
                    <p className="big">{decodeBytes(parsed.action_type)}</p>
                    <p className="muted">
                      {formatTimestamp(parsed.timestamp ?? '0')}
                    </p>
                  </div>
                  <div className="cell">
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
    </div>
  )
}

export default App
