import { setLampGlow } from './terrain';
import { setWindowGlow } from './buildings';

export interface Sprite {
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number; // 0=terrain, 1=buildings, 2=characters, 3=UI
  draw: (ctx: CanvasRenderingContext2D, screenX: number, screenY: number, frame: number) => void;
  id?: string;
  onClick?: () => void;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const DRAG_THRESHOLD = 4;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ANIMATION_FRAME_DIVISOR = 15;

// ==================== DAY/NIGHT CYCLE ====================

export type TimeOfDay = 'night' | 'dawn' | 'day' | 'dusk';

export interface DayNightState {
  hour: number; // 0-23
  phase: TimeOfDay;
  overlayColor: string; // CSS rgb values e.g. "10,10,40"
  overlayAlpha: number;
  lampGlow: number; // 0-1
}

export function getDayNightState(tick: number): DayNightState {
  const hour = tick % 24;

  if (hour >= 8 && hour <= 17) {
    // Day: very slight warm tint
    return { hour, phase: 'day', overlayColor: '255,240,200', overlayAlpha: 0.03, lampGlow: 0 };
  } else if (hour >= 5 && hour <= 7) {
    // Dawn: warm orange/pink gradually brightening
    const t = (hour - 5) / 2; // 0 at hour 5, 1 at hour 7
    const r = Math.round(255 - 40 * (1 - t));
    const g = Math.round(180 + 60 * t);
    const b = Math.round(140 + 60 * t);
    return { hour, phase: 'dawn', overlayColor: `${r},${g},${b}`, overlayAlpha: 0.25 - t * 0.22, lampGlow: Math.max(0, 1 - t * 1.5) };
  } else if (hour >= 18 && hour <= 20) {
    // Dusk: warm orange/red gradually darkening
    const t = (hour - 18) / 2; // 0 at hour 18, 1 at hour 20
    const r = Math.round(255 - 60 * t);
    const g = Math.round(160 - 80 * t);
    const b = Math.round(120 - 80 * t);
    return { hour, phase: 'dusk', overlayColor: `${r},${g},${b}`, overlayAlpha: 0.05 + t * 0.25, lampGlow: Math.min(1, t * 1.5) };
  } else {
    // Night (21-4): dark blue overlay
    return { hour, phase: 'night', overlayColor: '10,10,40', overlayAlpha: 0.45, lampGlow: 1 };
  }
}

export class PixelRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera = { x: 640, y: 640, zoom: 1 };
  private sprites: Sprite[] = [];
  private frame: number = 0;
  private rawFrame: number = 0;
  private animationId: number = 0;
  private isDragging: boolean = false;
  private dragStart = { x: 0, y: 0 };
  private cameraStart = { x: 0, y: 0 };
  private dragMoved: boolean = false;
  private onClickSprite: ((id: string) => void) | null = null;
  private width: number = 0;
  private height: number = 0;
  private dayNight: DayNightState = getDayNightState(8);
  private starPositions: { x: number; y: number; brightness: number }[] = [];

  // Bound handlers for cleanup
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundWheel = this.handleWheel.bind(this);

