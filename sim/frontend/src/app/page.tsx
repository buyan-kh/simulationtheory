'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSimulation } from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [simIds, setSimIds] = useState<string[]>([]);

  async function handleCreate() {
    setCreating(true);
    try {
      const sim = await createSimulation({
        randomness: 0.3,
        information_symmetry: 0.5,
        resource_scarcity: 0.5,
        max_ticks: 100,
      });
      setSimIds((prev) => [sim.id, ...prev]);
      router.push(`/simulation/${sim.id}`);
    } catch {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-16 animate-fade-in">
        <h1 className="text-6xl font-bold tracking-tight mb-2">
          <span className="bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-gold bg-clip-text text-transparent">
            NEXUS SIM
          </span>
        </h1>
        <p className="text-gray-500 text-sm tracking-widest uppercase mt-4">
          Multi-Agent Game-Theoretic Simulation Engine
        </p>
        <div className="mt-2 h-px w-48 mx-auto bg-gradient-to-r from-transparent via-neon-cyan/40 to-transparent" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-12 animate-fade-in">
        <StatCard label="Engine" value="v0.1" color="cyan" />
        <StatCard label="Agents" value="AI-Driven" color="magenta" />
        <StatCard label="Theory" value="Nash" color="green" />
      </div>

      <div className="flex justify-center mb-12">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="group relative px-8 py-3 bg-gradient-to-r from-neon-cyan/10 to-neon-magenta/10 rounded-xl glow-border-cyan hover:from-neon-cyan/20 hover:to-neon-magenta/20 transition-all duration-300 disabled:opacity-50"
        >
          <span className="text-neon-cyan font-bold tracking-wider text-sm">
            {creating ? 'INITIALIZING...' : '+ NEW SIMULATION'}
          </span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-cyan/5 to-neon-magenta/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {simIds.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-3">Recent Simulations</h2>
          {simIds.map((id) => (
            <button
              key={id}
              onClick={() => router.push(`/simulation/${id}`)}
              className="w-full text-left px-4 py-3 glass rounded-lg hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 font-mono">{id}</span>
                <span className="text-xs text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                  OPEN →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-16 grid grid-cols-2 gap-4 animate-fade-in">
        <InfoCard
          title="Game Theory Core"
          description="Nash equilibria, minimax strategies, and strategic dominance drive agent decisions."
          color="cyan"
        />
        <InfoCard
          title="Emergent Behavior"
          description="Watch alliances form, conflicts erupt, and complex social dynamics emerge."
          color="magenta"
        />
        <InfoCard
          title="Memory & Emotion"
          description="Agents remember past interactions and their emotional state shapes behavior."
          color="green"
        />
        <InfoCard
          title="Path Exploration"
          description="Monte Carlo simulations explore possible futures with controlled randomness."
          color="gold"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-neon-cyan glow-border-cyan',
    magenta: 'text-neon-magenta glow-border-magenta',
    green: 'text-neon-green glow-border-green',
    gold: 'text-neon-gold glow-border-gold',
  };
  return (
    <div className={`glass rounded-xl p-4 text-center ${colorMap[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function InfoCard({ title, description, color }: { title: string; description: string; color: string }) {
  const borderMap: Record<string, string> = {
    cyan: 'glow-border-cyan',
    magenta: 'glow-border-magenta',
    green: 'glow-border-green',
    gold: 'glow-border-gold',
  };
  const textMap: Record<string, string> = {
    cyan: 'text-neon-cyan',
    magenta: 'text-neon-magenta',
    green: 'text-neon-green',
    gold: 'text-neon-gold',
  };
  return (
    <div className={`glass rounded-xl p-5 ${borderMap[color]}`}>
      <h3 className={`text-sm font-bold mb-2 ${textMap[color]}`}>{title}</h3>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
