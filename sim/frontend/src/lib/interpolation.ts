/** Smooth position interpolation between simulation ticks. */

interface CharacterMotion {
  prevX: number;
  prevY: number;
  targetX: number;
  targetY: number;
  startTime: number;
}

export class InterpolationManager {
  private motions = new Map<string, CharacterMotion>();
  private tickDuration = 300;

  setTickDuration(ms: number) {
    this.tickDuration = Math.max(50, ms);
  }

  /** Called when new simulation state arrives. */
  updateTargets(characters: Record<string, { position: { x: number; y: number } }>) {
    const now = performance.now();
    for (const [id, char] of Object.entries(characters)) {
      const existing = this.motions.get(id);
      if (existing) {
        // Snap current interpolated position to prev
        const t = Math.min(1, (now - existing.startTime) / this.tickDuration);
        const st = t * t * (3 - 2 * t);
        existing.prevX = existing.prevX + (existing.targetX - existing.prevX) * st;
        existing.prevY = existing.prevY + (existing.targetY - existing.prevY) * st;
        existing.targetX = char.position.x;
        existing.targetY = char.position.y;
        existing.startTime = now;
      } else {
        this.motions.set(id, {
          prevX: char.position.x,
          prevY: char.position.y,
          targetX: char.position.x,
          targetY: char.position.y,
          startTime: now,
        });
      }
    }
  }

  /** Called every render frame — returns smoothly interpolated position. */
  getPosition(id: string): { x: number; y: number } | null {
    const m = this.motions.get(id);
    if (!m) return null;
    const t = Math.min(1, (performance.now() - m.startTime) / this.tickDuration);
    // Smoothstep for natural acceleration/deceleration
    const st = t * t * (3 - 2 * t);
    return {
      x: m.prevX + (m.targetX - m.prevX) * st,
      y: m.prevY + (m.targetY - m.prevY) * st,
    };
  }

  /** Direction vector from prev → target (for walking animation). */
  getDirection(id: string): { dx: number; dy: number } {
    const m = this.motions.get(id);
    if (!m) return { dx: 0, dy: 0 };
    return { dx: m.targetX - m.prevX, dy: m.targetY - m.prevY };
  }

  /** Whether the character is currently moving (target differs from prev). */
  isMoving(id: string): boolean {
    const m = this.motions.get(id);
    if (!m) return false;
    const dx = m.targetX - m.prevX;
    const dy = m.targetY - m.prevY;
    return Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3;
  }
}
