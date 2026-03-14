'use client';

import { useState } from 'react';
import type { ActionType, Character } from '@/lib/types';

interface GodModeProps {
  simId: string;
  characterId: string;
  characterName: string;
  allCharacters: Record<string, Character>;
  onRefresh: () => void;
}

const ACTION_TYPES: ActionType[] = [
  'cooperate', 'compete', 'negotiate', 'ally', 'betray',
  'explore', 'rest', 'gather', 'share', 'attack', 'defend',
  'observe', 'communicate', 'trade', 'form_group', 'join_group',
  'leave_group', 'build_home', 'kill', 'bully', 'learn', 'teach',
  'court', 'craft',
];

const EVENT_TYPES = [
  { value: 'weather', label: 'Weather Change' },
  { value: 'resource_boom', label: 'Resource Boom' },
  { value: 'resource_bust', label: 'Resource Bust' },
  { value: 'disaster', label: 'Natural Disaster' },
];

async function godRequest(url: string, body?: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function GodMode({ simId, characterId, characterName, allCharacters, onRefresh }: GodModeProps) {
  const [actionType, setActionType] = useState<ActionType>('gather');
  const [giftAmount, setGiftAmount] = useState(50);
  const [confirmSmite, setConfirmSmite] = useState(false);
  const [introduceTarget, setIntroduceTarget] = useState('');
  const [eventType, setEventType] = useState('weather');
  const [status, setStatus] = useState<string | null>(null);

  const otherChars = Object.values(allCharacters).filter(c => c.id !== characterId && c.alive);

  async function doAction(label: string, fn: () => Promise<unknown>) {
    setStatus(`${label}...`);
    try {
      await fn();
      setStatus(`${label} done`);
      onRefresh();
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : 'failed'}`);
    }
    setTimeout(() => setStatus(null), 2000);
  }

  const charUrl = `/api/simulations/${simId}/characters/${characterId}`;

  return (
    <div className="pixel-panel">
      <div className="pixel-panel-title flex items-center gap-2">
        <span style={{ color: '#ff3366' }}>*</span>
        <span>God Mode</span>
      </div>
      <div className="p-3 space-y-3">
        {/* Force Action */}
        <div>
          <div className="font-pixel text-pixel-text-dim uppercase mb-1" style={{ fontSize: '7px' }}>Force Action</div>
          <div className="flex gap-1">
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="pixel-select flex-1"
              style={{ fontSize: '7px', padding: '2px 4px' }}
            >
              {ACTION_TYPES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button
              onClick={() => doAction('Force', () => godRequest(`${charUrl}/force-action`, { action_type: actionType }))}
              className="pixel-btn pixel-btn-cyan"
              style={{ fontSize: '7px', padding: '2px 6px' }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Gift Wealth */}
        <div>
          <div className="font-pixel text-pixel-text-dim uppercase mb-1" style={{ fontSize: '7px' }}>Gift Wealth</div>
          <div className="flex gap-1">
            <input
              type="number"
              value={giftAmount}
              onChange={(e) => setGiftAmount(Number(e.target.value))}
              min={1}
              className="pixel-input flex-1"
              style={{ fontSize: '7px', padding: '2px 4px' }}
            />
            <button
              onClick={() => doAction('Gift', () => godRequest(`${charUrl}/gift`, { resource: 'wealth', amount: giftAmount }))}
              className="pixel-btn pixel-btn-gold"
              style={{ fontSize: '7px', padding: '2px 6px' }}
            >
              Give
            </button>
          </div>
        </div>

        {/* Introduce */}
        {otherChars.length > 0 && (
          <div>
            <div className="font-pixel text-pixel-text-dim uppercase mb-1" style={{ fontSize: '7px' }}>Introduce To</div>
            <div className="flex gap-1">
              <select
                value={introduceTarget}
                onChange={(e) => setIntroduceTarget(e.target.value)}
                className="pixel-select flex-1"
                style={{ fontSize: '7px', padding: '2px 4px' }}
              >
                <option value="">Select...</option>
                {otherChars.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!introduceTarget) return;
                  doAction('Introduce', () => godRequest(`${charUrl}/introduce`, { target_id: introduceTarget, boost: 0.3 }));
                }}
                disabled={!introduceTarget}
                className="pixel-btn"
                style={{ fontSize: '7px', padding: '2px 6px', borderColor: '#44ccff', color: '#44ccff' }}
              >
                Meet
              </button>
            </div>
          </div>
        )}

        {/* Spawn Event */}
        <div>
          <div className="font-pixel text-pixel-text-dim uppercase mb-1" style={{ fontSize: '7px' }}>Spawn Event</div>
          <div className="flex gap-1">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="pixel-select flex-1"
              style={{ fontSize: '7px', padding: '2px 4px' }}
            >
              {EVENT_TYPES.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <button
              onClick={() => doAction('Event', () => godRequest(`/api/simulations/${simId}/spawn-event`, { event_type: eventType }))}
              className="pixel-btn"
              style={{ fontSize: '7px', padding: '2px 6px', borderColor: '#ff8844', color: '#ff8844' }}
            >
              Trigger
            </button>
          </div>
        </div>

        {/* Heal & Smite */}
        <div className="flex gap-2">
          <button
            onClick={() => doAction('Heal', () => godRequest(`${charUrl}/heal`))}
            className="pixel-btn pixel-btn-green flex-1"
            style={{ fontSize: '7px', padding: '3px 6px' }}
          >
            Heal
          </button>

          {!confirmSmite ? (
            <button
              onClick={() => setConfirmSmite(true)}
              className="pixel-btn pixel-btn-red flex-1"
              style={{ fontSize: '7px', padding: '3px 6px' }}
            >
              Smite
            </button>
          ) : (
            <button
              onClick={() => {
                setConfirmSmite(false);
                doAction('Smite', () => godRequest(`${charUrl}/smite`));
              }}
              className="pixel-btn flex-1 animate-pixel-blink"
              style={{ fontSize: '7px', padding: '3px 6px', background: '#ff1144', color: '#fff', border: '2px solid #ff3366' }}
            >
              CONFIRM KILL?
            </button>
          )}
        </div>

        {status && (
          <div className="font-pixel text-center" style={{ fontSize: '7px', color: status.startsWith('Error') ? '#ff3366' : '#00ff88' }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
