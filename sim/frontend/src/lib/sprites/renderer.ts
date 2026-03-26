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

// Camera smoothing
const CAMERA_LERP_SPEED = 0.08;

// ==================== PARTICLE SYSTEM ====================

export type ParticleType = 'dust' | 'emotion' | 'sparkle' | 'rain' | 'leaf';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: ParticleType;
  color: string;
  size: number;
  emoji?: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 500;

  emit(worldX: number, worldY: number, type: ParticleType, count: number = 3, emoji?: string) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const p = this.createParticle(worldX, worldY, type, emoji);
      if (p) this.particles.push(p);
    }
  }

  private createParticle(x: number, y: number, type: ParticleType, emoji?: string): Particle {
    switch (type) {
      case 'dust':
        return {
          x, y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -Math.random() * 0.5 - 0.2,
          life: 20 + Math.random() * 15,
          maxLife: 35,
          type, color: '#b8a88a', size: 2,
        };
      case 'emotion':
        return {
          x: x + (Math.random() - 0.5) * 8,
          y: y - 10,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.6 - Math.random() * 0.3,
          life: 50 + Math.random() * 20,
          maxLife: 70,
          type, color: '#ffffff', size: 8,
          emoji,
        };
      case 'sparkle':
        return {
          x: x + (Math.random() - 0.5) * 16,
          y: y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.3,
          life: 15 + Math.random() * 10,
          maxLife: 25,
          type, color: '#FFD700', size: 2,
        };
      case 'rain':
        return {
          x: x + (Math.random() - 0.5) * 800,
          y: y - 400 + Math.random() * 100,
          vx: -0.5,
          vy: 6 + Math.random() * 2,
          life: 80,
          maxLife: 80,
          type, color: '#8ab4d4', size: 1,
        };
      case 'leaf':
        return {
          x: x + (Math.random() - 0.5) * 400,
          y: y - 200 + Math.random() * 100,
          vx: 0.5 + Math.random() * 0.5,
          vy: 0.3 + Math.random() * 0.5,
          life: 100 + Math.random() * 60,
          maxLife: 160,
          type,
          color: Math.random() < 0.5 ? '#5dc05d' : '#cc8833',
          size: 3,
        };
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      // Gravity for leaves
      if (p.type === 'leaf') {
        p.vx += Math.sin(p.life * 0.1) * 0.02;
      }

      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));

      if (p.type === 'emotion' && p.emoji) {
        ctx.globalAlpha = alpha;
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.emoji, p.x, p.y);
        ctx.textAlign = 'start';
        ctx.globalAlpha = 1;
      } else if (p.type === 'rain') {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      }
    }
  }

  get count() { return this.particles.length; }
  clear() { this.particles.length = 0; }
}

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
  private targetCamera: Camera = { x: 640, y: 640, zoom: 1 };
  private smoothCamera = true;
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

  // Terrain chunk caching
  private chunkCache = new Map<string, { canvas: OffscreenCanvas; frame: number }>();
  private lastChunkClearFrame = 0;

  // Particle system
  particles = new ParticleSystem();

  // Weather
  private weatherType: 'clear' | 'rain' | 'leaves' = 'clear';
  private weatherTimer = 0;

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

    // Generate stars once at construction
    this.generateStars();
  }

  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
  }

  setCamera(x: number, y: number, zoom?: number) {
    this.targetCamera.x = x;
    this.targetCamera.y = y;
    // Also snap actual camera on explicit setCamera
    this.camera.x = x;
    this.camera.y = y;
    if (zoom !== undefined) {
      const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      this.camera.zoom = z;
      this.targetCamera.zoom = z;
    }
  }

  getCamera(): Camera {
    return { ...this.camera };
  }

  getViewportSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  centerOn(worldX: number, worldY: number) {
    this.targetCamera.x = worldX;
    this.targetCamera.y = worldY;
  }

  setWeather(type: 'clear' | 'rain' | 'leaves') {
    this.weatherType = type;
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

    // Smooth camera interpolation
    if (this.smoothCamera && !this.isDragging) {
      camera.x += (this.targetCamera.x - camera.x) * CAMERA_LERP_SPEED;
      camera.y += (this.targetCamera.y - camera.y) * CAMERA_LERP_SPEED;
    }

    // Update module-level glow values for terrain/building draw functions
    setLampGlow(this.dayNight.lampGlow);
    setWindowGlow(this.dayNight.lampGlow);

    // Weather particle spawning
    this.weatherTimer++;
    if (this.weatherType === 'rain' && this.weatherTimer % 2 === 0) {
      this.particles.emit(camera.x, camera.y, 'rain', 3);
    } else if (this.weatherType === 'leaves' && this.weatherTimer % 8 === 0) {
      this.particles.emit(camera.x, camera.y, 'leaf', 1);
    }

    // Update particles
    this.particles.update();

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Viewport bounds in world coordinates (with margin for sprites near edges)
    const margin = 128;
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

    // Draw world-space particles
    this.particles.draw(ctx);

    ctx.restore();

    // Day/night overlay (screen-space, after all world sprites)
    this.renderDayNightOverlay();

    // Increment animation frame counter
    this.rawFrame++;
    if (this.rawFrame % ANIMATION_FRAME_DIVISOR === 0) {
      this.frame++;
    }

    // Clear stale chunk caches periodically (every ~10 seconds at 60fps)
    if (this.rawFrame - this.lastChunkClearFrame > 600) {
      this.chunkCache.clear();
      this.lastChunkClearFrame = this.rawFrame;
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
    this.targetCamera.x = this.camera.x;
    this.targetCamera.y = this.camera.y;
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
