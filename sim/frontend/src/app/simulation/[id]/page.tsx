'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSimStore } from '@/lib/store';
import { getSimulation, stepSimulation, updateConfig, addCharacter } from '@/lib/api';
import type { SimulationConfig, CharacterCreate } from '@/lib/types';
import CharacterCard from '@/components/CharacterCard';
import WorldView from '@/components/WorldView';
import EventLog from '@/components/EventLog';
import SimControls from '@/components/SimControls';
import Inspector from '@/components/Inspector';

export default function SimulationPage() {
  const params = useParams();
  const simId = params.id as string;
  const {
    simulation,
    selectedCharacterId,
    events,
    isRunning,
    autoPlaySpeed,
    setSimulation,
    selectCharacter,
    addEvents,
    setRunning,
    setAutoPlaySpeed,
  } = useSimStore();

  const [stepping, setStepping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getSimulation(simId)
      .then((sim) => {
        setSimulation(sim);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [simId, setSimulation]);

  const doStep = useCallback(async () => {
    setStepping(true);
    try {
      const result = await stepSimulation(simId);
      setSimulation(result.state);
      addEvents(result.events);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Step failed');
      setRunning(false);
    } finally {
      setStepping(false);
    }
  }, [simId, setSimulation, addEvents, setRunning]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(doStep, autoPlaySpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, autoPlaySpeed, doStep]);

  const characters = simulation ? Object.values(simulation.characters) : [];
  const selectedCharacter = selectedCharacterId && simulation ? simulation.characters[selectedCharacterId] : null;

  if (error && !simulation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <div className="text-3xl mb-4">⚠️</div>
          <h2 className="text-sm font-bold text-neon-red mb-2">Connection Error</h2>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => getSimulation(simId).then(setSimulation).catch((e) => setError(e.message))}
            className="px-4 py-2 text-xs bg-neon-cyan/10 text-neon-cyan rounded-lg hover:bg-neon-cyan/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto mb-4" />
          <div className="text-xs text-gray-500">Loading simulation...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col">
      <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
        <SimControls
          tick={simulation.tick}
          isRunning={isRunning}
          autoPlaySpeed={autoPlaySpeed}
          onStep={doStep}
          onTogglePlay={() => setRunning(!isRunning)}
          onSpeedChange={setAutoPlaySpeed}
          onOpenSettings={() => setShowSettings(true)}
          stepping={stepping}
        />
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-[10px] text-neon-red">{error}</span>
          )}
          <button
            onClick={() => setShowAddChar(true)}
            className="px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-lg bg-neon-magenta/10 text-neon-magenta hover:bg-neon-magenta/20 transition-colors uppercase"
          >
            + Character
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-56 border-r border-white/5 overflow-y-auto p-2 space-y-1.5 shrink-0">
          <div className="px-2 py-1 text-[10px] text-gray-600 uppercase tracking-widest">
            Characters ({characters.length})
          </div>
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              selected={char.id === selectedCharacterId}
              onClick={() => selectCharacter(char.id === selectedCharacterId ? null : char.id)}
            />
          ))}
          {characters.length === 0 && (
            <div className="text-center py-8">
              <div className="text-2xl mb-2 opacity-30">👤</div>
              <div className="text-[10px] text-gray-600">No characters yet</div>
              <button
                onClick={() => setShowAddChar(true)}
                className="mt-2 text-[10px] text-neon-cyan hover:text-neon-cyan/80 transition-colors"
              >
                + Add one
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 p-2">
            <WorldView
              characters={simulation.characters}
              locations={simulation.environment.locations}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={(id) => selectCharacter(id === selectedCharacterId ? null : id)}
            />
          </div>

          {selectedCharacter && (
            <div className="h-64 border-t border-white/5 shrink-0">
              <Inspector
                character={selectedCharacter}
                allCharacters={simulation.characters}
                simId={simId}
              />
            </div>
          )}
        </div>

        <div className="w-64 border-l border-white/5 shrink-0">
          <EventLog events={events} />
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          config={simulation.config}
          onClose={() => setShowSettings(false)}
          onSave={async (config) => {
            const updated = await updateConfig(simId, config);
            setSimulation(updated);
            setShowSettings(false);
          }}
        />
      )}

      {showAddChar && (
        <QuickAddCharacter
          onClose={() => setShowAddChar(false)}
          onAdd={async (data) => {
            await addCharacter(simId, data);
            const sim = await getSimulation(simId);
            setSimulation(sim);
            setShowAddChar(false);
          }}
        />
      )}
    </div>
  );
}

