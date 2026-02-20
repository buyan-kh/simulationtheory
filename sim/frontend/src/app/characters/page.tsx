'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PersonalityTraits, CharacterCreate } from '@/lib/types';
import TraitSlider from '@/components/TraitSlider';
import { createSimulation, addCharacter } from '@/lib/api';

const TRAIT_COLORS: Record<keyof PersonalityTraits, string> = {
  openness: 'neon-cyan',
  conscientiousness: 'neon-green',
  extraversion: 'neon-gold',
  agreeableness: 'neon-magenta',
  neuroticism: 'neon-red',
};

const TEMPLATES = [
  {
    label: 'The Diplomat',
    data: {
      name: 'The Diplomat',
      profile: 'A skilled negotiator who values peace and alliance-building above all. Masters the art of compromise and sees every conflict as an opportunity for collaboration.',
      traits: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.9, neuroticism: 0.3 },
      goals: ['Forge lasting alliances', 'Resolve conflicts peacefully', 'Build trust networks'],
      motivations: ['Harmony', 'Legacy', 'Cooperation'],
    },
  },
  {
    label: 'The Warrior',
    data: {
      name: 'The Warrior',
      profile: 'A fierce combatant driven by honor and the desire to prove strength in battle. Protects the weak but challenges the strong.',
      traits: { openness: 0.4, conscientiousness: 0.6, extraversion: 0.7, agreeableness: 0.3, neuroticism: 0.5 },
      goals: ['Defeat all rivals', 'Protect the weak', 'Earn glory'],
      motivations: ['Honor', 'Strength', 'Justice'],
    },
  },
  {
    label: 'The Trickster',
    data: {
      name: 'The Trickster',
      profile: 'A cunning manipulator who thrives on chaos and misdirection. Always three steps ahead, weaving webs of deception.',
      traits: { openness: 0.9, conscientiousness: 0.3, extraversion: 0.8, agreeableness: 0.2, neuroticism: 0.4 },
      goals: ['Sow discord among others', 'Accumulate secret power', 'Never be caught'],
      motivations: ['Chaos', 'Freedom', 'Curiosity'],
    },
  },
  {
    label: 'The Scholar',
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

  function applyTemplate(t: typeof TEMPLATES[0]['data']) {
    setName(t.name);
    setProfile(t.profile);
    setTraits(t.traits);
    setGoals(t.goals);
    setMotivations(t.motivations);
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
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-1">
        <span className="bg-gradient-to-r from-neon-magenta to-neon-cyan bg-clip-text text-transparent">
          Character Creator
        </span>
      </h1>
      <p className="text-xs text-gray-500 mb-8">Design agents with unique personalities, goals, and motivations</p>

      <div className="mb-6">
        <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Templates</h3>
        <div className="grid grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(t.data)}
              className={`p-3 glass rounded-xl text-left hover:bg-white/5 transition-all ${
                name === t.data.name ? 'glow-border-cyan' : 'border border-white/5'
              }`}
            >
              <div className="text-xs font-bold text-gray-300 mb-1">{t.label}</div>
              <div className="text-[10px] text-gray-500 line-clamp-2">{t.data.profile.slice(0, 80)}...</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="glass rounded-xl p-5 space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter character name..."
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 outline-none focus:border-neon-cyan/30 placeholder:text-gray-700 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Profile / Bio</label>
              <textarea
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="Describe this character's backstory, personality, and role..."
                rows={4}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 outline-none focus:border-neon-cyan/30 placeholder:text-gray-700 resize-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Image URL</label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 outline-none focus:border-neon-cyan/30 placeholder:text-gray-700 transition-colors"
              />
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Personality Traits (Big Five)</h3>
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
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] text-gray-500 uppercase tracking-widest">Goals</h3>
                <button onClick={addGoal} className="text-[10px] text-neon-cyan hover:text-neon-cyan/80 transition-colors">+ Add</button>
              </div>
              <div className="space-y-2">
                {goals.map((g, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={g}
                      onChange={(e) => updateGoal(i, e.target.value)}
                      placeholder={`Goal ${i + 1}...`}
                      className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 outline-none focus:border-neon-cyan/30 placeholder:text-gray-700"
                    />
                    {goals.length > 1 && (
                      <button onClick={() => removeGoal(i)} className="text-gray-600 hover:text-neon-red text-xs transition-colors">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] text-gray-500 uppercase tracking-widest">Motivations</h3>
                <button onClick={addMotivation} className="text-[10px] text-neon-cyan hover:text-neon-cyan/80 transition-colors">+ Add</button>
              </div>
              <div className="space-y-2">
                {motivations.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={m}
                      onChange={(e) => updateMotivation(i, e.target.value)}
                      placeholder={`Motivation ${i + 1}...`}
                      className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 outline-none focus:border-neon-cyan/30 placeholder:text-gray-700"
                    />
                    {motivations.length > 1 && (
                      <button onClick={() => removeMotivation(i)} className="text-gray-600 hover:text-neon-red text-xs transition-colors">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Simulation ID (optional)</label>
                <input
                  value={simId}
                  onChange={(e) => setSimId(e.target.value)}
                  placeholder="Leave empty to create a new simulation"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 outline-none focus:border-neon-cyan/30 placeholder:text-gray-700 font-mono"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || submitting}
                className={`px-6 py-2.5 text-xs font-bold tracking-widest rounded-xl transition-all disabled:opacity-30 ${
                  success
                    ? 'bg-neon-green/20 text-neon-green glow-border-green'
                    : 'bg-gradient-to-r from-neon-cyan/10 to-neon-magenta/10 text-neon-cyan glow-border-cyan hover:from-neon-cyan/20 hover:to-neon-magenta/20'
                }`}
              >
                {success ? 'CREATED!' : submitting ? 'CREATING...' : 'ADD TO SIMULATION'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-20">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Live Preview</h3>
            <div className="glass-strong rounded-2xl p-5 glow-border-cyan">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-magenta/20 flex items-center justify-center border border-white/10 text-2xl">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full rounded-xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="text-gray-400">{name ? name.charAt(0).toUpperCase() : '?'}</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-200">
                    {name || 'Unnamed Agent'}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {dominantTrait ? `Primary: ${dominantTrait[0]}` : 'Balanced'}
                  </div>
                </div>
              </div>

              {profile && (
                <p className="text-[11px] text-gray-400 leading-relaxed mb-4 line-clamp-4">{profile}</p>
              )}

              <div className="space-y-2 mb-4">
                {(Object.entries(traits) as [keyof PersonalityTraits, number][]).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-600 w-20 uppercase">{key.slice(0, 6)}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-neon-cyan/60 transition-all duration-300"
                        style={{ width: `${val * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {goals.filter((g) => g.trim()).length > 0 && (
                <div className="mb-3">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Goals</div>
                  {goals.filter((g) => g.trim()).map((g, i) => (
                    <div key={i} className="text-[10px] text-gray-400 flex items-start gap-1.5">
                      <span className="text-neon-green mt-0.5">›</span> {g}
                    </div>
                  ))}
                </div>
              )}

              {motivations.filter((m) => m.trim()).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {motivations.filter((m) => m.trim()).map((m, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-neon-purple/10 text-neon-purple rounded">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
