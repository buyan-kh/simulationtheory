'use client';

import { useState } from 'react';
import type { SimEvent, EventType } from '@/lib/types';

interface EventLogProps {
  events: SimEvent[];
}

const EVENT_STYLES: Record<EventType, { color: string; icon: string }> = {
  conflict: { color: '#ff3366', icon: '⚔' },
  alliance_formed: { color: '#00ff88', icon: '🛡' },
  negotiation: { color: '#ff8844', icon: '🤝' },
  interaction: { color: '#00e5ff', icon: '💬' },
  environmental: { color: '#ffd700', icon: '☁' },
  emergent: { color: '#ff00aa', icon: '✦' },
  resource_change: { color: '#4488ff', icon: '💎' },
  decision: { color: '#d0d0e0', icon: '►' },
  emotional_shift: { color: '#aa44ff', icon: '💜' },
};

export default function EventLog({ events }: EventLogProps) {
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const sorted = [...filtered].sort((a, b) => b.tick - a.tick || b.importance - a.importance);

  return (
    <div className="pixel-panel flex flex-col h-full">
      <div className="pixel-panel-title flex items-center justify-between">
        <span>Events</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EventType | 'all')}
          className="pixel-select"
          style={{ fontSize: '8px', padding: '2px 6px' }}
        >
          <option value="all">ALL</option>
          {Object.keys(EVENT_STYLES).map((type) => (
            <option key={type} value={type}>{type.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 pixel-scrollbar">
        {sorted.length === 0 && (
          <div className="text-center py-8 font-pixel text-pixel-text-dim" style={{ fontSize: '8px' }}>
            No events yet
          </div>
        )}
        {sorted.map((event) => {
          const style = EVENT_STYLES[event.type] || EVENT_STYLES.decision;
          const isExpanded = expanded === event.id;
          const isImportant = event.importance > 0.7;

          return (
            <div
              key={event.id}
              className={`p-2 cursor-pointer ${isImportant ? 'glow-gold' : ''}`}
              onClick={() => setExpanded(isExpanded ? null : event.id)}
              style={{
                background: '#0a0a1a',
                border: `1px solid ${isImportant ? style.color : '#2a2a5a'}`,
                boxShadow: isImportant ? `0 0 6px ${style.color}40` : 'none',
              }}
            >
              <div className="flex items-start gap-2">
                <span style={{ fontSize: '10px' }}>{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel truncate" style={{ fontSize: '8px', color: style.color }}>
                      {event.title}
                    </span>
                    <span className="font-pixel text-pixel-text-dim shrink-0" style={{ fontSize: '7px' }}>
                      T{event.tick}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 space-y-1">
                      <p className="font-pixel text-pixel-text-dim leading-relaxed" style={{ fontSize: '7px' }}>
                        {event.description}
                      </p>
                      {event.outcomes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {event.outcomes.map((o, i) => (
                            <span
                              key={i}
                              className="pixel-badge font-pixel"
                              style={{ fontSize: '6px', borderColor: '#2a2a5a', color: '#6a6a8a' }}
                            >
                              {o}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {isImportant && (
                  <span className="font-pixel animate-pixel-blink" style={{ fontSize: '8px', color: '#ff00aa' }}>!</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
