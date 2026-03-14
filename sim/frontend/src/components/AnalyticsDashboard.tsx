'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { AnalyticsSummary, RelationshipGraph as RelGraphType, Character } from '@/lib/types';
import {
  getAnalyticsSummary,
  getRelationshipGraph,
  getEventFrequency,
  getResourceTrends,
  getExportJsonUrl,
  getExportCsvUrl,
  getSimulation,
} from '@/lib/api';

interface AnalyticsDashboardProps {
  simId: string;
  onClose: () => void;
}

export default function AnalyticsDashboard({ simId, onClose }: AnalyticsDashboardProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [graph, setGraph] = useState<RelGraphType | null>(null);
  const [eventFreq, setEventFreq] = useState<Record<string, number> | null>(null);
  const [characters, setCharacters] = useState<Record<string, Character>>({});
  const [resourceTrends, setResourceTrends] = useState<Record<string, { tick: number; name: string; energy: number; wealth: number; influence: number; health: number; alive: boolean }[]> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAnalyticsSummary(simId).catch(() => null),
      getRelationshipGraph(simId).catch(() => null),
      getEventFrequency(simId).catch(() => null),
      getSimulation(simId).catch(() => null),
      getResourceTrends(simId).catch(() => null),
    ]).then(([s, g, ef, sim, rt]) => {
      setSummary(s);
      setGraph(g);
      setEventFreq(ef);
      if (sim) setCharacters(sim.characters);
      setResourceTrends(rt);
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

  // Wealth distribution: top 10 wealthiest
  const charList = Object.values(characters);
  const wealthiestChars = [...charList]
    .filter(c => c.alive)
    .sort((a, b) => (b.resources?.wealth ?? 0) - (a.resources?.wealth ?? 0))
    .slice(0, 10);
  const maxWealth = wealthiestChars.length > 0 ? Math.max(...wealthiestChars.map(c => c.resources?.wealth ?? 0), 1) : 1;

  // Most influential: top 10 by influence resource
  const influentialChars = [...charList]
    .filter(c => c.alive)
    .sort((a, b) => (b.resources?.influence ?? 0) - (a.resources?.influence ?? 0))
    .slice(0, 10);
  const maxInfluence = influentialChars.length > 0 ? Math.max(...influentialChars.map(c => c.resources?.influence ?? 0), 1) : 1;

  // Most connected: top 10 by number of relationships
  const connectedChars = [...charList]
    .filter(c => c.alive)
    .sort((a, b) => Object.keys(b.relationships || {}).length - Object.keys(a.relationships || {}).length)
    .slice(0, 10);
  const maxConnections = connectedChars.length > 0 ? Math.max(...connectedChars.map(c => Object.keys(c.relationships || {}).length), 1) : 1;

  // Death causes
  const deadChars = charList.filter(c => !c.alive && c.cause_of_death);
  const deathCauses: Record<string, number> = {};
  for (const c of deadChars) {
    const cause = c.cause_of_death || 'unknown';
    deathCauses[cause] = (deathCauses[cause] || 0) + 1;
  }
  const deathEntries = Object.entries(deathCauses).sort((a, b) => b[1] - a[1]);
  const maxDeathCount = deathEntries.length > 0 ? Math.max(...deathEntries.map(e => e[1])) : 1;

  // Population over time from resource trends
  const popOverTime = computePopulationOverTime(resourceTrends);

  // Action frequency from last actions
  const actionFreq: Record<string, number> = {};
  for (const c of charList) {
    if (c.last_action) {
      actionFreq[c.last_action.type] = (actionFreq[c.last_action.type] || 0) + 1;
    }
  }
  const actionEntries = Object.entries(actionFreq).sort((a, b) => b[1] - a[1]);
  const maxActionCount = actionEntries.length > 0 ? Math.max(...actionEntries.map(e => e[1])) : 1;

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

          {/* Population Over Time Line Chart */}
          {popOverTime.length > 1 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Population Over Time</div>
              <PopulationChart data={popOverTime} />
            </div>
          )}

          {/* Wealth Distribution */}
          {wealthiestChars.length > 0 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Top 10 Wealthiest</div>
              <div className="space-y-1">
                {wealthiestChars.map((c, i) => {
                  const w = c.resources?.wealth ?? 0;
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="font-pixel w-4 text-right text-pixel-text-dim" style={{ fontSize: '7px' }}>{i + 1}</span>
                      <span className="font-pixel w-24 truncate text-pixel-text" style={{ fontSize: '7px' }}>
                        {c.name}
                      </span>
                      <div className="flex-1" style={{ height: '8px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                        <div style={{ width: `${(w / maxWealth) * 100}%`, height: '100%', background: '#ffd700' }} />
                      </div>
                      <span className="font-pixel w-12 text-right text-neon-gold" style={{ fontSize: '7px' }}>
                        {Math.round(w)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Most Influential */}
          {influentialChars.length > 0 && influentialChars[0].resources?.influence !== undefined && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Top 10 Most Influential</div>
              <div className="space-y-1">
                {influentialChars.map((c, i) => {
                  const inf = c.resources?.influence ?? 0;
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="font-pixel w-4 text-right text-pixel-text-dim" style={{ fontSize: '7px' }}>{i + 1}</span>
                      <span className="font-pixel w-24 truncate text-pixel-text" style={{ fontSize: '7px' }}>
                        {c.name}
                      </span>
                      <div className="flex-1" style={{ height: '8px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                        <div style={{ width: `${(inf / maxInfluence) * 100}%`, height: '100%', background: '#aa44ff' }} />
                      </div>
                      <span className="font-pixel w-12 text-right" style={{ fontSize: '7px', color: '#aa44ff' }}>
                        {Math.round(inf)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Most Connected */}
          {connectedChars.length > 0 && Object.keys(connectedChars[0].relationships || {}).length > 0 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Most Connected</div>
              <div className="space-y-1">
                {connectedChars.map((c, i) => {
                  const cnt = Object.keys(c.relationships || {}).length;
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="font-pixel w-4 text-right text-pixel-text-dim" style={{ fontSize: '7px' }}>{i + 1}</span>
                      <span className="font-pixel w-24 truncate text-pixel-text" style={{ fontSize: '7px' }}>
                        {c.name}
                      </span>
                      <div className="flex-1" style={{ height: '8px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                        <div style={{ width: `${(cnt / maxConnections) * 100}%`, height: '100%', background: '#44ccff' }} />
                      </div>
                      <span className="font-pixel w-12 text-right" style={{ fontSize: '7px', color: '#44ccff' }}>
                        {cnt}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Frequency */}
          {actionEntries.length > 0 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Action Frequency (Current Tick)</div>
              <div className="space-y-1">
                {actionEntries.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="font-pixel w-28 truncate text-pixel-text" style={{ fontSize: '7px' }}>
                      {type}
                    </span>
                    <div className="flex-1" style={{ height: '8px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                      <div style={{ width: `${(count / maxActionCount) * 100}%`, height: '100%', background: '#00e5ff' }} />
                    </div>
                    <span className="font-pixel w-8 text-right" style={{ fontSize: '7px', color: '#00e5ff' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Breakdown */}
          {eventEntries.length > 0 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Events by Type (All Time)</div>
              <div className="space-y-1">
                {eventEntries.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="font-pixel w-28 truncate text-pixel-text" style={{ fontSize: '7px' }}>
                      {type}
                    </span>
                    <div className="flex-1" style={{ height: '8px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                      <div style={{ width: `${(count / maxEventCount) * 100}%`, height: '100%', background: '#ff00aa' }} />
                    </div>
                    <span className="font-pixel w-8 text-right text-neon-gold" style={{ fontSize: '7px' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Death Causes */}
          {deathEntries.length > 0 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Death Causes</div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  {deathEntries.map(([cause, count]) => (
                    <div key={cause} className="flex items-center gap-2">
                      <span className="font-pixel w-28 truncate text-pixel-text" style={{ fontSize: '7px' }}>
                        {cause}
                      </span>
                      <div className="flex-1" style={{ height: '8px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                        <div style={{ width: `${(count / maxDeathCount) * 100}%`, height: '100%', background: '#ff3366' }} />
                      </div>
                      <span className="font-pixel w-8 text-right" style={{ fontSize: '7px', color: '#ff3366' }}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
                <DeathPieChart entries={deathEntries} total={deadChars.length} />
              </div>
            </div>
          )}

          {/* Relationship Network */}
          {graph && graph.edges.length > 0 && (
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-3" style={{ fontSize: '9px' }}>Relationship Network</div>
              <div className="space-y-1" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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

function computePopulationOverTime(
  trends: Record<string, { tick: number; alive: boolean }[]> | null
): { tick: number; alive: number; total: number }[] {
  if (!trends) return [];
  const allCharTrends = Object.values(trends);
  if (allCharTrends.length === 0) return [];

  // Collect all ticks
  const tickSet = new Set<number>();
  for (const entries of allCharTrends) {
    for (const e of entries) tickSet.add(e.tick);
  }
  const ticks = [...tickSet].sort((a, b) => a - b);

  return ticks.map(tick => {
    let alive = 0;
    let total = 0;
    for (const entries of allCharTrends) {
      const entry = entries.find(e => e.tick === tick);
      if (entry) {
        total++;
        if (entry.alive) alive++;
      }
    }
    return { tick, alive, total };
  });
}

function PopulationChart({ data }: { data: { tick: number; alive: number; total: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 10, right: 10, bottom: 20, left: 30 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxPop = Math.max(...data.map(d => d.total), 1);
    const minTick = data[0].tick;
    const maxTick = data[data.length - 1].tick;
    const tickRange = Math.max(maxTick - minTick, 1);

    const toX = (tick: number) => pad.left + ((tick - minTick) / tickRange) * cw;
    const toY = (val: number) => pad.top + ch - (val / maxPop) * ch;

    // Grid lines
    ctx.strokeStyle = '#1a1a3a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    // Total line (darker)
    ctx.beginPath();
    ctx.strokeStyle = '#ffd70060';
    ctx.lineWidth = 1;
    for (let i = 0; i < data.length; i++) {
      const x = toX(data[i].tick);
      const y = toY(data[i].total);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Alive line
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    for (let i = 0; i < data.length; i++) {
      const x = toX(data[i].tick);
      const y = toY(data[i].alive);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill under alive line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = toX(data[i].tick);
      const y = toY(data[i].alive);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(toX(data[data.length - 1].tick), pad.top + ch);
    ctx.lineTo(toX(data[0].tick), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,255,136,0.08)';
    ctx.fill();

    // Axes labels
    ctx.font = '7px monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText(`T${minTick}`, pad.left, h - 4);
    ctx.fillText(`T${maxTick}`, w - pad.right, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText('0', pad.left - 4, pad.top + ch);
    ctx.fillText(String(maxPop), pad.left - 4, pad.top + 4);

    // Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('Alive', pad.left + 4, pad.top + 8);
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Total', pad.left + 40, pad.top + 8);
  }, [data]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={120}
      style={{ width: '100%', height: '120px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}
    />
  );
}

const PIE_COLORS = ['#ff3366', '#ff6644', '#ff9922', '#ffcc00', '#88cc44', '#44ccaa', '#4488ff', '#8844ff', '#cc44aa', '#888888'];

function DeathPieChart({ entries, total }: { entries: [string, number][]; total: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || entries.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 20;

    ctx.clearRect(0, 0, size, size);

    let startAngle = -Math.PI / 2;
    entries.forEach(([cause, count], i) => {
      const slice = (count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#0a0a1a';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      if (slice > 0.3) {
        const mid = startAngle + slice / 2;
        const lx = cx + (r * 0.6) * Math.cos(mid);
        const ly = cy + (r * 0.6) * Math.sin(mid);
        ctx.font = '7px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round((count / total) * 100)}%`, lx, ly);
      }

      startAngle += slice;
    });

    // Legend
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    entries.slice(0, 5).forEach(([cause], i) => {
      const ly = size - 14 + (i < 3 ? 0 : 0);
      // Skip legend if too many, it's shown in the bars
    });
  }, [entries, total]);

  useEffect(() => { draw(); }, [draw]);

  if (entries.length === 0) return null;

  return (
    <div className="shrink-0">
      <canvas
        ref={canvasRef}
        width={100}
        height={100}
        style={{ width: '100px', height: '100px' }}
      />
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
