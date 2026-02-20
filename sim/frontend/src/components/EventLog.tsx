'use client';

import { useState } from 'react';
import type { SimEvent, EventType } from '@/lib/types';

interface EventLogProps {
  events: SimEvent[];
}

const EVENT_STYLES: Record<EventType, { color: string; icon: string; label: string }> = {
  interaction: { color: 'text-neon-cyan border-neon-cyan/20', icon: '💬', label: 'Interaction' },
  environmental: { color: 'text-neon-gold border-neon-gold/20', icon: '🌍', label: 'Environment' },
  decision: { color: 'text-gray-300 border-gray-600/20', icon: '🧠', label: 'Decision' },
  emergent: { color: 'text-neon-magenta border-neon-magenta/20', icon: '✨', label: 'Emergent' },
  alliance_formed: { color: 'text-neon-green border-neon-green/20', icon: '🤝', label: 'Alliance' },
  conflict: { color: 'text-neon-red border-neon-red/20', icon: '⚔️', label: 'Conflict' },
  negotiation: { color: 'text-neon-orange border-neon-orange/20', icon: '🗣️', label: 'Negotiation' },
  resource_change: { color: 'text-neon-blue border-neon-blue/20', icon: '📦', label: 'Resources' },
  emotional_shift: { color: 'text-neon-purple border-neon-purple/20', icon: '💜', label: 'Emotion' },
};

export default function EventLog({ events }: EventLogProps) {
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const sorted = [...filtered].sort((a, b) => b.tick - a.tick || b.importance - a.importance);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">Events</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EventType | 'all')}
          className="text-[10px] bg-transparent border border-white/10 rounded px-1.5 py-0.5 text-gray-400 outline-none focus:border-neon-cyan/30"
        >
          <option value="all">All</option>
          {Object.entries(EVENT_STYLES).map(([type, cfg]) => (
            <option key={type} value={type}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sorted.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-600">
            No events yet
          </div>
        )}
        {sorted.map((event) => {
          const style = EVENT_STYLES[event.type] || EVENT_STYLES.decision;
          const isExpanded = expanded === event.id;

          return (
            <div
              key={event.id}
              className={`animate-slide-in-right rounded-lg p-2 glass cursor-pointer transition-all border-l-2 ${style.color} ${
                event.importance > 0.7 ? 'bg-white/[0.03]' : ''
              }`}
              onClick={() => setExpanded(isExpanded ? null : event.id)}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs mt-0.5 shrink-0">{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300 truncate">{event.title}</span>
                    <span className="text-[9px] text-gray-600 font-mono shrink-0">t{event.tick}</span>
                  </div>
                  {isExpanded && (
                    <div className="mt-1.5 space-y-1 animate-fade-in">
                      <p className="text-[11px] text-gray-400 leading-relaxed">{event.description}</p>
                      {event.outcomes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {event.outcomes.map((o, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-gray-500">
                              {o}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {event.importance > 0.7 && (
                  <span className="text-[8px] text-neon-magenta uppercase tracking-wider shrink-0">!</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
