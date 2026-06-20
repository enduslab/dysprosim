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
  LightweightSimState,
  SimulationResults,
  ResourceSelectionRule,
  SimulationRecord,
  ProductRouteCheckResult,
  SimulationMode,
  WarehouseSelectionPriority,
  ProductSelectionStrategy,
  AiApiConfig,
  AiAnalysisRecord,
  OptimizationSuggestion,
  OptimizationIteration,
  OptimizationResult,
  OptimizationGoal,
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
  updateDevicePositions: (devices: Device[]) => void;
  commitDevicePositions: (devices: Device[]) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  addConnection: (connection: Connection) => Promise<string>;
  updateConnection: (connection: Connection) => Promise<void>;
  updateConnectionPositions: (connections: Connection[]) => void;
  commitConnectionPositions: (connections: Connection[]) => Promise<void>;
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
  refreshLightweightState: () => Promise<void>;
  setSimulationSpeed: (speed: number) => Promise<void>;
  setSimulationDuration: (duration_s: number) => Promise<void>;
  setResourceSelectionRule: (rule: ResourceSelectionRule) => Promise<void>;
  setSimulationMode: (mode: SimulationMode) => Promise<void>;
  setUtilizationSampleInterval: (interval_s: number) => Promise<void>;
  setWarehouseSelectionPriorities: (priorities: WarehouseSelectionPriority[]) => Promise<void>;
  setProductSelectionStrategy: (strategy: ProductSelectionStrategy) => Promise<void>;
  setConsiderProductPriority: (consider: boolean) => Promise<void>;
  setDeadline: (deadline_s: number | null) => Promise<void>;
  setDailyWorkHours: (hours: number) => Promise<void>;
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

  showAiOptimizationModal: boolean;
  openAiOptimizationModal: () => void;
  closeAiOptimizationModal: () => void;
  optimizationRunning: boolean;
  optimizationResult: OptimizationResult | null;
  optimizationCurrentIteration: number;
  optimizationMaxIterations: number;
  optimizationStatusMessage: string;
  optimizationGoals: OptimizationGoal[];
  runAiOptimization: (maxIterations?: number, goals?: OptimizationGoal[]) => Promise<void>;
  cancelAiOptimization: () => void;
  resetOptimization: () => void;
  continueAiOptimization: (additionalIterations: number) => Promise<void>;

  ws3dEnabled: boolean;
  ws3dPort: number;
  toggleWs3d: (enabled: boolean) => Promise<void>;
}

function extractJson(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    return braceMatch[0];
  }
  return text;
}

const VALID_CHANGE_TYPES = [
  'resource_selection_rule',
  'product_selection_strategy',
  'consider_product_priority',
  'warehouse_selection_priorities',
  'device_config',
  'product_priority',
  'add_buffer',
  'clone_device',
];

const VALID_RULE_VALUES = ['basic', 'min_wip_dynamic', 'min_utilrate_dynamic'];
const VALID_STRATEGY_VALUES = ['first_come_first_served', 'same_type_priority_with_tool', 'same_tool_priority'];
const VALID_PRIORITY_VALUES = ['nearest_distance', 'farthest_distance', 'lowest_utilization', 'highest_utilization', 'product_concentrated', 'product_dispersed', 'least_waiting_entry'];
const CONFLICTING_PRIORITIES: [string, string][] = [
  ['nearest_distance', 'farthest_distance'],
  ['farthest_distance', 'nearest_distance'],
  ['lowest_utilization', 'highest_utilization'],
  ['highest_utilization', 'lowest_utilization'],
  ['product_concentrated', 'product_dispersed'],
  ['product_dispersed', 'product_concentrated'],
];

function validateOptimizationSuggestion(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['返回数据不是有效的JSON对象'] };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.can_optimize !== 'boolean') {
    errors.push('can_optimize 字段缺失或不是布尔值');
  }

  if (typeof obj.should_continue !== 'boolean') {
    errors.push('should_continue 字段缺失或不是布尔值');
  }

  if (typeof obj.reasoning !== 'string') {
    errors.push('reasoning 字段缺失或不是字符串');
  }

  if (!Array.isArray(obj.changes)) {
    errors.push('changes 字段缺失或不是数组');
  } else {
    for (let i = 0; i < obj.changes.length; i++) {
      const change = obj.changes[i] as Record<string, unknown>;
      if (!change || typeof change !== 'object') {
        errors.push(`changes[${i}] 不是有效的对象`);
        continue;
      }

      if (typeof change.type !== 'string' || !VALID_CHANGE_TYPES.includes(change.type)) {
        errors.push(`changes[${i}].type 无效，必须是以下之一: ${VALID_CHANGE_TYPES.join(', ')}`);
      }

      if (change.value === undefined || change.value === null) {
        errors.push(`changes[${i}].value 缺失`);
        continue;
      }

      switch (change.type) {
        case 'resource_selection_rule':
          if (typeof change.value !== 'string' || !VALID_RULE_VALUES.includes(change.value)) {
            errors.push(`changes[${i}].value 无效，必须是: ${VALID_RULE_VALUES.join(', ')}`);
          }
          break;
        case 'product_selection_strategy':
          if (typeof change.value !== 'string' || !VALID_STRATEGY_VALUES.includes(change.value)) {
            errors.push(`changes[${i}].value 无效，必须是: ${VALID_STRATEGY_VALUES.join(', ')}`);
          }
          break;
        case 'consider_product_priority':
          if (typeof change.value !== 'boolean') {
            errors.push(`changes[${i}].value 必须是布尔值`);
          }
          break;
        case 'warehouse_selection_priorities': {
          if (!Array.isArray(change.value)) {
            errors.push(`changes[${i}].value 必须是数组`);
          } else {
            const invalidItems = (change.value as string[]).filter(v => !VALID_PRIORITY_VALUES.includes(v));
            if (invalidItems.length > 0) {
              errors.push(`changes[${i}].value 包含无效值: ${invalidItems.join(', ')}`);
            }
            for (const [a, b] of CONFLICTING_PRIORITIES) {
              if ((change.value as string[]).includes(a) && (change.value as string[]).includes(b)) {
                errors.push(`changes[${i}].value 包含冲突的优先级: ${a} 和 ${b}`);
              }
            }
          }
          break;
        }
        case 'device_config':
          if (typeof change.device_id !== 'string' || !change.device_id) {
            errors.push(`changes[${i}].device_id 缺失`);
          }
          if (typeof change.field !== 'string' || !change.field) {
            errors.push(`changes[${i}].field 缺失`);
          }
          if (change.field === 'release_mode' && typeof change.value === 'string' && !['immediate', 'wait_for_idle'].includes(change.value)) {
            errors.push(`changes[${i}].value 无效，release_mode 必须是: immediate, wait_for_idle`);
          }
          if (change.field === 'max_capacity' && (typeof change.value !== 'number' || change.value <= 0 || !Number.isInteger(change.value))) {
            errors.push(`changes[${i}].value 无效，max_capacity 必须是正整数`);
          }
          break;
        case 'product_priority':
          if (typeof change.device_id !== 'string' || !change.device_id) {
            errors.push(`changes[${i}].device_id (产品编码) 缺失`);
          }
          if (change.value !== null && (typeof change.value !== 'number' || ![1, 2, 3, 4, 5].includes(change.value))) {
            errors.push(`changes[${i}].value 无效，优先级必须是1-5的整数或null`);
          }
          break;
        case 'add_buffer': {
          const v = change.value as Record<string, unknown>;
          if (!v || typeof v !== 'object') {
            errors.push(`changes[${i}].value 必须是对象`);
          } else {
            if (typeof v.upstream_device_id !== 'string' || !v.upstream_device_id) {
              errors.push(`changes[${i}].value.upstream_device_id 缺失`);
            }
            if (typeof v.downstream_device_id !== 'string' || !v.downstream_device_id) {
              errors.push(`changes[${i}].value.downstream_device_id 缺失`);
            }
            if (typeof v.capacity !== 'number' || v.capacity <= 0 || !Number.isInteger(v.capacity)) {
              errors.push(`changes[${i}].value.capacity 必须是正整数`);
            }
            if (typeof v.product_code !== 'string' || !v.product_code) {
              errors.push(`changes[${i}].value.product_code 缺失`);
            }
          }
          break;
        }
        case 'clone_device': {
          const v = change.value as Record<string, unknown>;
          if (!v || typeof v !== 'object') {
            errors.push(`changes[${i}].value 必须是对象`);
          } else {
            if (typeof v.device_id !== 'string' || !v.device_id) {
              errors.push(`changes[${i}].value.device_id 缺失`);
            }
            if (typeof v.count !== 'number' || v.count < 1 || v.count > 3 || !Number.isInteger(v.count)) {
              errors.push(`changes[${i}].value.count 必须是1-3的整数`);
            }
          }
          break;
        }
      }
    }
  }

  if (obj.can_optimize === true && Array.isArray(obj.changes) && obj.changes.length === 0) {
    errors.push('can_optimize 为 true 但 changes 为空');
  }

  return { valid: errors.length === 0, errors };
}