    canvas.addEventListener('mousedown', this.boundMouseDown);
    canvas.addEventListener('mousemove', this.boundMouseMove);
    canvas.addEventListener('mouseup', this.boundMouseUp);
    canvas.addEventListener('mouseleave', this.boundMouseUp);
    canvas.addEventListener('wheel', this.boundWheel, { passive: false });
  }

  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
  }

  setCamera(x: number, y: number, zoom?: number) {
    this.camera.x = x;
    this.camera.y = y;
    if (zoom !== undefined) {
      this.camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    }
  }

  getCamera(): Camera {
    return { ...this.camera };
  }

  getViewportSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  centerOn(worldX: number, worldY: number) {
    this.camera.x = worldX;
    this.camera.y = worldY;
  }

  setSprites(sprites: Sprite[]) {
    this.sprites = sprites;
  }

  setDayNight(tick: number) {
    this.dayNight = getDayNightState(tick);
  }

  getDayNight(): DayNightState {
    return this.dayNight;
  }

  setClickHandler(handler: (id: string) => void) {
    this.onClickSprite = handler;
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const { x: cx, y: cy, zoom } = this.camera;
    return {
      x: (wx - cx) * zoom + this.width / 2,
      y: (wy - cy) * zoom + this.height / 2,
    };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const { x: cx, y: cy, zoom } = this.camera;
    return {
      x: (sx - this.width / 2) / zoom + cx,
      y: (sy - this.height / 2) / zoom + cy,
    };
  }

  start() {
    if (this.animationId) return;
    const loop = () => {
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private render() {
    const { ctx, width, height, camera, sprites } = this;

    // Update module-level glow values for terrain/building draw functions
    setLampGlow(this.dayNight.lampGlow);
    setWindowGlow(this.dayNight.lampGlow);

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Viewport bounds in world coordinates (with margin for sprites near edges)
    const margin = 64;
    const viewLeft = camera.x - (width / 2) / camera.zoom - margin;
    const viewRight = camera.x + (width / 2) / camera.zoom + margin;
    const viewTop = camera.y - (height / 2) / camera.zoom - margin;
    const viewBottom = camera.y + (height / 2) / camera.zoom + margin;

    // Sort sprites by layer, then by y position (for depth)
    const sorted = sprites.slice().sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      return a.y - b.y;
    });

    // Draw only visible sprites (viewport culling)
    for (const sprite of sorted) {
      const sx = sprite.x;
      const sy = sprite.y;
      const sw = sprite.width;
      const sh = sprite.height;

      // Cull sprites outside the viewport
      if (
        sx + sw < viewLeft ||
        sx > viewRight ||
        sy + sh < viewTop ||
        sy > viewBottom
      ) {
        continue;
      }

      ctx.save();
      sprite.draw(ctx, sx, sy, this.frame);
      ctx.restore();
    }

    ctx.restore();

    // Day/night overlay (screen-space, after all world sprites)
    this.renderDayNightOverlay();

    // Increment animation frame counter
    this.rawFrame++;
    if (this.rawFrame % ANIMATION_FRAME_DIVISOR === 0) {
      this.frame++;
    }
  }

  private generateStars() {
    // Generate deterministic star positions across the screen
    this.starPositions = [];
    const rng = (s: number) => {
      s = (s * 16807 + 0) % 2147483647;
      return s / 2147483647;
    };
    let seed = 9999;
    for (let i = 0; i < 80; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = rng(seed + i * 137);
      seed = (seed * 16807) % 2147483647;
      const y = rng(seed + i * 251);
      seed = (seed * 16807) % 2147483647;
      const brightness = 0.4 + rng(seed + i * 73) * 0.6;
      this.starPositions.push({ x, y, brightness });
    }
  }

  private renderDayNightOverlay() {
    const { ctx, width, height, dayNight } = this;
    if (dayNight.overlayAlpha <= 0) return;

    // Color overlay
    ctx.save();
    ctx.fillStyle = `rgba(${dayNight.overlayColor},${dayNight.overlayAlpha})`;
    ctx.fillRect(0, 0, width, height);

    // Stars at night/dawn/dusk when it's dark enough
    if (dayNight.overlayAlpha >= 0.15) {
      if (this.starPositions.length === 0) this.generateStars();

      const twinklePhase = this.rawFrame * 0.03;
      const starAlpha = Math.min(1, (dayNight.overlayAlpha - 0.15) / 0.3);

      for (const star of this.starPositions) {
        const twinkle = 0.5 + 0.5 * Math.sin(twinklePhase + star.x * 20 + star.y * 30);
        const a = star.brightness * twinkle * starAlpha;
        if (a < 0.05) continue;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        const sx = star.x * width;
        const sy = star.y * height * 0.6; // stars only in upper 60% of screen
        ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
      }
    }

    ctx.restore();
  }

  private handleMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStart.x = e.clientX;
    this.dragStart.y = e.clientY;
    this.cameraStart.x = this.camera.x;
    this.cameraStart.y = this.camera.y;
    this.canvas.style.cursor = 'grabbing';
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      this.dragMoved = true;
    }

    this.camera.x = this.cameraStart.x - dx / this.camera.zoom;
    this.camera.y = this.cameraStart.y - dy / this.camera.zoom;
  }

  private handleMouseUp(e: MouseEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';

    // If we didn't drag, treat as click
    if (!this.dragMoved) {
      this.handleClick(e);
    }
  }

  private handleClick(e: MouseEvent) {
    if (!this.onClickSprite) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.screenToWorld(screenX, screenY);

    // Check sprites in reverse order (top-most first), only clickable ones
    const clickable = this.sprites
      .filter((s) => s.id)
      .sort((a, b) => {
        if (a.layer !== b.layer) return b.layer - a.layer;
        return b.y - a.y;
      });

    for (const sprite of clickable) {
      if (
        world.x >= sprite.x &&
        world.x <= sprite.x + sprite.width &&
        world.y >= sprite.y &&
        world.y <= sprite.y + sprite.height
      ) {
        if (sprite.id) {
          this.onClickSprite(sprite.id);
        }
        return;
      }
    }
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.camera.zoom * zoomFactor));

    // Zoom toward mouse position
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldBefore = this.screenToWorld(mouseX, mouseY);

    this.camera.zoom = newZoom;

    const worldAfter = this.screenToWorld(mouseX, mouseY);
    this.camera.x -= worldAfter.x - worldBefore.x;
    this.camera.y -= worldAfter.y - worldBefore.y;
  }

  destroy() {
    this.stop();
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundMouseUp);
    this.canvas.removeEventListener('wheel', this.boundWheel);
  }
}
