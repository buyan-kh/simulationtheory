'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PersonalityTraits, CharacterCreate } from '@/lib/types';
import TraitSlider from '@/components/TraitSlider';
import { createSimulation, addCharacter } from '@/lib/api';

const TRAIT_COLORS: Record<keyof PersonalityTraits, string> = {
  openness: 'cyan',
  conscientiousness: 'green',
  extraversion: 'gold',
  agreeableness: 'magenta',
  neuroticism: 'red',
};

const TRAIT_ABBREV: Record<keyof PersonalityTraits, string> = {
  openness: 'OPN',
  conscientiousness: 'CSC',
  extraversion: 'EXT',
  agreeableness: 'AGR',
  neuroticism: 'NEU',
};

const TEMPLATES = [
  {
    label: 'DIPLOMAT',
    icon: '♦',
    color: 'neon-cyan',
    data: {
      name: 'The Diplomat',
      profile: 'A skilled negotiator who values peace and alliance-building above all. Masters the art of compromise and sees every conflict as an opportunity for collaboration.',
      traits: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.9, neuroticism: 0.3 },
      goals: ['Forge lasting alliances', 'Resolve conflicts peacefully', 'Build trust networks'],
      motivations: ['Harmony', 'Legacy', 'Cooperation'],
    },
  },
  {
    label: 'WARRIOR',
    icon: '⚔',
    color: 'neon-red',
    data: {
      name: 'The Warrior',
      profile: 'A fierce combatant driven by honor and the desire to prove strength in battle. Protects the weak but challenges the strong.',
      traits: { openness: 0.4, conscientiousness: 0.6, extraversion: 0.7, agreeableness: 0.3, neuroticism: 0.5 },
      goals: ['Defeat all rivals', 'Protect the weak', 'Earn glory'],
      motivations: ['Honor', 'Strength', 'Justice'],
    },
  },
  {
    label: 'TRICKSTER',
    icon: '★',
    color: 'neon-magenta',
    data: {
      name: 'The Trickster',
      profile: 'A cunning manipulator who thrives on chaos and misdirection. Always three steps ahead, weaving webs of deception.',
      traits: { openness: 0.9, conscientiousness: 0.3, extraversion: 0.8, agreeableness: 0.2, neuroticism: 0.4 },
      goals: ['Sow discord among others', 'Accumulate secret power', 'Never be caught'],
      motivations: ['Chaos', 'Freedom', 'Curiosity'],
    },
  },
  {
    label: 'SCHOLAR',
    icon: '◆',
    color: 'neon-gold',
    data: {
      name: 'The Scholar',
      profile: 'A curious mind devoted to understanding the world through observation and analysis. Knowledge is the ultimate currency.',
      traits: { openness: 0.95, conscientiousness: 0.85, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.4 },
      goals: ['Discover hidden knowledge', 'Map the environment', 'Understand all agents'],
      motivations: ['Knowledge', 'Truth', 'Discovery'],
    },
  },
];

