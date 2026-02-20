'use client';

import type { Character, Location } from '@/lib/types';
import { getMoodColor } from './EmotionDisplay';

interface WorldViewProps {
  characters: Record<string, Character>;
  locations: Location[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
}

const SCALE = 1.8;

function toIso(x: number, y: number): { ix: number; iy: number } {
  return {
    ix: (x - y) * SCALE,
    iy: (x + y) * (SCALE * 0.5),
  };
}

const LOCATION_ICONS: Record<string, string> = {
  trade: '\u{1F3EA}',
  conflict: '\u{2694}',
  diplomacy: '\u{1F3DB}',
  exploration: '\u{1F332}',
  knowledge: '\u{1F4DA}',
};

export default function WorldView({ characters, locations, selectedCharacterId, onSelectCharacter }: WorldViewProps) {
  const chars = Object.values(characters);

  const allPoints = [
    ...chars.map((c) => toIso(c.position.x, c.position.y)),
    ...locations.map((l) => toIso(l.x, l.y)),
  ];

  const padding = 60;
  const isoMinX = allPoints.length ? Math.min(...allPoints.map((p) => p.ix)) - padding : -200;
  const isoMaxX = allPoints.length ? Math.max(...allPoints.map((p) => p.ix)) + padding : 200;
  const isoMinY = allPoints.length ? Math.min(...allPoints.map((p) => p.iy)) - padding : -150;
  const isoMaxY = allPoints.length ? Math.max(...allPoints.map((p) => p.iy)) + padding : 150;
  const viewWidth = isoMaxX - isoMinX;
  const viewHeight = isoMaxY - isoMinY;

  const selectedChar = selectedCharacterId ? characters[selectedCharacterId] : null;

  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const gridStep = 50;
  for (let i = -200; i <= 200; i += gridStep) {
    const a = toIso(i, -200);
    const b = toIso(i, 200);
    gridLines.push({ x1: a.ix, y1: a.iy, x2: b.ix, y2: b.iy });
    const c = toIso(-200, i);
    const d = toIso(200, i);
    gridLines.push({ x1: c.ix, y1: c.iy, x2: d.ix, y2: d.iy });
  }

  return (
    <div className="w-full h-full glass rounded-xl overflow-hidden relative">
      <div className="absolute top-2 left-3 text-[10px] text-gray-600 uppercase tracking-widest z-10">
        World View
      </div>

      <svg
        viewBox={`${isoMinX} ${isoMinY} ${viewWidth} ${viewHeight}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {gridLines.map((line, i) => (
          <line
            key={`grid-${i}`}
            x1={line.x1} y1={line.y1}
            x2={line.x2} y2={line.y2}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="0.5"
          />
        ))}

        {locations.map((loc) => {
          const { ix, iy } = toIso(loc.x, loc.y);
          const icon = LOCATION_ICONS[loc.type] || '\u{1F4CD}';
          const halfW = 20;
          const halfH = 12;
          return (
            <g key={loc.name}>
              <polygon
                points={`${ix},${iy - halfH} ${ix + halfW},${iy} ${ix},${iy + halfH} ${ix - halfW},${iy}`}
                fill="rgba(255,215,0,0.06)"
                stroke="rgba(255,215,0,0.15)"
                strokeWidth="0.5"
              />
              <text x={ix} y={iy + 2} textAnchor="middle" fontSize="10" dominantBaseline="middle">
                {icon}
              </text>
              <text
                x={ix}
                y={iy + 16}
                textAnchor="middle"
                fontSize="5"
                fill="rgba(255,215,0,0.6)"
                fontFamily="monospace"
              >
                {loc.name}
              </text>
            </g>
          );
        })}

        {selectedChar && chars.map((c) => {
          if (c.id === selectedCharacterId) return null;
          const rel = selectedChar.relationships[c.id];
          if (rel === undefined) return null;
          const from = toIso(selectedChar.position.x, selectedChar.position.y);
          const to = toIso(c.position.x, c.position.y);
          const color = rel > 0 ? `rgba(0,255,136,${Math.min(1, Math.abs(rel))})` : `rgba(255,51,102,${Math.min(1, Math.abs(rel))})`;
          return (
            <line
              key={`rel-${c.id}`}
              x1={from.ix}
              y1={from.iy}
              x2={to.ix}
              y2={to.iy}
              stroke={color}
              strokeWidth="1"
              strokeDasharray={rel < 0 ? '4,4' : 'none'}
              opacity="0.5"
              filter="url(#glow)"
            />
          );
        })}

        {chars.map((c) => {
          const { ix, iy } = toIso(c.position.x, c.position.y);
          const color = getMoodColor(c.emotional_state);
          const isSelected = c.id === selectedCharacterId;

          return (
            <g
              key={c.id}
              onClick={() => onSelectCharacter(c.id)}
              className="cursor-pointer"
            >
              {isSelected && (
                <circle cx={ix} cy={iy} r="10" fill="none" stroke={color} strokeWidth="0.5" opacity="0.5">
                  <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={ix}
                cy={iy}
                r="6"
                fill={color}
                opacity={c.alive ? 0.9 : 0.3}
                filter="url(#glow)"
              />
              <circle
                cx={ix}
                cy={iy}
                r="3"
                fill="white"
                opacity={c.alive ? 0.7 : 0.2}
              />
              <text
                x={ix}
                y={iy - 10}
                textAnchor="middle"
                fontSize="5"
                fill={color}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      {chars.length === 0 && locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2 opacity-30">{'\u{1F30C}'}</div>
            <div className="text-xs text-gray-600">Empty world — add characters to begin</div>
          </div>
        </div>
      )}
    </div>
  );
}
