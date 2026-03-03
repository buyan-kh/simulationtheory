'use client';

import type { Group, Character } from '@/lib/types';

interface GroupPanelProps {
  groups: Record<string, Group>;
  characters: Record<string, Character>;
}

const ROLE_ICONS: Record<string, string> = {
  leader: '♛',
  officer: '♦',
  member: '►',
};

export default function GroupPanel({ groups, characters }: GroupPanelProps) {
  const activeGroups = Object.values(groups).filter(g => !g.dissolved);
  const dissolvedGroups = Object.values(groups).filter(g => g.dissolved);

  return (
    <div className="pixel-panel flex flex-col h-full">
      <div className="pixel-panel-title">Groups ({activeGroups.length})</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 pixel-scrollbar">
        {activeGroups.length === 0 && (
          <div className="text-center py-8 font-pixel text-pixel-text-dim" style={{ fontSize: '8px' }}>
            No groups formed yet
          </div>
        )}
        {activeGroups.map(group => {
          const leader = group.leader_id ? characters[group.leader_id] : null;
          return (
            <div
              key={group.id}
              className="p-2"
              style={{ background: '#0a0a1a', border: '1px solid #44ccff' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-pixel" style={{ fontSize: '9px', color: '#44ccff' }}>⚑</span>
                <span className="font-pixel text-pixel-text truncate" style={{ fontSize: '8px' }}>
                  {group.name}
                </span>
              </div>
              {leader && (
                <div className="mb-1">
                  <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>
                    Leader: <span style={{ color: '#ffd700' }}>{leader.name}</span>
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.members.map(m => {
                  const char = characters[m.character_id];
                  if (!char) return null;
                  return (
                    <div key={m.character_id} className="flex items-center gap-1">
                      <span style={{ fontSize: '7px' }}>{ROLE_ICONS[m.role] || '►'}</span>
                      <span
                        className="font-pixel flex-1 truncate"
                        style={{ fontSize: '7px', color: char.alive ? '#aaa' : '#555' }}
                      >
                        {char.name}
                      </span>
                      <span className="font-pixel" style={{ fontSize: '6px', color: m.loyalty > 0.6 ? '#00ff88' : m.loyalty < 0.3 ? '#ff3366' : '#ffaa44' }}>
                        {Math.round(m.loyalty * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {group.rival_group_ids.length > 0 && (
                <div className="mt-1">
                  <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>
                    Rivals: {group.rival_group_ids.map(rid => groups[rid]?.name || '?').join(', ')}
                  </span>
                </div>
              )}
              {group.goals.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {group.goals.map((g, i) => (
                    <span key={i} className="pixel-badge font-pixel" style={{ fontSize: '5px', borderColor: '#44ccff', color: '#44ccff' }}>
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {dissolvedGroups.length > 0 && (
          <>
            <div className="font-pixel text-pixel-text-dim mt-2" style={{ fontSize: '7px' }}>
              Dissolved ({dissolvedGroups.length})
            </div>
            {dissolvedGroups.map(group => (
              <div
                key={group.id}
                className="p-2 opacity-40"
                style={{ background: '#0a0a1a', border: '1px solid #2a2a5a' }}
              >
                <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>
                  {group.name} (T{group.dissolved_tick})
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