function generateOptimizationMd(record: SimulationRecord, canvas: { products: Record<string, { name: string; color: string }>; materials: Record<string, { name: string; unit: string }>; devices: Record<string, { type: string; name: string }>; connections?: Record<string, { from_device_id: string; to_device_id: string; name: string }> }): string {
  const results = record.results;

  let md = `# 模拟运行统计报告\n\n`;
  md += `> 记录时间: ${new Date(record.timestamp).toLocaleString()}\n\n`;

  md += `## 总体指标\n\n`;
  md += `- 模拟时长: ${results.duration_s.toFixed(1)}s\n`;
  md += `- 完成产品数: ${results.completed_products}\n`;
  md += `- 最大在制品数(WIP): ${results.max_total_wip}\n`;
  md += `- 模拟模式: ${results.simulation_mode === 'fixed_output' ? '固定产量' : '固定时长'}\n`;
  md += `- 资源选择规则: ${results.resource_selection_rule || 'basic'}\n`;
  md += `- 加工制品选择策略: ${results.product_selection_strategy || 'first_come_first_served'}\n`;
  md += `- 考虑产品优先级: ${results.consider_product_priority ? '是' : '否'}\n`;

  if (results.warehouse_selection_priorities && results.warehouse_selection_priorities.length > 0) {
    md += `- 仓库选择优先级: ${results.warehouse_selection_priorities.join(', ')}\n`;
  }

  md += `\n## 产品完成情况\n\n`;
  if (results.completed_products_by_code) {
    md += `| 产品编码 | 产品名称 | 完成数量 |\n|---------|---------|--------|\n`;
    for (const [code, count] of Object.entries(results.completed_products_by_code)) {
      const productName = canvas.products[code]?.name || code;
      md += `| ${code} | ${productName} | ${count} |\n`;
    }
  }

  md += `\n## 设备利用率\n\n`;
  md += `| 设备ID | 设备名称 | 完成数 | 利用率 | 最大WIP | 最大等待运输 |\n|-------|---------|-------|-------|--------|------------|\n`;
  for (const stat of results.device_stats) {
    const name = canvas.devices[stat.device_id]?.name || stat.device_name;
    md += `| ${stat.device_id} | ${name} | ${stat.completed} | ${stat.utilization.toFixed(1)}% | ${stat.max_wip} | ${stat.max_wait_transport} |\n`;
  }

  md += `\n## 产品平均加工时间\n\n`;
  if (results.product_avg_process_times && results.product_avg_process_times.length > 0) {
    md += `| 产品编码 | 产品名称 | 平均加工时间 |\n|---------|---------|------------|\n`;
    for (const pt of results.product_avg_process_times) {
      const pName = canvas.products[pt.product_code]?.name || pt.product_name || pt.product_code;
      md += `| ${pt.product_code} | ${pName} | ${pt.avg_process_time_s.toFixed(3)}s |\n`;
    }
  }

  md += `\n## 仓库/缓冲区状态\n\n`;
  if (results.storage_stats && results.storage_stats.length > 0) {
    md += `| 设备ID | 仓库名称 | 当前库存 | 容量 | 最大库存 | 最大等待入库 |\n|-------|---------|---------|------|---------|------------|\n`;
    for (const stat of results.storage_stats) {
      const name = canvas.devices[stat.device_id]?.name || stat.device_name;
      md += `| ${stat.device_id} | ${name} | ${stat.stock} | ${stat.capacity} | ${stat.max_stock ?? '-'} | ${stat.max_waiting_entry ?? '-'} |\n`;
    }
  }

  md += `\n## 设备连接关系\n\n`;
  if (canvas.connections && Object.keys(canvas.connections).length > 0) {
    md += `| 从设备ID | 从设备名称 | 到设备ID | 到设备名称 | 路径名称 |\n|---------|----------|---------|----------|--------|\n`;
    for (const conn of Object.values(canvas.connections)) {
      const fromName = canvas.devices[conn.from_device_id]?.name || conn.from_device_id;
      const toName = canvas.devices[conn.to_device_id]?.name || conn.to_device_id;
      md += `| ${conn.from_device_id} | ${fromName} | ${conn.to_device_id} | ${toName} | ${conn.name} |\n`;
    }
  }

  md += `\n## 运输路径利用率\n\n`;
  if (results.connection_stats && results.connection_stats.length > 0) {
    md += `| 路径名称 | 运输次数 | 利用率 | 从(设备ID) | 到(设备ID) |\n|---------|---------|-------|----------|----------|\n`;
    for (const stat of results.connection_stats) {
      const fromName = canvas.devices[stat.from_device]?.name || stat.from_device;
      const toName = canvas.devices[stat.to_device]?.name || stat.to_device;
      md += `| ${stat.connection_name} | ${stat.transport_count} | ${stat.utilization.toFixed(1)}% | ${fromName}(${stat.from_device}) | ${toName}(${stat.to_device}) |\n`;
    }
  }

  return md;
}

