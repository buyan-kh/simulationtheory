'use client';

import { useEffect, useState } from 'react';
import type { Character, Memory } from '@/lib/types';
import { useSimStore } from '@/lib/store';
import EmotionDisplay from './EmotionDisplay';
import TraitSlider from './TraitSlider';
import { getMemory, getReasoning } from '@/lib/api';

interface InspectorProps {
  character: Character;
  allCharacters: Record<string, Character>;
  simId: string;
}

export default function Inspector({ character, allCharacters, simId }: InspectorProps) {
  const { inspectorTab, setInspectorTab } = useSimStore();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [reasoning, setReasoning] = useState<{ reasoning: string; action: { type: string; detail: string } } | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [loadingReasoning, setLoadingReasoning] = useState(false);

  useEffect(() => {
    if (inspectorTab === 'memory') {
      setLoadingMemory(true);
      getMemory(simId, character.id)
        .then(setMemory)
        .catch(() => setMemory(null))
        .finally(() => setLoadingMemory(false));
    }
    if (inspectorTab === 'reasoning') {
      setLoadingReasoning(true);
      getReasoning(simId, character.id)
        .then(setReasoning)
        .catch(() => setReasoning(null))
        .finally(() => setLoadingReasoning(false));
    }
  }, [inspectorTab, character.id, simId]);

  const tabs = [
    { key: 'emotions' as const, label: 'Emotions' },
    { key: 'memory' as const, label: 'Memory' },
    { key: 'relationships' as const, label: 'Relations' },
    { key: 'reasoning' as const, label: 'Reasoning' },
  ];

  const relEntries = Object.entries(character.relationships);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-neon-cyan/20 to-neon-magenta/20 flex items-center justify-center text-[10px] font-bold border border-white/10">
            {character.name.charAt(0)}
          </div>
          <span className="text-sm font-bold text-gray-200">{character.name}</span>
        </div>

        <div className="flex-1" />

        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setInspectorTab(tab.key)}
              className={`px-2.5 py-1 text-[10px] rounded-md transition-colors uppercase tracking-wider ${
                inspectorTab === tab.key
                  ? 'bg-neon-cyan/10 text-neon-cyan'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {inspectorTab === 'emotions' && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Emotional State</h4>
              <EmotionDisplay emotions={character.emotional_state} />
            </div>
            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Personality</h4>
              <div className="space-y-3">
                <TraitSlider label="Openness" value={character.traits.openness} onChange={() => {}} readOnly color="neon-cyan" />
                <TraitSlider label="Conscientiousness" value={character.traits.conscientiousness} onChange={() => {}} readOnly color="neon-green" />
                <TraitSlider label="Extraversion" value={character.traits.extraversion} onChange={() => {}} readOnly color="neon-gold" />
                <TraitSlider label="Agreeableness" value={character.traits.agreeableness} onChange={() => {}} readOnly color="neon-magenta" />
                <TraitSlider label="Neuroticism" value={character.traits.neuroticism} onChange={() => {}} readOnly color="neon-red" />
              </div>
            </div>
            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Goals</h4>
              <div className="space-y-1">
                {character.goals.map((g, i) => (
                  <div key={i} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-neon-cyan mt-0.5">›</span>
                    <span>{g}</span>
                  </div>
                ))}
                {character.goals.length === 0 && <span className="text-xs text-gray-600">No goals set</span>}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Last Action</h4>
              {character.last_action ? (
                <div className="glass rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-neon-cyan/10 text-neon-cyan rounded uppercase">
                      {character.last_action.type}
                    </span>
                    {character.last_action.target_id && (
                      <span className="text-[10px] text-gray-500">
                        → {allCharacters[character.last_action.target_id]?.name || character.last_action.target_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{character.last_action.detail}</p>
                </div>
              ) : (
                <span className="text-xs text-gray-600">No action taken</span>
              )}
            </div>
          </div>
        )}

        {inspectorTab === 'memory' && (
          <div className="space-y-4">
            {loadingMemory ? (
              <div className="text-xs text-gray-500 animate-pulse">Loading memory...</div>
            ) : memory ? (
              <>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Beliefs</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(memory.beliefs).map(([k, v]) => (
                      <span key={k} className="text-[10px] px-2 py-1 glass rounded-md text-gray-400">
                        <span className="text-neon-gold">{k}:</span> {v}
                      </span>
                    ))}
                    {Object.keys(memory.beliefs).length === 0 && (
                      <span className="text-xs text-gray-600">No beliefs recorded</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Short-Term Memory</h4>
                  <div className="space-y-1.5">
                    {memory.short_term.map((m) => (
                      <div key={m.id} className="glass rounded-lg p-2 border-l-2 border-neon-cyan/20">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] text-gray-600 font-mono">t{m.tick}</span>
                          <span className="text-[9px] text-neon-gold font-mono">imp:{(m.importance * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-[11px] text-gray-400">{m.content}</p>
                      </div>
                    ))}
                    {memory.short_term.length === 0 && <span className="text-xs text-gray-600">Empty</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Long-Term Memory</h4>
                  <div className="space-y-1.5">
                    {memory.long_term.slice(0, 10).map((m) => (
                      <div key={m.id} className="glass rounded-lg p-2 border-l-2 border-neon-magenta/20">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] text-gray-600 font-mono">t{m.tick}</span>
                          <span className="text-[9px] text-neon-gold font-mono">imp:{(m.importance * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-[11px] text-gray-400">{m.content}</p>
                      </div>
                    ))}
                    {memory.long_term.length === 0 && <span className="text-xs text-gray-600">Empty</span>}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Beliefs (local)</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(character.memory.beliefs).map(([k, v]) => (
                      <span key={k} className="text-[10px] px-2 py-1 glass rounded-md text-gray-400">
                        <span className="text-neon-gold">{k}:</span> {v}
                      </span>
                    ))}
                    {Object.keys(character.memory.beliefs).length === 0 && (
                      <span className="text-xs text-gray-600">No beliefs</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Recent Memories</h4>
                  <div className="space-y-1.5">
                    {character.memory.short_term.map((m) => (
                      <div key={m.id} className="glass rounded-lg p-2 border-l-2 border-neon-cyan/20">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] text-gray-600 font-mono">t{m.tick}</span>
                        </div>
                        <p className="text-[11px] text-gray-400">{m.content}</p>
                      </div>
                    ))}
                    {character.memory.short_term.length === 0 && <span className="text-xs text-gray-600">No memories</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {inspectorTab === 'relationships' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Relationships</h4>
              {relEntries.length === 0 ? (
                <span className="text-xs text-gray-600">No relationships</span>
              ) : (
                <div className="space-y-2">
                  {relEntries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([id, value]) => {
                    const other = allCharacters[id];
                    const name = other?.name || id;
                    const isPositive = value >= 0;
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <span className="text-xs text-gray-300 w-24 truncate">{name}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                          <div className="absolute inset-0 flex">
                            <div className="w-1/2" />
                            <div className="w-px bg-white/10 z-10" />
                            <div className="w-1/2" />
                          </div>
                          {isPositive ? (
                            <div
                              className="absolute top-0 h-full bg-neon-green rounded-r-full transition-all duration-300"
                              style={{ left: '50%', width: `${Math.abs(value) * 50}%`, opacity: 0.7 }}
                            />
                          ) : (
                            <div
                              className="absolute top-0 h-full bg-neon-red rounded-l-full transition-all duration-300"
                              style={{ right: '50%', width: `${Math.abs(value) * 50}%`, opacity: 0.7 }}
                            />
                          )}
                        </div>
                        <span className={`text-[10px] font-mono w-10 text-right ${isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
                          {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Resources</h4>
              {Object.keys(character.resources).length === 0 ? (
                <span className="text-xs text-gray-600">No resources</span>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(character.resources).map(([key, val]) => (
                    <div key={key} className="glass rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-neon-gold">{Math.round(val)}</div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{key}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {inspectorTab === 'reasoning' && (
          <div className="space-y-4">
            {loadingReasoning ? (
              <div className="text-xs text-gray-500 animate-pulse">Loading reasoning...</div>
            ) : reasoning ? (
              <>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Current Action</h4>
                  <div className="glass rounded-lg p-3">
                    <span className="text-[10px] px-1.5 py-0.5 bg-neon-cyan/10 text-neon-cyan rounded uppercase">
                      {reasoning.action.type}
                    </span>
                    <p className="text-xs text-gray-400 mt-1.5">{reasoning.action.detail}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Reasoning Trace</h4>
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{reasoning.reasoning}</p>
                  </div>
                </div>
              </>
            ) : character.last_action ? (
              <>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Last Action</h4>
                  <div className="glass rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 bg-neon-cyan/10 text-neon-cyan rounded uppercase">
                        {character.last_action.type}
                      </span>
                      {character.last_action.target_id && (
                        <span className="text-[10px] text-gray-500">
                          → {allCharacters[character.last_action.target_id]?.name || character.last_action.target_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{character.last_action.detail}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Reasoning</h4>
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {character.last_action.reasoning || character.last_reasoning || 'No reasoning available'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-600">No action taken yet</div>
            )}

            <div>
              <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Motivations</h4>
              <div className="flex flex-wrap gap-1.5">
                {character.motivations.map((m, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 glass rounded-md text-neon-purple">
                    {m}
                  </span>
                ))}
                {character.motivations.length === 0 && <span className="text-xs text-gray-600">None</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