function SettingsModal({ config, onClose, onSave }: {
  config: SimulationConfig;
  onClose: () => void;
  onSave: (config: Partial<SimulationConfig>) => void;
}) {
  const [local, setLocal] = useState(config);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-96 glow-border-gold" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-neon-gold mb-4 tracking-wider">SIMULATION CONFIG</h3>

        <div className="space-y-4">
          <SliderField label="Randomness" value={local.randomness} onChange={(v) => setLocal({ ...local, randomness: v })} />
          <SliderField label="Info Symmetry" value={local.information_symmetry} onChange={(v) => setLocal({ ...local, information_symmetry: v })} />
          <SliderField label="Scarcity" value={local.resource_scarcity} onChange={(v) => setLocal({ ...local, resource_scarcity: v })} />
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Max Ticks</label>
            <input
              type="number"
              value={local.max_ticks}
              onChange={(e) => setLocal({ ...local, max_ticks: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-neon-gold/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(local)}
            className="px-4 py-1.5 text-xs bg-neon-gold/10 text-neon-gold rounded-lg hover:bg-neon-gold/20 transition-colors font-bold tracking-wider"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</label>
        <span className="text-[10px] text-gray-500 font-mono">{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full h-1 appearance-none bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-gold"
      />
    </div>
  );
}

function QuickAddCharacter({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (data: CharacterCreate) => void;
}) {
  const [name, setName] = useState('');
  const [profile, setProfile] = useState('');

  const templates = [
    { name: 'The Diplomat', profile: 'A skilled negotiator who values peace and alliance-building above all.', traits: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.9, neuroticism: 0.3 }, goals: ['Forge lasting alliances', 'Resolve conflicts peacefully'] },
    { name: 'The Warrior', profile: 'A fierce combatant driven by honor and the desire to prove strength.', traits: { openness: 0.4, conscientiousness: 0.6, extraversion: 0.7, agreeableness: 0.3, neuroticism: 0.5 }, goals: ['Defeat all rivals', 'Protect the weak'] },
    { name: 'The Trickster', profile: 'A cunning manipulator who thrives on chaos and misdirection.', traits: { openness: 0.9, conscientiousness: 0.3, extraversion: 0.8, agreeableness: 0.2, neuroticism: 0.4 }, goals: ['Sow discord among others', 'Accumulate secret power'] },
    { name: 'The Scholar', profile: 'A curious mind devoted to understanding the world through observation.', traits: { openness: 0.95, conscientiousness: 0.85, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.4 }, goals: ['Discover hidden knowledge', 'Map the environment'] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-[480px] glow-border-magenta max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-neon-magenta mb-4 tracking-wider">ADD CHARACTER</h3>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setName(t.name);
                setProfile(t.profile);
              }}
              className={`p-2 glass rounded-lg text-left hover:bg-white/5 transition-colors ${
                name === t.name ? 'glow-border-cyan' : ''
              }`}
            >
              <div className="text-xs font-bold text-gray-300">{t.name}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{t.profile}</div>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-neon-magenta/30 placeholder:text-gray-700"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Profile</label>
            <textarea
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="Character backstory..."
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-neon-magenta/30 placeholder:text-gray-700 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return;
              const template = templates.find((t) => t.name === name);
              onAdd({
                name: name.trim(),
                profile: profile.trim() || undefined,
                traits: template?.traits,
                goals: template?.goals,
              });
            }}
            disabled={!name.trim()}
            className="px-4 py-1.5 text-xs bg-neon-magenta/10 text-neon-magenta rounded-lg hover:bg-neon-magenta/20 transition-colors font-bold tracking-wider disabled:opacity-30"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
