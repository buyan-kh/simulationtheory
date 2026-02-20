import { create } from 'zustand';
import type { SimulationState, SimEvent, ChatMessage } from './types';

interface SimStore {
  simulation: SimulationState | null;
  selectedCharacterId: string | null;
  events: SimEvent[];
  chatMessages: ChatMessage[];
  isRunning: boolean;
  autoPlaySpeed: number;
  inspectorTab: 'stats' | 'memory' | 'relations' | 'mind';
  activePanel: 'events' | 'chat';

  setSimulation: (sim: SimulationState) => void;
  selectCharacter: (id: string | null) => void;
  addEvents: (events: SimEvent[]) => void;
  addChatMessages: (messages: ChatMessage[]) => void;
  setRunning: (running: boolean) => void;
  setAutoPlaySpeed: (speed: number) => void;
  setInspectorTab: (tab: 'stats' | 'memory' | 'relations' | 'mind') => void;
  setActivePanel: (panel: 'events' | 'chat') => void;
}

export const useSimStore = create<SimStore>((set) => ({
  simulation: null,
  selectedCharacterId: null,
  events: [],
  chatMessages: [],
  isRunning: false,
  autoPlaySpeed: 1000,
  inspectorTab: 'stats',
  activePanel: 'events',

  setSimulation: (sim) => set({ simulation: sim, events: sim.events }),
  selectCharacter: (id) => set({ selectedCharacterId: id }),
  addEvents: (events) => set((state) => ({
    events: [...state.events, ...events.filter(e => !state.events.find(ex => ex.id === e.id))],
  })),
  addChatMessages: (messages) => set((state) => ({
    chatMessages: [...state.chatMessages, ...messages.filter(m => !state.chatMessages.find(cm => cm.id === m.id))],
  })),
  setRunning: (running) => set({ isRunning: running }),
  setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
