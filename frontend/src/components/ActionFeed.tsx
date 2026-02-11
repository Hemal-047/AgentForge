import { useEffect, useMemo, useState } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'
import { PACKAGE_ID } from '../config'
import { decodeBytes, formatMist, formatTimestamp } from '../utils/format'

type ActionEntry = {
  type: string
  isSpend: boolean
  amount?: string
  category?: string
  hash?: string
  walrusBlobId?: string
  timestamp?: string
  denied?: boolean
  reason?: string
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'spending', label: 'Spending' },
  { id: 'denied', label: 'Denied' },
  { id: 'system', label: 'System' },
]

export default function ActionFeed() {
  const suiClient = useSuiClient()
  const [actions, setActions] = useState<ActionEntry[]>([])
  const [filter, setFilter] = useState('all')

  const fetchActions = async () => {
    try {
      const [spendEvents, denyEvents, actionEvents] = await Promise.all([
        suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::constitution::SpendAuthorized` },
          limit: 20,
          order: 'descending',
        }),
        suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::constitution::SpendDenied` },
          limit: 20,
          order: 'descending',
        }),
        suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::constitution::ActionReported` },
          limit: 20,
          order: 'descending',
        }),
      ])

      const all: ActionEntry[] = []
      spendEvents.data.forEach((e: any) => {
        const f = e.parsedJson
        all.push({
          type: 'spend_authorized',
          isSpend: true,
          amount: String(f.amount),
          category: decodeBytes(f.category),
          hash: decodeBytes(f.reason_hash),
          walrusBlobId: decodeBytes(f.walrus_blob_id),
          timestamp: formatTimestamp(f.timestamp),
        })
      })
      denyEvents.data.forEach((e: any) => {
        const f = e.parsedJson
        all.push({
          type: 'spend_denied',
          isSpend: true,
          denied: true,
          amount: String(f.amount),
          category: decodeBytes(f.category),
          reason: decodeBytes(f.reason),
          timestamp: formatTimestamp(f.timestamp),
        })
      })
      actionEvents.data.forEach((e: any) => {
        const f = e.parsedJson
        all.push({
          type: decodeBytes(f.action_type),
          isSpend: false,
          hash: decodeBytes(f.action_hash),
          walrusBlobId: decodeBytes(f.walrus_blob_id),
          timestamp: formatTimestamp(f.timestamp),
        })
      })

      all.sort((a, b) =>
        Number(new Date(b.timestamp ?? '').getTime()) -
        Number(new Date(a.timestamp ?? '').getTime()),
      )
      setActions(all)
    } catch (error) {
      console.error('Failed to fetch actions:', error)
    }
  }

  useEffect(() => {
    fetchActions()
    const interval = setInterval(fetchActions, 5000)
    return () => clearInterval(interval)
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return actions
    if (filter === 'spending') return actions.filter((a) => a.isSpend && !a.denied)
    if (filter === 'denied') return actions.filter((a) => a.denied)
    return actions.filter((a) => !a.isSpend)
  }, [actions, filter])

  return (
    <div className="space-y-6">
      <div className="panel-header">
        <div>
          <h2>Action Feed</h2>
          <p className="muted">Every action the agent takes, verified on-chain</p>
        </div>
        <div className="filter-group">
          {filters.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={filter === item.id ? 'active' : ''}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table">
        {filtered.map((action, i) => (
          <div
            key={`${action.type}-${i}`}
            className={`row ${
              action.denied ? 'row-denied' : action.isSpend ? 'row-spend' : 'row-action'
            }`}
          >
            <div className="cell">
              <div className="action-title">
                <span>
                  {action.denied ? '🚫' : action.isSpend ? '💸' : '⚡'}
                </span>
                <span className="big">{action.type}</span>
                {action.category && (
                  <span className="tag">{action.category}</span>
                )}
              </div>
              <p className="muted">{action.timestamp}</p>
            </div>
            <div className="cell">
              {action.amount && (
                <p>
                  Amount: {formatMist(action.amount)} SUI{' '}
                  {action.denied && (
                    <span className="denied">DENIED: {action.reason}</span>
                  )}
                </p>
              )}
              {action.walrusBlobId && (
                <p className="muted">
                  Walrus {action.walrusBlobId.slice(0, 16)}…
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
