'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSimulation, getSimulations } from '@/lib/api';
import type { SimulationState } from '@/lib/types';

export default function TitleScreen() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [recentSims, setRecentSims] = useState<SimulationState[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getSimulations()
      .then((sims) => setRecentSims(sims.slice(0, 5)))
      .catch(() => setLoadError(true));
  }, []);

  async function handleNewSim() {
    setCreating(true);
    try {
      const sim = await createSimulation({
        randomness: 0.3,
        information_symmetry: 0.5,
        resource_scarcity: 0.5,
        max_ticks: 100,
      });
      router.push(`/simulation/${sim.id}`);
    } catch {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-40px)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="pixel-panel p-8 mb-6 text-center">
          <div className="mb-6">
            <pre className="text-neon-cyan text-pixel-xs leading-tight inline-block text-left" style={{ textShadow: '0 0 10px rgba(0,229,255,0.6)' }}>
{`
 ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
 ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
 ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
 ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
 ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
 ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`}
            </pre>
          </div>

          <div className="text-pixel-lg text-neon-magenta mb-2 tracking-widest" style={{ textShadow: '0 0 8px rgba(255,0,170,0.5)' }}>
            S I M
          </div>

          <div className="w-48 h-[2px] mx-auto bg-gradient-to-r from-transparent via-neon-cyan to-transparent mb-8" />

          <p className="text-pixel-xs text-gray-400 mb-8 tracking-wide">
            Multi-Agent Game-Theoretic Simulation Engine v0.1
          </p>

          <button
            onClick={handleNewSim}
            disabled={creating}
            className="pixel-btn pixel-btn-cyan text-pixel-sm px-8 py-3 mb-4"
          >
            {creating ? (
              <span>INITIALIZING...</span>
            ) : (
              <span className="flex items-center gap-3">
                <span className="animate-pixel-blink">▶</span>
                NEW SIMULATION
              </span>
            )}
          </button>

          <div className="text-pixel-xs text-gray-600 animate-pixel-blink mt-4">
            PRESS START
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <FeatureCard
            icon="♦"
            title="AUTONOMOUS AGENTS"
            desc="AI-driven characters with unique personalities"
            color="cyan"
          />
          <FeatureCard
            icon="★"
            title="EMERGENT EVENTS"
            desc="No scripted outcomes, pure emergence"
            color="magenta"
          />
          <FeatureCard
            icon="◆"
            title="GAME THEORY"
            desc="Nash equilibria & strategic reasoning"
            color="gold"
          />
          <FeatureCard
            icon="♥"
            title="PERSISTENT MEMORY"
            desc="Characters remember & learn over time"
            color="green"
          />
        </div>

        {recentSims.length > 0 && (
          <div className="pixel-panel p-4">
            <div className="text-pixel-xs text-neon-gold mb-3 tracking-wider" style={{ textShadow: '0 0 6px rgba(255,215,0,0.4)' }}>
              CONTINUE SIMULATION
            </div>
            <div className="space-y-1">
              {recentSims.map((sim) => (
                <button
                  key={sim.id}
                  onClick={() => router.push(`/simulation/${sim.id}`)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-neon-cyan/5 border-2 border-transparent hover:border-neon-cyan/20 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-pixel-xs text-neon-cyan">▶</span>
                    <span className="text-pixel-xs text-gray-300 truncate max-w-[300px]">
                      {sim.id.slice(0, 16)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-pixel-xs text-gray-600">
                      TICK {String(sim.tick).padStart(3, '0')}
                    </span>
                    <span className="text-pixel-xs text-gray-600">
                      {Object.keys(sim.characters).length} AGENTS
                    </span>
                    <span className="text-pixel-xs text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                      LOAD →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {loadError && !recentSims.length && (
          <div className="pixel-panel p-4 text-center">
            <div className="text-pixel-xs text-gray-600">
              No saved simulations found. Start a new one!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  const colorMap: Record<string, { text: string; glow: string; iconBg: string }> = {
    cyan: { text: 'text-neon-cyan', glow: '0 0 6px rgba(0,229,255,0.4)', iconBg: 'bg-neon-cyan/10 border-neon-cyan/30' },
    magenta: { text: 'text-neon-magenta', glow: '0 0 6px rgba(255,0,170,0.4)', iconBg: 'bg-neon-magenta/10 border-neon-magenta/30' },
    gold: { text: 'text-neon-gold', glow: '0 0 6px rgba(255,215,0,0.4)', iconBg: 'bg-neon-gold/10 border-neon-gold/30' },
    green: { text: 'text-neon-green', glow: '0 0 6px rgba(0,255,136,0.4)', iconBg: 'bg-neon-green/10 border-neon-green/30' },
  };
  const c = colorMap[color];
  return (
    <div className="pixel-panel p-4 flex items-start gap-3">
      <div className={`w-8 h-8 flex items-center justify-center border-2 ${c.iconBg} ${c.text} text-pixel-base shrink-0`}>
        {icon}
      </div>
      <div>
        <div className={`text-pixel-xs ${c.text} mb-1.5`} style={{ textShadow: c.glow }}>
          {title}
        </div>
        <div className="text-pixel-xs text-gray-500 leading-relaxed">
          {desc}
        </div>
      </div>
    </div>
  );
}
