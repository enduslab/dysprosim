export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'diamond' | 'tri' | 'trap';

export type FeedMode = 'idle' | 'paced';

export type DistributionType = 'normal' | 'triangular' | 'uniform' | 'exponential';

export type IncomingRule = 'immediate' | 'collect_all';

export type CapacityMode = 'fixed' | 'dynamic';

export type TransportMode = 'continuous' | 'discrete';

export type ReleaseMode = 'immediate' | 'wait_for_idle';

export type ResourceSelectionRule = 'basic' | 'min_wip_dynamic' | 'min_utilrate_dynamic';

export type LineStyle = 'straight' | 'curve' | 'free_polyline' | 'elbow';

export type SimulationMode = 'fixed_duration' | 'fixed_output';

export interface DeviceBase {
  id: string;
  shape_type: ShapeType;
  x_mm: number;
  y_mm: number;
  params: Record<string, number>;
  fill: string;
  outline: string;
  equip_id: string;
  name: string;
  desc: string;
  tag: string;
  workshop_id?: string;
  workshop_top?: number;
  workshop_bottom?: number;
  workshop_left?: number;
  workshop_right?: number;
}

export interface StartNode extends DeviceBase {
  type: 'StartNode';
  product_code: string;
  product_name: string;
  product_color: string;
  feed_mode: FeedMode;
  feed_interval_s: number;
  feed_status: string;
}

export interface EndNode extends DeviceBase {
  type: 'EndNode';
  target_outputs?: Record<string, number>;
}

export interface ProductProcessTime {
  dist_type: DistributionType;
  avg_time_s: number | null;
  stddev_s: number | null;
  min_time_s: number | null;
  max_time_s: number | null;
  mode_time_s: number | null;
  uniform_min_s: number | null;
  uniform_max_s: number | null;
  exp_mean_s: number | null;
}

export interface Station extends DeviceBase {
  type: 'Station';
  product_code: string;
  product_name: string;
  product_color: string;
  processable_products: string[];
  incoming_rule: IncomingRule;
  dist_type: DistributionType;
  avg_time_s: number | null;
  stddev_s: number | null;
  min_time_s: number | null;
  max_time_s: number | null;
  mode_time_s: number | null;
  uniform_min_s: number | null;
  uniform_max_s: number | null;
  exp_mean_s: number | null;
  required_materials: Record<string, number>;
  product_materials: Record<string, Record<string, number>>;
  product_process_times: Record<string, ProductProcessTime>;
  product_tools: Record<string, Record<string, number>>;
}

export interface AssemblyStation extends DeviceBase {
  type: 'AssemblyStation';
  processable_products: string[];
  dist_type: DistributionType;
  avg_time_s: number | null;
  stddev_s: number | null;
  min_time_s: number | null;
  max_time_s: number | null;
  mode_time_s: number | null;
  uniform_min_s: number | null;
  uniform_max_s: number | null;
  exp_mean_s: number | null;
  product_process_times: Record<string, ProductProcessTime>;
  product_tools: Record<string, Record<string, number>>;
  product_upstream_requirements: Record<string, Record<string, number>>;
}

export interface Warehouse extends DeviceBase {
  type: 'Warehouse';
  product_code: string;
  product_name: string;
  product_color: string;
  wh_capacity: number;
  release_mode?: ReleaseMode;
  processable_products?: string[];
}

export interface TempStore extends DeviceBase {
  type: 'TempStore';
  product_code: string;
  product_name: string;
  product_color: string;
  release_mode?: ReleaseMode;
  processable_products?: string[];
}

export interface Buffer extends DeviceBase {
  type: 'Buffer';
  product_code: string;
  product_name: string;
  product_color: string;
  capacity_mode: CapacityMode;
  max_capacity: number | null;
  buffer_duration_s: number | null;
  current_stock: number;
  start_node_ids: string;
  processable_products?: string[];
}

export interface Workshop extends DeviceBase {
  type: 'Workshop';
  width_mm: number;
  height_mm: number;
}

export type Device = StartNode | EndNode | Station | AssemblyStation | Warehouse | TempStore | Buffer | Workshop;

