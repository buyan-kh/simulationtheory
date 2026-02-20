'use client';

import { useEffect, useState } from 'react';
import type { Character, Memory } from '@/lib/types';
import { useSimStore } from '@/lib/store';
import EmotionDisplay from './EmotionDisplay';
import TraitSlider from './TraitSlider';
import ResourceBar from './ResourceBar';
import { getMemory, getReasoning } from '@/lib/api';

interface InspectorProps {
  character: Character;
  allCharacters: Record<string, Character>;
  simId: string;
}

type TabKey = 'stats' | 'memory' | 'relations' | 'mind';

export default function Inspector({ character, allCharacters, simId }: InspectorProps) {
  const { inspectorTab, setInspectorTab } = useSimStore();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [reasoning, setReasoning] = useState<{ reasoning: string; action: { type: string; detail: string } } | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [loadingReasoning, setLoadingReasoning] = useState(false);

  const tab = (['stats', 'memory', 'relations', 'mind'].includes(inspectorTab) ? inspectorTab : 'stats') as TabKey;

  useEffect(() => {
    if (tab === 'memory') {
      setLoadingMemory(true);
      getMemory(simId, character.id)
        .then(setMemory)
        .catch(() => setMemory(null))
        .finally(() => setLoadingMemory(false));
    }
    if (tab === 'mind') {
      setLoadingReasoning(true);
      getReasoning(simId, character.id)
        .then(setReasoning)
        .catch(() => setReasoning(null))
        .finally(() => setLoadingReasoning(false));
    }
  }, [tab, character.id, simId]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'stats', label: 'Stats' },
    { key: 'memory', label: 'Memory' },
    { key: 'relations', label: 'Relations' },
    { key: 'mind', label: 'Mind' },
  ];

  const relEntries = Object.entries(character.relationships);
  const resourceColors = ['cyan', 'gold', 'green', 'magenta', 'blue', 'orange'];

  return (
    <div className="pixel-panel flex flex-col h-full">
      <div className="pixel-panel-title flex items-center gap-2">
        <div
          className="flex items-center justify-center font-pixel"
          style={{
            width: 20,
            height: 20,
            background: '#1a1a3a',
            border: '2px solid #4a4a8a',
            fontSize: '8px',
            color: '#00e5ff',
          }}
        >
          {character.name.charAt(0)}
        </div>
        <span>{character.name}</span>
      </div>

      <div className="flex" style={{ borderBottom: '2px solid #2a2a5a' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setInspectorTab(t.key as typeof inspectorTab)}
            className={`pixel-tab ${tab === t.key ? 'pixel-tab-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 pixel-scrollbar">
        {tab === 'stats' && (
          <div className="space-y-4">
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Personality</div>
              <div className="space-y-2">
                <TraitSlider label="Open" value={character.traits.openness} onChange={() => {}} readOnly color="purple" />
                <TraitSlider label="Consc" value={character.traits.conscientiousness} onChange={() => {}} readOnly color="cyan" />
                <TraitSlider label="Extra" value={character.traits.extraversion} onChange={() => {}} readOnly color="gold" />
                <TraitSlider label="Agree" value={character.traits.agreeableness} onChange={() => {}} readOnly color="green" />
                <TraitSlider label="Neuro" value={character.traits.neuroticism} onChange={() => {}} readOnly color="red" />
              </div>
            </div>

            <div className="pixel-divider" />

            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Emotions</div>
              <EmotionDisplay emotions={character.emotional_state} />
            </div>

            <div className="pixel-divider" />

            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Goals</div>
              <div className="space-y-1">
                {character.goals.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-pixel text-neon-gold" style={{ fontSize: '7px' }}>►</span>
                    <span className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{g}</span>
                  </div>
                ))}
                {character.goals.length === 0 && (
                  <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No goals set</span>
                )}
              </div>
            </div>

            <div className="pixel-divider" />

            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Resources</div>
              <div className="space-y-2">
                {Object.entries(character.resources).map(([key, val], i) => (
                  <ResourceBar key={key} label={key} value={val} color={resourceColors[i % resourceColors.length]} />
                ))}
                {Object.keys(character.resources).length === 0 && (
                  <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No resources</span>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'memory' && (
          <div className="space-y-4">
            {loadingMemory ? (
              <div className="font-pixel text-pixel-text-dim animate-pixel-blink" style={{ fontSize: '8px' }}>
                Loading memory...
              </div>
            ) : memory ? (
              <>
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Beliefs</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(memory.beliefs).map(([k, v]) => (
                      <span key={k} className="pixel-badge font-pixel" style={{ fontSize: '6px', borderColor: '#ffd700', color: '#ffd700' }}>
                        {k}: {v}
                      </span>
                    ))}
                    {Object.keys(memory.beliefs).length === 0 && (
                      <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No beliefs</span>
                    )}
                  </div>
                </div>
                <div className="pixel-divider" />
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Short-term</div>
                  <div className="space-y-1">
                    {memory.short_term.map((m) => (
                      <div key={m.id} className="p-2" style={{ background: '#0a0a1a', borderLeft: '2px solid #00e5ff' }}>
                        <div className="flex gap-2 mb-1">
                          <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>T{m.tick}</span>
                          <span className="font-pixel text-neon-gold" style={{ fontSize: '6px' }}>
                            IMP:{Math.round(m.importance * 100)}%
                          </span>
                        </div>
                        <p className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{m.content}</p>
                      </div>
                    ))}
                    {memory.short_term.length === 0 && (
                      <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>Empty</span>
                    )}
                  </div>
                </div>
                <div className="pixel-divider" />
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Long-term</div>
                  <div className="space-y-1">
                    {memory.long_term.slice(0, 10).map((m) => (
                      <div key={m.id} className="p-2" style={{ background: '#0a0a1a', borderLeft: '2px solid #ff00aa' }}>
                        <div className="flex gap-2 mb-1">
                          <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>T{m.tick}</span>
                          <span className="font-pixel text-neon-gold" style={{ fontSize: '6px' }}>
                            IMP:{Math.round(m.importance * 100)}%
                          </span>
                        </div>
                        <p className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{m.content}</p>
                      </div>
                    ))}
                    {memory.long_term.length === 0 && (
                      <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>Empty</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Beliefs (local)</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(character.memory.beliefs).map(([k, v]) => (
                      <span key={k} className="pixel-badge font-pixel" style={{ fontSize: '6px', borderColor: '#ffd700', color: '#ffd700' }}>
                        {k}: {v}
                      </span>
                    ))}
                    {Object.keys(character.memory.beliefs).length === 0 && (
                      <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No beliefs</span>
                    )}
                  </div>
                </div>
                <div className="pixel-divider" />
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Recent Memories</div>
                  <div className="space-y-1">
                    {character.memory.short_term.map((m) => (
                      <div key={m.id} className="p-2" style={{ background: '#0a0a1a', borderLeft: '2px solid #00e5ff' }}>
                        <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>T{m.tick}</span>
                        <p className="font-pixel text-pixel-text mt-1" style={{ fontSize: '7px' }}>{m.content}</p>
                      </div>
                    ))}
                    {character.memory.short_term.length === 0 && (
                      <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No memories</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'relations' && (
          <div className="space-y-4">
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Relationships</div>
              {relEntries.length === 0 ? (
                <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No relationships</span>
              ) : (
                <div className="space-y-2">
                  {relEntries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([id, value]) => {
                    const other = allCharacters[id];
                    const name = other?.name || id;
                    const isPositive = value >= 0;
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <span className="font-pixel text-pixel-text w-20 truncate" style={{ fontSize: '7px' }}>{name}</span>
                        <div className="flex-1 relative" style={{ height: '8px', background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: 0,
                              width: '1px',
                              height: '100%',
                              background: '#4a4a8a',
                            }}
                          />
                          {isPositive ? (
                            <div
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: 0,
                                height: '100%',
                                width: `${Math.abs(value) * 50}%`,
                                background: '#00ff88',
                                transition: 'width 0.3s steps(8)',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                position: 'absolute',
                                right: '50%',
                                top: 0,
                                height: '100%',
                                width: `${Math.abs(value) * 50}%`,
                                background: '#ff3366',
                                transition: 'width 0.3s steps(8)',
                              }}
                            />
                          )}
                        </div>
                        <span
                          className="font-pixel w-8 text-right"
                          style={{ fontSize: '7px', color: isPositive ? '#00ff88' : '#ff3366' }}
                        >
                          {value > 0 ? '+' : ''}{Math.round(value * 100)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pixel-divider" />

            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Resources</div>
              {Object.keys(character.resources).length === 0 ? (
                <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No resources</span>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(character.resources).map(([key, val]) => (
                    <div
                      key={key}
                      className="text-center p-2"
                      style={{ background: '#0a0a1a', border: '1px solid #2a2a5a' }}
                    >
                      <div className="font-pixel text-neon-gold" style={{ fontSize: '10px' }}>{Math.round(val)}</div>
                      <div className="font-pixel text-pixel-text-dim uppercase" style={{ fontSize: '6px' }}>{key}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'mind' && (
          <div className="space-y-4">
            {loadingReasoning ? (
              <div className="font-pixel text-pixel-text-dim animate-pixel-blink" style={{ fontSize: '8px' }}>
                Loading reasoning...
              </div>
            ) : reasoning ? (
              <>
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Current Action</div>
                  <div className="p-2" style={{ background: '#0a0a1a', border: '2px solid #2a2a5a' }}>
                    <span className="pixel-badge font-pixel" style={{ fontSize: '7px', borderColor: '#00e5ff', color: '#00e5ff' }}>
                      {reasoning.action.type}
                    </span>
                    <p className="font-pixel text-pixel-text mt-2" style={{ fontSize: '7px' }}>{reasoning.action.detail}</p>
                  </div>
                </div>
                <div className="pixel-divider" />
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Reasoning Trace</div>
                  <div className="p-2" style={{ background: '#0a0a1a', border: '2px solid #2a2a5a' }}>
                    <p className="font-pixel text-pixel-text leading-relaxed whitespace-pre-wrap" style={{ fontSize: '7px' }}>
                      {reasoning.reasoning}
                    </p>
                  </div>
                </div>
              </>
            ) : character.last_action ? (
              <>
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Last Action</div>
                  <div className="p-2" style={{ background: '#0a0a1a', border: '2px solid #2a2a5a' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="pixel-badge font-pixel" style={{ fontSize: '7px', borderColor: '#00e5ff', color: '#00e5ff' }}>
                        {character.last_action.type}
                      </span>
                      {character.last_action.target_id && (
                        <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>
                          → {allCharacters[character.last_action.target_id]?.name || character.last_action.target_id}
                        </span>
                      )}
                    </div>
                    <p className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{character.last_action.detail}</p>
                  </div>
                </div>
                <div className="pixel-divider" />
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Reasoning</div>
                  <div className="p-2" style={{ background: '#0a0a1a', border: '2px solid #2a2a5a' }}>
                    <p className="font-pixel text-pixel-text leading-relaxed whitespace-pre-wrap" style={{ fontSize: '7px' }}>
                      {character.last_action.reasoning || character.last_reasoning || 'No reasoning available'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="font-pixel text-pixel-text-dim" style={{ fontSize: '8px' }}>No action taken yet</div>
            )}

            <div className="pixel-divider" />

            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Motivations</div>
              <div className="flex flex-wrap gap-1">
                {character.motivations.map((m, i) => (
                  <span
                    key={i}
                    className="pixel-badge font-pixel"
                    style={{ fontSize: '6px', borderColor: '#aa44ff', color: '#aa44ff' }}
                  >
                    {m}
                  </span>
                ))}
                {character.motivations.length === 0 && (
                  <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>None</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
