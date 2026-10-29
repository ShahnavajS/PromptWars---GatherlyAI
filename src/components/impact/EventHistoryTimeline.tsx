'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDate } from '@/lib/domain/formatting';

export interface EventActivityItem {
  id: string;
  eventId: string;
  actorId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  changeSummary: string;
  previousValuesJson: string | null;
  newValuesJson: string | null;
  findingsSummaryJson: string | null;
  approvedActionsJson: string | null;
  createdAt: string;
}

export default function EventHistoryTimeline({ eventId }: { eventId: string }) {
  const [history, setHistory] = useState<EventActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/history`);
      const json = await res.json();
      if (json.success && Array.isArray(json.history)) {
        setHistory(json.history);
      }
    } catch {
      // Non-critical background fetch failure
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    let ignore = false;

    fetch(`/api/events/${eventId}/history`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore && json.success && Array.isArray(json.history)) {
          setHistory(json.history);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes('GUEST')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (actionType.includes('DATE')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (actionType.includes('BUDGET')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (actionType.includes('CREATED')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100 mb-4" />
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-xl bg-slate-50" />
          <div className="h-16 animate-pulse rounded-xl bg-slate-50" />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
        <p className="text-sm">No requirement changes recorded yet. Changes will appear here with full provenance.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>📜</span>
          <span>Requirement Change & Audit Provenance</span>
        </h3>
        <button
          onClick={fetchHistory}
          className="text-xs font-semibold text-orange-600 hover:text-orange-700"
        >
          ↻ Refresh Log
        </button>
      </div>

      <div className="relative border-l-2 border-amber-200 ml-3 space-y-6">
        {history.map((item) => {
          const isExpanded = expandedId === item.id;
          let approvedActions = [];
          try {
            if (item.approvedActionsJson) {
              approvedActions = JSON.parse(item.approvedActionsJson);
            }
          } catch {
            // parse error ignored
          }

          return (
            <div key={item.id} className="relative pl-6">
              {/* Dot */}
              <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-orange-500 shadow-sm" />

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all hover:bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getActionBadgeColor(
                        item.actionType
                      )}`}
                    >
                      {item.actionType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">
                      by <strong className="text-slate-700">{item.actorId}</strong>
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(item.createdAt.split('T')[0], { format: 'short' })} at{' '}
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-800">{item.changeSummary}</p>

                {approvedActions.length > 0 && (
                  <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <span>✓</span>
                    <span>Applied {approvedActions.length} authorized side-effect adjustments</span>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="text-xs font-bold text-orange-600 hover:text-orange-800 flex items-center gap-1"
                  >
                    <span>{isExpanded ? 'Hide Technical Details' : 'View Snapshot Values'}</span>
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t border-slate-200 pt-3 text-xs space-y-2 font-mono">
                    {item.previousValuesJson && (
                      <div>
                        <span className="font-bold text-slate-500">Previous Values:</span>
                        <pre className="mt-1 rounded bg-slate-900 p-2 text-amber-300 overflow-x-auto text-[11px]">
                          {JSON.stringify(JSON.parse(item.previousValuesJson), null, 2)}
                        </pre>
                      </div>
                    )}
                    {item.newValuesJson && (
                      <div>
                        <span className="font-bold text-slate-500">New Values:</span>
                        <pre className="mt-1 rounded bg-slate-900 p-2 text-emerald-300 overflow-x-auto text-[11px]">
                          {JSON.stringify(JSON.parse(item.newValuesJson), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