export const useAppStore = create<AppState>((set, get) => ({
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
    const state = get();
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
      aiAnalysisRecords: [],
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
          aiAnalysisRecords: [],
        }));
        const appWindow = getCurrentWindow();
        await appWindow.setTitle(`DysProSim - ${path}`);
      }
    } catch (error) {
      console.error('Load failed:', error);
    }
  },

  handleSaveLayout: async () => {
    const state = get();
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

  updateDevicePositions: (devices) => {
    set((state) => {
      const newDevices = { ...state.canvas.devices };
      for (const device of devices) {
        newDevices[device.id] = device;
      }
      return {
        canvas: {
          ...state.canvas,
          devices: newDevices,
        },
      };
    });
  },

  commitDevicePositions: async (devices) => {
    try {
      for (const device of devices) {
        await invoke('update_device', { device });
      }
      set((state) => {
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

  updateConnectionPositions: (connections) => {
    set((state) => {
      const newConnections = { ...state.canvas.connections };
      for (const conn of connections) {
        newConnections[conn.id] = conn;
      }
      return {
        canvas: {
          ...state.canvas,
          connections: newConnections,
        },
      };
    });
  },

  commitConnectionPositions: async (connections) => {
    try {
      for (const conn of connections) {
        await invoke('update_connection', { connection: conn });
      }
      set((state) => {
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
      return completed;
    } catch (error) {
      set({ error: String(error) });
      return false;
    }
  },

  refreshLightweightState: async () => {
    try {
      const lwState = await invoke<LightweightSimState>('get_lightweight_sim_state');
      set((state) => ({
        simulation: {
          ...state.simulation,
          state: lwState.state,
          elapsed_s: lwState.elapsed_s,
          speed: lwState.speed,
          duration_s: lwState.duration_s,
          completed_products: lwState.completed_products,
          simulation_mode: lwState.simulation_mode,
          completion_status: lwState.completion_status,
          deadline_s: lwState.deadline_s,
          daily_work_hours: lwState.daily_work_hours,
          utilization_sample_interval_s: lwState.utilization_sample_interval_s,
        }
      }));
    } catch (error) {
      // silently ignore - will retry next frame
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

  setDeadline: async (deadline_s: number | null) => {
    try {
      await invoke('set_deadline', { deadlineS: deadline_s });
      const simState = await invoke<SimulationState>('get_simulation_state');
      set({ simulation: simState });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setDailyWorkHours: async (hours: number) => {
    try {
      await invoke('set_daily_work_hours', { hours });
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
      const records = await invoke<SimulationRecord[]>('get_simulation_records');
      set((state) => ({
        canvas: {
          ...state.canvas,
          simulation_records: records,
        },
      }));
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
      const records = await invoke<SimulationRecord[]>('get_simulation_records');
      set((state) => ({
        canvas: {
          ...state.canvas,
          simulation_records: records,
        },
      }));
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
      const layoutPath = get().currentFilePath || '';
      const records = await invoke<AiAnalysisRecord[]>('get_ai_analysis_records', { layoutPath });
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
      const layoutPath = get().currentFilePath || '';
      const record = await invoke<AiAnalysisRecord>('save_ai_analysis_record', { recordIds, layoutPath, prompt, result, modelUsed });
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

  showAiOptimizationModal: false,
  openAiOptimizationModal: () => set({ showAiOptimizationModal: true }),
  closeAiOptimizationModal: () => set({ showAiOptimizationModal: false, optimizationRunning: false }),
  optimizationRunning: false,
  optimizationResult: null,
  optimizationCurrentIteration: 0,
  optimizationMaxIterations: 5,
  optimizationStatusMessage: '',
  optimizationGoals: [],
  cancelAiOptimization: () => set({ optimizationRunning: false, optimizationStatusMessage: '用户取消优化' }),

  resetOptimization: () => set({
    optimizationRunning: false,
    optimizationResult: null,
    optimizationCurrentIteration: 0,
    optimizationMaxIterations: 0,
    optimizationStatusMessage: '',
    optimizationGoals: [],
  }),

  runAiOptimization: async (maxIterations: number = 5, goals: OptimizationGoal[] = []) => {
    const records = await get().getSimulationRecords();
    if (records.length === 0) {
      set({ optimizationStatusMessage: '没有模拟记录，请先运行模拟并保存记录' });
      return;
    }

    const latestRecord = records[records.length - 1];
    const baselineCompletedProducts = latestRecord.results.completed_products;
    const baselineMaxWip = latestRecord.results.max_total_wip;
    const baselineAvgTimes = latestRecord.results.product_avg_process_times || [];
    const baselineCompletedProductsByCode = latestRecord.results.completed_products_by_code || {};

    const sortedGoals = [...goals].sort((a, b) => a.priority - b.priority);

    const iterations: OptimizationIteration[] = [];
    let bestIteration = 0;
    let stoppedReason = '';
    let cancelled = false;

    set({
      optimizationRunning: true,
      optimizationResult: null,
      optimizationCurrentIteration: 0,
      optimizationMaxIterations: maxIterations,
      optimizationStatusMessage: '开始AI优化...',
      optimizationGoals: goals,
    });

    const baselineCanvasSnapshot = JSON.parse(JSON.stringify(get().canvas)) as CanvasState;
    let baselineSimState: SimulationState | undefined;
    try {
      baselineSimState = await invoke<SimulationState>('get_simulation_state');
    } catch {
      baselineSimState = undefined;
    }

    try {
      for (let i = 1; i <= maxIterations; i++) {
        if (!get().optimizationRunning) {
          cancelled = true;
          stoppedReason = '用户取消优化';
          break;
        }

        set({ optimizationCurrentIteration: i, optimizationStatusMessage: `第 ${i}/${maxIterations} 次迭代：AI分析中...` });

        const currentRecords = await get().getSimulationRecords();
        const currentRecord = currentRecords.length > 0 ? currentRecords[currentRecords.length - 1] : null;
        if (!currentRecord) {
          stoppedReason = '没有可用的模拟记录';
          break;
        }

        const currentCanvas = get().canvas;
        const canvasData = {
          products: currentCanvas.products,
          materials: currentCanvas.materials,
          devices: currentCanvas.devices,
          connections: currentCanvas.connections,
        };
        const mdContent = generateOptimizationMd(currentRecord, canvasData);
        let mdContentWithGoals: string;

        if (sortedGoals.length > 0) {
          const goalLabels: Record<string, string> = {
            production_increase: '产量增加',
            production_balance: '产量均衡',
            wip_reduction: '在制品减少',
            avg_time_reduction: '平均生产时间减少',
          };
          let goalSection = '\n## 优化目标\n\n';
          goalSection += '请按照以下优先级顺序进行优化（优先级1为最高优先级）：\n\n';
          goalSection += '| 优先级 | 目标 | 详细说明 |\n|--------|------|----------|\n';
          for (const goal of sortedGoals) {
            goalSection += `| ${goal.priority} | ${goalLabels[goal.type] || goal.type} | ${goal.description || '-'} |\n`;
          }
          goalSection += '\n**判断优化是否有效的规则**：按优先级从高到低判断，如果最高优先级目标变差，则本次优化无效；如果最高优先级目标不变，则按下一优先级目标判断；只有当高优先级目标不变或改善时，才看低优先级目标的改善。\n';
          mdContentWithGoals = mdContent + goalSection;
        } else {
          mdContentWithGoals = mdContent;
        }

        const previousChanges = iterations.map(it => ({
          iteration: it.iteration,
          changes: it.applied_changes,
          is_improvement: it.is_improvement,
          improvement_details: it.improvement_details,
          completed_products: it.completed_products,
          max_total_wip: it.max_total_wip,
        }));
        const previousChangesJson = JSON.stringify(previousChanges);

        let aiResponse: string;
        try {
          aiResponse = await invoke<string>('call_ai_optimization', {
            mdContent: mdContentWithGoals,
            iteration: i,
            maxIterations,
            previousChangesJson,
          });
        } catch (error) {
          stoppedReason = `AI分析失败: ${error}`;
          break;
        }

        let suggestion: OptimizationSuggestion | null = null;
        let lastValidationErrors: string[] = [];
        const MAX_JSON_RETRIES = 10;

        for (let retry = 0; retry < MAX_JSON_RETRIES; retry++) {
          let parsed: unknown;
          try {
            const jsonStr = extractJson(aiResponse);
            parsed = JSON.parse(jsonStr);
          } catch (parseError) {
            lastValidationErrors = [`JSON解析失败: ${parseError}`];
          }

          if (parsed !== undefined) {
            const validation = validateOptimizationSuggestion(parsed);
            if (validation.valid) {
              suggestion = parsed as OptimizationSuggestion;
              break;
            }
            lastValidationErrors = validation.errors;
          }

          if (retry < MAX_JSON_RETRIES - 1) {
            set({ optimizationStatusMessage: `第 ${i}/${maxIterations} 次迭代：AI返回格式有误，正在重新生成 (${retry + 2}/${MAX_JSON_RETRIES})...` });

            const errorFeedback = `你上一次返回的JSON格式有误，错误如下：\n${lastValidationErrors.map((e, idx) => `${idx + 1}. ${e}`).join('\n')}\n\n请严格按照要求的JSON格式重新生成，确保：\n- can_optimize 和 should_continue 是布尔值\n- changes 是数组，每个元素有 type 和 value 字段\n- type 必须是: ${VALID_CHANGE_TYPES.join(', ')}\n- value 的格式必须与 type 匹配\n- 不要包含任何JSON之外的文字\n\n请直接返回修正后的JSON：`;

            try {
              aiResponse = await invoke<string>('call_ai_optimization', {
                mdContent: errorFeedback,
                iteration: i,
                maxIterations,
                previousChangesJson,
              });
            } catch (error) {
              stoppedReason = `AI重新生成失败: ${error}`;
              break;
            }
          }
        }

        if (stoppedReason) break;

        if (!suggestion) {
          stoppedReason = `AI返回JSON格式验证失败（已重试${MAX_JSON_RETRIES}次），主要错误: ${lastValidationErrors.slice(0, 3).join('; ')}`;
          break;
        }

        if (!suggestion.can_optimize || suggestion.changes.length === 0) {
          stoppedReason = suggestion.reasoning || 'AI判断无法继续优化';
          break;
        }

        set({ optimizationStatusMessage: `第 ${i}/${maxIterations} 次迭代：应用配置变更...` });

        let appliedChanges: string[];
        try {
          appliedChanges = await invoke<string[]>('apply_optimization_changes', {
            changes: suggestion.changes,
          });
        } catch (error) {
          stoppedReason = `应用配置变更失败: ${error}`;
          break;
        }

        await get().loadCanvasState();

        const currentSimState = await invoke<SimulationState>('get_simulation_state');

        set({ optimizationStatusMessage: `第 ${i}/${maxIterations} 次迭代：运行模拟...` });

        let simResults: SimulationResults;
        try {
          simResults = await invoke<SimulationResults>('run_simulation_to_completion');
        } catch (error) {
          stoppedReason = `模拟运行失败: ${error}`;
          break;
        }

        const currentCompletedProducts = simResults.completed_products;
        const currentMaxWip = simResults.max_total_wip;
        const currentAvgTimes = simResults.product_avg_process_times || [];
        const currentCompletedProductsByCode = simResults.completed_products_by_code || {};

        const improvementDetails: string[] = [];
        let isImprovement = false;

        const lastGoodIteration = [...iterations].reverse().find(it => it.is_improvement);
        const prevCompleted = lastGoodIteration ? lastGoodIteration.completed_products : baselineCompletedProducts;
        const prevMaxWip = lastGoodIteration ? lastGoodIteration.max_total_wip : baselineMaxWip;
        const prevAvgTimes = lastGoodIteration ? lastGoodIteration.product_avg_process_times : baselineAvgTimes;
        const prevCompletedProductsByCode = lastGoodIteration ? (lastGoodIteration.completed_products_by_code || {}) : baselineCompletedProductsByCode;

        if (sortedGoals.length > 0) {
          let decided = false;
          for (const goal of sortedGoals) {
            if (decided) break;
            switch (goal.type) {
              case 'production_increase': {
                if (currentCompletedProducts > prevCompleted) {
                  isImprovement = true;
                  decided = true;
                  improvementDetails.push(`完成产品数: ${prevCompleted} → ${currentCompletedProducts} (+${currentCompletedProducts - prevCompleted})`);
                } else if (currentCompletedProducts < prevCompleted) {
                  isImprovement = false;
                  decided = true;
                  improvementDetails.push(`完成产品数: ${prevCompleted} → ${currentCompletedProducts} (-${prevCompleted - currentCompletedProducts})`);
                } else {
                  improvementDetails.push(`完成产品数: ${prevCompleted} → ${currentCompletedProducts} (不变)`);
                }
                break;
              }
              case 'production_balance': {
                const prevValues = Object.values(prevCompletedProductsByCode);
                const curValues = Object.values(currentCompletedProductsByCode);
                const prevStdDev = prevValues.length > 1 ? Math.sqrt(prevValues.reduce((s, v) => s + (v - prevValues.reduce((a, b) => a + b, 0) / prevValues.length) ** 2, 0) / prevValues.length) : 0;
                const curStdDev = curValues.length > 1 ? Math.sqrt(curValues.reduce((s, v) => s + (v - curValues.reduce((a, b) => a + b, 0) / curValues.length) ** 2, 0) / curValues.length) : 0;
                if (curStdDev < prevStdDev) {
                  isImprovement = true;
                  decided = true;
                  improvementDetails.push(`产量均衡度(标准差): ${prevStdDev.toFixed(1)} → ${curStdDev.toFixed(1)} (改善)`);
                } else if (curStdDev > prevStdDev) {
                  isImprovement = false;
                  decided = true;
                  improvementDetails.push(`产量均衡度(标准差): ${prevStdDev.toFixed(1)} → ${curStdDev.toFixed(1)} (变差)`);
                } else {
                  improvementDetails.push(`产量均衡度(标准差): ${prevStdDev.toFixed(1)} → ${curStdDev.toFixed(1)} (不变)`);
                }
                break;
              }
              case 'wip_reduction': {
                if (currentMaxWip < prevMaxWip) {
                  isImprovement = true;
                  decided = true;
                  improvementDetails.push(`最大在制品数: ${prevMaxWip} → ${currentMaxWip} (-${prevMaxWip - currentMaxWip})`);
                } else if (currentMaxWip > prevMaxWip) {
                  isImprovement = false;
                  decided = true;
                  improvementDetails.push(`最大在制品数: ${prevMaxWip} → ${currentMaxWip} (+${currentMaxWip - prevMaxWip})`);
                } else {
                  improvementDetails.push(`最大在制品数: ${prevMaxWip} → ${currentMaxWip} (不变)`);
                }
                break;
              }
              case 'avg_time_reduction': {
                const prevTotalAvg = prevAvgTimes.reduce((s, p) => s + p.avg_process_time_s, 0);
                const curTotalAvg = currentAvgTimes.reduce((s, p) => s + p.avg_process_time_s, 0);
                if (curTotalAvg < prevTotalAvg) {
                  isImprovement = true;
                  decided = true;
                  improvementDetails.push(`平均加工时间总和: ${prevTotalAvg.toFixed(2)}s → ${curTotalAvg.toFixed(2)}s (改善)`);
                } else if (curTotalAvg > prevTotalAvg) {
                  isImprovement = false;
                  decided = true;
                  improvementDetails.push(`平均加工时间总和: ${prevTotalAvg.toFixed(2)}s → ${curTotalAvg.toFixed(2)}s (变差)`);
                } else {
                  improvementDetails.push(`平均加工时间总和: ${prevTotalAvg.toFixed(2)}s → ${curTotalAvg.toFixed(2)}s (不变)`);
                }
                break;
              }
            }
          }
        } else {
          if (currentCompletedProducts > prevCompleted) {
            isImprovement = true;
            improvementDetails.push(`完成产品数: ${prevCompleted} → ${currentCompletedProducts} (+${currentCompletedProducts - prevCompleted})`);
          }
          if (currentMaxWip < prevMaxWip) {
            isImprovement = true;
            improvementDetails.push(`最大在制品数: ${prevMaxWip} → ${currentMaxWip} (-${prevMaxWip - currentMaxWip})`);
          }
          for (const cur of currentAvgTimes) {
            const prev = prevAvgTimes.find(p => p.product_code === cur.product_code);
            if (prev && cur.avg_process_time_s < prev.avg_process_time_s) {
              isImprovement = true;
              improvementDetails.push(`${cur.product_name || cur.product_code} 平均加工时间: ${prev.avg_process_time_s.toFixed(2)}s → ${cur.avg_process_time_s.toFixed(2)}s`);
            }
          }
        }

        let recordId: string | undefined;
        let currentCanvasState = get().canvas;

        if (isImprovement) {
          try {
            recordId = await invoke<string>('save_simulation_record');
            await get().loadCanvasState();
            currentCanvasState = get().canvas;
          } catch {
            recordId = undefined;
          }
        } else {
          const lastGoodIteration = [...iterations].reverse().find(it => it.is_improvement);
          const rollbackSnapshot = lastGoodIteration?.layout_snapshot || baselineCanvasSnapshot;
          const rollbackSimState = lastGoodIteration?.simulation_params_snapshot || baselineSimState;
          try {
            await invoke('set_canvas_state', { canvasState: JSON.parse(JSON.stringify(rollbackSnapshot)) });
            if (rollbackSimState) {
              await invoke('set_resource_selection_rule', { rule: rollbackSimState.resource_selection_rule });
              await invoke('set_product_selection_strategy', { strategy: rollbackSimState.product_selection_strategy });
              await invoke('set_warehouse_selection_priorities', { priorities: rollbackSimState.warehouse_selection_priorities || [] });
              await invoke('set_consider_product_priority', { consider: rollbackSimState.consider_product_priority ?? false });
              await invoke('set_utilization_sample_interval', { intervalS: rollbackSimState.utilization_sample_interval_s || 1.0 });
              if (rollbackSimState.simulation_mode) {
                await invoke('set_simulation_mode', { mode: rollbackSimState.simulation_mode });
              }
            }
            await get().loadCanvasState();
          } catch {
            // ignore rollback errors
          }
        }

        const iteration: OptimizationIteration = {
          iteration: i,
          changes: suggestion.changes,
          applied_changes: appliedChanges,
          reasoning: suggestion.reasoning,
          completed_products: currentCompletedProducts,
          max_total_wip: currentMaxWip,
          product_avg_process_times: currentAvgTimes,
          completed_products_by_code: currentCompletedProductsByCode,
          is_improvement: isImprovement,
          improvement_details: improvementDetails,
          record_id: recordId,
          layout_snapshot: isImprovement ? JSON.parse(JSON.stringify(currentCanvasState)) as CanvasState : undefined,
          simulation_params_snapshot: isImprovement ? JSON.parse(JSON.stringify(currentSimState)) as SimulationState : undefined,
        };

        iterations.push(iteration);

        if (isImprovement) {
          bestIteration = i;
        }

        let consecutiveBad = 0;
        let hasGoodAfterLastBad = false;
        for (let j = iterations.length - 1; j >= 0; j--) {
          if (!iterations[j].is_improvement) {
            consecutiveBad++;
          } else {
            hasGoodAfterLastBad = true;
            break;
          }
        }

        if (consecutiveBad >= 3) {
          stoppedReason = `连续${consecutiveBad}次优化结果均不如基线，提前停止优化`;
          break;
        }
        if (hasGoodAfterLastBad && consecutiveBad >= 2) {
          stoppedReason = `最近1次有效优化后连续${consecutiveBad}次结果不如基线，提前停止优化`;
          break;
        }

        if (i >= maxIterations) {
          if (suggestion.should_continue) {
            stoppedReason = `已达到最大迭代次数(${maxIterations})，AI建议可继续优化`;
          } else {
            stoppedReason = `已达到最大迭代次数(${maxIterations})`;
          }
          break;
        }
      }

      if (!stoppedReason && !cancelled) {
        stoppedReason = '优化完成';
      }
    } catch (error) {
      stoppedReason = `优化过程出错: ${error}`;
    }

    const result: OptimizationResult = {
      iterations,
      total_iterations: iterations.length,
      best_iteration: bestIteration,
      stopped_reason: stoppedReason,
      baseline_completed_products: baselineCompletedProducts,
      baseline_max_wip: baselineMaxWip,
      baseline_product_avg_process_times: baselineAvgTimes,
      baseline_completed_products_by_code: baselineCompletedProductsByCode,
    };

    set({
      optimizationRunning: false,
      optimizationResult: result,
      optimizationStatusMessage: stoppedReason,
    });
  },

  continueAiOptimization: async (additionalIterations: number = 3) => {
    const prevResult = get().optimizationResult;
    if (!prevResult) return;

    const goals = get().optimizationGoals;
    const sortedGoals = [...goals].sort((a, b) => a.priority - b.priority);

    const lastGoodIteration = [...prevResult.iterations].reverse().find(it => it.is_improvement);
    if (!lastGoodIteration) return;

    const rollbackSnapshot = lastGoodIteration.layout_snapshot;
    const rollbackSimState = lastGoodIteration.simulation_params_snapshot;
    if (!rollbackSnapshot) return;

    try {
      await invoke('set_canvas_state', { canvasState: JSON.parse(JSON.stringify(rollbackSnapshot)) });
      if (rollbackSimState) {
        await invoke('set_resource_selection_rule', { rule: rollbackSimState.resource_selection_rule });
        await invoke('set_product_selection_strategy', { strategy: rollbackSimState.product_selection_strategy });
        await invoke('set_warehouse_selection_priorities', { priorities: rollbackSimState.warehouse_selection_priorities || [] });
        await invoke('set_consider_product_priority', { consider: rollbackSimState.consider_product_priority ?? false });
        await invoke('set_utilization_sample_interval', { intervalS: rollbackSimState.utilization_sample_interval_s || 1.0 });
        if (rollbackSimState.simulation_mode) {
          await invoke('set_simulation_mode', { mode: rollbackSimState.simulation_mode });
        }
      }
      await get().loadCanvasState();
    } catch {
      set({ optimizationStatusMessage: '继续优化失败：无法恢复到上次好的布局' });
      return;
    }

    const records = await get().getSimulationRecords();
    if (records.length === 0) {
      set({ optimizationStatusMessage: '没有模拟记录，请先运行模拟并保存记录' });
      return;
    }

    const baselineCompletedProducts = prevResult.baseline_completed_products;
    const baselineMaxWip = prevResult.baseline_max_wip;
    const baselineAvgTimes = prevResult.baseline_product_avg_process_times || [];
    const baselineCompletedProductsByCode = prevResult.baseline_completed_products_by_code || {};

    const iterations: OptimizationIteration[] = [...prevResult.iterations];
    let bestIteration = prevResult.best_iteration;
    let stoppedReason = '';
    let cancelled = false;

    const startIteration = iterations.length + 1;
    const endIteration = iterations.length + additionalIterations;

    const baselineCanvasSnapshot = JSON.parse(JSON.stringify(rollbackSnapshot)) as CanvasState;
    let baselineSimState: SimulationState | undefined;
    try {
      baselineSimState = await invoke<SimulationState>('get_simulation_state');
    } catch {
      baselineSimState = undefined;
    }

    set({
      optimizationRunning: true,
      optimizationCurrentIteration: 0,
      optimizationMaxIterations: endIteration,
      optimizationStatusMessage: '继续AI优化...',
    });

    try {
      for (let i = startIteration; i <= endIteration; i++) {
        if (!get().optimizationRunning) {
          cancelled = true;
          stoppedReason = '用户取消优化';
          break;
        }

        set({ optimizationCurrentIteration: i, optimizationStatusMessage: `第 ${i}/${endIteration} 次迭代：AI分析中...` });

        const currentRecords = await get().getSimulationRecords();
        const currentRecord = currentRecords.length > 0 ? currentRecords[currentRecords.length - 1] : null;
        if (!currentRecord) {
          stoppedReason = '没有可用的模拟记录';
          break;
        }

        const currentCanvas = get().canvas;
        const canvasData = {
          products: currentCanvas.products,
          materials: currentCanvas.materials,
          devices: currentCanvas.devices,
          connections: currentCanvas.connections,
        };
        const mdContent = generateOptimizationMd(currentRecord, canvasData);
        let mdContentWithGoals: string;

        if (sortedGoals.length > 0) {
          const goalLabels: Record<string, string> = {
            production_increase: '产量增加',
            production_balance: '产量均衡',
            wip_reduction: '在制品减少',
            avg_time_reduction: '平均生产时间减少',
          };
          let goalSection = '\n## 优化目标\n\n';
          goalSection += '请按照以下优先级顺序进行优化（优先级1为最高优先级）：\n\n';
          goalSection += '| 优先级 | 目标 | 详细说明 |\n|--------|------|----------|\n';
          for (const goal of sortedGoals) {
            goalSection += `| ${goal.priority} | ${goalLabels[goal.type] || goal.type} | ${goal.description || '-'} |\n`;
          }
          goalSection += '\n**判断优化是否有效的规则**：按优先级从高到低判断，如果最高优先级目标变差，则本次优化无效；如果最高优先级目标不变，则按下一优先级目标判断；只有当高优先级目标不变或改善时，才看低优先级目标的改善。\n';
          mdContentWithGoals = mdContent + goalSection;
        } else {
          mdContentWithGoals = mdContent;
        }

        const previousChanges = iterations.map(it => ({
          iteration: it.iteration,
          changes: it.applied_changes,
          is_improvement: it.is_improvement,
          improvement_details: it.improvement_details,
          completed_products: it.completed_products,
          max_total_wip: it.max_total_wip,
        }));
        const previousChangesJson = JSON.stringify(previousChanges);

        let aiResponse: string;
        try {
          aiResponse = await invoke<string>('call_ai_optimization', {
            mdContent: mdContentWithGoals,
            iteration: i,
            maxIterations: endIteration,
            previousChangesJson,
          });
        } catch (error) {
          stoppedReason = `AI分析失败: ${error}`;
          break;
        }

        let suggestion: OptimizationSuggestion | null = null;
        let lastValidationErrors: string[] = [];
        const MAX_JSON_RETRIES = 10;

        for (let retry = 0; retry < MAX_JSON_RETRIES; retry++) {
          let parsed: unknown;
          try {
            const jsonStr = extractJson(aiResponse);
            parsed = JSON.parse(jsonStr);
          } catch (parseError) {
            lastValidationErrors = [`JSON解析失败: ${parseError}`];
          }

          if (parsed !== undefined) {
            const validation = validateOptimizationSuggestion(parsed);
            if (validation.valid) {
              suggestion = parsed as OptimizationSuggestion;
              break;
            }
            lastValidationErrors = validation.errors;
          }

          if (retry < MAX_JSON_RETRIES - 1) {
            set({ optimizationStatusMessage: `第 ${i}/${endIteration} 次迭代：AI返回格式有误，正在重新生成 (${retry + 2}/${MAX_JSON_RETRIES})...` });

            const errorFeedback = `你上一次返回的JSON格式有误，错误如下：\n${lastValidationErrors.map((e, idx) => `${idx + 1}. ${e}`).join('\n')}\n\n请严格按照要求的JSON格式重新生成，确保：\n- can_optimize 和 should_continue 是布尔值\n- changes 是数组，每个元素有 type 和 value 字段\n- type 必须是: ${VALID_CHANGE_TYPES.join(', ')}\n- value 的格式必须与 type 匹配\n- 不要包含任何JSON之外的文字\n\n请直接返回修正后的JSON：`;

            try {
              aiResponse = await invoke<string>('call_ai_optimization', {
                mdContent: errorFeedback,
                iteration: i,
                maxIterations: endIteration,
                previousChangesJson,
              });
            } catch (error) {
              stoppedReason = `AI重新生成失败: ${error}`;
              break;
            }
          }
        }

        if (stoppedReason) break;

        if (!suggestion) {
          stoppedReason = `AI返回JSON格式验证失败（已重试${MAX_JSON_RETRIES}次），主要错误: ${lastValidationErrors.slice(0, 3).join('; ')}`;
          break;
        }

        if (!suggestion.can_optimize || suggestion.changes.length === 0) {
          stoppedReason = suggestion.reasoning || 'AI判断无法继续优化';
          break;
        }

        set({ optimizationStatusMessage: `第 ${i}/${endIteration} 次迭代：应用配置变更...` });

        let appliedChanges: string[];
        try {
          appliedChanges = await invoke<string[]>('apply_optimization_changes', {
            changes: suggestion.changes,
          });
        } catch (error) {
          stoppedReason = `应用配置变更失败: ${error}`;
          break;
        }

        await get().loadCanvasState();

        const currentSimState = await invoke<SimulationState>('get_simulation_state');

        set({ optimizationStatusMessage: `第 ${i}/${endIteration} 次迭代：运行模拟...` });

        let simResults: SimulationResults;
        try {
          simResults = await invoke<SimulationResults>('run_simulation_to_completion');
        } catch (error) {
          stoppedReason = `模拟运行失败: ${error}`;
          break;
        }

        const currentCompletedProducts = simResults.completed_products;
        const currentMaxWip = simResults.max_total_wip;
        const currentAvgTimes = simResults.product_avg_process_times || [];
        const currentCompletedProductsByCode = simResults.completed_products_by_code || {};

        const improvementDetails: string[] = [];
        let isImprovement = false;

        const prevGoodIteration = [...iterations].reverse().find(it => it.is_improvement);
        const prevCompleted = prevGoodIteration ? prevGoodIteration.completed_products : baselineCompletedProducts;
        const prevMaxWip = prevGoodIteration ? prevGoodIteration.max_total_wip : baselineMaxWip;
        const prevAvgTimes = prevGoodIteration ? prevGoodIteration.product_avg_process_times : baselineAvgTimes;
        const prevCompletedProductsByCode = prevGoodIteration ? (prevGoodIteration.completed_products_by_code || {}) : baselineCompletedProductsByCode;

        if (sortedGoals.length > 0) {
          let decided = false;
          for (const goal of sortedGoals) {
            if (decided) break;
            switch (goal.type) {
              case 'production_increase': {
                if (currentCompletedProducts > prevCompleted) {
                  isImprovement = true;
                  decided = true;
                  improvementDetails.push(`完成产品数: ${prevCompleted} → ${currentCompletedProducts} (+${currentCompletedProducts - prevCompleted})`);
                } else if (currentCompletedProducts < prevCompleted) {
                  isImprovement = false;
                  decided = true;
                  improvementDetails.push(`完成产品数: ${prevCompleted} → ${currentCompletedProducts} (-${prevCompleted - currentCompletedProducts})`);
                } else {
                  improvementDetails.push(`完成产品数: ${prevCompleted} → ${currentCompletedProducts} (不变)`);
                }
                break;
              }
              case 'production_balance': {
                const prevValues = Object.values(prevCompletedProductsByCode);
                const curValues = Object.values(currentCompletedProductsByCode);
                const prevStdDev = prevValues.length > 1 ? Math.sqrt(prevValues.reduce((s, v) => s + (v - prevValues.reduce((a, b) => a + b, 0) / prevValues.length) ** 2, 0) / prevValues.length) : 0;
                const curStdDev = curValues.length > 1 ? Math.sqrt(curValues.reduce((s, v) => s + (v - curValues.reduce((a, b) => a + b, 0) / curValues.length) ** 2, 0) / curValues.length) : 0;
                if (curStdDev < prevStdDev) {
                  isImprovement = true;
                  decided = true;
                  improvementDetails.push(`产量均衡度(标准差): ${prevStdDev.toFixed(1)} → ${curStdDev.toFixed(1)} (改善)`);
                } else if (curStdDev > prevStdDev) {
                  isImprovement = false;
                  decided = true;
                  improvementDetails.push(`产量均衡度(标准差): ${prevStdDev.toFixed(1)} → ${curStdDev.toFixed(1)} (变差)`);
                } else {
                  improvementDetails.push(`产量均衡度(标准差): ${prevStdDev.toFixed(1)} → ${curStdDev.toFixed(1)} (不变)`);
                }
                break;
              }
              case 'wip_reduction': {
                if (currentMaxWip < prevMaxWip) {
                  isImprovement = true;
                  decided = true;
                  improvementDetails.push(`最大在制品数: ${prevMaxWip} → ${currentMaxWip} (-${prevMaxWip - currentMaxWip})`);
                } else if (currentMaxWip > prevMaxWip) {
                  isImprovement = false;
                  decided = true;
                  improvementDetails.push(`最大在制品数: ${prevMaxWip} → ${currentMaxWip} (+${currentMaxWip - prevMaxWip})`);
                } else {
                  improvementDetails.push(`最大在制品数: ${prevMaxWip} → ${currentMaxWip} (不变)`);
                }
                break;
              }
              case 'avg_time_reduction': {
                const prevTotalAvg = prevAvgTimes.reduce((s, p) => s + p.avg_process_time_s, 0);
                const curTotalAvg = currentAvgTimes.reduce((s, p) => s + p.avg_process_time_s, 0);
                if (curTotalAvg < prevTotalAvg) {
                  isImprovement = true;
                  decided = true;
                  improvementDetails.push(`平均加工时间总和: ${prevTotalAvg.toFixed(2)}s → ${curTotalAvg.toFixed(2)}s (改善)`);
                } else if (curTotalAvg > prevTotalAvg) {
                  isImprovement = false;
                  decided = true;
                  improvementDetails.push(`平均加工时间总和: ${prevTotalAvg.toFixed(2)}s → ${curTotalAvg.toFixed(2)}s (变差)`);
                } else {
                  improvementDetails.push(`平均加工时间总和: ${prevTotalAvg.toFixed(2)}s → ${curTotalAvg.toFixed(2)}s (不变)`);
                }
                break;
              }
            }
          }
        } else {
          if (currentCompletedProducts > prevCompleted) {
            isImprovement = true;
            improvementDetails.push(`完成产品数: ${prevCompleted} → ${currentCompletedProducts} (+${currentCompletedProducts - prevCompleted})`);
          }
          if (currentMaxWip < prevMaxWip) {
            isImprovement = true;
            improvementDetails.push(`最大在制品数: ${prevMaxWip} → ${currentMaxWip} (-${prevMaxWip - currentMaxWip})`);
          }
          for (const cur of currentAvgTimes) {
            const prev = prevAvgTimes.find(p => p.product_code === cur.product_code);
            if (prev && cur.avg_process_time_s < prev.avg_process_time_s) {
              isImprovement = true;
              improvementDetails.push(`${cur.product_name || cur.product_code} 平均加工时间: ${prev.avg_process_time_s.toFixed(2)}s → ${cur.avg_process_time_s.toFixed(2)}s`);
            }
          }
        }

        let recordId: string | undefined;
        let currentCanvasState = get().canvas;

        if (isImprovement) {
          try {
            recordId = await invoke<string>('save_simulation_record');
            await get().loadCanvasState();
            currentCanvasState = get().canvas;
          } catch {
            recordId = undefined;
          }
        } else {
          const lastGood = [...iterations].reverse().find(it => it.is_improvement);
          const rollbackSnap = lastGood?.layout_snapshot || baselineCanvasSnapshot;
          const rollbackSim = lastGood?.simulation_params_snapshot || baselineSimState;
          try {
            await invoke('set_canvas_state', { canvasState: JSON.parse(JSON.stringify(rollbackSnap)) });
            if (rollbackSim) {
              await invoke('set_resource_selection_rule', { rule: rollbackSim.resource_selection_rule });
              await invoke('set_product_selection_strategy', { strategy: rollbackSim.product_selection_strategy });
              await invoke('set_warehouse_selection_priorities', { priorities: rollbackSim.warehouse_selection_priorities || [] });
              await invoke('set_consider_product_priority', { consider: rollbackSim.consider_product_priority ?? false });
              await invoke('set_utilization_sample_interval', { intervalS: rollbackSim.utilization_sample_interval_s || 1.0 });
              if (rollbackSim.simulation_mode) {
                await invoke('set_simulation_mode', { mode: rollbackSim.simulation_mode });
              }
            }
            await get().loadCanvasState();
          } catch {
            // ignore rollback errors
          }
        }

        const iteration: OptimizationIteration = {
          iteration: i,
          changes: suggestion.changes,
          applied_changes: appliedChanges,
          reasoning: suggestion.reasoning,
          completed_products: currentCompletedProducts,
          max_total_wip: currentMaxWip,
          product_avg_process_times: currentAvgTimes,
          completed_products_by_code: currentCompletedProductsByCode,
          is_improvement: isImprovement,
          improvement_details: improvementDetails,
          record_id: recordId,
          layout_snapshot: isImprovement ? JSON.parse(JSON.stringify(currentCanvasState)) as CanvasState : undefined,
          simulation_params_snapshot: isImprovement ? JSON.parse(JSON.stringify(currentSimState)) as SimulationState : undefined,
        };

        iterations.push(iteration);

        if (isImprovement) {
          bestIteration = i;
        }

        let consecutiveBad = 0;
        let hasGoodAfterLastBad = false;
        for (let j = iterations.length - 1; j >= 0; j--) {
          if (!iterations[j].is_improvement) {
            consecutiveBad++;
          } else {
            hasGoodAfterLastBad = true;
            break;
          }
        }

        if (consecutiveBad >= 3) {
          stoppedReason = `连续${consecutiveBad}次优化结果均不如上次好的结果，提前停止优化`;
          break;
        }
        if (hasGoodAfterLastBad && consecutiveBad >= 2) {
          stoppedReason = `最近1次有效优化后连续${consecutiveBad}次结果不如上次好的结果，提前停止优化`;
          break;
        }

        if (i >= endIteration) {
          if (suggestion.should_continue) {
            stoppedReason = `已达到最大迭代次数(${endIteration})，AI建议可继续优化`;
          } else {
            stoppedReason = `已达到最大迭代次数(${endIteration})`;
          }
          break;
        }
      }

      if (!stoppedReason && !cancelled) {
        stoppedReason = '优化完成';
      }
    } catch (error) {
      stoppedReason = `优化过程出错: ${error}`;
    }

    const result: OptimizationResult = {
      iterations,
      total_iterations: iterations.length,
      best_iteration: bestIteration,
      stopped_reason: stoppedReason,
      baseline_completed_products: baselineCompletedProducts,
      baseline_max_wip: baselineMaxWip,
      baseline_product_avg_process_times: baselineAvgTimes,
      baseline_completed_products_by_code: baselineCompletedProductsByCode,
    };

    set({
      optimizationRunning: false,
      optimizationResult: result,
      optimizationStatusMessage: stoppedReason,
    });
  },

  ws3dEnabled: false,
  ws3dPort: 8080,
  toggleWs3d: async (enabled: boolean) => {
    try {
      if (enabled) {
        const port = await invoke<number>('start_ws_server', { port: get().ws3dPort });
        set({ ws3dEnabled: true, ws3dPort: port });
      } else {
        await invoke('stop_ws_server');
        set({ ws3dEnabled: false });
      }
    } catch (error) {
      console.error('WebSocket 3D联动切换失败:', error);
      set({ ws3dEnabled: false });
    }
  },
}));
