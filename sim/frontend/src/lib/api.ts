import type {
  SimulationState,
  SimulationSummary,
  SimulationConfig,
  Character,
  CharacterCreate,
  Memory,
  Action,
  SimEvent,
  ChatMessage,
  Location,
  Group,
  MarketState,
  TradeOffer,
  TradeHistory,
  AnalyticsSummary,
  RelationshipGraph,
} from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getSimulations(): Promise<SimulationSummary[]> {
  return request('/simulations');
}

export async function createSimulation(config?: Partial<SimulationConfig>): Promise<SimulationState> {
  return request('/simulations', {
    method: 'POST',
    body: JSON.stringify(config ?? {}),
  });
}

export async function getSimulation(id: string): Promise<SimulationState> {
  return request(`/simulations/${id}`);
}

export async function stepSimulation(id: string): Promise<{ events: SimEvent[]; state: SimulationState; chat_messages: ChatMessage[] }> {
  return request(`/simulations/${id}/step`, { method: 'POST' });
}

export async function updateConfig(id: string, config: Partial<SimulationConfig>): Promise<SimulationState> {
  return request(`/simulations/${id}/config`, {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

export async function deleteSimulation(id: string): Promise<{ ok: true }> {
  return request(`/simulations/${id}`, { method: 'DELETE' });
}

export async function addCharacter(simId: string, character: CharacterCreate): Promise<Character> {
  return request(`/simulations/${simId}/characters`, {
    method: 'POST',
    body: JSON.stringify(character),
  });
}

export async function batchCreateCharacters(simId: string, count: number, namePrefix = ''): Promise<Character[]> {
  return request(`/simulations/${simId}/characters/batch`, {
    method: 'POST',
    body: JSON.stringify({ count, name_prefix: namePrefix }),
  });
}

export async function getCharacter(simId: string, charId: string): Promise<Character> {
  return request(`/simulations/${simId}/characters/${charId}`);
}

export async function removeCharacter(simId: string, charId: string): Promise<{ ok: true }> {
  return request(`/simulations/${simId}/characters/${charId}`, { method: 'DELETE' });
}

export async function getMemory(simId: string, charId: string): Promise<Memory> {
  return request(`/simulations/${simId}/characters/${charId}/memory`);
}

export async function getReasoning(simId: string, charId: string): Promise<{ reasoning: string; action: Action }> {
  return request(`/simulations/${simId}/characters/${charId}/reasoning`);
}

export async function getEvents(simId: string, sinceTick?: number): Promise<SimEvent[]> {
  const query = sinceTick !== undefined ? `?since_tick=${sinceTick}` : '';
  return request(`/simulations/${simId}/events${query}`);
}

export async function getChat(simId: string, sinceTick?: number): Promise<ChatMessage[]> {
  const query = sinceTick !== undefined ? `?since_tick=${sinceTick}` : '';
  return request(`/simulations/${simId}/chat${query}`);
}

// Locations
export async function getLocations(simId: string): Promise<Location[]> {
  return request(`/simulations/${simId}/locations`);
}

export async function addLocation(simId: string, location: Partial<Location>): Promise<Location> {
  return request(`/simulations/${simId}/locations`, {
    method: 'POST',
    body: JSON.stringify(location),
  });
}

export async function removeLocation(simId: string, locId: string): Promise<{ status: string }> {
  return request(`/simulations/${simId}/locations/${locId}`, { method: 'DELETE' });
}

// Groups
export async function getGroups(simId: string): Promise<Group[]> {
  return request(`/simulations/${simId}/groups`);
}

export async function getGroup(simId: string, groupId: string): Promise<Group> {
  return request(`/simulations/${simId}/groups/${groupId}`);
}

// Market
export async function getMarket(simId: string): Promise<MarketState> {
  return request(`/simulations/${simId}/market`);
}

export async function getMarketOffers(simId: string, status = 'open'): Promise<TradeOffer[]> {
  return request(`/simulations/${simId}/market/offers?status=${status}`);
}

export async function getTradeHistory(simId: string, limit = 50): Promise<TradeHistory[]> {
  return request(`/simulations/${simId}/market/history?limit=${limit}`);
}

export async function getMarketPrices(simId: string): Promise<Record<string, number>> {
  return request(`/simulations/${simId}/market/prices`);
}

// Replay
export async function getReplayTicks(simId: string): Promise<number[]> {
  return request(`/simulations/${simId}/replay/ticks`);
}

export async function getReplayState(simId: string, tick: number): Promise<SimulationState> {
  return request(`/simulations/${simId}/replay/${tick}`);
}

// Analytics
export async function getAnalyticsSummary(simId: string): Promise<AnalyticsSummary> {
  return request(`/simulations/${simId}/analytics/summary`);
}

export async function getRelationshipGraph(simId: string): Promise<RelationshipGraph> {
  return request(`/simulations/${simId}/analytics/relationships`);
}

export async function getResourceTrends(simId: string): Promise<Record<string, { tick: number; name: string; energy: number; wealth: number; influence: number; health: number; alive: boolean }[]>> {
  return request(`/simulations/${simId}/analytics/resource-trends`);
}

export async function getEventFrequency(simId: string): Promise<Record<string, number>> {
  return request(`/simulations/${simId}/analytics/event-frequency`);
}

export function getExportJsonUrl(simId: string): string {
  return `${BASE}/simulations/${simId}/export/json`;
}

export function getExportCsvUrl(simId: string): string {
  return `${BASE}/simulations/${simId}/export/csv`;
}