export interface Connection {
  id: string;
  from_device_id: string;
  from_anchor_index: number;
  to_device_id: string;
  to_anchor_index: number;
  name: string;
  length_mm: number | null;
  auto_chain: boolean;
  continuous_transport: boolean;
  is_end_link: boolean;
  transport_speed_mps: number;
  transport_mode: TransportMode;
  max_transport_count: number;
  unlimited_transport: boolean;
  cart_count: number;
  cart_capacity: number;
  line_style: LineStyle;
  curve_control_x: number | null;
  curve_control_y: number | null;
  intermediate_points: [number, number][];
  elbow_offset: number | null;
}

export interface Product {
  code: string;
  name: string;
  color: string;
  bom: Record<string, number>;
}

export interface Material {
  code: string;
  name: string;
  unit: string;
}

export interface Tool {
  code: string;
  name: string;
}

export interface Settings {
  grid_step_mm: number;
  show_grid: boolean;
  show_rulers: boolean;
  snap_threshold_mm: number;
  utilization_sample_interval_s?: number;
  px_per_mm: number;
}

export type SimState = 'idle' | 'running' | 'paused' | 'completed';

export interface UtilizationRecord {
  time_s: number;
  utilization_percent: number;
}

export interface StockHistoryRecord {
  time_s: number;
  stock: number;
  waiting_entry: number;
}

export interface SimDeviceState {
  device_id: string;
  busy: boolean;
  wip: number;
  wait_transport: number;
  completed: number;
  processing_product: string | null;
  max_wip: number;
  max_wait_transport: number;
  total_proc_time_s: number;
  utilization_history?: UtilizationRecord[];
}

export interface SimConnectionState {
  connection_id: string;
  state: string;
  inflight: number;
  queue: number;
  pe_count: number;
  total_time_s: number;
  idle_carts: number;
  pending_queue: [string, string, number][];
  utilization_history?: UtilizationRecord[];
}

export interface SimStorageState {
  device_id: string;
  stock: number;
  capacity: number;
  records: [number, string, number][];
  stored_products?: string[];
  waiting_entry_queue?: WaitingEntryItem[];
  max_waiting_entry?: number;
  max_stock?: number;
  stock_history?: StockHistoryRecord[];
}

export interface SimulationState {
  state: SimState;
  elapsed_s: number;
  speed: number;
  duration_s: number;
  completed_products: number;
  devices: Record<string, SimDeviceState>;
  connections: Record<string, SimConnectionState>;
  storage: Record<string, SimStorageState>;
  resource_selection_rule: ResourceSelectionRule;
  simulation_mode?: SimulationMode;
  process_products: Record<string, ProcessProduct>;
  product_counters: Record<string, number>;
  material_consumption: Record<string, number>;
  device_material_consumption: Record<string, Record<string, number>>;
  utilization_sample_interval_s?: number;
}

export interface DeviceStatistics {
  device_id: string;
  device_name: string;
  completed: number;
  max_wip: number;
  max_wait_transport: number;
  avg_proc_time_s: number;
  total_proc_time_s: number;
  utilization: number;
  by_product: Record<string, ProductStatistics>;
}

export interface ProductStatistics {
  product_code: string;
  product_name: string;
  count: number;
  avg_time_s: number;
}

export interface ConnectionStatistics {
  connection_id: string;
  connection_name: string;
  transport_count: number;
  utilization: number;
  from_device: string;
  to_device: string;
}

export interface StorageStatistics {
  device_id: string;
  device_name: string;
  stock: number;
  capacity: number;
  by_product: Record<string, number>;
  change_records: number;
  max_stock?: number;
  max_waiting_entry?: number;
}

export interface ProcessingRecord {
  product_code: string;
  process_product_id: string;
  sequence_number: number;
  start_wip: number;
  start_wait_transport: number;
  materials_used: Record<string, number>;
  start_time_s: number;
  end_time_s: number;
  duration_s: number;
  arrive_time_s: number;
  leave_time_s: number | null;
  task_type?: string;
}

export interface TransportRecord {
  product_code: string;
  process_product_ids: string[];
  sequence_number: number;
  transport_batch: number;
  start_time_s: number;
  end_time_s: number;
  duration_s: number;
}

export interface StorageChangeRecord {
  time_s: number;
  change_type: string;
  current_stock: number;
  capacity: number;
  process_product_id: string;
  arrival_time_s?: number;
}

export interface WaitingEntryItem {
  process_product_id: string;
  product_code: string;
  arrival_time_s: number;
}

export interface FeedRecord {
  time_s: number;
  event_type: string;
  feed_status: string;
  product_code: string;
  process_product_id: string;
}

