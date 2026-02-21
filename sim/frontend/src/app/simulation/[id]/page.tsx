'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSimStore } from '@/lib/store';
import { getSimulation, stepSimulation, updateConfig, addCharacter } from '@/lib/api';
import type { SimulationConfig, CharacterCreate, PersonalityTraits } from '@/lib/types';
import CharacterCard from '@/components/CharacterCard';
import PixelCanvas from '@/components/PixelCanvas';
import EventLog from '@/components/EventLog';
import ChatLog from '@/components/ChatLog';
import SimControls from '@/components/SimControls';
import Inspector from '@/components/Inspector';

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const simId = params.id as string;
  const {
    simulation,
    selectedCharacterId,
    events,
    chatMessages,
    isRunning,
    autoPlaySpeed,
    activePanel,
    setSimulation,
    selectCharacter,
    addEvents,
    addChatMessages,
    setRunning,
    setAutoPlaySpeed,
    setActivePanel,
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
        if (sim.chat_log) {
          addChatMessages(sim.chat_log);
        }
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [simId, setSimulation, addChatMessages]);

  const doStep = useCallback(async () => {
    setStepping(true);
    try {
      const result = await stepSimulation(simId);
      setSimulation(result.state);
      addEvents(result.events);
      if (result.chat_messages) {
        addChatMessages(result.chat_messages);
      }
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Step failed');
      setRunning(false);
    } finally {
      setStepping(false);
    }
  }, [simId, setSimulation, addEvents, addChatMessages, setRunning]);

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
      <div className="flex items-center justify-center min-h-[calc(100vh-40px)]">
        <div className="pixel-panel p-8 text-center max-w-md">
          <div className="text-pixel-xl mb-4">!</div>
          <div className="text-pixel-sm text-neon-red mb-3">CONNECTION ERROR</div>
          <div className="text-pixel-xs text-gray-500 mb-4">{error}</div>
          <button
            onClick={() => getSimulation(simId).then(setSimulation).catch((e) => setError(e.message))}
            className="pixel-btn pixel-btn-cyan text-pixel-xs"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-40px)]">
        <div className="text-center">
          <div className="text-pixel-lg text-neon-cyan animate-pixel-blink mb-4">...</div>
          <div className="text-pixel-xs text-gray-500">LOADING SIMULATION</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-40px)] flex flex-col">
      <div className="bg-pixel-panel border-b-2 border-[#4a4a8a] px-3 py-1.5 flex items-center justify-between shrink-0"
        style={{ boxShadow: '0 2px 0 0 rgba(0,0,0,0.3)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-pixel-xs text-gray-500 hover:text-neon-cyan transition-colors"
          >
            &lt; BACK
          </button>
          <div className="w-[2px] h-5 bg-[#2a2a5a]" />
          <span className="text-pixel-sm text-neon-cyan" style={{ textShadow: '0 0 6px rgba(0,229,255,0.4)' }}>
            NEXUS SIM
          </span>
        </div>
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
            <span className="text-pixel-xs text-neon-red">{error}</span>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-[220px] border-r-2 border-[#4a4a8a] bg-pixel-panel overflow-y-auto pixel-scrollbar shrink-0 flex flex-col">
          <div className="px-3 py-2 border-b-2 border-[#2a2a5a] bg-[#1a1a3a]">
            <span className="text-pixel-xs text-gray-400 tracking-wider">AGENTS ({characters.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
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
                <div className="text-pixel-lg text-gray-600 mb-2">?</div>
                <div className="text-pixel-xs text-gray-600 mb-3">NO AGENTS</div>
              </div>
            )}
          </div>
          <div className="p-2 border-t-2 border-[#2a2a5a]">
            <button
              onClick={() => setShowAddChar(true)}
              className="pixel-btn pixel-btn-green text-pixel-xs w-full py-2"
            >
              + ADD AGENT
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <PixelCanvas
              characters={simulation.characters}
              locations={simulation.environment.locations}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={(id) => selectCharacter(id === selectedCharacterId ? null : id)}
              chatMessages={chatMessages}
              currentTick={simulation.tick}
            />
          </div>

          {selectedCharacter && (
            <div className="h-[250px] border-t-2 border-[#4a4a8a] shrink-0">
              <Inspector
                character={selectedCharacter}
                allCharacters={simulation.characters}
                simId={simId}
              />
            </div>
          )}
        </div>

        <div className="w-[280px] border-l-2 border-[#4a4a8a] bg-pixel-panel shrink-0 flex flex-col">
          <div className="flex shrink-0">
            <button
              onClick={() => setActivePanel('events')}
              className={`flex-1 px-3 py-2 text-pixel-xs tracking-wider border-b-2 transition-colors ${
                activePanel === 'events'
                  ? 'text-neon-cyan border-neon-cyan bg-[#12122a]'
                  : 'text-gray-500 border-[#2a2a5a] bg-[#1a1a3a] hover:text-gray-300'
              }`}
            >
              EVENTS
            </button>
            <button
              onClick={() => setActivePanel('chat')}
              className={`flex-1 px-3 py-2 text-pixel-xs tracking-wider border-b-2 transition-colors ${
                activePanel === 'chat'
                  ? 'text-neon-magenta border-neon-magenta bg-[#12122a]'
                  : 'text-gray-500 border-[#2a2a5a] bg-[#1a1a3a] hover:text-gray-300'
              }`}
            >
              CHAT
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {activePanel === 'events' ? (
              <EventLog events={events} />
            ) : (
              <ChatLog messages={chatMessages} characters={simulation.characters} />
            )}
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="pixel-panel p-6 w-[420px]" onClick={(e) => e.stopPropagation()}
        style={{ borderColor: '#ffd700', boxShadow: '0 0 12px rgba(255,215,0,0.3), 4px 4px 0 #000' }}
      >
        <div className="text-pixel-sm text-neon-gold mb-5 tracking-wider" style={{ textShadow: '0 0 8px rgba(255,215,0,0.5)' }}>
          SIMULATION CONFIG
        </div>

        <div className="space-y-5">
          <PixelSliderField label="RANDOMNESS" value={local.randomness} onChange={(v) => setLocal({ ...local, randomness: v })} color="#00e5ff" />
          <PixelSliderField label="INFO SYMMETRY" value={local.information_symmetry} onChange={(v) => setLocal({ ...local, information_symmetry: v })} color="#00ff88" />
          <PixelSliderField label="SCARCITY" value={local.resource_scarcity} onChange={(v) => setLocal({ ...local, resource_scarcity: v })} color="#ff00aa" />
          <div>
            <label className="text-pixel-xs text-gray-500 tracking-wider block mb-2">MAX TICKS</label>
            <input
              type="number"
              value={local.max_ticks}
              onChange={(e) => setLocal({ ...local, max_ticks: Number(e.target.value) })}
              className="pixel-input text-pixel-xs w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="pixel-btn text-pixel-xs">
            CANCEL
          </button>
          <button
            onClick={() => onSave(local)}
            className="pixel-btn pixel-btn-gold text-pixel-xs"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

function PixelSliderField({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-pixel-xs text-gray-500 tracking-wider">{label}</span>
        <span className="text-pixel-xs" style={{ color }}>{pct}%</span>
      </div>
      <div className="pixel-bar-container cursor-pointer" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onChange(Math.round(x * 20) / 20);
      }}>
        <div className="pixel-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function QuickAddCharacter({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (data: CharacterCreate) => void;
}) {
  const [name, setName] = useState('');
  const [profile, setProfile] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    { name: 'The Diplomat', icon: '♦', color: 'text-neon-cyan', profile: 'A skilled negotiator who values peace and alliance-building above all.', traits: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.9, neuroticism: 0.3 } as PersonalityTraits, goals: ['Forge lasting alliances', 'Resolve conflicts peacefully'] },
    { name: 'The Warrior', icon: '⚔', color: 'text-neon-red', profile: 'A fierce combatant driven by honor and the desire to prove strength.', traits: { openness: 0.4, conscientiousness: 0.6, extraversion: 0.7, agreeableness: 0.3, neuroticism: 0.5 } as PersonalityTraits, goals: ['Defeat all rivals', 'Protect the weak'] },
    { name: 'The Trickster', icon: '★', color: 'text-neon-magenta', profile: 'A cunning manipulator who thrives on chaos and misdirection.', traits: { openness: 0.9, conscientiousness: 0.3, extraversion: 0.8, agreeableness: 0.2, neuroticism: 0.4 } as PersonalityTraits, goals: ['Sow discord among others', 'Accumulate secret power'] },
    { name: 'The Scholar', icon: '◆', color: 'text-neon-gold', profile: 'A curious mind devoted to understanding the world through observation.', traits: { openness: 0.95, conscientiousness: 0.85, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.4 } as PersonalityTraits, goals: ['Discover hidden knowledge', 'Map the environment'] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="pixel-panel p-6 w-[500px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
        style={{ borderColor: '#ff00aa', boxShadow: '0 0 12px rgba(255,0,170,0.3), 4px 4px 0 #000' }}
      >
        <div className="text-pixel-sm text-neon-magenta mb-4 tracking-wider" style={{ textShadow: '0 0 8px rgba(255,0,170,0.5)' }}>
          ADD CHARACTER
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setSelectedTemplate(t.name);
                setName(t.name);
                setProfile(t.profile);
              }}
              className={`pixel-panel p-2 text-center hover:bg-white/5 transition-colors ${
                selectedTemplate === t.name ? 'border-neon-cyan' : ''
              }`}
              style={selectedTemplate === t.name ? { borderColor: '#00e5ff', boxShadow: '0 0 6px rgba(0,229,255,0.3)' } : {}}
            >
              <div className={`text-pixel-base ${t.color} mb-1`}>{t.icon}</div>
              <div className="text-pixel-xs text-gray-400 truncate">{t.name.replace('The ', '')}</div>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-pixel-xs text-gray-500 tracking-wider block mb-1.5">NAME</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name..."
              className="pixel-input text-pixel-xs w-full"
            />
          </div>
          <div>
            <label className="text-pixel-xs text-gray-500 tracking-wider block mb-1.5">PROFILE</label>
            <textarea
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="Character backstory..."
              rows={3}
              className="pixel-input text-pixel-xs w-full resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="pixel-btn text-pixel-xs">
            CANCEL
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
            className="pixel-btn pixel-btn-cyan text-pixel-xs"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
