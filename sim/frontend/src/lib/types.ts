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

export type ActionType =
  | 'cooperate' | 'compete' | 'negotiate' | 'ally' | 'betray'
  | 'explore' | 'rest' | 'gather' | 'share' | 'attack' | 'defend'
  | 'observe' | 'communicate'
  | 'trade' | 'form_group' | 'join_group' | 'leave_group'
  | 'build_home' | 'kill' | 'bully' | 'learn' | 'teach' | 'court';

export interface Action {
  type: ActionType;
  target_id: string | null;
  detail: string;
  reasoning: string;
}

export interface Needs {
  hunger: number;
  energy: number;
  social: number;
  fun: number;
  hygiene: number;
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
  needs: Needs;
  // Lifecycle
  age?: number;
  max_age?: number;
  health?: number;
  cause_of_death?: string | null;
  death_tick?: number | null;
  parent_ids?: string[];
  // Social
  group_id?: string | null;
  group_role?: string | null;
  // Trade
  trade_skill?: number;
}

export interface CharacterCreate {
  name: string;
  profile?: string;
  traits?: Partial<PersonalityTraits>;
  goals?: string[];
  motivations?: string[];
  image_url?: string | null;
}

export type EventType =
  | 'interaction' | 'environmental' | 'decision' | 'emergent'
  | 'alliance_formed' | 'conflict' | 'negotiation' | 'resource_change' | 'emotional_shift'
  | 'death' | 'birth'
  | 'group_formed' | 'group_dissolved' | 'group_conflict' | 'member_joined' | 'member_left' | 'leadership_change'
  | 'trade_completed' | 'trade_posted' | 'market_shift';

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
  id: string;
  name: string;
  x: number;
  y: number;
  type: string;
  biome: string;
  resources: Record<string, number>;
  resource_regen_rate: Record<string, number>;
  capacity: number;
  owner_group_id: string | null;
  modifiers: Record<string, number>;
  is_removable: boolean;
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
  aging_rate?: number;
  enable_permadeath?: boolean;
  enable_offspring?: boolean;
  max_population?: number;
}

export interface GroupMember {
  character_id: string;
  role: string;
  joined_tick: number;
  loyalty: number;
}

export interface Group {
  id: string;
  name: string;
  founded_tick: number;
  leader_id: string | null;
  members: GroupMember[];
  goals: string[];
  resources: Record<string, number>;
  territory_ids: string[];
  reputation: number;
  rival_group_ids: string[];
  ally_group_ids: string[];
  dissolved: boolean;
  dissolved_tick: number | null;
}

export interface TradeOffer {
  id: string;
  seller_id: string;
  offer_resource: string;
  offer_amount: number;
  request_resource: string;
  request_amount: number;
  created_tick: number;
  expires_tick: number;
  status: string;
  accepted_by: string | null;
}

export interface TradeHistory {
  id: string;
  tick: number;
  seller_id: string;
  buyer_id: string;
  sold_resource: string;
  sold_amount: number;
  bought_resource: string;
  bought_amount: number;
}

export interface MarketState {
  offers: TradeOffer[];
  history: TradeHistory[];
  price_index: Record<string, number>;
}

export interface SimulationState {
  id: string;
  name: string;
  tick: number;
  characters: Record<string, Character>;
  environment: Environment;
  events: SimEvent[];
  config: SimulationConfig;
  running: boolean;
  created_at: number;
  updated_at: number;
  chat_log: ChatMessage[];
  groups: Record<string, Group>;
  market: MarketState;
}

export interface SimulationSummary {
  id: string;
  name: string;
  tick: number;
  character_count: number;
  event_count: number;
  created_at: number;
  updated_at: number;
}

export interface ChatMessage {
  id: string;
  tick: number;
  speaker_id: string;
  speaker_name: string;
  content: string;
  tone: string;
  target_id: string | null;
  target_name: string | null;
  is_thought: boolean;
  action_context: string;
}

export interface AnalyticsSummary {
  total_ticks: number;
  total_characters: number;
  alive_characters: number;
  dead_characters: number;
  total_events: number;
  events_by_type: Record<string, number>;
  avg_relationship: number;
  total_groups: number;
  most_influential: string | null;
  wealthiest: string | null;
  most_connected: string | null;
}

export interface RelationshipGraph {
  nodes: { id: string; name: string; alive: boolean; group_id: string | null }[];
  edges: { source: string; target: string; weight: number; type: string }[];
}
