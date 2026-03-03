'use client';

import { useEffect, useState } from 'react';
import type { AnalyticsSummary, RelationshipGraph } from '@/lib/types';
import {
  getAnalyticsSummary,
  getRelationshipGraph,
  getEventFrequency,
  getExportJsonUrl,
  getExportCsvUrl,
} from '@/lib/api';

interface AnalyticsDashboardProps {
  simId: string;
  onClose: () => void;
}

export default function AnalyticsDashboard({ simId, onClose }: AnalyticsDashboardProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [graph, setGraph] = useState<RelationshipGraph | null>(null);
  const [eventFreq, setEventFreq] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAnalyticsSummary(simId).catch(() => null),
      getRelationshipGraph(simId).catch(() => null),
      getEventFrequency(simId).catch(() => null),
    ]).then(([s, g, ef]) => {
      setSummary(s);
      setGraph(g);
      setEventFreq(ef);
      setLoading(false);
    });
  }, [simId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div className="font-pixel text-neon-cyan animate-pixel-blink" style={{ fontSize: '10px' }}>
          Loading analytics...
        </div>
      </div>
    );
  }

  const eventEntries = summary?.events_by_type
    ? Object.entries(summary.events_by_type).sort((a, b) => b[1] - a[1])
    : [];

  const maxEventCount = eventEntries.length > 0 ? Math.max(...eventEntries.map(e => e[1])) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div
        className="pixel-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto pixel-scrollbar"
        style={{ borderColor: '#ff00aa' }}
      >
        <div className="pixel-panel-title flex items-center justify-between">
          <span>Analytics Dashboard</span>
          <button onClick={onClose} className="pixel-btn pixel-btn-red" style={{ fontSize: '7px', padding: '2px 6px' }}>
            CLOSE
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Summary Stats */}
          {summary && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Overview</div>
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Ticks" value={summary.total_ticks} color="#00e5ff" />
                <StatCard label="Alive" value={summary.alive_characters} color="#00ff88" />
                <StatCard label="Dead" value={summary.dead_characters} color="#ff3366" />
                <StatCard label="Events" value={summary.total_events} color="#ffd700" />
                <StatCard label="Groups" value={summary.total_groups} color="#44ccff" />
                <StatCard label="Avg Rel" value={summary.avg_relationship.toFixed(2)} color="#aa44ff" />
                <StatCard label="Top Influence" value={summary.most_influential || '-'} color="#ffd700" small />
                <StatCard label="Wealthiest" value={summary.wealthiest || '-'} color="#00ff88" small />
              </div>
            </div>
          )}

          {/* Event Breakdown */}
          {eventEntries.length > 0 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Events by Type</div>
              <div className="space-y-1">
                {eventEntries.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="font-pixel w-28 truncate text-pixel-text" style={{ fontSize: '7px' }}>
                      {type}
                    </span>
                    <div className="flex-1" style={{ height: '8px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                      <div
                        style={{
                          width: `${(count / maxEventCount) * 100}%`,
                          height: '100%',
                          background: '#ff00aa',
                        }}
                      />
                    </div>
                    <span className="font-pixel w-8 text-right text-neon-gold" style={{ fontSize: '7px' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationship Network */}
          {graph && graph.edges.length > 0 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Relationship Network</div>
              <div className="space-y-1">
                {graph.edges.map((edge, i) => {
                  const src = graph.nodes.find(n => n.id === edge.source);
                  const tgt = graph.nodes.find(n => n.id === edge.target);
                  return (
                    <div key={i} className="flex items-center gap-2 px-2 py-0.5"
                      style={{ background: '#0a0a1a' }}>
                      <span className="font-pixel w-20 truncate" style={{ fontSize: '7px', color: src?.alive ? '#ddd' : '#666' }}>
                        {src?.name || '?'}
                      </span>
                      <div className="flex-1 flex items-center">
                        <div style={{
                          height: '2px',
                          width: `${Math.abs(edge.weight) * 100}%`,
                          background: edge.weight > 0 ? '#00ff88' : '#ff3366',
                        }} />
                      </div>
                      <span className="font-pixel w-20 truncate text-right" style={{ fontSize: '7px', color: tgt?.alive ? '#ddd' : '#666' }}>
                        {tgt?.name || '?'}
                      </span>
                      <span className="font-pixel w-8 text-right" style={{ fontSize: '6px', color: edge.weight > 0 ? '#00ff88' : '#ff3366' }}>
                        {edge.weight > 0 ? '+' : ''}{(edge.weight * 100).toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Export */}
          <div>
            <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Export</div>
            <div className="flex gap-3">
              <a href={getExportJsonUrl(simId)} download className="pixel-btn pixel-btn-cyan" style={{ fontSize: '8px', textDecoration: 'none' }}>
                Download JSON
              </a>
              <a href={getExportCsvUrl(simId)} download className="pixel-btn pixel-btn-green" style={{ fontSize: '8px', textDecoration: 'none' }}>
                Download CSV (ZIP)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, small }: { label: string; value: string | number; color: string; small?: boolean }) {
  return (
    <div className="p-2 text-center" style={{ background: '#0a0a1a', border: `1px solid ${color}40` }}>
      <div className="font-pixel" style={{ fontSize: small ? '8px' : '12px', color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="font-pixel text-pixel-text-dim uppercase" style={{ fontSize: '6px' }}>{label}</div>
    </div>
  );
}