export interface ProductAvgProcessTime {
  product_code: string;
  product_name: string;
  product_color: string;
  count: number;
  avg_process_time_s: number;
}

export interface EndNodeArrivalRecord {
  process_product_id: string;
  product_code: string;
  product_name: string;
  product_color: string;
  arrive_time_s: number;
  node_visits: NodeVisit[];
}

export interface SimulationResults {
  duration_s: number;
  completed_products: number;
  completed_products_by_code: Record<string, number>;
  device_stats: DeviceStatistics[];
  connection_stats: ConnectionStatistics[];
  storage_stats: StorageStatistics[];
  material_usage: Record<string, Record<string, number>>;
  processing_records: Record<string, ProcessingRecord[]>;
  transport_records: Record<string, TransportRecord[]>;
  storage_change_records: Record<string, StorageChangeRecord[]>;
  material_consumption: Record<string, number>;
  device_material_consumption: Record<string, Record<string, number>>;
  feed_records: Record<string, FeedRecord[]>;
  max_total_wip: number;
  product_avg_process_times?: ProductAvgProcessTime[];
  device_utilization_history?: Record<string, UtilizationRecord[]>;
  connection_utilization_history?: Record<string, UtilizationRecord[]>;
  storage_utilization_history?: Record<string, UtilizationRecord[]>;
  storage_stock_history?: Record<string, StockHistoryRecord[]>;
  end_node_arrival_records?: Record<string, EndNodeArrivalRecord[]>;
}

export interface SimulationRecord {
  id: string;
  timestamp: string;
  duration_s: number;
  completed_products: number;
  results: SimulationResults;
  process_products: ProcessProduct[];
}

export type ProcessProductStatus = 
  | 'WaitingForProcessing'
  | 'Processing'
  | 'WaitingForTransport'
  | 'InTransit'
  | 'WaitingForStorage'
  | 'Stored'
  | 'Buffering'
  | 'TempStored'
  | 'Completed'
  | 'Consumed';

export interface NodeVisit {
  node_id: string;
  node_name: string;
  arrive_time_s: number;
  leave_time_s: number | null;
}

export interface ConnectionVisit {
  connection_id: string;
  connection_name: string;
  arrive_time_s: number;
  leave_time_s: number | null;
}

export interface ProcessProduct {
  id: string;
  product_code: string;
  product_name: string;
  product_color: string;
  status: ProcessProductStatus;
  current_node_id: string | null;
  current_connection_id: string | null;
  node_visits: NodeVisit[];
  connection_visits: ConnectionVisit[];
}

export interface CanvasState {
  width_mm: number;
  height_mm: number;
  devices: Record<string, Device>;
  connections: Record<string, Connection>;
  products: Record<string, Product>;
  materials: Record<string, Material>;
  tools: Record<string, Tool>;
  settings: Settings;
  simulation_records: SimulationRecord[];
  device_connection_counter: Record<string, number>;
  connection_counter: number;
}

export interface LayoutData {
  canvas_width_mm: number;
  canvas_height_mm: number;
  devices: Device[];
  connections: Connection[];
  products: Product[];
  materials: Material[];
  tools: Tool[];
  settings: Settings;
  simulation_records: SimulationRecord[];
}

export interface BranchPath {
  from_node_id: string;
  from_node_name: string;
  path: string[];
  path_names: string[];
  required_quantity: number;
}

export interface ProductRoute {
  product_code: string;
  start_node_id: string;
  start_node_name: string;
  path: string[];
  path_names: string[];
  end_node_id: string | null;
  end_node_name: string | null;
  is_complete: boolean;
  step_materials?: Record<string, number>[];
  assembly_node_id?: string;
  assembly_node_name?: string;
  branch_paths?: BranchPath[];
}

export interface StartNodeInfo {
  id: string;
  name: string;
  product_code: string | null;
  product_name: string | null;
}

export interface ProductRouteCheckResult {
  all_start_nodes_have_product: boolean;
  start_nodes_without_product: StartNodeInfo[];
  routes: ProductRoute[];
  incomplete_route_start_nodes: StartNodeInfo[];
  assembly_station_errors?: AssemblyStationError[];
}

export interface AssemblyStationError {
  id: string;
  name: string;
  error_type: 'NoProductSelected' | 'UpstreamQuantityZero';
  product_code?: string;
  product_name?: string;
  upstream_node_id?: string;
  upstream_node_name?: string;
}
