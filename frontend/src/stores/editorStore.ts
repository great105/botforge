import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';

// --- Undo/Redo history ---

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

interface EditorState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  aiLoading: boolean;
  aiProgress: string;
  // Undo/Redo
  history: Snapshot[];
  historyIndex: number;
  // Auto-save
  dirty: boolean;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNode: (id: string | null) => void;
  setAiLoading: (loading: boolean) => void;
  setAiProgress: (progress: string) => void;
  addNode: (node: Node) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  // Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // Auto-save
  markClean: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  aiLoading: false,
  aiProgress: '',
  history: [],
  historyIndex: -1,
  dirty: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    const prev = get().nodes;
    const next = applyNodeChanges(changes, prev);
    const dirty = prev.length !== next.length || changes.some(c => c.type === 'remove' || c.type === 'position');
    set((s) => ({ nodes: next, dirty: s.dirty || dirty }));
  },

  onEdgesChange: (changes) => {
    const prev = get().edges;
    const next = applyEdgeChanges(changes, prev);
    const dirty = prev.length !== next.length;
    set((s) => ({ edges: next, dirty: s.dirty || dirty }));
  },

  onConnect: (connection) => {
    get().pushHistory();
    set((s) => ({ edges: addEdge(connection, s.edges), dirty: true }));
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  setAiLoading: (loading) => set({ aiLoading: loading }),
  setAiProgress: (progress) => set({ aiProgress: progress }),

  addNode: (node) => {
    get().pushHistory();
    set((s) => ({ nodes: [...s.nodes, node], dirty: true }));
  },

  updateNodeData: (id, data) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      ),
      dirty: true,
    }));
  },

  deleteNode: (id) => {
    get().pushHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      dirty: true,
    }));
  },

  duplicateNode: (id) => {
    const state = get();
    const original = state.nodes.find((n) => n.id === id);
    if (!original) return;
    state.pushHistory();
    const newId = `node_${Date.now()}`;
    const clone: Node = {
      ...original,
      id: newId,
      position: {
        x: original.position.x + 40,
        y: original.position.y + 40,
      },
      data: { ...original.data, label: `${original.data.label || original.type} (копия)` },
      selected: false,
    };
    set((s) => ({
      nodes: [...s.nodes, clone],
      selectedNodeId: newId,
      dirty: true,
    }));
  },

  // --- Undo/Redo ---

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const trimmed = history.slice(0, historyIndex + 1);
    const snapshot: Snapshot = {
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: edges.map((e) => ({ ...e })),
    };
    const next = [...trimmed, snapshot].slice(-MAX_HISTORY);
    set({ history: next, historyIndex: next.length - 1 });
  },

  undo: () => {
    const { history, historyIndex, nodes, edges } = get();
    if (historyIndex < 0) return;

    if (historyIndex === history.length - 1) {
      const current: Snapshot = {
        nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
        edges: edges.map((e) => ({ ...e })),
      };
      const updatedHistory = [...history, current];
      const snapshot = history[historyIndex];
      set({
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        history: updatedHistory,
        historyIndex: historyIndex - 1,
        dirty: true,
      });
    } else {
      const snapshot = history[historyIndex];
      set({
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        historyIndex: historyIndex - 1,
        dirty: true,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    const nextIndex = historyIndex + 2;
    if (nextIndex >= history.length) return;
    const snapshot = history[nextIndex];
    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      historyIndex: historyIndex + 1,
      dirty: true,
    });
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex + 2 < get().history.length,

  markClean: () => set({ dirty: false }),
}));
