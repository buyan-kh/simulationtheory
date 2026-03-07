'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSimStore } from '@/lib/store';
import { getSimulation, stepSimulation, updateConfig, addCharacter, batchCreateCharacters, getReplayTicks, getReplayState } from '@/lib/api';
import type { SimulationConfig, CharacterCreate, PersonalityTraits } from '@/lib/types';
import CharacterCard from '@/components/CharacterCard';
import PixelCanvas from '@/components/PixelCanvas';
import EventLog from '@/components/EventLog';
import ChatLog from '@/components/ChatLog';
import SimControls from '@/components/SimControls';
import Inspector from '@/components/Inspector';
import BuildingInterior from '@/components/BuildingInterior';
import GroupPanel from '@/components/GroupPanel';
import MarketPanel from '@/components/MarketPanel';
import ReplayControls from '@/components/ReplayControls';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import RelationshipGraph from '@/components/RelationshipGraph';
import GodMode from '@/components/GodMode';

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

  const {
    replayMode, replayTick, replayTicks,
    setReplayMode, setReplayTick, setReplayTicks,
  } = useSimStore();

  const [stepping, setStepping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
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
          <button
            onClick={() => setShowAnalytics(true)}
            className="pixel-btn text-pixel-xs"
            style={{ fontSize: '7px', padding: '2px 6px' }}
          >
            ANALYTICS
          </button>
          <button
            onClick={async () => {
              if (replayMode) {
                setReplayMode(false);
              } else {
                const ticks = await getReplayTicks(simId);
                if (ticks.length > 0) {
                  setReplayTicks(ticks);
                  setReplayTick(ticks[ticks.length - 1]);
                  setReplayMode(true);
                  setRunning(false);
                }
              }
            }}
            className={`pixel-btn text-pixel-xs ${replayMode ? 'pixel-btn-red' : ''}`}
            style={{ fontSize: '7px', padding: '2px 6px' }}
          >
            {replayMode ? 'EXIT REPLAY' : 'REPLAY'}
          </button>
        </div>
      </div>

      {replayMode && (
        <ReplayControls
          currentTick={replayTick}
          maxTick={replayTicks.length > 0 ? replayTicks[replayTicks.length - 1] : 0}
          ticks={replayTicks}
          onSeek={async (tick) => {
            setReplayTick(tick);
            try {
              const state = await getReplayState(simId, tick);
              setSimulation(state);
            } catch {}
          }}
          onExit={() => {
            setReplayMode(false);
            getSimulation(simId).then(setSimulation).catch(() => {});
          }}
        />
      )}

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
              onClickBuilding={(name) => setSelectedBuilding(name)}
              chatMessages={chatMessages}
              currentTick={simulation.tick}
              worldItems={simulation.world_items || []}
            />
          </div>

          {selectedCharacter && (
            <div className="h-[250px] border-t-2 border-[#4a4a8a] shrink-0 flex">
              <div className="flex-1 min-w-0">
                <Inspector
                  character={selectedCharacter}
                  allCharacters={simulation.characters}
                  simId={simId}
                />
              </div>
              <div className="w-[200px] border-l-2 border-[#4a4a8a] shrink-0 overflow-y-auto pixel-scrollbar">
                <GodMode
                  simId={simId}
                  characterId={selectedCharacter.id}
                  characterName={selectedCharacter.name}
                  onRefresh={async () => {
                    const sim = await getSimulation(simId);
                    setSimulation(sim);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="w-[280px] border-l-2 border-[#4a4a8a] bg-pixel-panel shrink-0 flex flex-col">
          <div className="flex shrink-0">
            {([
              { key: 'events' as const, label: 'EVENTS', color: 'neon-cyan' },
              { key: 'chat' as const, label: 'CHAT', color: 'neon-magenta' },
              { key: 'groups' as const, label: 'GROUPS', color: '#44ccff' },
              { key: 'market' as const, label: 'MARKET', color: '#ffcc00' },
              { key: 'graph' as const, label: 'GRAPH', color: '#aa44ff' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActivePanel(tab.key)}
                className={`flex-1 px-1.5 py-2 text-pixel-xs tracking-wider border-b-2 transition-colors ${
                  activePanel === tab.key
                    ? `bg-[#12122a]`
                    : 'text-gray-500 border-[#2a2a5a] bg-[#1a1a3a] hover:text-gray-300'
                }`}
                style={activePanel === tab.key ? { color: tab.color, borderColor: tab.color } : { fontSize: '7px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activePanel === 'events' && <EventLog events={events} />}
            {activePanel === 'chat' && <ChatLog messages={chatMessages} characters={simulation.characters} />}
            {activePanel === 'groups' && <GroupPanel groups={simulation.groups || {}} characters={simulation.characters} />}
            {activePanel === 'market' && <MarketPanel market={simulation.market || { offers: [], history: [], price_index: {} }} characters={simulation.characters} />}
            {activePanel === 'graph' && <RelationshipGraph simId={simId} selectedCharacterId={selectedCharacterId} onSelectCharacter={(id) => selectCharacter(id === selectedCharacterId ? null : id)} />}
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
          onBatchAdd={async (count, prefix) => {
            await batchCreateCharacters(simId, count, prefix);
            const sim = await getSimulation(simId);
            setSimulation(sim);
            setShowAddChar(false);
          }}
        />
      )}

      {selectedBuilding && (
        <BuildingInterior
          buildingName={selectedBuilding}
          locations={simulation.environment.locations}
          characters={simulation.characters}
          onClose={() => setSelectedBuilding(null)}
          worldItems={simulation.world_items || []}
        />
      )}

      {showAnalytics && (
        <AnalyticsDashboard
          simId={simId}
          onClose={() => setShowAnalytics(false)}
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

          <div className="pixel-divider" />
          <div className="text-pixel-xs text-gray-400 tracking-wider">LIFECYCLE</div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-pixel-xs text-gray-500 tracking-wider block mb-2">AGING RATE</label>
              <input
                type="number"
                value={local.aging_rate ?? 1}
                onChange={(e) => setLocal({ ...local, aging_rate: Number(e.target.value) })}
                min={0}
                className="pixel-input text-pixel-xs w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-pixel-xs text-gray-500 tracking-wider block mb-2">MAX POP</label>
              <input
                type="number"
                value={local.max_population ?? 30}
                onChange={(e) => setLocal({ ...local, max_population: Number(e.target.value) })}
                min={1}
                className="pixel-input text-pixel-xs w-full"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={local.enable_permadeath ?? true}
                onChange={(e) => setLocal({ ...local, enable_permadeath: e.target.checked })}
              />
              <span className="text-pixel-xs text-gray-400">Permadeath</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={local.enable_offspring ?? true}
                onChange={(e) => setLocal({ ...local, enable_offspring: e.target.checked })}
              />
              <span className="text-pixel-xs text-gray-400">Offspring</span>
            </label>
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

interface CharTemplate {
  label: string;
  icon: string;
  color: string;
  profile: string;
  traits: PersonalityTraits;
  goals: string[];
  motivations: string[];
}

const TEMPLATES: CharTemplate[] = [
  { label: 'Diplomat', icon: '♦', color: '#00e5ff', profile: 'A skilled negotiator who values peace and alliance-building above all.', traits: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.9, neuroticism: 0.3 }, goals: ['Forge lasting alliances', 'Resolve conflicts peacefully'], motivations: ['loyalty', 'compassion'] },
  { label: 'Warrior', icon: '⚔', color: '#ff3366', profile: 'A fierce combatant driven by honor and the desire to prove strength.', traits: { openness: 0.4, conscientiousness: 0.6, extraversion: 0.7, agreeableness: 0.3, neuroticism: 0.5 }, goals: ['Defeat all rivals', 'Protect the weak'], motivations: ['vengeance', 'loyalty'] },
  { label: 'Trickster', icon: '★', color: '#ff00aa', profile: 'A cunning manipulator who thrives on chaos and misdirection.', traits: { openness: 0.9, conscientiousness: 0.3, extraversion: 0.8, agreeableness: 0.2, neuroticism: 0.4 }, goals: ['Sow discord among others', 'Accumulate secret power'], motivations: ['greed', 'curiosity'] },
  { label: 'Scholar', icon: '◆', color: '#ffd700', profile: 'A curious mind devoted to understanding the world through observation and study.', traits: { openness: 0.95, conscientiousness: 0.85, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.4 }, goals: ['Discover hidden knowledge', 'Map the environment'], motivations: ['curiosity', 'compassion'] },
  { label: 'Healer', icon: '✚', color: '#44cc88', profile: 'A compassionate caretaker who puts the wellbeing of others before their own.', traits: { openness: 0.6, conscientiousness: 0.9, extraversion: 0.5, agreeableness: 0.95, neuroticism: 0.6 }, goals: ['Keep everyone healthy', 'Build a sanctuary'], motivations: ['compassion', 'loyalty'] },
  { label: 'Merchant', icon: '⬡', color: '#ffaa44', profile: 'A shrewd trader with an eye for profit and a knack for deal-making.', traits: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.8, agreeableness: 0.5, neuroticism: 0.3 }, goals: ['Amass great wealth', 'Control the market'], motivations: ['greed', 'curiosity'] },
  { label: 'Assassin', icon: '◇', color: '#8844cc', profile: 'A silent operative who strikes from the shadows with deadly precision.', traits: { openness: 0.3, conscientiousness: 0.8, extraversion: 0.2, agreeableness: 0.1, neuroticism: 0.5 }, goals: ['Eliminate key targets', 'Remain undetected'], motivations: ['vengeance', 'greed'] },
  { label: 'Bard', icon: '♫', color: '#ff66aa', profile: 'A charismatic entertainer who uses charm and stories to influence everyone.', traits: { openness: 0.9, conscientiousness: 0.4, extraversion: 0.95, agreeableness: 0.7, neuroticism: 0.3 }, goals: ['Become legendary', 'Know everyones secrets'], motivations: ['curiosity', 'compassion'] },
  { label: 'Guardian', icon: '▣', color: '#4488ff', profile: 'A steadfast protector devoted to defending the community at all costs.', traits: { openness: 0.3, conscientiousness: 0.9, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.4 }, goals: ['Protect the settlement', 'Uphold justice'], motivations: ['loyalty', 'vengeance'] },
  { label: 'Hermit', icon: '☾', color: '#6a7a8a', profile: 'A reclusive loner who shuns society and finds peace in solitude and nature.', traits: { openness: 0.7, conscientiousness: 0.5, extraversion: 0.1, agreeableness: 0.4, neuroticism: 0.7 }, goals: ['Achieve inner peace', 'Understand the natural world'], motivations: ['curiosity'] },
  { label: 'Tyrant', icon: '♛', color: '#cc2222', profile: 'A ruthless authoritarian who craves total dominance and control over others.', traits: { openness: 0.3, conscientiousness: 0.7, extraversion: 0.8, agreeableness: 0.05, neuroticism: 0.6 }, goals: ['Rule over everyone', 'Crush all opposition'], motivations: ['greed', 'vengeance'] },
  { label: 'Explorer', icon: '⚐', color: '#22ccaa', profile: 'A restless adventurer always seeking the unknown beyond the horizon.', traits: { openness: 0.95, conscientiousness: 0.4, extraversion: 0.6, agreeableness: 0.5, neuroticism: 0.3 }, goals: ['Discover every corner of the world', 'Find legendary artifacts'], motivations: ['curiosity'] },
  { label: 'Prophet', icon: '☀', color: '#eedd44', profile: 'A mystical visionary who claims to see the future and speaks in riddles.', traits: { openness: 0.9, conscientiousness: 0.6, extraversion: 0.5, agreeableness: 0.6, neuroticism: 0.8 }, goals: ['Guide others toward their destiny', 'Prevent catastrophe'], motivations: ['compassion', 'curiosity'] },
  { label: 'Spy', icon: '⊘', color: '#7a8a9a', profile: 'A master of disguise who gathers intelligence and plays all sides.', traits: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.3, neuroticism: 0.4 }, goals: ['Uncover every secret', 'Stay one step ahead'], motivations: ['curiosity', 'greed'] },
];

function QuickAddCharacter({ onClose, onAdd, onBatchAdd }: {
  onClose: () => void;
  onAdd: (data: CharacterCreate) => void;
  onBatchAdd: (count: number, prefix: string) => void;
}) {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [name, setName] = useState('');
  const [profile, setProfile] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [traits, setTraits] = useState<PersonalityTraits>({ openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 });
  const [goals, setGoals] = useState('');
  const [showTraits, setShowTraits] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [batchPrefix, setBatchPrefix] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function selectTemplate(idx: number) {
    const t = TEMPLATES[idx];
    setSelectedTemplate(idx);
    setName(t.label);
    setProfile(t.profile);
    setTraits(t.traits);
    setGoals(t.goals.join(', '));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="pixel-panel p-5 w-[560px] max-h-[85vh] overflow-y-auto pixel-scrollbar" onClick={(e) => e.stopPropagation()}
        style={{ borderColor: '#ff00aa', boxShadow: '0 0 12px rgba(255,0,170,0.3), 4px 4px 0 #000' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-pixel-sm text-neon-magenta tracking-wider" style={{ textShadow: '0 0 8px rgba(255,0,170,0.5)' }}>
            ADD {mode === 'batch' ? 'AGENTS' : 'CHARACTER'}
          </div>
          <div className="flex" style={{ border: '2px solid #4a4a8a' }}>
            <button
              onClick={() => setMode('single')}
              className="px-3 py-1 text-pixel-xs tracking-wider transition-colors"
              style={mode === 'single' ? { background: '#ff00aa30', color: '#ff00aa', borderRight: '2px solid #4a4a8a' } : { color: '#6a6a9a', borderRight: '2px solid #4a4a8a' }}
            >
              SINGLE
            </button>
            <button
              onClick={() => setMode('batch')}
              className="px-3 py-1 text-pixel-xs tracking-wider transition-colors"
              style={mode === 'batch' ? { background: '#00e5ff30', color: '#00e5ff' } : { color: '#6a6a9a' }}
            >
              BATCH
            </button>
          </div>
        </div>

        {mode === 'batch' ? (
          <div className="space-y-4">
            <div className="p-3" style={{ background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
              <div className="text-pixel-xs text-gray-400 mb-2">Spawn many agents at once with randomized traits, goals, and personalities.</div>
            </div>

            <div>
              <label className="text-pixel-xs text-gray-500 tracking-wider block mb-1">NUMBER OF AGENTS</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={batchCount}
                  onChange={(e) => setBatchCount(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
                  min={1}
                  max={10000}
                  className="pixel-input text-pixel-xs w-32"
                />
                <div className="flex gap-1.5">
                  {[10, 50, 100, 500, 1000].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBatchCount(n)}
                      className="px-2 py-1 text-pixel-xs transition-colors"
                      style={batchCount === n
                        ? { background: '#00e5ff20', color: '#00e5ff', border: '1px solid #00e5ff' }
                        : { color: '#6a6a9a', border: '1px solid #3a3a6a' }
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-pixel-xs text-gray-500 tracking-wider block mb-1">NAME PREFIX (OPTIONAL)</label>
              <input
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value)}
                placeholder="e.g. Villager, Soldier..."
                className="pixel-input text-pixel-xs w-full"
              />
              <div className="text-gray-600 mt-1" style={{ fontSize: '7px' }}>
                Leave empty for random names
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={onClose} className="pixel-btn text-pixel-xs">
                CANCEL
              </button>
              <button
                onClick={() => { setSubmitting(true); onBatchAdd(batchCount, batchPrefix); }}
                disabled={submitting}
                className="pixel-btn pixel-btn-cyan text-pixel-xs"
              >
                {submitting ? 'SPAWNING...' : `SPAWN ${batchCount} AGENTS`}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-pixel-xs text-gray-500 mb-2 tracking-wider">TEMPLATES</div>
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {TEMPLATES.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => selectTemplate(i)}
                  className="pixel-panel p-1.5 text-center hover:bg-white/5 transition-colors"
                  style={selectedTemplate === i ? { borderColor: t.color, boxShadow: `0 0 6px ${t.color}40` } : {}}
                  title={t.label}
                >
                  <div className="mb-0.5" style={{ fontSize: '14px', color: t.color }}>{t.icon}</div>
                  <div className="text-gray-400 truncate" style={{ fontSize: '6px' }}>{t.label}</div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-pixel-xs text-gray-500 tracking-wider block mb-1">NAME</label>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setSelectedTemplate(null); }}
                    placeholder="Enter any name..."
                    className="pixel-input text-pixel-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-pixel-xs text-gray-500 tracking-wider block mb-1">BACKSTORY</label>
                <textarea
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  placeholder="Who is this character? What drives them?"
                  rows={2}
                  className="pixel-input text-pixel-xs w-full resize-none"
                />
              </div>

              <div>
                <label className="text-pixel-xs text-gray-500 tracking-wider block mb-1">GOALS</label>
                <input
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Comma-separated goals..."
                  className="pixel-input text-pixel-xs w-full"
                />
              </div>

              <div>
                <button
                  onClick={() => setShowTraits(!showTraits)}
                  className="text-pixel-xs text-neon-cyan hover:text-white transition-colors tracking-wider flex items-center gap-1"
                >
                  <span style={{ fontSize: '8px' }}>{showTraits ? '▼' : '▶'}</span>
                  PERSONALITY TRAITS
                </button>
                {showTraits && (
                  <div className="mt-2 space-y-1.5 p-3" style={{ background: '#0a0a1a', border: '1px solid #2a2a5a' }}>
                    {([
                      ['Openness', 'openness', 'purple'],
                      ['Conscientiousness', 'conscientiousness', 'cyan'],
                      ['Extraversion', 'extraversion', 'gold'],
                      ['Agreeableness', 'agreeableness', 'green'],
                      ['Neuroticism', 'neuroticism', 'red'],
                    ] as const).map(([label, key, color]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-gray-400 w-28 truncate uppercase" style={{ fontSize: '7px', fontFamily: 'var(--font-pixel, monospace)' }}>{label}</span>
                        <div className="flex-1 relative" style={{ height: '10px' }}>
                          <div className="pixel-bar-container" style={{ height: '10px' }}>
                            <div className="pixel-bar-fill" style={{ width: `${traits[key] * 100}%`, background: { purple: '#aa44ff', cyan: '#00e5ff', gold: '#ffd700', green: '#00ff88', red: '#ff3366' }[color] }} />
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(traits[key] * 100)}
                            onChange={(e) => setTraits({ ...traits, [key]: Number(e.target.value) / 100 })}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <span className="w-7 text-right" style={{ fontSize: '7px', color: { purple: '#aa44ff', cyan: '#00e5ff', gold: '#ffd700', green: '#00ff88', red: '#ff3366' }[color], fontFamily: 'var(--font-pixel, monospace)' }}>
                          {Math.round(traits[key] * 100)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={onClose} className="pixel-btn text-pixel-xs">
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (!name.trim()) return;
                  const goalList = goals.split(',').map(g => g.trim()).filter(Boolean);
                  const tmpl = selectedTemplate !== null ? TEMPLATES[selectedTemplate] : null;
                  onAdd({
                    name: name.trim(),
                    profile: profile.trim() || undefined,
                    traits,
                    goals: goalList.length > 0 ? goalList : undefined,
                    motivations: tmpl?.motivations,
                  });
                }}
                disabled={!name.trim()}
                className="pixel-btn pixel-btn-cyan text-pixel-xs"
              >
                ADD
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