export default function CharacterCreator() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [profile, setProfile] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [traits, setTraits] = useState<PersonalityTraits>({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  });
  const [goals, setGoals] = useState<string[]>(['']);
  const [motivations, setMotivations] = useState<string[]>(['']);
  const [simId, setSimId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setSelectedTemplate(t.label);
    setName(t.data.name);
    setProfile(t.data.profile);
    setTraits(t.data.traits);
    setGoals(t.data.goals);
    setMotivations(t.data.motivations);
  }

  function addGoal() { setGoals([...goals, '']); }
  function removeGoal(i: number) { setGoals(goals.filter((_, idx) => idx !== i)); }
  function updateGoal(i: number, v: string) { setGoals(goals.map((g, idx) => idx === i ? v : g)); }

  function addMotivation() { setMotivations([...motivations, '']); }
  function removeMotivation(i: number) { setMotivations(motivations.filter((_, idx) => idx !== i)); }
  function updateMotivation(i: number, v: string) { setMotivations(motivations.map((m, idx) => idx === i ? v : m)); }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      let targetSimId = simId;
      if (!targetSimId) {
        const sim = await createSimulation();
        targetSimId = sim.id;
        setSimId(targetSimId);
      }
      const data: CharacterCreate = {
        name: name.trim(),
        profile: profile.trim() || undefined,
        traits,
        goals: goals.filter((g) => g.trim()),
        motivations: motivations.filter((m) => m.trim()),
        image_url: imageUrl.trim() || null,
      };
      await addCharacter(targetSimId, data);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/simulation/${targetSimId}`);
      }, 800);
    } catch {
      setSubmitting(false);
    }
  }

  const dominantTrait = (Object.entries(traits) as [keyof PersonalityTraits, number][])
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="pixel-panel p-4 mb-4">
        <h1 className="text-pixel-lg text-neon-magenta tracking-wider" style={{ textShadow: '0 0 8px rgba(255,0,170,0.5)' }}>
          CHARACTER CREATOR
        </h1>
        <div className="text-pixel-xs text-gray-500 mt-1">
          Design agents with unique personalities, goals, and motivations
        </div>
      </div>

      <div className="pixel-panel p-4 mb-4">
        <div className="text-pixel-xs text-gray-500 mb-3 tracking-wider">TEMPLATES</div>
        <div className="grid grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(t)}
              className={`pixel-panel p-3 text-left transition-all hover:bg-white/5 ${
                selectedTemplate === t.label ? 'border-neon-cyan' : ''
              }`}
              style={selectedTemplate === t.label ? { borderColor: '#00e5ff', boxShadow: '0 0 8px rgba(0,229,255,0.3), 4px 4px 0 #000' } : {}}
            >
              <div className={`text-pixel-lg text-${t.color} mb-2 text-center`}>
                {t.icon}
              </div>
              <div className={`text-pixel-xs text-${t.color} text-center`} style={{ textShadow: '0 0 4px currentColor' }}>
                {t.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="pixel-panel p-4 space-y-4">
            <div>
              <label className="text-pixel-xs text-gray-500 tracking-wider block mb-2">NAME</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter character name..."
                className="pixel-input text-pixel-sm w-full"
              />
            </div>
            <div>
              <label className="text-pixel-xs text-gray-500 tracking-wider block mb-2">BIO</label>
              <textarea
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="Describe this character..."
                rows={4}
                className="pixel-input text-pixel-xs w-full resize-none"
              />
            </div>
            <div>
              <label className="text-pixel-xs text-gray-500 tracking-wider block mb-2">IMAGE URL</label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="pixel-input text-pixel-xs w-full"
              />
            </div>
          </div>

          <div className="pixel-panel p-4">
            <div className="text-pixel-xs text-gray-500 tracking-wider mb-4">TRAITS</div>
            <div className="space-y-4">
              {(Object.entries(traits) as [keyof PersonalityTraits, number][]).map(([key, val]) => (
                <TraitSlider
                  key={key}
                  label={key}
                  value={val}
                  onChange={(v) => setTraits({ ...traits, [key]: v })}
                  color={TRAIT_COLORS[key]}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="pixel-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-pixel-xs text-gray-500 tracking-wider">GOALS</span>
                <button onClick={addGoal} className="pixel-btn pixel-btn-green text-pixel-xs px-2 py-1">
                  + ADD
                </button>
              </div>
              <div className="space-y-2">
                {goals.map((g, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-neon-green text-pixel-xs">&gt;</span>
                    <input
                      value={g}
                      onChange={(e) => updateGoal(i, e.target.value)}
                      placeholder={`Goal ${i + 1}...`}
                      className="pixel-input text-pixel-xs flex-1 py-1.5"
                    />
                    {goals.length > 1 && (
                      <button onClick={() => removeGoal(i)} className="text-neon-red text-pixel-xs hover:text-neon-red/80 px-1">
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pixel-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-pixel-xs text-gray-500 tracking-wider">MOTIVATIONS</span>
                <button onClick={addMotivation} className="pixel-btn pixel-btn-cyan text-pixel-xs px-2 py-1">
                  + ADD
                </button>
              </div>
              <div className="space-y-2">
                {motivations.map((m, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-neon-cyan text-pixel-xs">&gt;</span>
                    <input
                      value={m}
                      onChange={(e) => updateMotivation(i, e.target.value)}
                      placeholder={`Motivation ${i + 1}...`}
                      className="pixel-input text-pixel-xs flex-1 py-1.5"
                    />
                    {motivations.length > 1 && (
                      <button onClick={() => removeMotivation(i)} className="text-neon-red text-pixel-xs hover:text-neon-red/80 px-1">
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pixel-panel p-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-pixel-xs text-gray-500 tracking-wider block mb-2">SIM ID (OPTIONAL)</label>
                <input
                  value={simId}
                  onChange={(e) => setSimId(e.target.value)}
                  placeholder="Leave empty to create new simulation"
                  className="pixel-input text-pixel-xs w-full"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || submitting}
                className={`pixel-btn text-pixel-sm px-6 py-3 ${
                  success ? 'pixel-btn-green' : 'pixel-btn-cyan'
                }`}
              >
                {success ? 'CREATED!' : submitting ? 'CREATING...' : '▶ CREATE CHARACTER'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-14">
            <div className="text-pixel-xs text-gray-500 tracking-wider mb-2">PREVIEW</div>
            <div className="pixel-panel p-4" style={{ borderColor: '#00e5ff', boxShadow: '0 0 8px rgba(0,229,255,0.2), 4px 4px 0 #000' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 border-2 border-[#3a3a5c] bg-pixel-bg flex items-center justify-center text-pixel-lg">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="text-neon-cyan">{name ? name.charAt(0).toUpperCase() : '?'}</span>
                  )}
                </div>
                <div>
                  <div className="text-pixel-sm text-gray-200">
                    {name || 'Unnamed Agent'}
                  </div>
                  <div className="text-pixel-xs text-gray-600 mt-0.5">
                    {dominantTrait ? `${TRAIT_ABBREV[dominantTrait[0]]} ${Math.round(dominantTrait[1] * 100)}%` : 'Balanced'}
                  </div>
                </div>
              </div>

              {profile && (
                <p className="text-pixel-xs text-gray-400 leading-relaxed mb-4 line-clamp-3">{profile}</p>
              )}

              <div className="space-y-1.5 mb-4">
                {(Object.entries(traits) as [keyof PersonalityTraits, number][]).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-pixel-xs text-gray-600 w-10">{TRAIT_ABBREV[key]}</span>
                    <div className="pixel-bar-container flex-1">
                      <div
                        className="pixel-bar-fill"
                        style={{
                          width: `${val * 100}%`,
                          backgroundColor: key === 'openness' ? '#00e5ff' :
                            key === 'conscientiousness' ? '#00ff88' :
                            key === 'extraversion' ? '#ffd700' :
                            key === 'agreeableness' ? '#ff00aa' : '#ff3366',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {goals.filter((g) => g.trim()).length > 0 && (
                <div className="mb-3">
                  <div className="text-pixel-xs text-gray-600 tracking-wider mb-1">GOALS</div>
                  {goals.filter((g) => g.trim()).map((g, i) => (
                    <div key={i} className="text-pixel-xs text-gray-400 flex items-start gap-1.5">
                      <span className="text-neon-green">&gt;</span> {g}
                    </div>
                  ))}
                </div>
              )}

              {motivations.filter((m) => m.trim()).length > 0 && (
                <div>
                  <div className="text-pixel-xs text-gray-600 tracking-wider mb-1">MOTIVATIONS</div>
                  <div className="flex flex-wrap gap-1">
                    {motivations.filter((m) => m.trim()).map((m, i) => (
                      <span key={i} className="text-pixel-xs px-2 py-0.5 bg-neon-purple/10 text-neon-purple border border-neon-purple/20">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
