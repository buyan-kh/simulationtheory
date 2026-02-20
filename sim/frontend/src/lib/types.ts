export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface EmotionalState {
  happiness: number;
  anger: number;
  fear: number;
  trust: number;
  surprise: number;
  disgust: number;
  sadness: number;
}

export interface MemoryEntry {
  id: string;
  tick: number;
  content: string;
  importance: number;
  related_characters: string[];
  emotional_context: EmotionalState;
}

export interface Memory {
  short_term: MemoryEntry[];
  long_term: MemoryEntry[];
  beliefs: Record<string, string>;
}

export type ActionType = 'cooperate' | 'compete' | 'negotiate' | 'ally' | 'betray' | 'explore' | 'rest' | 'gather' | 'share' | 'attack' | 'defend' | 'observe' | 'communicate';

export interface Action {
  type: ActionType;
  target_id: string | null;
  detail: string;
  reasoning: string;
}

export interface Character {
  id: string;
  name: string;
  profile: string;
  traits: PersonalityTraits;
  goals: string[];
  motivations: string[];
  image_url: string | null;
  emotional_state: EmotionalState;
  memory: Memory;
  resources: Record<string, number>;
  relationships: Record<string, number>;
  last_action: Action | null;
  last_reasoning: string;
  alive: boolean;
  position: { x: number; y: number };
}

export interface CharacterCreate {
  name: string;
  profile?: string;
  traits?: PersonalityTraits;
  goals?: string[];
  motivations?: string[];
  image_url?: string | null;
}

export type EventType = 'interaction' | 'environmental' | 'decision' | 'emergent' | 'alliance_formed' | 'conflict' | 'negotiation' | 'resource_change' | 'emotional_shift';

export interface SimEvent {
  id: string;
  tick: number;
  type: EventType;
  title: string;
  description: string;
  participants: string[];
  outcomes: string[];
  importance: number;
}

export interface Location {
  name: string;
  x: number;
  y: number;
  type: string;
}

export interface Environment {
  name: string;
  description: string;
  resources: Record<string, number>;
  conditions: Record<string, string>;
  locations: Location[];
}

export interface SimulationConfig {
  randomness: number;
  information_symmetry: number;
  resource_scarcity: number;
  max_ticks: number;
}

export interface SimulationState {
  id: string;
  tick: number;
  characters: Record<string, Character>;
  environment: Environment;
  events: SimEvent[];
  config: SimulationConfig;
  running: boolean;
  created_at: number;
}
