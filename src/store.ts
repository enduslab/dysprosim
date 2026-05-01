import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { open, save, ask } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type {
  Device,
  Connection,
  Product,
  Material,
  Tool,
  Settings,
  CanvasState,
  LayoutData,
  SimulationState,
  SimulationResults,
  ResourceSelectionRule,
  SimulationRecord,
  ProductRouteCheckResult,
  SimulationMode,
  WarehouseSelectionPriority,
  ProductSelectionStrategy,
  AiApiConfig,
  AiAnalysisRecord,
} from './types';

interface AppState {
  canvas: CanvasState;
  selectedDeviceId: string | null;
  selectedDeviceIds: string[];
  selectedConnectionId: string | null;
  toolMode: 'select' | 'pan' | 'device' | 'connection';
  deviceTypeToAdd: string | null;
  connectionLineStyle: string | null;
  zoom: number;
  panOffset: { x: number; y: number };
  simulation: SimulationState;
  simulationResults: SimulationResults | null;
  loading: boolean;
  error: string | null;
  showSimControlPanel: boolean;
  showRecordsModal: boolean;
  recordsModalDeviceId: string | null;
  recordsModalConnectionId: string | null;
  routeValidated: boolean;
  productRoutes: ProductRouteCheckResult | null;
  showProductRoutesModal: boolean;
  validationErrors: string[] | null;
  showValidationErrorModal: boolean;
  currentFilePath: string | null;
  history: CanvasState[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  selectDevice: (id: string | null) => void;
  toggleDeviceSelection: (id: string) => void;
  setMultiSelectedDevices: (ids: string[]) => void;
  clearDeviceSelection: () => void;
  selectConnection: (id: string | null) => void;
  setToolMode: (mode: 'select' | 'pan' | 'device' | 'connection') => void;
  setDeviceTypeToAdd: (type: string | null) => void;
  setConnectionLineStyle: (style: string | null) => void;
  setShowSimControlPanel: (show: boolean) => void;
  openRecordsModal: (deviceId?: string, connectionId?: string) => void;
  closeRecordsModal: () => void;
  setCurrentFilePath: (path: string | null) => void;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  selectAllDevices: () => void;
  deselectAll: () => void;
  handleNewCanvas: () => Promise<void>;
  handleOpenLayout: () => Promise<void>;
  handleSaveLayout: () => Promise<void>;

  loadCanvasState: () => Promise<void>;
  setCanvasSize: (width: number, height: number) => Promise<void>;
  clearCanvas: () => Promise<void>;
  addDevice: (device: Device) => Promise<string>;
  updateDevice: (device: Device) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  addConnection: (connection: Connection) => Promise<string>;
  updateConnection: (connection: Connection) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  saveLayout: (path: string) => Promise<void>;
  loadLayout: (path: string) => Promise<LayoutData>;

  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (code: string) => Promise<void>;
  loadProducts: () => Promise<void>;

  addMaterial: (material: Material) => Promise<void>;
  updateMaterial: (material: Material) => Promise<void>;
  deleteMaterial: (code: string) => Promise<void>;
  loadMaterials: () => Promise<void>;

  addTool: (tool: Tool) => Promise<void>;
  updateTool: (tool: Tool) => Promise<void>;
  deleteTool: (code: string) => Promise<void>;
  loadTools: () => Promise<void>;

  loadSettings: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;

  startSimulation: () => Promise<void>;
  pauseSimulation: () => Promise<void>;
  resumeSimulation: () => Promise<void>;
  resetSimulation: () => Promise<void>;
  stepSimulation: (dt_s: number) => Promise<boolean>;
  setSimulationSpeed: (speed: number) => Promise<void>;
  setSimulationDuration: (duration_s: number) => Promise<void>;
  setResourceSelectionRule: (rule: ResourceSelectionRule) => Promise<void>;
  setSimulationMode: (mode: SimulationMode) => Promise<void>;
  setUtilizationSampleInterval: (interval_s: number) => Promise<void>;
  setWarehouseSelectionPriorities: (priorities: WarehouseSelectionPriority[]) => Promise<void>;
  setProductSelectionStrategy: (strategy: ProductSelectionStrategy) => Promise<void>;
  setConsiderProductPriority: (consider: boolean) => Promise<void>;
  loadSimulationState: () => Promise<void>;
  loadSimulationResults: () => Promise<void>;
  saveSimulationRecord: () => Promise<string>;
  getSimulationRecords: () => Promise<SimulationRecord[]>;
  getSimulationRecord: (recordId: string) => Promise<SimulationRecord | null>;
  deleteSimulationRecord: (recordId: string) => Promise<void>;
  setRouteValidated: (validated: boolean) => void;
  getProductRoutes: () => Promise<ProductRouteCheckResult>;
  openProductRoutesModal: () => void;
  closeProductRoutesModal: () => void;
  openValidationErrorModal: (errors: string[]) => void;
  closeValidationErrorModal: () => void;

  showAiAnalysisModal: boolean;
  openAiAnalysisModal: () => void;
  closeAiAnalysisModal: () => void;
  aiApiConfig: AiApiConfig;
  loadAiApiConfig: () => Promise<void>;
  saveAiApiConfig: (config: AiApiConfig) => Promise<void>;
  testAiConnection: () => Promise<string>;
  aiAnalysisLoading: boolean;
  aiAnalysisRecords: AiAnalysisRecord[];
  loadAiAnalysisRecords: () => Promise<void>;
  callAiAnalysis: (mdContent: string, recordCount: number) => Promise<string>;
  saveAiAnalysisRecord: (recordIds: string[], prompt: string, result: string, modelUsed: string) => Promise<AiAnalysisRecord>;
  deleteAiAnalysisRecord: (recordId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  canvas: {
    width_mm: 8000,
    height_mm: 8000,
    devices: {},
    connections: {},
    products: {},
    materials: {},
    tools: {},
    settings: {
      grid_step_mm: 100,
      show_grid: true,
      show_rulers: true,
      snap_threshold_mm: 20,
      px_per_mm: 0.2,
    },
    simulation_records: [],
    device_connection_counter: {},
    connection_counter: 0,
  },
  selectedDeviceId: null,
  selectedDeviceIds: [],
  selectedConnectionId: null,
  toolMode: 'select',
  deviceTypeToAdd: null,
  connectionLineStyle: null,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  simulation: {
    state: 'idle',
    elapsed_s: 0,
    speed: 1,
    duration_s: 3600,
    completed_products: 0,
    devices: {},
    connections: {},
    storage: {},
    resource_selection_rule: 'basic',
    process_products: {},
    product_counters: {},
    material_consumption: {},
    device_material_consumption: {},
  },
  simulationResults: null,
  showSimControlPanel: true,
  showRecordsModal: false,
  recordsModalDeviceId: null,
  recordsModalConnectionId: null,
  loading: false,
  error: null,
  routeValidated: false,
  productRoutes: null,
  showProductRoutesModal: false,
  validationErrors: null,
  showValidationErrorModal: false,
  currentFilePath: null,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  showAiAnalysisModal: false,
  aiApiConfig: {
    use_custom_api: false,
    custom_base_url: undefined,
    custom_api_key: undefined,
    custom_model: undefined,
  },
  aiAnalysisLoading: false,
  aiAnalysisRecords: [],

  saveToHistory: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.canvas)));
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    const newIndex = newHistory.length - 1;
    return {
      history: newHistory,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false,
    };
  }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const canvas = JSON.parse(JSON.stringify(state.history[newIndex]));
      return {
        canvas,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true,
        selectedDeviceId: null,
        selectedDeviceIds: [],
        selectedConnectionId: null,
      };
    }
    return state;
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const canvas = JSON.parse(JSON.stringify(state.history[newIndex]));
      return {
        canvas,
        historyIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < state.history.length - 1,
        selectedDeviceId: null,
        selectedDeviceIds: [],
        selectedConnectionId: null,
      };
    }
    return state;
  }),

  selectAllDevices: () => set((state) => ({
    selectedDeviceIds: Object.keys(state.canvas.devices),
    selectedDeviceId: null,
    selectedConnectionId: null,
  })),

  deselectAll: () => set({
    selectedDeviceIds: [],
    selectedDeviceId: null,
    selectedConnectionId: null,
  }),

  handleNewCanvas: async () => {
    const state = useAppStore.getState();
    const hasContent = Object.keys(state.canvas.devices).length > 0 || Object.keys(state.canvas.connections).length > 0;
    
    if (hasContent) {
      const shouldSave = await ask('当前画布有内容，是否要保存？', {
        title: '保存确认',
        kind: 'warning',
        okLabel: '保存',
        cancelLabel: '不保存',
      });
      
      if (shouldSave) {
        try {
          const path = await save({
            defaultPath: 'layout.json',
            filters: [{ name: 'JSON', extensions: ['json'] }],
          });
          if (path) {
            await invoke('save_layout', { path });
          } else {
            return;
          }
        } catch (error) {
          console.error('Save failed:', error);
          return;
        }
      }
    }
    
    await invoke('set_canvas_size', { widthMm: 8000, heightMm: 8000 });
    await invoke('clear_canvas');
    set({
      canvas: {
        width_mm: 8000,
        height_mm: 8000,
        devices: {},
        connections: {},
        products: {},
        materials: {},
        tools: {},
        settings: state.canvas.settings,
        simulation_records: [],
        device_connection_counter: {},
        connection_counter: 0,
      },
      currentFilePath: null,
      selectedDeviceId: null,
      selectedDeviceIds: [],
      selectedConnectionId: null,
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,
    });
    const appWindow = getCurrentWindow();
    await appWindow.setTitle('DysProSim');
  },

  handleOpenLayout: async () => {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (path && typeof path === 'string') {
        const layout = await invoke<LayoutData>('load_layout', { path });
        set((state) => ({
          canvas: {
            ...state.canvas,
            width_mm: layout.canvas_width_mm,
            height_mm: layout.canvas_height_mm,
            devices: layout.devices.reduce<Record<string, Device>>((acc, d) => ({ ...acc, [d.id]: d }), {}),
            connections: layout.connections.reduce<Record<string, Connection>>((acc, c) => ({ ...acc, [c.id]: c }), {}),
            products: layout.products.reduce<Record<string, Product>>((acc, p) => ({ ...acc, [p.code]: p }), {}),
            materials: layout.materials.reduce<Record<string, Material>>((acc, m) => ({ ...acc, [m.code]: m }), {}),
            tools: layout.tools.reduce<Record<string, Tool>>((acc, t) => ({ ...acc, [t.code]: t }), {}),
            settings: layout.settings,
            simulation_records: layout.simulation_records || [],
          },
          currentFilePath: path,
          selectedDeviceId: null,
          selectedDeviceIds: [],
          selectedConnectionId: null,
          history: [],
          historyIndex: -1,
          canUndo: false,
          canRedo: false,
        }));
        const appWindow = getCurrentWindow();
        await appWindow.setTitle(`DysProSim - ${path}`);
      }
    } catch (error) {
      console.error('Load failed:', error);
    }
  },

  handleSaveLayout: async () => {
    const state = useAppStore.getState();
    try {
      if (state.currentFilePath) {
        await invoke('save_layout', { path: state.currentFilePath });
      } else {
        const path = await save({
          defaultPath: 'layout.json',
          filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (path) {
          await invoke('save_layout', { path });
          set({ currentFilePath: path });
          const appWindow = getCurrentWindow();
          await appWindow.setTitle(`DysProSim - ${path}`);
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  selectDevice: (id) => set({ selectedDeviceId: id, selectedDeviceIds: id ? [id] : [], selectedConnectionId: null }),
  toggleDeviceSelection: (id) => set((state) => {
    const isSelected = state.selectedDeviceIds.includes(id);
    if (isSelected) {
      const newIds = state.selectedDeviceIds.filter(did => did !== id);
      return { 
        selectedDeviceIds: newIds, 
        selectedDeviceId: newIds.length === 1 ? newIds[0] : null,
        selectedConnectionId: null 
      };
    } else {
      const newIds = [...state.selectedDeviceIds, id];
      return { 
        selectedDeviceIds: newIds, 
        selectedDeviceId: newIds.length === 1 ? newIds[0] : state.selectedDeviceId,
        selectedConnectionId: null 
      };
    }
  }),
  setMultiSelectedDevices: (ids) => set({ 
    selectedDeviceIds: ids, 
    selectedDeviceId: ids.length === 1 ? ids[0] : null,
    selectedConnectionId: null 
  }),
  clearDeviceSelection: () => set({ selectedDeviceIds: [], selectedDeviceId: null }),
  selectConnection: (id) => set({ selectedConnectionId: id, selectedDeviceId: null, selectedDeviceIds: [] }),
  setToolMode: (mode) => set({ toolMode: mode }),
  setDeviceTypeToAdd: (type) => {
    console.log('setDeviceTypeToAdd called with:', type);
    if (type) {
      set({ 
        deviceTypeToAdd: type, 
        toolMode: 'device',
        connectionLineStyle: null,
      });
    } else {
      set({ 
        deviceTypeToAdd: null, 
        toolMode: 'select',
      });
    }
    console.log('State updated: deviceTypeToAdd=', type, 'toolMode=', type ? 'device' : 'select');
  },
  setConnectionLineStyle: (style) => {
    if (style) {
      set({ 
        connectionLineStyle: style, 
        toolMode: 'connection',
        deviceTypeToAdd: null,
      });
    } else {
      set({ 
        connectionLineStyle: null, 
        toolMode: 'select',
      });
    }
  },
  setShowSimControlPanel: (show) => set({ showSimControlPanel: show }),
  openRecordsModal: (deviceId, connectionId) => set({ 
    showRecordsModal: true, 
    recordsModalDeviceId: deviceId || null,
    recordsModalConnectionId: connectionId || null,
  }),
  closeRecordsModal: () => set({ 
    showRecordsModal: false, 
    recordsModalDeviceId: null,
    recordsModalConnectionId: null,
  }),
  setCurrentFilePath: (path) => set({ currentFilePath: path }),

  loadCanvasState: async () => {
    try {
      set({ loading: true, error: null });
      const state = await invoke<CanvasState>('get_canvas_state');
      set({ canvas: state, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  setCanvasSize: async (width, height) => {
    try {
      await invoke('set_canvas_size', { widthMm: width, heightMm: height });
      set((state) => ({
        canvas: { ...state.canvas, width_mm: width, height_mm: height },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearCanvas: async () => {
    try {
      await invoke('clear_canvas');
      set((state) => ({
        canvas: {
          ...state.canvas,
          devices: {},
          connections: {},
        },
        selectedDeviceId: null,
        selectedConnectionId: null,
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  addDevice: async (device) => {
    console.log('store.addDevice called with:', device);
    try {
      console.log('Invoking add_device command...');
      const result = await invoke<{ id: string; name: string }>('add_device', { device });
      console.log('add_device returned:', result);
      const updatedDevice = { ...device, id: result.id, name: result.name } as Device;
      set((state) => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.canvas)));
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        const newIndex = newHistory.length - 1;
        return {
          canvas: {
            ...state.canvas,
            devices: { ...state.canvas.devices, [result.id]: updatedDevice },
          },
          history: newHistory,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: false,
        };
      });
      return result.id;
    } catch (error) {
      console.error('add_device error:', error);
      set({ error: String(error) });
      throw error;
    }
  },

  updateDevice: async (device) => {
    try {
      await invoke('update_device', { device });
      set((state) => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.canvas)));
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        const newIndex = newHistory.length - 1;
        return {
          canvas: {
            ...state.canvas,
            devices: { ...state.canvas.devices, [device.id]: device },
          },
          history: newHistory,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: false,
        };
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteDevice: async (id) => {
    console.log('store.deleteDevice called with id:', id);
    try {
      console.log('Invoking delete_device command...');
      await invoke('delete_device', { deviceId: id });
      console.log('delete_device command completed');
      set((state) => {
        const devices = { ...state.canvas.devices };
        delete devices[id];
        const connections = { ...state.canvas.connections };
        Object.keys(connections).forEach((connId) => {
          const conn = connections[connId];
          if (conn.from_device_id === id || conn.to_device_id === id) {
            delete connections[connId];
          }
        });
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.canvas)));
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        const newIndex = newHistory.length - 1;
        return {
          canvas: { ...state.canvas, devices, connections },
          selectedDeviceId: state.selectedDeviceId === id ? null : state.selectedDeviceId,
          history: newHistory,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: false,
        };
      });
    } catch (error) {
      console.error('deleteDevice error:', error);
      set({ error: String(error) });
    }
  },

  addConnection: async (connection) => {
    try {
      const newConnection = await invoke<Connection>('add_connection', { connection });
      set((state) => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.canvas)));
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        const newIndex = newHistory.length - 1;
        return {
          canvas: {
            ...state.canvas,
            connections: { ...state.canvas.connections, [newConnection.id]: newConnection },
          },
          history: newHistory,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: false,
        };
      });
      return newConnection.id;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateConnection: async (connection) => {
    try {
      await invoke('update_connection', { connection });
      set((state) => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.canvas)));
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        const newIndex = newHistory.length - 1;
        return {
          canvas: {
            ...state.canvas,
            connections: { ...state.canvas.connections, [connection.id]: connection },
          },
          history: newHistory,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: false,
        };
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteConnection: async (id) => {
    try {
      await invoke('delete_connection', { connectionId: id });
      set((state) => {
        const connections = { ...state.canvas.connections };
        delete connections[id];
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.canvas)));
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        const newIndex = newHistory.length - 1;
        return {
          canvas: { ...state.canvas, connections },
          selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
          history: newHistory,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: false,
        };
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  saveLayout: async (path) => {
    try {
      await invoke('save_layout', { path });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadLayout: async (path) => {
    try {
      const layout = await invoke<LayoutData>('load_layout', { path });
      set((state) => ({
        canvas: {
          ...state.canvas,
          width_mm: layout.canvas_width_mm,
          height_mm: layout.canvas_height_mm,
          devices: layout.devices.reduce<Record<string, Device>>((acc, d) => ({ ...acc, [d.id]: d }), {}),
          connections: layout.connections.reduce<Record<string, Connection>>((acc, c) => ({ ...acc, [c.id]: c }), {}),
          products: layout.products.reduce<Record<string, Product>>((acc, p) => ({ ...acc, [p.code]: p }), {}),
          materials: layout.materials.reduce<Record<string, Material>>((acc, m) => ({ ...acc, [m.code]: m }), {}),
          tools: layout.tools.reduce<Record<string, Tool>>((acc, t) => ({ ...acc, [t.code]: t }), {}),
          settings: layout.settings,
          simulation_records: layout.simulation_records || [],
        },
      }));
      return layout;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  addProduct: async (product) => {
    try {
      await invoke('add_product', { product });
      set((state) => ({
        canvas: {
          ...state.canvas,
          products: { ...state.canvas.products, [product.code]: product },
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateProduct: async (product) => {
    try {
      await invoke('update_product', { product });
      set((state) => ({
        canvas: {
          ...state.canvas,
          products: { ...state.canvas.products, [product.code]: product },
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteProduct: async (code) => {
    try {
      await invoke('delete_product', { code });
      set((state) => {
        const products = { ...state.canvas.products };
        delete products[code];
        return { canvas: { ...state.canvas, products } };
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadProducts: async () => {
    try {
      const products = await invoke<Product[]>('get_products');
      set((state) => ({
        canvas: {
          ...state.canvas,
          products: products.reduce((acc, p) => ({ ...acc, [p.code]: p }), {}),
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  addMaterial: async (material) => {
    try {
      await invoke('add_material', { material });
      set((state) => ({
        canvas: {
          ...state.canvas,
          materials: { ...state.canvas.materials, [material.code]: material },
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateMaterial: async (material) => {
    try {
      await invoke('update_material', { material });
      set((state) => ({
        canvas: {
          ...state.canvas,
          materials: { ...state.canvas.materials, [material.code]: material },
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteMaterial: async (code) => {
    try {
      await invoke('delete_material', { code });
      set((state) => {
        const materials = { ...state.canvas.materials };
        delete materials[code];
        return { canvas: { ...state.canvas, materials } };
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadMaterials: async () => {
    try {
      const materials = await invoke<Material[]>('get_materials');
      set((state) => ({
        canvas: {
          ...state.canvas,
          materials: materials.reduce((acc, m) => ({ ...acc, [m.code]: m }), {}),
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  addTool: async (tool) => {
    try {
      await invoke('add_tool', { tool });
      set((state) => ({
        canvas: {
          ...state.canvas,
          tools: { ...state.canvas.tools, [tool.code]: tool },
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateTool: async (tool) => {
    try {
      await invoke('update_tool', { tool });
      set((state) => ({
        canvas: {
          ...state.canvas,
          tools: { ...state.canvas.tools, [tool.code]: tool },
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteTool: async (code) => {
    try {
      await invoke('delete_tool', { code });
      set((state) => {
        const tools = { ...state.canvas.tools };
        delete tools[code];
        return { canvas: { ...state.canvas, tools } };
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadTools: async () => {
    try {
      const tools = await invoke<Tool[]>('get_tools');
      set((state) => ({
        canvas: {
          ...state.canvas,
          tools: tools.reduce((acc, t) => ({ ...acc, [t.code]: t }), {}),
        },
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadSettings: async () => {
    try {
      const settings = await invoke<Settings>('get_settings');
      set((state) => ({ canvas: { ...state.canvas, settings } }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateSettings: async (settings) => {
    try {
      await invoke('update_settings', { settings });
      set((state) => ({ canvas: { ...state.canvas, settings } }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  startSimulation: async () => {
    try {
      await invoke('start_simulation');
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  pauseSimulation: async () => {
    try {
      await invoke('pause_simulation');
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  resumeSimulation: async () => {
    try {
      await invoke('resume_simulation');
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  resetSimulation: async () => {
    try {
      await invoke('reset_simulation');
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState, routeValidated: false });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stepSimulation: async (dt_s: number) => {
    try {
      const completed = await invoke<boolean>('step_simulation', { dtS: dt_s });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
      return completed;
    } catch (error) {
      set({ error: String(error) });
      return false;
    }
  },

  setSimulationSpeed: async (speed: number) => {
    try {
      await invoke('set_simulation_speed', { speed });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setSimulationDuration: async (duration_s: number) => {
    try {
      await invoke('set_simulation_duration', { durationS: duration_s });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setResourceSelectionRule: async (rule: ResourceSelectionRule) => {
    try {
      await invoke('set_resource_selection_rule', { rule });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setSimulationMode: async (mode: SimulationMode) => {
    try {
      await invoke('set_simulation_mode', { mode });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setUtilizationSampleInterval: async (interval_s: number) => {
    try {
      await invoke('set_utilization_sample_interval', { intervalS: interval_s });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setWarehouseSelectionPriorities: async (priorities: WarehouseSelectionPriority[]) => {
    try {
      await invoke('set_warehouse_selection_priorities', { priorities });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setProductSelectionStrategy: async (strategy: ProductSelectionStrategy) => {
    try {
      await invoke('set_product_selection_strategy', { strategy });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setConsiderProductPriority: async (consider: boolean) => {
    try {
      await invoke('set_consider_product_priority', { consider });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadSimulationState: async () => {
    try {
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadSimulationResults: async () => {
    try {
      const results = await invoke<SimulationResults>('get_simulation_results');
      set({ simulationResults: results });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  saveSimulationRecord: async () => {
    try {
      const recordId = await invoke<string>('save_simulation_record');
      return recordId;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  getSimulationRecords: async () => {
    try {
      const records = await invoke<SimulationRecord[]>('get_simulation_records');
      return records;
    } catch (error) {
      set({ error: String(error) });
      return [];
    }
  },

  getSimulationRecord: async (recordId: string) => {
    try {
      const record = await invoke<SimulationRecord | null>('get_simulation_record', { recordId });
      return record;
    } catch (error) {
      set({ error: String(error) });
      return null;
    }
  },

  deleteSimulationRecord: async (recordId: string) => {
    try {
      await invoke('delete_simulation_record', { recordId });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setRouteValidated: (validated: boolean) => {
    set({ routeValidated: validated });
  },

  getProductRoutes: async () => {
    try {
      const result = await invoke<ProductRouteCheckResult>('get_product_routes');
      return result;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  openProductRoutesModal: async () => {
    try {
      const result = await invoke<ProductRouteCheckResult>('get_product_routes');
      
      const errors: string[] = [];
      
      if (result.assembly_station_errors && result.assembly_station_errors.length > 0) {
        for (const error of result.assembly_station_errors) {
          if (error.error_type === 'NoProductSelected') {
            errors.push(`装配站「${error.name}」未选择任何产品`);
          } else if (!error.upstream_node_id) {
            errors.push(`装配站「${error.name}」的产品「${error.product_name || error.product_code}」未设置上游来料需求`);
          } else {
            errors.push(`装配站「${error.name}」的产品「${error.product_name || error.product_code}」上游节点「${error.upstream_node_name || error.upstream_node_id}」的来料用量为 0`);
          }
        }
      }

      if (result.disassembly_station_errors && result.disassembly_station_errors.length > 0) {
        for (const error of result.disassembly_station_errors) {
          if (error.error_type === 'NoItemToDisassemble') {
            errors.push(`拆解站「${error.name}」未选择任何待拆解品`);
          } else if (error.error_type === 'NoDisassemblyProduct') {
            errors.push(`拆解站「${error.name}」未选择任何拆解产物`);
          } else if (error.error_type === 'NoProductForItem') {
            errors.push(`拆解站「${error.name}」的待拆解品「${error.product_name || error.product_code}」未设置拆解产物数量`);
          } else if (error.error_type === 'DisassemblyProductQuantityZero') {
            errors.push(`拆解站「${error.name}」的待拆解品「${error.product_name || error.product_code}」的拆解产物「${error.disassembly_product_name || error.disassembly_product_code}」产出数量为 0`);
          } else if (error.error_type === 'ItemUnreachable') {
            errors.push(`拆解站「${error.name}」的待拆解品「${error.product_name || error.product_code}」无法从起点或上游拆解站获取`);
          } else if (error.error_type === 'AssemblyProductAsItem') {
            errors.push(`拆解站「${error.name}」的待拆解品「${error.product_name || error.product_code}」是装配成品，不能作为待拆解品`);
          }
        }
      }
      
      if (!result.all_start_nodes_have_product) {
        for (const node of result.start_nodes_without_product) {
          errors.push(`起点「${node.name}」未选择产品`);
        }
      }
      
      if (result.incomplete_route_start_nodes.length > 0) {
        for (const node of result.incomplete_route_start_nodes) {
          errors.push(`起点「${node.name}」的产品「${node.product_name || node.product_code || '未知'}」没有完整工艺路线`);
        }
      }
      
      if (errors.length > 0) {
        set({ productRoutes: result, validationErrors: errors, showValidationErrorModal: true });
      } else {
        set({ productRoutes: result, showProductRoutesModal: true });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  closeProductRoutesModal: () => {
    set({ showProductRoutesModal: false });
  },

  openValidationErrorModal: (errors: string[]) => {
    set({ validationErrors: errors, showValidationErrorModal: true });
  },

  closeValidationErrorModal: () => {
    set({ showValidationErrorModal: false, validationErrors: null });
  },

  openAiAnalysisModal: () => set({ showAiAnalysisModal: true }),
  closeAiAnalysisModal: () => set({ showAiAnalysisModal: false }),

  loadAiApiConfig: async () => {
    try {
      const config = await invoke<AiApiConfig>('get_ai_api_config');
      set({ aiApiConfig: config });
    } catch (error) {
      console.error('Failed to load AI API config:', error);
    }
  },

  saveAiApiConfig: async (config: AiApiConfig) => {
    try {
      await invoke('save_ai_api_config', { config });
      set({ aiApiConfig: config });
    } catch (error) {
      console.error('Failed to save AI API config:', error);
      throw error;
    }
  },

  testAiConnection: async () => {
    try {
      const result = await invoke<string>('test_ai_connection');
      return result;
    } catch (error) {
      throw new Error(String(error));
    }
  },

  loadAiAnalysisRecords: async () => {
    try {
      const records = await invoke<AiAnalysisRecord[]>('get_ai_analysis_records');
      set({ aiAnalysisRecords: records });
    } catch (error) {
      console.error('Failed to load AI analysis records:', error);
    }
  },

  callAiAnalysis: async (mdContent: string, recordCount: number) => {
    set({ aiAnalysisLoading: true });
    try {
      const result = await invoke<string>('call_ai_analysis', { mdContent, recordCount });
      set({ aiAnalysisLoading: false });
      return result;
    } catch (error) {
      set({ aiAnalysisLoading: false });
      throw new Error(String(error));
    }
  },

  saveAiAnalysisRecord: async (recordIds: string[], prompt: string, result: string, modelUsed: string) => {
    try {
      const record = await invoke<AiAnalysisRecord>('save_ai_analysis_record', { recordIds, prompt, result, modelUsed });
      set((state) => ({
        aiAnalysisRecords: [...state.aiAnalysisRecords, record],
      }));
      return record;
    } catch (error) {
      console.error('Failed to save AI analysis record:', error);
      throw error;
    }
  },

  deleteAiAnalysisRecord: async (recordId: string) => {
    try {
      await invoke('delete_ai_analysis_record', { recordId });
      set((state) => ({
        aiAnalysisRecords: state.aiAnalysisRecords.filter((r) => r.id !== recordId),
      }));
    } catch (error) {
      console.error('Failed to delete AI analysis record:', error);
    }
  },
}));
