import { create } from 'zustand';
import type { SimulationState, SimEvent } from './types';

interface SimStore {
  simulation: SimulationState | null;
  selectedCharacterId: string | null;
  events: SimEvent[];
  isRunning: boolean;
  autoPlaySpeed: number;
  inspectorTab: 'emotions' | 'memory' | 'relationships' | 'reasoning';

  setSimulation: (sim: SimulationState) => void;
  selectCharacter: (id: string | null) => void;
  addEvents: (events: SimEvent[]) => void;
  setRunning: (running: boolean) => void;
  setAutoPlaySpeed: (speed: number) => void;
  setInspectorTab: (tab: 'emotions' | 'memory' | 'relationships' | 'reasoning') => void;
}

export const useSimStore = create<SimStore>((set) => ({
  simulation: null,
  selectedCharacterId: null,
  events: [],
  isRunning: false,
  autoPlaySpeed: 1000,
  inspectorTab: 'emotions',

  setSimulation: (sim) => set({ simulation: sim, events: sim.events }),
  selectCharacter: (id) => set({ selectedCharacterId: id }),
  addEvents: (events) => set((state) => ({
    events: [...state.events, ...events.filter(e => !state.events.find(ex => ex.id === e.id))],
  })),
  setRunning: (running) => set({ isRunning: running }),
  setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
}));
