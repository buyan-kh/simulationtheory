import type {
  SimulationState,
  SimulationConfig,
  Character,
  CharacterCreate,
  Memory,
  Action,
  SimEvent,
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

export async function createSimulation(config?: Partial<SimulationConfig>): Promise<SimulationState> {
  return request('/simulations', {
    method: 'POST',
    body: JSON.stringify(config ?? {}),
  });
}

export async function getSimulation(id: string): Promise<SimulationState> {
  return request(`/simulations/${id}`);
}

export async function stepSimulation(id: string): Promise<{ events: SimEvent[]; state: SimulationState }> {
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
