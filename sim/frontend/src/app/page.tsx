'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSimulation, getSimulations, deleteSimulation } from '@/lib/api';
import type { SimulationSummary } from '@/lib/types';

function timeAgo(epoch: number): string {
  const seconds = Math.floor(Date.now() / 1000 - epoch);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function TitleScreen() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [recentSims, setRecentSims] = useState<SimulationSummary[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getSimulations()
      .then((sims) => setRecentSims(sims))
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
            <pre className="text-neon-cyan text-pixel-xs leading-tight inline-block text-left" style={{ textShadow: '0 0 10px rgba(74,154,170,0.6)' }}>
{`
 ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
 ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
 ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
 ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
 ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
 ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`}
            </pre>
          </div>

          <div className="text-pixel-lg text-neon-magenta mb-2 tracking-widest" style={{ textShadow: '0 0 8px rgba(196,90,122,0.5)' }}>
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
            <div className="text-pixel-xs text-neon-gold mb-3 tracking-wider" style={{ textShadow: '0 0 6px rgba(196,154,53,0.4)' }}>
              SAVED SESSIONS
            </div>
            <div className="space-y-1">
              {recentSims.map((sim) => (
                <div
                  key={sim.id}
                  className="flex items-center hover:bg-neon-cyan/5 border-2 border-transparent hover:border-neon-cyan/20 transition-colors group"
                >
                  <button
                    onClick={() => router.push(`/simulation/${sim.id}`)}
                    className="flex-1 text-left px-3 py-2 flex items-center justify-between min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-pixel-xs text-neon-cyan shrink-0">▶</span>
                      <span className="text-pixel-xs text-gray-300 truncate">
                        {sim.name || sim.id.slice(0, 16)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      <span className="text-pixel-xs text-gray-600">
                        TICK {String(sim.tick).padStart(3, '0')}
                      </span>
                      <span className="text-pixel-xs text-gray-600">
                        {sim.character_count} AGENTS
                      </span>
                      <span className="text-pixel-xs text-gray-600">
                        {sim.event_count} EVENTS
                      </span>
                      <span className="text-pixel-xs text-gray-600">
                        {timeAgo(sim.updated_at)}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await deleteSimulation(sim.id);
                      setRecentSims((prev) => prev.filter((s) => s.id !== sim.id));
                    }}
                    className="px-2 py-2 text-pixel-xs text-gray-700 hover:text-neon-red opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Delete session"
                  >
                    ✕
                  </button>
                </div>
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
    cyan: { text: 'text-neon-cyan', glow: '0 0 6px rgba(74,154,170,0.4)', iconBg: 'bg-neon-cyan/10 border-neon-cyan/30' },
    magenta: { text: 'text-neon-magenta', glow: '0 0 6px rgba(196,90,122,0.4)', iconBg: 'bg-neon-magenta/10 border-neon-magenta/30' },
    gold: { text: 'text-neon-gold', glow: '0 0 6px rgba(196,154,53,0.4)', iconBg: 'bg-neon-gold/10 border-neon-gold/30' },
    green: { text: 'text-neon-green', glow: '0 0 6px rgba(90,154,90,0.4)', iconBg: 'bg-neon-green/10 border-neon-green/30' },
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
