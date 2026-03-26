'use client';

import { useEffect, useState } from 'react';
import type { Character, Memory, WorldItem } from '@/lib/types';
import { useSimStore } from '@/lib/store';
import EmotionDisplay from './EmotionDisplay';
import TraitSlider from './TraitSlider';
import ResourceBar from './ResourceBar';
import { getMemory, getReasoning, getAgentMemoryFile } from '@/lib/api';

interface InspectorProps {
  character: Character;
  allCharacters: Record<string, Character>;
  simId: string;
  worldItems?: WorldItem[];
  currentTick?: number;
}

function getScheduleInfo(tick: number): { period: string; label: string; color: string; icon: string } {
  const hour = tick % 24;
  if (hour >= 22 || hour < 6) return { period: 'sleep', label: 'Sleeping', color: '#6a5acd', icon: '🌙' };
  if (hour < 8) return { period: 'morning', label: 'Morning', color: '#daa520', icon: '🌅' };
  if (hour < 17) return { period: 'work', label: 'Working', color: '#4a9a68', icon: '⚒' };
  return { period: 'free', label: 'Free Time', color: '#4a9aaa', icon: '✦' };
}

type TabKey = 'stats' | 'memory' | 'relations' | 'mind' | 'items' | 'file';

export default function Inspector({ character, allCharacters, simId, worldItems = [], currentTick = 0 }: InspectorProps) {
  const { inspectorTab, setInspectorTab } = useSimStore();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [reasoning, setReasoning] = useState<{ reasoning: string; action: { type: string; detail: string } } | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [loadingReasoning, setLoadingReasoning] = useState(false);
  const [memoryFile, setMemoryFile] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const tab = (['stats', 'memory', 'relations', 'mind', 'items', 'file'].includes(inspectorTab) ? inspectorTab : 'stats') as TabKey;

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
    if (tab === 'file') {
      setLoadingFile(true);
      getAgentMemoryFile(simId, character.id)
        .then((res) => setMemoryFile(res.content))
        .catch(() => setMemoryFile(null))
        .finally(() => setLoadingFile(false));
    }
  }, [tab, character.id, simId]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'stats', label: 'Stats' },
    { key: 'memory', label: 'Memory' },
    { key: 'relations', label: 'Relations' },
    { key: 'mind', label: 'Mind' },
    { key: 'items', label: 'Items' },
    { key: 'file', label: 'File' },
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
            background: '#ece5d8',
            border: '2px solid #a89880',
            fontSize: '8px',
            color: '#4a9aaa',
          }}
        >
          {character.name.charAt(0)}
        </div>
        <span>{character.name}</span>
      </div>

      <div className="flex" style={{ borderBottom: '2px solid #c4b6a2' }}>
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
            {/* Vitals: Age, Health */}
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Vitals</div>
              <div className="grid grid-cols-2 gap-2">
                {character.age !== undefined && (
                  <div className="p-2" style={{ background: '#e8dfd2', border: '1px solid #c4b6a2' }}>
                    <div className="font-pixel text-pixel-text-dim uppercase" style={{ fontSize: '6px' }}>Age</div>
                    <div className="font-pixel text-neon-gold" style={{ fontSize: '10px' }}>
                      {character.age}{character.max_age ? `/${character.max_age}` : ''}
                    </div>
                  </div>
                )}
                {character.health !== undefined && (
                  <div className="p-2" style={{ background: '#e8dfd2', border: '1px solid #c4b6a2' }}>
                    <div className="font-pixel text-pixel-text-dim uppercase" style={{ fontSize: '6px' }}>Health</div>
                    <NeedBar label="" value={character.health} color={character.health < 30 ? '#c4555a' : '#4a9a68'} icon="♥" />
                  </div>
                )}
              </div>
              {!character.alive && character.cause_of_death && (
                <div className="mt-2 p-2" style={{ background: '#f0e0e0', border: '1px solid #c4555a' }}>
                  <span className="font-pixel" style={{ fontSize: '7px', color: '#c4555a' }}>
                    Died from {character.cause_of_death} {character.death_tick !== undefined ? `at tick ${character.death_tick}` : ''}
                  </span>
                </div>
              )}
              {character.parent_ids && character.parent_ids.length > 0 && (
                <div className="mt-1">
                  <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>
                    Parents: {character.parent_ids.map(pid => allCharacters[pid]?.name || 'Unknown').join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="pixel-divider" />

            {/* Schedule */}
            {character.alive && (
              <>
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Schedule</div>
                  {(() => {
                    const schedule = getScheduleInfo(currentTick);
                    const hour = currentTick % 24;
                    return (
                      <div className="p-2" style={{ background: '#e8dfd2', border: `1px solid ${schedule.color}` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontSize: '10px' }}>{schedule.icon}</span>
                          <span className="font-pixel" style={{ fontSize: '8px', color: schedule.color }}>{schedule.label}</span>
                          <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>Hour {hour}/24</span>
                        </div>
                        {character.occupation && schedule.period === 'work' && (
                          <div className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>
                            Working as {character.occupation}
                          </div>
                        )}
                        {/* Day progress bar */}
                        <div className="mt-1 relative" style={{ height: '4px', background: '#d4c8b8', border: '1px solid #c4b6a2' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(hour / 24) * 100}%`, background: schedule.color }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="pixel-divider" />
              </>
            )}

            {/* Group Info */}
            {character.group_id && (
              <>
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Group</div>
                  <div className="p-2" style={{ background: '#e8dfd2', border: '1px solid #5a9aaa' }}>
                    <span className="pixel-badge font-pixel" style={{ fontSize: '7px', borderColor: '#5a9aaa', color: '#5a9aaa' }}>
                      {character.group_role || 'member'}
                    </span>
                  </div>
                </div>
                <div className="pixel-divider" />
              </>
            )}

            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Personality</div>
              <div className="space-y-2">
                <TraitSlider label="Open" value={character.traits.openness} onChange={() => {}} readOnly color="purple" />
                <TraitSlider label="Consc" value={character.traits.conscientiousness} onChange={() => {}} readOnly color="cyan" />
                <TraitSlider label="Extra" value={character.traits.extraversion} onChange={() => {}} readOnly color="gold" />
                <TraitSlider label="Agree" value={character.traits.agreeableness} onChange={() => {}} readOnly color="green" />
                <TraitSlider label="Neuro" value={character.traits.neuroticism} onChange={() => {}} readOnly color="red" />
                <TraitSlider label="H-H" value={character.traits.honesty_humility} onChange={() => {}} readOnly color="orange" />
              </div>
            </div>

            {character.values && (
              <>
                <div className="pixel-divider" />
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Values</div>
                  <div className="space-y-2">
                    <TraitSlider label="Self-Enh" value={character.values.self_enhancement} onChange={() => {}} readOnly color="red" />
                    <TraitSlider label="Open-Chg" value={character.values.openness_to_change} onChange={() => {}} readOnly color="purple" />
                    <TraitSlider label="Self-Tran" value={character.values.self_transcendence} onChange={() => {}} readOnly color="green" />
                    <TraitSlider label="Conserv" value={character.values.conservation} onChange={() => {}} readOnly color="cyan" />
                  </div>
                </div>
              </>
            )}

            {(character.occupation || (character.skills && character.skills.length > 0)) && (
              <>
                <div className="pixel-divider" />
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Identity</div>
                  {character.occupation && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-pixel text-neon-gold" style={{ fontSize: '7px' }}>Job:</span>
                      <span className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{character.occupation}</span>
                    </div>
                  )}
                  {character.skills && character.skills.length > 0 && (
                    <div className="flex items-start gap-2 mb-1">
                      <span className="font-pixel text-neon-gold" style={{ fontSize: '7px' }}>Skills:</span>
                      <span className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{character.skills.join(', ')}</span>
                    </div>
                  )}
                  {character.hobbies && character.hobbies.length > 0 && (
                    <div className="flex items-start gap-2 mb-1">
                      <span className="font-pixel text-neon-gold" style={{ fontSize: '7px' }}>Hobbies:</span>
                      <span className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{character.hobbies.join(', ')}</span>
                    </div>
                  )}
                  {character.social_roles && character.social_roles.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="font-pixel text-neon-gold" style={{ fontSize: '7px' }}>Roles:</span>
                      <span className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{character.social_roles.join(', ')}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="pixel-divider" />

            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Emotions</div>
              <EmotionDisplay emotions={character.emotional_state} />
            </div>

            <div className="pixel-divider" />

            {character.needs && (
              <>
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Needs</div>
                  <div className="space-y-1.5">
                    <NeedBar label="Hunger" value={character.needs.hunger} color="#ff8844" icon="🍖" />
                    <NeedBar label="Energy" value={character.needs.energy} color="#ffdd44" icon="⚡" />
                    <NeedBar label="Social" value={character.needs.social} color="#4488ff" icon="💬" />
                    <NeedBar label="Fun" value={character.needs.fun} color="#ff66aa" icon="✦" />
                    <NeedBar label="Hygiene" value={character.needs.hygiene} color="#44cc88" icon="✧" />
                  </div>
                </div>
                <div className="pixel-divider" />
              </>
            )}

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
                      <span key={k} className="pixel-badge font-pixel" style={{ fontSize: '6px', borderColor: '#c49a35', color: '#c49a35' }}>
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
                      <div key={m.id} className="p-2" style={{ background: '#e8dfd2', borderLeft: '2px solid #4a9aaa' }}>
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
                      <div key={m.id} className="p-2" style={{ background: '#e8dfd2', borderLeft: '2px solid #c45a7a' }}>
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
                      <span key={k} className="pixel-badge font-pixel" style={{ fontSize: '6px', borderColor: '#c49a35', color: '#c49a35' }}>
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
                      <div key={m.id} className="p-2" style={{ background: '#e8dfd2', borderLeft: '2px solid #4a9aaa' }}>
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
                        <span className="font-pixel text-pixel-text w-20 truncate" style={{ fontSize: '7px' }}>
                          {name}
                          {(() => {
                            const relType = character.relationship_types?.[id];
                            if (!relType) return null;
                            const colors: Record<string, string> = { spouse: '#c46a8a', parent: '#c48a40', child: '#5a9aaa', friend: '#5aaa6a', rival: '#c44444' };
                            return <span style={{ color: colors[relType] || '#888', marginLeft: '2px', fontSize: '6px' }}>[{relType}]</span>;
                          })()}
                        </span>
                        <div className="flex-1 relative" style={{ height: '8px', background: '#e8dfd2', border: '1px solid #c4b6a2' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: 0,
                              width: '1px',
                              height: '100%',
                              background: '#a89880',
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
                                background: '#5a9a5a',
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
                                background: '#c4555a',
                                transition: 'width 0.3s steps(8)',
                              }}
                            />
                          )}
                        </div>
                        <span
                          className="font-pixel w-8 text-right"
                          style={{ fontSize: '7px', color: isPositive ? '#5a9a5a' : '#c4555a' }}
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
                      style={{ background: '#e8dfd2', border: '1px solid #c4b6a2' }}
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
                  <div className="p-2" style={{ background: '#e8dfd2', border: '2px solid #c4b6a2' }}>
                    <span className="pixel-badge font-pixel" style={{ fontSize: '7px', borderColor: '#4a9aaa', color: '#4a9aaa' }}>
                      {reasoning.action.type}
                    </span>
                    <p className="font-pixel text-pixel-text mt-2" style={{ fontSize: '7px' }}>{reasoning.action.detail}</p>
                  </div>
                </div>
                <div className="pixel-divider" />
                <div>
                  <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Reasoning Trace</div>
                  <div className="p-2" style={{ background: '#e8dfd2', border: '2px solid #c4b6a2' }}>
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
                  <div className="p-2" style={{ background: '#e8dfd2', border: '2px solid #c4b6a2' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="pixel-badge font-pixel" style={{ fontSize: '7px', borderColor: '#4a9aaa', color: '#4a9aaa' }}>
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
                  <div className="p-2" style={{ background: '#e8dfd2', border: '2px solid #c4b6a2' }}>
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
                    style={{ fontSize: '6px', borderColor: '#8a6aaa', color: '#8a6aaa' }}
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

        {tab === 'items' && (
          <div className="space-y-4">
            <div>
              <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Equipped Items</div>
              {(!character.equipped_items || character.equipped_items.length === 0) ? (
                <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No items</span>
              ) : (
                <div className="space-y-1">
                  {character.equipped_items.map((itemId) => {
                    const item = worldItems.find((wi) => wi.id === itemId);
                    return (
                      <div
                        key={itemId}
                        className="flex items-center gap-2 p-2"
                        style={{ background: '#e8dfd2', border: '1px solid #c4b6a2' }}
                      >
                        <span
                          className="pixel-badge font-pixel"
                          style={{ fontSize: '6px', borderColor: '#c48a30', color: '#c48a30' }}
                        >
                          {item?.item_type || '?'}
                        </span>
                        <span className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>
                          {item?.name || itemId.slice(0, 8)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'file' && (
          <div className="space-y-2">
            <div className="font-pixel text-neon-cyan uppercase mb-2" style={{ fontSize: '8px' }}>Agent Memory File</div>
            {loadingFile ? (
              <div className="font-pixel text-pixel-text-dim animate-pixel-blink" style={{ fontSize: '8px' }}>
                Loading file...
              </div>
            ) : memoryFile ? (
              <pre
                className="font-mono text-pixel-text whitespace-pre-wrap overflow-x-auto p-2"
                style={{ fontSize: '6px', lineHeight: '1.4', background: '#e8dfd2', border: '1px solid #c4b6a2' }}
              >
                {memoryFile}
              </pre>
            ) : (
              <div className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>
                No memory file available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NeedBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const isCritical = pct < 20;

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-pixel w-3 text-center" style={{ fontSize: '7px' }}>{icon}</span>
      <span className="font-pixel w-12 truncate" style={{ fontSize: '7px', color: isCritical ? '#c4555a' : '#8a8a8a' }}>
        {label}
      </span>
      <div
        className="flex-1 relative"
        style={{ height: '6px', background: '#e8dfd2', border: '1px solid #c4b6a2' }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: isCritical ? '#c4555a' : color,
            transition: 'width 0.3s ease',
            animation: isCritical ? 'pulse 1s ease-in-out infinite' : undefined,
          }}
        />
      </div>
      <span
        className="font-pixel w-7 text-right"
        style={{ fontSize: '7px', color: isCritical ? '#c4555a' : color }}
      >
        {pct}
      </span>
    </div>
  );
}
