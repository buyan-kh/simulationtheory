'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RelationshipGraph as RelGraphType } from '@/lib/types';
import { getRelationshipGraph } from '@/lib/api';

interface RelationshipGraphProps {
  simId: string;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
}

interface NodePos {
  id: string;
  name: string;
  alive: boolean;
  group_id: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const GROUP_COLORS = [
  '#4a9aaa', '#c45a7a', '#c49a35', '#5a9a5a', '#c4555a',
  '#5a9aaa', '#8a6aaa', '#cc7744', '#6aaa6a', '#c45a7a',
];

export default function RelationshipGraph({ simId, selectedCharacterId, onSelectCharacter }: RelationshipGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<NodePos[]>([]);
  const graphRef = useRef<RelGraphType | null>(null);
  const animRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const groupColorMap = useRef<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    getRelationshipGraph(simId)
      .then((g) => {
        graphRef.current = g;
        // Assign colors to groups
        const groupIds = [...new Set(g.nodes.map(n => n.group_id).filter(Boolean))] as string[];
        const map: Record<string, string> = {};
        groupIds.forEach((gid, i) => { map[gid] = GROUP_COLORS[i % GROUP_COLORS.length]; });
        groupColorMap.current = map;

        // Initialize node positions in a circle
        const cx = 200, cy = 150;
        const radius = Math.min(cx, cy) * 0.7;
        nodesRef.current = g.nodes.map((n, i) => {
          const angle = (2 * Math.PI * i) / g.nodes.length;
          return {
            ...n,
            x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
            y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
            vx: 0,
            vy: 0,
          };
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [simId]);

  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const graph = graphRef.current;
    if (!nodes.length || !graph) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // Force simulation step
    const repulsion = 800;
    const attraction = 0.05;
    const damping = 0.85;
    const centerPull = 0.01;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of graph.edges) {
      if (Math.abs(edge.weight) < 0.3) continue;
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = attraction * dist * Math.abs(edge.weight);
      src.vx += (dx / dist) * force;
      src.vy += (dy / dist) * force;
      tgt.vx -= (dx / dist) * force;
      tgt.vy -= (dy / dist) * force;
    }

    // Center pull & update positions
    const cx = w / 2, cy = h / 2;
    for (const node of nodes) {
      node.vx += (cx - node.x) * centerPull;
      node.vy += (cy - node.y) * centerPull;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
      // Clamp
      node.x = Math.max(15, Math.min(w - 15, node.x));
      node.y = Math.max(15, Math.min(h - 15, node.y));
    }

    // Draw
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // Edges
    for (const edge of graph.edges) {
      if (Math.abs(edge.weight) < 0.3) continue;
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (!src || !tgt) continue;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = edge.weight > 0 ? `rgba(90,154,90,${Math.min(Math.abs(edge.weight), 0.8)})` : `rgba(196,85,90,${Math.min(Math.abs(edge.weight), 0.8)})`;
      ctx.lineWidth = Math.abs(edge.weight) * 3;
      ctx.stroke();
    }

    // Nodes
    for (const node of nodes) {
      const isSelected = node.id === selectedCharacterId;
      const r = isSelected ? 8 : 6;
      const color = node.group_id ? (groupColorMap.current[node.group_id] || '#6a88b5') : '#4a9aaa';

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = `${color}30`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // White fill circle with colored border
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = node.alive ? '#fff' : '#d8d0c8';
      ctx.fill();
      ctx.strokeStyle = node.alive ? color : '#aaa';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Inner colored dot
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = node.alive ? color : '#bbb';
      ctx.fill();

      // Label
      ctx.font = '7px monospace';
      ctx.fillStyle = node.alive ? '#3a3a4a' : '#aaa';
      ctx.textAlign = 'center';
      ctx.fillText(node.name.slice(0, 8), node.x, node.y + r + 10);
    }

    animRef.current = requestAnimationFrame(simulate);
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!loading) {
      animRef.current = requestAnimationFrame(simulate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [loading, simulate]);

  // Resize canvas to container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const node of nodesRef.current) {
      const dx = node.x - mx;
      const dy = node.y - my;
      if (dx * dx + dy * dy < 100) {
        onSelectCharacter(node.id);
        return;
      }
    }
  };

  if (loading) {
    return (
      <div className="pixel-panel flex flex-col h-full">
        <div className="pixel-panel-title">Graph</div>
        <div className="flex-1 flex items-center justify-center">
          <span className="font-pixel text-pixel-text-dim animate-pixel-blink" style={{ fontSize: '8px' }}>Loading graph...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pixel-panel flex flex-col h-full">
      <div className="pixel-panel-title">Relationship Graph</div>
      <div ref={containerRef} className="flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="w-full h-full cursor-pointer"
          style={{ background: '#f5f0e6' }}
        />
      </div>
    </div>
  );
}
