use rand::{Rng, SeedableRng};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SimState {
    Idle,
    Running,
    Paused,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UtilizationRecord {
    pub time_s: f64,
    pub utilization_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockHistoryRecord {
    pub time_s: f64,
    pub stock: i32,
    pub waiting_entry: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimDeviceState {
    pub device_id: String,
    pub busy: bool,
    pub wip: i32,
    pub wait_transport: i32,
    pub completed: i32,
    pub processing_product: Option<String>,
    pub max_wip: i32,
    pub max_wait_transport: i32,
    pub total_proc_time_s: f64,
    pub collected_from_upstream: HashMap<String, i32>,
    #[serde(default)]
    pub utilization_history: Vec<UtilizationRecord>,
    #[serde(default)]
    pub last_product_code: Option<String>,
    #[serde(default)]
    pub last_tools: HashMap<String, f64>,
    #[serde(default)]
    pub assembly_wip: HashMap<String, Vec<String>>,
    #[serde(default)]
    pub assembly_product_code: Option<String>,
    #[serde(default)]
    pub disassembly_wip: HashMap<String, Vec<String>>,
    #[serde(default)]
    pub disassembly_item_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimConnectionState {
    pub connection_id: String,
    pub state: String,
    pub inflight: i32,
    pub queue: i32,
    pub pe_count: i32,
    pub total_time_s: f64,
    pub idle_carts: i32,
    pub pending_queue: Vec<(String, String, f64, String)>,
    #[serde(default)]
    pub utilization_history: Vec<UtilizationRecord>,
    #[serde(default)]
    pub batch_counter: i32,
    #[serde(default)]
    pub busy_start_time: Option<f64>,
    #[serde(default)]
    pub total_busy_time_s: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaitingEntryItem {
    pub process_product_id: String,
    pub product_code: String,
    pub arrival_time_s: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimStorageState {
    pub device_id: String,
    pub stock: i32,
    pub capacity: i32,
    pub records: Vec<(f64, String, i32)>,
    #[serde(default)]
    pub stored_products: Vec<String>,
    #[serde(default)]
    pub stored_process_product_ids: Vec<String>,
    #[serde(default)]
    pub utilization_history: Vec<UtilizationRecord>,
    #[serde(default)]
    pub stock_history: Vec<StockHistoryRecord>,
    #[serde(default)]
    pub waiting_entry_queue: Vec<WaitingEntryItem>,
    #[serde(default)]
    pub max_waiting_entry: i32,
    #[serde(default)]
    pub max_stock: i32,
    #[serde(default)]
    pub pending_release: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationState {
    pub state: SimState,
    pub elapsed_s: f64,
    pub speed: f64,
    pub duration_s: f64,
    pub completed_products: i32,
    pub completed_products_by_code: HashMap<String, i32>,
    pub devices: HashMap<String, SimDeviceState>,
    pub connections: HashMap<String, SimConnectionState>,
    pub storage: HashMap<String, SimStorageState>,
    pub resource_selection_rule: crate::models::ResourceSelectionRule,
    #[serde(default)]
    pub simulation_mode: crate::models::SimulationMode,
    pub process_products: HashMap<String, crate::models::ProcessProduct>,
    pub product_counters: HashMap<String, i32>,
    #[serde(default)]
    pub start_node_product_counters: HashMap<String, i32>,
    #[serde(default)]
    pub assembly_station_product_counters: HashMap<String, i32>,
    #[serde(default)]
    pub disassembly_station_product_counters: HashMap<String, i32>,
    pub processing_records: HashMap<String, Vec<ProcessingRecord>>,
    pub transport_records: HashMap<String, Vec<TransportRecord>>,
    pub storage_change_records: HashMap<String, Vec<StorageChangeRecord>>,
    #[serde(default)]
    pub material_consumption: HashMap<String, f64>,
    #[serde(default)]
    pub device_material_consumption: HashMap<String, HashMap<String, f64>>,
    #[serde(default)]
    pub feed_records: HashMap<String, Vec<FeedRecord>>,
    #[serde(default)]
    pub max_total_wip: i32,
    #[serde(default = "default_utilization_sample_interval")]
    pub utilization_sample_interval_s: f64,
    #[serde(default)]
    pub product_routes: Vec<crate::models::ProductRoute>,
    #[serde(default)]
    pub start_node_feed_counts: HashMap<String, i32>,
    #[serde(default)]
    pub end_node_completed_by_product: HashMap<String, HashMap<String, i32>>,
    #[serde(default)]
    pub stopped_feeding_products: std::collections::HashSet<String>,
    #[serde(default)]
    pub end_node_arrival_records: HashMap<String, Vec<crate::models::EndNodeArrivalRecord>>,
    #[serde(default = "default_warehouse_selection_priorities")]
    pub warehouse_selection_priorities: Vec<crate::models::WarehouseSelectionPriority>,
    #[serde(default)]
    pub product_selection_strategy: crate::models::ProductSelectionStrategy,
    #[serde(default)]
    pub consider_product_priority: bool,
}

fn default_utilization_sample_interval() -> f64 { 1.0 }

fn default_warehouse_selection_priorities() -> Vec<crate::models::WarehouseSelectionPriority> {
    vec![
        crate::models::WarehouseSelectionPriority::NearestDistance,
        crate::models::WarehouseSelectionPriority::LowestUtilization,
        crate::models::WarehouseSelectionPriority::ProductConcentrated,
        crate::models::WarehouseSelectionPriority::LeastWaitingEntry,
    ]
}

impl Default for SimulationState {
    fn default() -> Self {
        Self {
            state: SimState::Idle,
            elapsed_s: 0.0,
            speed: 1.0,
            duration_s: 3600.0,
            completed_products: 0,
            completed_products_by_code: HashMap::new(),
            devices: HashMap::new(),
            connections: HashMap::new(),
            storage: HashMap::new(),
            resource_selection_rule: crate::models::ResourceSelectionRule::Basic,
            simulation_mode: crate::models::SimulationMode::FixedDuration,
            process_products: HashMap::new(),
            product_counters: HashMap::new(),
            start_node_product_counters: HashMap::new(),
            assembly_station_product_counters: HashMap::new(),
            disassembly_station_product_counters: HashMap::new(),
            processing_records: HashMap::new(),
            transport_records: HashMap::new(),
            storage_change_records: HashMap::new(),
            material_consumption: HashMap::new(),
            device_material_consumption: HashMap::new(),
            feed_records: HashMap::new(),
            max_total_wip: 0,
            utilization_sample_interval_s: 1.0,
            product_routes: Vec::new(),
            start_node_feed_counts: HashMap::new(),
            end_node_completed_by_product: HashMap::new(),
            stopped_feeding_products: std::collections::HashSet::new(),
            end_node_arrival_records: HashMap::new(),
            warehouse_selection_priorities: default_warehouse_selection_priorities(),
            product_selection_strategy: crate::models::ProductSelectionStrategy::default(),
            consider_product_priority: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceStatistics {
    pub device_id: String,
    pub device_name: String,
    pub completed: i32,
    pub max_wip: i32,
    pub max_wait_transport: i32,
    pub avg_proc_time_s: f64,
    pub total_proc_time_s: f64,
    pub utilization: f64,
    pub by_product: HashMap<String, ProductStatistics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductStatistics {
    pub product_code: String,
    pub product_name: String,
    pub count: i32,
    pub avg_time_s: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStatistics {
    pub connection_id: String,
    pub connection_name: String,
    pub transport_count: i32,
    pub utilization: f64,
    pub from_device: String,
    pub to_device: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageStatistics {
    pub device_id: String,
    pub device_name: String,
    pub stock: i32,
    pub capacity: i32,
    pub by_product: HashMap<String, i32>,
    pub change_records: i32,
    #[serde(default)]
    pub max_stock: i32,
    #[serde(default)]
    pub max_waiting_entry: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingRecord {
    pub product_code: String,
    pub process_product_id: String,
    pub sequence_number: i32,
    pub start_wip: i32,
    pub start_wait_transport: i32,
    pub materials_used: HashMap<String, f64>,
    pub start_time_s: f64,
    pub end_time_s: f64,
    pub duration_s: f64,
    pub arrive_time_s: f64,
    pub leave_time_s: Option<f64>,
    #[serde(default)]
    pub task_type: String,
    #[serde(default)]
    pub disassembly_product_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportRecord {
    pub product_code: String,
    pub process_product_ids: Vec<String>,
    pub sequence_number: i32,
    pub transport_batch: i32,
    pub start_time_s: f64,
    pub end_time_s: f64,
    pub duration_s: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageChangeRecord {
    pub time_s: f64,
    pub change_type: String,
    pub current_stock: i32,
    pub capacity: i32,
    #[serde(default)]
    pub process_product_id: String,
    #[serde(default)]
    pub arrival_time_s: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedRecord {
    pub time_s: f64,
    pub event_type: String,
    pub feed_status: String,
    pub product_code: String,
    pub process_product_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductAvgProcessTime {
    pub product_code: String,
    pub product_name: String,
    pub product_color: String,
    pub count: i32,
    pub avg_process_time_s: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResults {
    pub duration_s: f64,
    pub completed_products: i32,
    pub completed_products_by_code: HashMap<String, i32>,
    pub device_stats: Vec<DeviceStatistics>,
    pub connection_stats: Vec<ConnectionStatistics>,
    pub storage_stats: Vec<StorageStatistics>,
    pub material_usage: HashMap<String, HashMap<String, f64>>,
    pub processing_records: HashMap<String, Vec<ProcessingRecord>>,
    pub transport_records: HashMap<String, Vec<TransportRecord>>,
    pub storage_change_records: HashMap<String, Vec<StorageChangeRecord>>,
    #[serde(default)]
    pub material_consumption: HashMap<String, f64>,
    #[serde(default)]
    pub device_material_consumption: HashMap<String, HashMap<String, f64>>,
    #[serde(default)]
    pub feed_records: HashMap<String, Vec<FeedRecord>>,
    pub max_total_wip: i32,
    #[serde(default)]
    pub product_avg_process_times: Vec<ProductAvgProcessTime>,
    #[serde(default)]
    pub device_utilization_history: HashMap<String, Vec<UtilizationRecord>>,
    #[serde(default)]
    pub connection_utilization_history: HashMap<String, Vec<UtilizationRecord>>,
    #[serde(default)]
    pub storage_utilization_history: HashMap<String, Vec<UtilizationRecord>>,
    #[serde(default)]
    pub storage_stock_history: HashMap<String, Vec<StockHistoryRecord>>,
    #[serde(default)]
    pub end_node_arrival_records: HashMap<String, Vec<crate::models::EndNodeArrivalRecord>>,
    #[serde(default)]
    pub simulation_mode: Option<crate::models::SimulationMode>,
    #[serde(default)]
    pub resource_selection_rule: Option<crate::models::ResourceSelectionRule>,
    #[serde(default)]
    pub warehouse_selection_priorities: Vec<crate::models::WarehouseSelectionPriority>,
    #[serde(default)]
    pub wip_queue_records: HashMap<String, Vec<WipQueueRecord>>,
    #[serde(default)]
    pub product_selection_strategy: Option<crate::models::ProductSelectionStrategy>,
    #[serde(default)]
    pub consider_product_priority: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WipQueueRecord {
    pub process_product_id: String,
    pub product_code: String,
    pub arrive_time_s: f64,
    pub dequeue_time_s: Option<f64>,
}

pub struct SimulationEngine {
    state: SimulationState,
    canvas_state: crate::models::CanvasState,
    event_queue: Vec<SimEvent>,
    rng: rand::rngs::StdRng,
}

#[derive(Debug, Clone)]
enum SimEvent {
    Feed { start_node_id: String, time_s: f64 },
    ProcessComplete { device_id: String, time_s: f64, product_code: String, process_product_id: String },
    TransportComplete { connection_id: String, from_id: String, to_id: String, time_s: f64, product_code: String, process_product_ids: Vec<String> },
    CartReturn { connection_id: String, time_s: f64 },
    DownstreamIdle { start_node_id: String, downstream_device_id: String, time_s: f64 },
    AssemblyComplete { device_id: String, time_s: f64, product_code: String, process_product_id: String },
    DisassemblyComplete { device_id: String, time_s: f64, product_code: String, process_product_id: String },
}

impl SimEvent {
    fn time_s(&self) -> f64 {
        match self {
            SimEvent::Feed { time_s, .. } => *time_s,
            SimEvent::ProcessComplete { time_s, .. } => *time_s,
            SimEvent::TransportComplete { time_s, .. } => *time_s,
            SimEvent::CartReturn { time_s, .. } => *time_s,
            SimEvent::DownstreamIdle { time_s, .. } => *time_s,
            SimEvent::AssemblyComplete { time_s, .. } => *time_s,
            SimEvent::DisassemblyComplete { time_s, .. } => *time_s,
        }
    }
}

impl SimulationEngine {
    pub fn new(canvas_state: crate::models::CanvasState) -> Self {
        Self {
            state: SimulationState::default(),
            canvas_state,
            event_queue: Vec::new(),
            rng: rand::rngs::StdRng::from_entropy(),
        }
    }

    fn extract_device_sequence(id: &str) -> String {
        let digits: String = id.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.len() >= 3 {
            digits[digits.len()-3..].to_string()
        } else {
            format!("{:03}", digits.parse::<i32>().unwrap_or(1))
        }
    }

    fn generate_start_node_pp_id(&mut self, start_node_id: &str, product_code: &str) -> String {
        let counter_key = format!("{}_{}", start_node_id, product_code);
        let counter = self.state.start_node_product_counters.entry(counter_key).or_insert(0);
        *counter += 1;
        let seq = Self::extract_device_sequence(start_node_id);
        format!("{}{}{:04}", product_code, seq, counter)
    }

    fn generate_assembly_pp_id(&mut self, assembly_station_id: &str, product_code: &str) -> String {
        let counter_key = format!("{}_{}", assembly_station_id, product_code);
        let counter = self.state.assembly_station_product_counters.entry(counter_key).or_insert(0);
        *counter += 1;
        let seq = Self::extract_device_sequence(assembly_station_id);
        format!("{}ASS{}{:04}", product_code, seq, counter)
    }

    pub fn state(&self) -> &SimulationState {
        &self.state
    }

    fn push_event(&mut self, event: SimEvent) {
        self.event_queue.push(event);
        self.event_queue.sort_by(|a, b| a.time_s().partial_cmp(&b.time_s()).unwrap_or(std::cmp::Ordering::Equal));
    }

    pub fn set_speed(&mut self, speed: f64) {
        self.state.speed = speed.max(0.1).min(100.0);
    }

    pub fn set_duration(&mut self, duration_s: f64) {
        self.state.duration_s = duration_s.max(1.0);
    }

    pub fn set_resource_selection_rule(&mut self, rule: crate::models::ResourceSelectionRule) {
        self.state.resource_selection_rule = rule;
    }

    pub fn set_simulation_mode(&mut self, mode: crate::models::SimulationMode) {
        self.state.simulation_mode = mode;
    }

    pub fn set_utilization_sample_interval(&mut self, interval_s: f64) {
        self.state.utilization_sample_interval_s = interval_s.max(1.0);
    }

    pub fn set_warehouse_selection_priorities(&mut self, priorities: Vec<crate::models::WarehouseSelectionPriority>) {
        if priorities.len() == 4 {
            self.state.warehouse_selection_priorities = priorities;
        }
    }

    pub fn set_product_selection_strategy(&mut self, strategy: crate::models::ProductSelectionStrategy) {
        self.state.product_selection_strategy = strategy;
    }

    pub fn set_consider_product_priority(&mut self, consider: bool) {
        self.state.consider_product_priority = consider;
    }

    fn update_total_wip(&mut self) {
        let mut total_wip: i32 = 0;
        
        for sim_dev in self.state.devices.values() {
            total_wip += sim_dev.wip;
            total_wip += sim_dev.wait_transport;
            if sim_dev.busy {
                total_wip += 1;
            }
        }
        
        if total_wip > self.state.max_total_wip {
            self.state.max_total_wip = total_wip;
        }
    }

    pub fn reset(&mut self) {
        self.state = SimulationState::default();
        self.event_queue.clear();
        self.initialize();
    }

    pub fn initialize(&mut self) {
        self.state.devices.clear();
        self.state.connections.clear();
        self.state.storage.clear();
        self.state.product_routes = self.calculate_product_routes();

        for (id, device) in &self.canvas_state.devices {
            let sim_dev = SimDeviceState {
                device_id: id.clone(),
                busy: false,
                wip: 0,
                wait_transport: 0,
                completed: 0,
                processing_product: None,
                max_wip: 0,
                max_wait_transport: 0,
                total_proc_time_s: 0.0,
                collected_from_upstream: HashMap::new(),
                utilization_history: Vec::new(),
                last_product_code: None,
                last_tools: HashMap::new(),
                assembly_wip: HashMap::new(),
                assembly_product_code: None,
                disassembly_wip: HashMap::new(),
                disassembly_item_code: None,
            };
            self.state.devices.insert(id.clone(), sim_dev);

            if device.is_warehouse() || device.is_temp_store() || device.is_buffer() {
                let capacity = match device {
                    crate::models::Device::Warehouse(w) => w.wh_capacity,
                    crate::models::Device::Buffer(b) => b.max_capacity.unwrap_or(0),
                    _ => 0,
                };
                let sim_storage = SimStorageState {
                    device_id: id.clone(),
                    stock: 0,
                    capacity,
                    records: Vec::new(),
                    stored_products: Vec::new(),
                    stored_process_product_ids: Vec::new(),
                    utilization_history: Vec::new(),
                    stock_history: Vec::new(),
                    waiting_entry_queue: Vec::new(),
                    max_waiting_entry: 0,
                    max_stock: 0,
                    pending_release: false,
                };
                self.state.storage.insert(id.clone(), sim_storage);
            }
        }

        for (id, conn) in &self.canvas_state.connections {
            let cart_count = if conn.transport_mode == crate::models::TransportMode::Discrete {
                conn.cart_count.max(1)
            } else {
                0
            };
            let sim_conn = SimConnectionState {
                connection_id: id.clone(),
                state: "idle".to_string(),
                inflight: 0,
                queue: 0,
                pe_count: 0,
                total_time_s: 0.0,
                idle_carts: cart_count,
                pending_queue: Vec::new(),
                utilization_history: Vec::new(),
                batch_counter: 0,
                busy_start_time: None,
                total_busy_time_s: 0.0,
            };
            self.state.connections.insert(id.clone(), sim_conn);
        }
    }

    pub fn step(&mut self, dt_s: f64) -> bool {
        if self.state.state != SimState::Running {
            return false;
        }

        let start_time = self.state.elapsed_s;
        let end_time = start_time + dt_s;
        let sample_interval = self.state.utilization_sample_interval_s.max(0.1);
        
        let mut next_sample_time = if start_time == 0.0 {
            sample_interval
        } else {
            (start_time / sample_interval).ceil() * sample_interval
        };
        
        if next_sample_time <= start_time {
            next_sample_time = start_time + sample_interval;
        }
        
        while next_sample_time <= end_time {
            while let Some(event) = self.event_queue.first() {
                let event_time = event.time_s();
                if event_time > next_sample_time {
                    break;
                }
                let event = self.event_queue.remove(0);
                self.state.elapsed_s = event_time;
                self.process_event(event);
            }
            
            self.state.elapsed_s = next_sample_time;
            self.record_utilization_snapshot(next_sample_time);
            
            next_sample_time += sample_interval;
        }
        
        while let Some(event) = self.event_queue.first() {
            let event_time = event.time_s();
            if event_time > end_time {
                break;
            }
            let event = self.event_queue.remove(0);
            self.state.elapsed_s = event_time;
            self.process_event(event);
        }

        self.state.elapsed_s = end_time;

        match self.state.simulation_mode {
            crate::models::SimulationMode::FixedDuration => {
                if self.state.elapsed_s >= self.state.duration_s {
                    self.state.state = SimState::Completed;
                    return true;
                }
            }
            crate::models::SimulationMode::FixedOutput => {
                let all_targets_reached = self.check_all_targets_reached();
                if all_targets_reached {
                    self.state.state = SimState::Completed;
                    return true;
                }
            }
        }

        false
    }
    
    fn check_all_targets_reached(&self) -> bool {
        let end_nodes: Vec<_> = self.canvas_state.devices
            .values()
            .filter_map(|d| {
                if let crate::models::Device::EndNode(en) = d {
                    Some((en.base.id.clone(), en.target_outputs.clone()))
                } else {
                    None
                }
            })
            .collect();

        if end_nodes.is_empty() {
            return true;
        }

        for (end_node_id, target_outputs) in end_nodes {
            if target_outputs.is_empty() {
                continue;
            }
            for (product_code, target) in &target_outputs {
                let completed = self.state.end_node_completed_by_product
                    .get(&end_node_id)
                    .and_then(|m| m.get(product_code))
                    .copied()
                    .unwrap_or(0);
                if completed < *target {
                    return false;
                }
            }
        }
        true
    }

    fn check_and_stop_feeding_for_product(&mut self, end_node_id: &str, product_code: &str) {
        let target = match self.canvas_state.devices.get(end_node_id) {
            Some(crate::models::Device::EndNode(en)) => en.target_outputs.get(product_code).copied(),
            _ => return,
        };

        let target = match target {
            Some(t) => t,
            None => return,
        };

        let completed = self.state.end_node_completed_by_product
            .get(end_node_id)
            .and_then(|m| m.get(product_code))
            .copied()
            .unwrap_or(0);

        if completed < target {
            return;
        }

        self.state.stopped_feeding_products.insert(product_code.to_string());

        let start_node_ids = self.find_source_start_nodes_for_product(end_node_id, product_code);
        for start_node_id in start_node_ids {
            if let Some(crate::models::Device::StartNode(sn)) = self.canvas_state.devices.get_mut(&start_node_id) {
                sn.feed_status = "暂停投料".to_string();
            }
        }
    }

    fn find_source_start_nodes_for_product(&self, end_node_id: &str, product_code: &str) -> Vec<String> {
        let mut start_nodes = std::collections::HashSet::new();
        let mut visited = std::collections::HashSet::new();
        self.trace_upstream_for_product(end_node_id, product_code, &mut start_nodes, &mut visited);
        start_nodes.into_iter().collect()
    }

    fn trace_upstream_for_product(
        &self,
        device_id: &str,
        product_code: &str,
        start_nodes: &mut std::collections::HashSet<String>,
        visited: &mut std::collections::HashSet<String>,
    ) {
        if visited.contains(device_id) {
            return;
        }
        visited.insert(device_id.to_string());

        let incoming: Vec<_> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .collect();

        for conn in incoming {
            let from_device = match self.canvas_state.devices.get(&conn.from_device_id) {
                Some(d) => d,
                None => continue,
            };

            match from_device {
                crate::models::Device::StartNode(sn) => {
                    if sn.product_code == product_code {
                        start_nodes.insert(sn.base.id.clone());
                    }
                }
                crate::models::Device::Station(s) => {
                    if s.processable_products.contains(&product_code.to_string())
                        || s.product_code == product_code
                        || s.processable_products.is_empty()
                    {
                        self.trace_upstream_for_product(&conn.from_device_id, product_code, start_nodes, visited);
                    }
                }
                crate::models::Device::AssemblyStation(a) => {
                    let is_component = a.components.contains(&product_code.to_string());
                    let is_legacy = !a.processable_products.is_empty() && a.processable_products.contains(&product_code.to_string());
                    if is_component || is_legacy {
                        for (assembly_product_code, component_reqs) in &a.product_upstream_requirements {
                            if let Some(qty) = component_reqs.get(product_code) {
                                if *qty > 0 {
                                    self.trace_upstream_for_assembly_components(&a.base.id, assembly_product_code, start_nodes, visited);
                                }
                            }
                        }
                    }
                }
                crate::models::Device::DisassemblyStation(d) => {
                    if d.items_to_disassemble.contains(&product_code.to_string()) {
                        self.trace_upstream_for_product(&conn.from_device_id, product_code, start_nodes, visited);
                    }
                }
                crate::models::Device::Warehouse(_)
                | crate::models::Device::Buffer(_)
                | crate::models::Device::TempStore(_) => {
                    self.trace_upstream_for_product(&conn.from_device_id, product_code, start_nodes, visited);
                }
                _ => {}
            }
        }
    }

    fn trace_upstream_for_assembly_components(
        &self,
        assembly_id: &str,
        assembly_product_code: &str,
        start_nodes: &mut std::collections::HashSet<String>,
        visited: &mut std::collections::HashSet<String>,
    ) {
        let assembly = match self.canvas_state.devices.get(assembly_id) {
            Some(crate::models::Device::AssemblyStation(a)) => a,
            _ => return,
        };

        let component_reqs = match assembly.product_upstream_requirements.get(assembly_product_code) {
            Some(reqs) => reqs,
            None => return,
        };

        for (component_code, qty) in component_reqs {
            if *qty == 0 {
                continue;
            }
            self.trace_upstream_for_product(assembly_id, component_code, start_nodes, visited);
        }
    }
    
    fn record_utilization_snapshot(&mut self, time_s: f64) {
        let device_ids: Vec<String> = self.state.devices.keys().cloned().collect();
        
        for device_id in device_ids {
            let actual_proc_time: f64 = if let Some(records) = self.state.processing_records.get(&device_id) {
                records.iter()
                    .map(|r| {
                        if r.end_time_s > 0.0 {
                            r.duration_s
                        } else {
                            time_s - r.start_time_s
                        }
                    })
                    .sum()
            } else {
                0.0
            };
            
            if let Some(sim_dev) = self.state.devices.get_mut(&device_id) {
                let utilization = if time_s > 0.0 {
                    (actual_proc_time / time_s * 100.0).min(100.0)
                } else {
                    0.0
                };
                sim_dev.utilization_history.push(UtilizationRecord {
                    time_s,
                    utilization_percent: utilization,
                });
            }
        }
        
        for sim_conn in self.state.connections.values_mut() {
            let utilization = if time_s > 0.0 {
                (sim_conn.total_time_s / time_s * 100.0).min(100.0)
            } else {
                0.0
            };
            sim_conn.utilization_history.push(UtilizationRecord {
                time_s,
                utilization_percent: utilization,
            });
        }
        
        let storage_ids: Vec<String> = self.state.storage.keys().cloned().collect();
        for storage_id in storage_ids {
            if let Some(sim_storage) = self.state.storage.get_mut(&storage_id) {
                sim_storage.stock_history.push(StockHistoryRecord {
                    time_s,
                    stock: sim_storage.stock,
                    waiting_entry: sim_storage.waiting_entry_queue.len() as i32,
                });
            }
        }
    }
    
    fn record_storage_utilization(&mut self, storage_id: &str, time_s: f64) {
        if let Some(sim_storage) = self.state.storage.get_mut(storage_id) {
            if sim_storage.capacity > 0 {
                let utilization = (sim_storage.stock as f64 / sim_storage.capacity as f64 * 100.0).min(100.0);
                sim_storage.utilization_history.push(UtilizationRecord {
                    time_s,
                    utilization_percent: utilization,
                });
            }
        }
    }

    fn process_event(&mut self, event: SimEvent) {
        match event {
            SimEvent::Feed { start_node_id, time_s } => {
                self.handle_feed(&start_node_id, time_s);
            }
            SimEvent::ProcessComplete { device_id, time_s, product_code, process_product_id } => {
                self.handle_process_complete(&device_id, time_s, &product_code, &process_product_id);
            }
            SimEvent::TransportComplete { connection_id, from_id, to_id, time_s, product_code, process_product_ids } => {
                self.handle_transport_complete(&connection_id, &from_id, &to_id, time_s, &product_code, &process_product_ids);
            }
            SimEvent::CartReturn { connection_id, time_s } => {
                self.handle_cart_return(&connection_id, time_s);
            }
            SimEvent::DownstreamIdle { start_node_id, downstream_device_id, time_s } => {
                self.handle_downstream_idle(&start_node_id, &downstream_device_id, time_s);
            }
            SimEvent::AssemblyComplete { device_id, time_s, product_code, process_product_id } => {
                self.handle_assembly_complete(&device_id, time_s, &product_code, &process_product_id);
            }
            SimEvent::DisassemblyComplete { device_id, time_s, product_code, process_product_id } => {
                self.handle_disassembly_complete(&device_id, time_s, &product_code, &process_product_id);
            }
        }
    }

    fn handle_feed(&mut self, start_node_id: &str, time_s: f64) {
        let (product_code, product_name, product_color, feed_mode, feed_interval, feed_status) = match self.canvas_state.devices.get(start_node_id) {
            Some(crate::models::Device::StartNode(sn)) => {
                let product = self.canvas_state.products.get(&sn.product_code);
                (
                    sn.product_code.clone(),
                    product.map_or(String::new(), |p| p.name.clone()),
                    product.map_or(String::new(), |p| p.color.clone()),
                    sn.feed_mode,
                    sn.feed_interval_s,
                    sn.feed_status.clone(),
                )
            }
            _ => return,
        };

        if self.state.simulation_mode == crate::models::SimulationMode::FixedOutput
            && self.state.stopped_feeding_products.contains(&product_code) {
            return;
        }

        if feed_status == "暂停投料" {
            self.state.feed_records
                .entry(start_node_id.to_string())
                .or_insert_with(Vec::new)
                .push(FeedRecord {
                    time_s,
                    event_type: "暂停投料".to_string(),
                    feed_status: "暂停投料".to_string(),
                    product_code: product_code.clone(),
                    process_product_id: String::new(),
                });

            let next_time = time_s + feed_interval;
            if self.state.simulation_mode == crate::models::SimulationMode::FixedDuration && next_time < self.state.duration_s {
                self.push_event(SimEvent::Feed {
                    start_node_id: start_node_id.to_string(),
                    time_s: next_time,
                });
            } else if self.state.simulation_mode == crate::models::SimulationMode::FixedOutput {
                if !self.state.stopped_feeding_products.contains(&product_code) {
                    self.push_event(SimEvent::Feed {
                        start_node_id: start_node_id.to_string(),
                        time_s: next_time,
                    });
                }
            }
            return;
        }

        match feed_mode {
            crate::models::FeedMode::Paced => {
                if let Some(conn) = self.select_downstream_connection(start_node_id, &product_code) {
                    let pp_id = self.generate_start_node_pp_id(start_node_id, &product_code);
                    
                    *self.state.start_node_feed_counts.entry(start_node_id.to_string()).or_insert(0) += 1;
                    
                    let start_node_name = match self.canvas_state.devices.get(start_node_id) {
                        Some(d) => d.name().to_string(),
                        None => start_node_id.to_string(),
                    };
                    
                    let process_product = crate::models::ProcessProduct {
                        id: pp_id.clone(),
                        product_code: product_code.clone(),
                        product_name: product_name.clone(),
                        product_color: product_color.clone(),
                        status: crate::models::ProcessProductStatus::WaitingForTransport,
                        current_node_id: Some(start_node_id.to_string()),
                        current_connection_id: Some(conn.id.clone()),
                        node_visits: vec![crate::models::NodeVisit {
                            node_id: start_node_id.to_string(),
                            node_name: start_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        }],
                        connection_visits: vec![],
                    };
                    
                    self.state.process_products.insert(pp_id.clone(), process_product);
                    
                    self.state.feed_records
                        .entry(start_node_id.to_string())
                        .or_insert_with(Vec::new)
                        .push(FeedRecord {
                            time_s,
                            event_type: "投料".to_string(),
                            feed_status: "投料中".to_string(),
                            product_code: product_code.clone(),
                            process_product_id: pp_id.clone(),
                        });

                    self.start_transport(&conn.id, start_node_id, &conn.to_device_id, time_s, &product_code, Some(&pp_id));
                }

                let next_time = time_s + feed_interval;
                let should_schedule = if self.state.simulation_mode == crate::models::SimulationMode::FixedDuration {
                    next_time < self.state.duration_s
                } else {
                    !self.state.stopped_feeding_products.contains(&product_code)
                };
                
                if should_schedule {
                    self.push_event(SimEvent::Feed {
                        start_node_id: start_node_id.to_string(),
                        time_s: next_time,
                    });
                }
            }
            crate::models::FeedMode::Idle => {
                if let Some(conn) = self.select_downstream_connection(start_node_id, &product_code) {
                    let pp_id = self.generate_start_node_pp_id(start_node_id, &product_code);
                    
                    *self.state.start_node_feed_counts.entry(start_node_id.to_string()).or_insert(0) += 1;
                    
                    let start_node_name = match self.canvas_state.devices.get(start_node_id) {
                        Some(d) => d.name().to_string(),
                        None => start_node_id.to_string(),
                    };
                    
                    let process_product = crate::models::ProcessProduct {
                        id: pp_id.clone(),
                        product_code: product_code.clone(),
                        product_name: product_name.clone(),
                        product_color: product_color.clone(),
                        status: crate::models::ProcessProductStatus::WaitingForTransport,
                        current_node_id: Some(start_node_id.to_string()),
                        current_connection_id: Some(conn.id.clone()),
                        node_visits: vec![crate::models::NodeVisit {
                            node_id: start_node_id.to_string(),
                            node_name: start_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        }],
                        connection_visits: vec![],
                    };
                    
                    self.state.process_products.insert(pp_id.clone(), process_product);
                    
                    self.state.feed_records
                        .entry(start_node_id.to_string())
                        .or_insert_with(Vec::new)
                        .push(FeedRecord {
                            time_s,
                            event_type: "投料".to_string(),
                            feed_status: "投料中".to_string(),
                            product_code: product_code.clone(),
                            process_product_id: pp_id.clone(),
                        });

                    self.start_transport(&conn.id, start_node_id, &conn.to_device_id, time_s, &product_code, Some(&pp_id));
                }
            }
        }
    }

    fn handle_downstream_idle(&mut self, start_node_id: &str, _downstream_device_id: &str, time_s: f64) {
        let (product_code, product_name, product_color, feed_mode, feed_status) = match self.canvas_state.devices.get(start_node_id) {
            Some(crate::models::Device::StartNode(sn)) => {
                let product = self.canvas_state.products.get(&sn.product_code);
                (
                    sn.product_code.clone(),
                    product.map_or(String::new(), |p| p.name.clone()),
                    product.map_or(String::new(), |p| p.color.clone()),
                    sn.feed_mode,
                    sn.feed_status.clone(),
                )
            }
            _ => return,
        };

        if feed_status != "投料中" {
            return;
        }

        if feed_mode != crate::models::FeedMode::Idle {
            return;
        }

        if self.state.simulation_mode == crate::models::SimulationMode::FixedOutput
            && self.state.stopped_feeding_products.contains(&product_code) {
            return;
        }

        if let Some(conn) = self.select_downstream_connection(start_node_id, &product_code) {
            let pp_id = self.generate_start_node_pp_id(start_node_id, &product_code);
            
            *self.state.start_node_feed_counts.entry(start_node_id.to_string()).or_insert(0) += 1;
            
            let start_node_name = match self.canvas_state.devices.get(start_node_id) {
                Some(d) => d.name().to_string(),
                None => start_node_id.to_string(),
            };
            
            let process_product = crate::models::ProcessProduct {
                id: pp_id.clone(),
                product_code: product_code.clone(),
                product_name: product_name.clone(),
                product_color: product_color.clone(),
                status: crate::models::ProcessProductStatus::WaitingForTransport,
                current_node_id: Some(start_node_id.to_string()),
                current_connection_id: Some(conn.id.clone()),
                node_visits: vec![crate::models::NodeVisit {
                    node_id: start_node_id.to_string(),
                    node_name: start_node_name,
                    arrive_time_s: time_s,
                    leave_time_s: None,
                }],
                connection_visits: vec![],
            };
            
            self.state.process_products.insert(pp_id.clone(), process_product);
            
            self.state.feed_records
                .entry(start_node_id.to_string())
                .or_insert_with(Vec::new)
                .push(FeedRecord {
                    time_s,
                    event_type: "投料".to_string(),
                    feed_status: "投料中".to_string(),
                    product_code: product_code.clone(),
                    process_product_id: pp_id.clone(),
                });

            self.start_transport(&conn.id, start_node_id, &conn.to_device_id, time_s, &product_code, Some(&pp_id));
        }
    }

    fn handle_process_complete(&mut self, device_id: &str, time_s: f64, product_code: &str, process_product_id: &str) {
        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.busy = false;
            sim_dev.completed += 1;
            sim_dev.processing_product = None;
        }
        
        self.update_total_wip();
        
        if let Some(records) = self.state.processing_records.get_mut(device_id) {
            if let Some(last_record) = records.last_mut() {
                last_record.end_time_s = time_s;
            }
        }

        let downstream_is_endnode = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == device_id)
            .all(|conn| matches!(self.canvas_state.devices.get(&conn.to_device_id), Some(crate::models::Device::EndNode(_))));

        if downstream_is_endnode {
            let end_node_id = self.canvas_state.connections
                .values()
                .find(|c| c.from_device_id == device_id)
                .map(|c| c.to_device_id.clone())
                .unwrap_or_default();

            if !end_node_id.is_empty() {
                self.state.completed_products += 1;
                if !product_code.is_empty() {
                    *self.state.completed_products_by_code.entry(product_code.to_string()).or_insert(0) += 1;
                }

                if self.state.simulation_mode == crate::models::SimulationMode::FixedOutput && !product_code.is_empty() {
                    *self.state.end_node_completed_by_product
                        .entry(end_node_id.clone())
                        .or_insert_with(HashMap::new)
                        .entry(product_code.to_string())
                        .or_insert(0) += 1;
                    self.check_and_stop_feeding_for_product(&end_node_id, product_code);
                }

                if !process_product_id.is_empty() {
                    let pp = self.state.process_products.get(process_product_id);
                    if let Some(pp) = pp {
                        self.state.end_node_arrival_records
                            .entry(end_node_id.clone())
                            .or_insert_with(Vec::new)
                            .push(crate::models::EndNodeArrivalRecord {
                                process_product_id: process_product_id.to_string(),
                                product_code: pp.product_code.clone(),
                                product_name: pp.product_name.clone(),
                                product_color: pp.product_color.clone(),
                                arrive_time_s: time_s,
                                node_visits: pp.node_visits.clone(),
                            });
                    }

                    if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                        let end_node_name = match self.canvas_state.devices.get(&end_node_id) {
                            Some(d) => d.name().to_string(),
                            None => end_node_id.clone(),
                        };
                        pp.node_visits.push(crate::models::NodeVisit {
                            node_id: end_node_id.clone(),
                            node_name: end_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: Some(time_s),
                        });
                        pp.status = crate::models::ProcessProductStatus::Completed;
                        pp.current_node_id = Some(end_node_id.clone());
                        pp.current_connection_id = None;
                    }
                }
            }

            if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
                sim_dev.wait_transport += 1;
                if sim_dev.wait_transport > sim_dev.max_wait_transport {
                    sim_dev.max_wait_transport = sim_dev.wait_transport;
                }
            }
        } else {
            if !process_product_id.is_empty() {
                if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                    pp.status = crate::models::ProcessProductStatus::WaitingForTransport;
                }
            }

            if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
                sim_dev.wait_transport += 1;
                if sim_dev.wait_transport > sim_dev.max_wait_transport {
                    sim_dev.max_wait_transport = sim_dev.wait_transport;
                }
            }

            if let Some(conn) = self.select_downstream_connection(device_id, product_code) {
                if self.can_start_transport(&conn.id) {
                    self.start_transport(&conn.id, device_id, &conn.to_device_id, time_s, product_code, Some(process_product_id));
                }
            }
        }

        self.try_start_processing(device_id, time_s, "");

        let upstream_storages: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                if from_device.is_warehouse() || from_device.is_temp_store() {
                    Some(c.from_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for storage_id in upstream_storages {
            self.try_release_from_storage(&storage_id, time_s);
        }

        let upstream_buffers: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                if from_device.is_buffer() {
                    Some(c.from_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for buffer_id in upstream_buffers {
            self.try_release_from_buffer(&buffer_id, time_s);
        }

        let downstream_buffers: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == device_id)
            .filter_map(|c| {
                let to_device = self.canvas_state.devices.get(&c.to_device_id)?;
                if to_device.is_buffer() {
                    Some(c.to_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for buffer_id in downstream_buffers {
            self.check_buffer_capacity(&buffer_id);
        }

        let sim_dev = self.state.devices.get(device_id);
        if let Some(sim_dev) = sim_dev {
            if !sim_dev.busy && sim_dev.wip == 0 {
                let upstream_start_nodes = self.find_upstream_start_nodes(device_id);

                for start_node_id in upstream_start_nodes {
                    if let Some(crate::models::Device::StartNode(sn)) = self.canvas_state.devices.get(&start_node_id) {
                        if sn.feed_mode == crate::models::FeedMode::Idle && sn.feed_status == "投料中" {
                            self.push_event(SimEvent::DownstreamIdle {
                                start_node_id,
                                downstream_device_id: device_id.to_string(),
                                time_s,
                            });
                        }
                    }
                }
            }
        }
    }

    fn handle_assembly_complete(&mut self, device_id: &str, time_s: f64, product_code: &str, process_product_id: &str) {
        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.busy = false;
            sim_dev.completed += 1;
            sim_dev.processing_product = None;
            sim_dev.assembly_product_code = None;
        }
        
        self.update_total_wip();
        
        if let Some(records) = self.state.processing_records.get_mut(device_id) {
            if let Some(last_record) = records.last_mut() {
                last_record.end_time_s = time_s;
            }
        }

        let downstream_is_endnode = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == device_id)
            .all(|conn| matches!(self.canvas_state.devices.get(&conn.to_device_id), Some(crate::models::Device::EndNode(_))));

        if downstream_is_endnode {
            let end_node_id = self.canvas_state.connections
                .values()
                .find(|c| c.from_device_id == device_id)
                .map(|c| c.to_device_id.clone())
                .unwrap_or_default();

            if !end_node_id.is_empty() {
                self.state.completed_products += 1;
                if !product_code.is_empty() {
                    *self.state.completed_products_by_code.entry(product_code.to_string()).or_insert(0) += 1;
                }

                if self.state.simulation_mode == crate::models::SimulationMode::FixedOutput && !product_code.is_empty() {
                    *self.state.end_node_completed_by_product
                        .entry(end_node_id.clone())
                        .or_insert_with(HashMap::new)
                        .entry(product_code.to_string())
                        .or_insert(0) += 1;
                    self.check_and_stop_feeding_for_product(&end_node_id, product_code);
                }

                if !process_product_id.is_empty() {
                    let pp = self.state.process_products.get(process_product_id);
                    if let Some(pp) = pp {
                        self.state.end_node_arrival_records
                            .entry(end_node_id.clone())
                            .or_insert_with(Vec::new)
                            .push(crate::models::EndNodeArrivalRecord {
                                process_product_id: process_product_id.to_string(),
                                product_code: pp.product_code.clone(),
                                product_name: pp.product_name.clone(),
                                product_color: pp.product_color.clone(),
                                arrive_time_s: time_s,
                                node_visits: pp.node_visits.clone(),
                            });
                    }

                    if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                        let end_node_name = match self.canvas_state.devices.get(&end_node_id) {
                            Some(d) => d.name().to_string(),
                            None => end_node_id.clone(),
                        };
                        pp.node_visits.push(crate::models::NodeVisit {
                            node_id: end_node_id.clone(),
                            node_name: end_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: Some(time_s),
                        });
                        pp.status = crate::models::ProcessProductStatus::Completed;
                        pp.current_node_id = Some(end_node_id.clone());
                        pp.current_connection_id = None;
                    }
                }
            }

            if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
                sim_dev.wait_transport += 1;
                if sim_dev.wait_transport > sim_dev.max_wait_transport {
                    sim_dev.max_wait_transport = sim_dev.wait_transport;
                }
            }
        } else {
            if !process_product_id.is_empty() {
                if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                    pp.status = crate::models::ProcessProductStatus::WaitingForTransport;
                }
            }

            if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
                sim_dev.wait_transport += 1;
                if sim_dev.wait_transport > sim_dev.max_wait_transport {
                    sim_dev.max_wait_transport = sim_dev.wait_transport;
                }
            }

            if let Some(conn) = self.select_downstream_connection(device_id, product_code) {
                if self.can_start_transport(&conn.id) {
                    self.start_transport(&conn.id, device_id, &conn.to_device_id, time_s, product_code, Some(process_product_id));
                }
            }
        }

        self.try_start_assembly(device_id, time_s);

        let upstream_storages: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                if from_device.is_warehouse() || from_device.is_temp_store() {
                    Some(c.from_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for storage_id in upstream_storages {
            self.try_release_from_storage(&storage_id, time_s);
        }

        let upstream_buffers: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                if from_device.is_buffer() {
                    Some(c.from_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for buffer_id in upstream_buffers {
            self.try_release_from_buffer(&buffer_id, time_s);
        }

        let downstream_buffers: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == device_id)
            .filter_map(|c| {
                let to_device = self.canvas_state.devices.get(&c.to_device_id)?;
                if to_device.is_buffer() {
                    Some(c.to_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for buffer_id in downstream_buffers {
            self.check_buffer_capacity(&buffer_id);
        }
    }

    fn handle_transport_complete(&mut self, connection_id: &str, from_id: &str, to_id: &str, time_s: f64, _product_code: &str, process_product_ids: &[String]) {
        let conn = self.canvas_state.connections.get(connection_id).cloned();
        let is_discrete = conn.as_ref().map_or(false, |c| c.transport_mode == crate::models::TransportMode::Discrete);
        
        if let Some(sim_conn) = self.state.connections.get_mut(connection_id) {
            let was_busy = sim_conn.inflight > 0;
            sim_conn.inflight = sim_conn.inflight.saturating_sub(1);
            sim_conn.pe_count += process_product_ids.len() as i32;
            
            if was_busy && sim_conn.inflight == 0 {
                if let Some(start_time) = sim_conn.busy_start_time {
                    sim_conn.total_busy_time_s += time_s - start_time;
                    sim_conn.busy_start_time = None;
                }
            }
        }
        
        if let Some(records) = self.state.transport_records.get_mut(connection_id) {
            if let Some(last_record) = records.last_mut() {
                last_record.end_time_s = time_s;
                if let Some(sim_conn) = self.state.connections.get_mut(connection_id) {
                    sim_conn.total_time_s += last_record.duration_s;
                }
            }
        }
        
        for process_product_id in process_product_ids {
            if !process_product_id.is_empty() {
                if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                    if let Some(last_conn_visit) = pp.connection_visits.last_mut() {
                        last_conn_visit.leave_time_s = Some(time_s);
                    }
                }
            }
        }

        let to_device = self.canvas_state.devices.get(to_id).cloned();
        
        for process_product_id in process_product_ids {
            if process_product_id.is_empty() {
                continue;
            }
            
            match to_device {
                Some(crate::models::Device::EndNode(_)) => {
                    self.state.completed_products += 1;
                    
                    let product_code = self.state.process_products.get(process_product_id)
                        .map(|pp| pp.product_code.clone())
                        .unwrap_or_default();
                    
                    if !product_code.is_empty() {
                        *self.state.completed_products_by_code.entry(product_code.clone()).or_insert(0) += 1;
                    }

                    if self.state.simulation_mode == crate::models::SimulationMode::FixedOutput && !product_code.is_empty() {
                        *self.state.end_node_completed_by_product
                            .entry(to_id.to_string())
                            .or_insert_with(HashMap::new)
                            .entry(product_code.clone())
                            .or_insert(0) += 1;

                        self.check_and_stop_feeding_for_product(to_id, &product_code);
                    }
                    
                    if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                        let to_node_name = match self.canvas_state.devices.get(to_id) {
                            Some(d) => d.name().to_string(),
                            None => to_id.to_string(),
                        };
                        
                        pp.node_visits.push(crate::models::NodeVisit {
                            node_id: to_id.to_string(),
                            node_name: to_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: Some(time_s),
                        });
                        
                        pp.status = crate::models::ProcessProductStatus::Completed;
                        pp.current_node_id = Some(to_id.to_string());
                        pp.current_connection_id = None;
                    }

                    {
                        let pp = self.state.process_products.get(process_product_id);
                        if let Some(pp) = pp {
                            self.state.end_node_arrival_records
                                .entry(to_id.to_string())
                                .or_insert_with(Vec::new)
                                .push(crate::models::EndNodeArrivalRecord {
                                    process_product_id: process_product_id.to_string(),
                                    product_code: pp.product_code.clone(),
                                    product_name: pp.product_name.clone(),
                                    product_color: pp.product_color.clone(),
                                    arrive_time_s: time_s,
                                    node_visits: pp.node_visits.clone(),
                                });
                        }
                    }
                }
                Some(crate::models::Device::Warehouse(_)) | Some(crate::models::Device::TempStore(_)) => {
                    let product_code = self.state.process_products.get(process_product_id)
                        .map(|pp| pp.product_code.clone())
                        .unwrap_or_default();
                    
                    if let Some(sim_storage) = self.state.storage.get_mut(to_id) {
                        sim_storage.waiting_entry_queue.push(WaitingEntryItem {
                            process_product_id: process_product_id.to_string(),
                            product_code: product_code.clone(),
                            arrival_time_s: time_s,
                        });
                        sim_storage.max_waiting_entry = sim_storage.max_waiting_entry.max(sim_storage.waiting_entry_queue.len() as i32);
                    }
                    
                    if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                        let to_node_name = match self.canvas_state.devices.get(to_id) {
                            Some(d) => d.name().to_string(),
                            None => to_id.to_string(),
                        };
                        
                        pp.node_visits.push(crate::models::NodeVisit {
                            node_id: to_id.to_string(),
                            node_name: to_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        });
                        
                        pp.status = crate::models::ProcessProductStatus::WaitingForStorage;
                        pp.current_node_id = Some(to_id.to_string());
                        pp.current_connection_id = None;
                    }

                    self.process_waiting_entry_queue(to_id, time_s);
                    self.try_signal_completion_from_storage(to_id, time_s, process_product_id);
                }
                Some(crate::models::Device::Buffer(_)) => {
                    let product_code = self.state.process_products.get(process_product_id)
                        .map(|pp| pp.product_code.clone())
                        .unwrap_or_default();
                    
                    if let Some(sim_storage) = self.state.storage.get_mut(to_id) {
                        sim_storage.waiting_entry_queue.push(WaitingEntryItem {
                            process_product_id: process_product_id.to_string(),
                            product_code: product_code.clone(),
                            arrival_time_s: time_s,
                        });
                        sim_storage.max_waiting_entry = sim_storage.max_waiting_entry.max(sim_storage.waiting_entry_queue.len() as i32);
                    }
                    
                    if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                        let to_node_name = match self.canvas_state.devices.get(to_id) {
                            Some(d) => d.name().to_string(),
                            None => to_id.to_string(),
                        };
                        
                        pp.node_visits.push(crate::models::NodeVisit {
                            node_id: to_id.to_string(),
                            node_name: to_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        });
                        
                        pp.status = crate::models::ProcessProductStatus::WaitingForStorage;
                        pp.current_node_id = Some(to_id.to_string());
                        pp.current_connection_id = None;
                    }

                    self.process_waiting_entry_queue(to_id, time_s);
                    self.try_signal_completion_from_storage(to_id, time_s, process_product_id);
                }
                Some(crate::models::Device::Station(ref station)) => {
                    if let Some(sim_dev) = self.state.devices.get_mut(to_id) {
                        let count = sim_dev.collected_from_upstream.entry(from_id.to_string()).or_insert(0);
                        *count += 1;
                        
                        match station.incoming_rule {
                            crate::models::IncomingRule::Immediate => {
                                sim_dev.wip += 1;
                                sim_dev.max_wip = sim_dev.max_wip.max(sim_dev.wip);
                            }
                            crate::models::IncomingRule::CollectAll => {
                                let upstream_count = self.canvas_state.connections
                                    .values()
                                    .filter(|c| c.to_device_id == to_id)
                                    .count();
                                
                                let collected_count = sim_dev.collected_from_upstream.len();
                                
                                if collected_count >= upstream_count {
                                    sim_dev.wip += 1;
                                    sim_dev.max_wip = sim_dev.max_wip.max(sim_dev.wip);
                                    sim_dev.collected_from_upstream.clear();
                                }
                            }
                        }
                    }
                    
                    self.update_total_wip();
                    
                    if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                        let to_node_name = match self.canvas_state.devices.get(to_id) {
                            Some(d) => d.name().to_string(),
                            None => to_id.to_string(),
                        };
                        
                        pp.node_visits.push(crate::models::NodeVisit {
                            node_id: to_id.to_string(),
                            node_name: to_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        });
                        
                        pp.status = crate::models::ProcessProductStatus::WaitingForProcessing;
                        pp.current_node_id = Some(to_id.to_string());
                        pp.current_connection_id = None;
                    }
                    self.try_start_processing(to_id, time_s, process_product_id);
                }
                Some(crate::models::Device::AssemblyStation(_)) => {
                    let product_code = self.state.process_products.get(process_product_id)
                        .map(|pp| pp.product_code.clone())
                        .unwrap_or_default();
                    
                    if let Some(sim_dev) = self.state.devices.get_mut(to_id) {
                        let wip_list = sim_dev.assembly_wip.entry(product_code.clone()).or_insert_with(Vec::new);
                        wip_list.push(process_product_id.to_string());
                        sim_dev.wip += 1;
                        sim_dev.max_wip = sim_dev.max_wip.max(sim_dev.wip);
                    }
                    
                    self.update_total_wip();
                    
                    if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                        let to_node_name = match self.canvas_state.devices.get(to_id) {
                            Some(d) => d.name().to_string(),
                            None => to_id.to_string(),
                        };
                        
                        pp.node_visits.push(crate::models::NodeVisit {
                            node_id: to_id.to_string(),
                            node_name: to_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        });
                        
                        pp.status = crate::models::ProcessProductStatus::WaitingForProcessing;
                        pp.current_node_id = Some(to_id.to_string());
                        pp.current_connection_id = None;
                    }
                    
                    self.try_start_assembly(to_id, time_s);
                }
                Some(crate::models::Device::DisassemblyStation(_)) => {
                    let product_code = self.state.process_products.get(process_product_id)
                        .map(|pp| pp.product_code.clone())
                        .unwrap_or_default();

                    if let Some(sim_dev) = self.state.devices.get_mut(to_id) {
                        let wip_list = sim_dev.disassembly_wip.entry(product_code.clone()).or_insert_with(Vec::new);
                        wip_list.push(process_product_id.to_string());
                        sim_dev.wip += 1;
                        sim_dev.max_wip = sim_dev.max_wip.max(sim_dev.wip);
                    }

                    self.update_total_wip();

                    if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
                        let to_node_name = match self.canvas_state.devices.get(to_id) {
                            Some(d) => d.name().to_string(),
                            None => to_id.to_string(),
                        };

                        pp.node_visits.push(crate::models::NodeVisit {
                            node_id: to_id.to_string(),
                            node_name: to_node_name,
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        });

                        pp.status = crate::models::ProcessProductStatus::WaitingForProcessing;
                        pp.current_node_id = Some(to_id.to_string());
                        pp.current_connection_id = None;
                    }

                    self.try_start_disassembly(to_id, time_s);
                }
                _ => {}
            }
        }

        if let Some(crate::models::Device::Warehouse(_)) | Some(crate::models::Device::TempStore(_)) = to_device {
            self.try_release_from_storage(to_id, time_s);
        }
        
        if let Some(crate::models::Device::Buffer(_)) = to_device {
            self.try_release_from_buffer(to_id, time_s);
            self.check_buffer_capacity(to_id);
        }

        let from_is_warehouse_or_tempstore = matches!(
            self.canvas_state.devices.get(from_id),
            Some(crate::models::Device::Warehouse(_)) | Some(crate::models::Device::TempStore(_))
        );
        let from_is_station_or_assembly = matches!(
            self.canvas_state.devices.get(from_id),
            Some(crate::models::Device::Station(_)) | Some(crate::models::Device::AssemblyStation(_)) | Some(crate::models::Device::DisassemblyStation(_))
        );

        if from_is_warehouse_or_tempstore {
            let has_pending = self.state.storage.get(from_id)
                .map(|s| s.pending_release)
                .unwrap_or(false);
            if has_pending {
                self.try_release_from_storage(from_id, time_s);
            }
        }

        if from_is_station_or_assembly {
            let wait_transport = self.state.devices.get(from_id)
                .map(|d| d.wait_transport)
                .unwrap_or(0);
            if wait_transport > 0 {
                self.try_start_transport_from_device(from_id, time_s);
            }
        }

        if is_discrete {
            let transport_time = self.calculate_transport_time(connection_id);
            self.push_event(SimEvent::CartReturn {
                connection_id: connection_id.to_string(),
                time_s: time_s + transport_time,
            });
        } else {
            self.try_start_pending_transport(connection_id, time_s);
        }

        let sim_dev = self.state.devices.get(to_id);
        if let Some(sim_dev) = sim_dev {
            if !sim_dev.busy && sim_dev.wip == 0 {
                let upstream_start_nodes = self.find_upstream_start_nodes(to_id);

                for start_node_id in upstream_start_nodes {
                    if let Some(crate::models::Device::StartNode(sn)) = self.canvas_state.devices.get(&start_node_id) {
                        if sn.feed_mode == crate::models::FeedMode::Idle && sn.feed_status == "投料中" {
                            self.push_event(SimEvent::DownstreamIdle {
                                start_node_id,
                                downstream_device_id: to_id.to_string(),
                                time_s,
                            });
                        }
                    }
                }
            }
        }
    }

    fn handle_cart_return(&mut self, connection_id: &str, time_s: f64) {
        if let Some(sim_conn) = self.state.connections.get_mut(connection_id) {
            sim_conn.idle_carts += 1;
        }

        let from_id = self.canvas_state.connections.get(connection_id)
            .map(|c| c.from_device_id.clone())
            .unwrap_or_default();

        if !from_id.is_empty() {
            let from_is_warehouse_or_tempstore = matches!(
                self.canvas_state.devices.get(&from_id),
                Some(crate::models::Device::Warehouse(_)) | Some(crate::models::Device::TempStore(_))
            );
            let from_is_station_or_assembly = matches!(
                self.canvas_state.devices.get(&from_id),
                Some(crate::models::Device::Station(_)) | Some(crate::models::Device::AssemblyStation(_)) | Some(crate::models::Device::DisassemblyStation(_))
            );

            if from_is_warehouse_or_tempstore {
                let has_pending = self.state.storage.get(&from_id)
                    .map(|s| s.pending_release)
                    .unwrap_or(false);
                if has_pending {
                    self.try_release_from_storage(&from_id, time_s);
                }
            }

            if from_is_station_or_assembly {
                let wait_transport = self.state.devices.get(&from_id)
                    .map(|d| d.wait_transport)
                    .unwrap_or(0);
                if wait_transport > 0 {
                    self.try_start_transport_from_device(&from_id, time_s);
                }
            }
        }

        self.try_start_pending_transport(connection_id, time_s);
    }

    fn select_downstream_connection(&mut self, from_device_id: &str, product_code: &str) -> Option<crate::models::Connection> {
        let from_device = self.canvas_state.devices.get(from_device_id);
        let (from_x, from_y) = from_device.map_or((0.0, 0.0), |d| d.center());

        let outgoing: Vec<_> = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == from_device_id)
            .collect();

        let mut candidates: Vec<(&crate::models::Connection, bool, f64, bool)> = Vec::new();

        for conn in &outgoing {
            let to_device = self.canvas_state.devices.get(&conn.to_device_id);
            if let Some(device) = to_device {
                let can_process = match device {
                    crate::models::Device::Station(s) => {
                        if !s.processable_products.is_empty() {
                            s.processable_products.contains(&product_code.to_string())
                        } else if !s.product_code.is_empty() {
                            s.product_code == product_code
                        } else {
                            true
                        }
                    }
                    crate::models::Device::AssemblyStation(a) => {
                        if !a.components.is_empty() {
                            a.components.contains(&product_code.to_string())
                        } else if !a.processable_products.is_empty() {
                            a.processable_products.contains(&product_code.to_string())
                        } else {
                            true
                        }
                    }
                    crate::models::Device::DisassemblyStation(d) => {
                        d.items_to_disassemble.contains(&product_code.to_string())
                    }
                    crate::models::Device::EndNode(_) => true,
                    crate::models::Device::Warehouse(w) => {
                        if !w.processable_products.is_empty() {
                            w.processable_products.contains(&product_code.to_string())
                        } else if !w.product_code.is_empty() {
                            w.product_code == product_code
                        } else {
                            true
                        }
                    }
                    crate::models::Device::TempStore(t) => {
                        if !t.processable_products.is_empty() {
                            t.processable_products.contains(&product_code.to_string())
                        } else if !t.product_code.is_empty() {
                            t.product_code == product_code
                        } else {
                            true
                        }
                    }
                    crate::models::Device::Buffer(b) => {
                        if !b.processable_products.is_empty() {
                            b.processable_products.contains(&product_code.to_string())
                        } else if !b.product_code.is_empty() {
                            b.product_code == product_code
                        } else {
                            true
                        }
                    }
                    crate::models::Device::StartNode(_) => false,
                    crate::models::Device::Workshop(_) => false,
                };

                if can_process {
                    let storage_full = match device {
                        crate::models::Device::Buffer(b) => {
                            let max_capacity = b.max_capacity.unwrap_or(0);
                            if max_capacity > 0 {
                                let current_stock = self.state.storage.get(&conn.to_device_id)
                                    .map(|s| s.stock)
                                    .unwrap_or(0);
                                let waiting_entry_count = self.state.storage.get(&conn.to_device_id)
                                    .map(|s| s.waiting_entry_queue.len() as i32)
                                    .unwrap_or(0);
                                current_stock + waiting_entry_count >= max_capacity
                            } else {
                                false
                            }
                        }
                        crate::models::Device::Warehouse(_) => {
                            false
                        }
                        _ => false,
                    };

                    if storage_full {
                        continue;
                    }

                    let is_idle = match device {
                        crate::models::Device::Station(_) => {
                            self.state.devices.get(&conn.to_device_id)
                                .map_or(true, |sd| !sd.busy && sd.wip == 0)
                        }
                        _ => true,
                    };

                    let is_storage = matches!(
                        device,
                        crate::models::Device::Warehouse(_) |
                        crate::models::Device::TempStore(_)
                    );

                    let (to_x, to_y) = device.center();
                    let distance = ((to_x - from_x).powi(2) + (to_y - from_y).powi(2)).sqrt();

                    candidates.push((*conn, is_idle, distance, is_storage));
                }
            }
        }

        if candidates.is_empty() {
            return None;
        }

        let has_non_storage = candidates.iter().any(|(_, _, _, is_storage)| !*is_storage);
        if has_non_storage {
            candidates.retain(|(_, _, _, is_storage)| !*is_storage);
        }

        let all_storage = candidates.iter().all(|(_, _, _, is_storage)| *is_storage);
        if all_storage && candidates.len() > 1 {
            return self.select_warehouse_by_priority(&candidates, from_device_id, product_code);
        }

        match self.state.resource_selection_rule {
            crate::models::ResourceSelectionRule::Basic => {
                let idle_candidates: Vec<_> = candidates.iter().filter(|(_, is_idle, _, _)| *is_idle).collect();
                
                if !idle_candidates.is_empty() {
                    let min_distance = idle_candidates.iter().map(|(_, _, d, _)| *d).fold(f64::INFINITY, f64::min);
                    let nearest: Vec<_> = idle_candidates.iter()
                        .filter(|(_, _, d, _)| (*d - min_distance).abs() < 0.001)
                        .collect();
                    
                    if nearest.len() == 1 {
                        Some(nearest[0].0.clone())
                    } else {
                        let idx = (self.rng.gen::<f64>() * nearest.len() as f64) as usize;
                        Some(nearest[idx].0.clone())
                    }
                } else {
                    let min_distance = candidates.iter().map(|(_, _, d, _)| *d).fold(f64::INFINITY, f64::min);
                    let nearest: Vec<_> = candidates.iter()
                        .filter(|(_, _, d, _)| (*d - min_distance).abs() < 0.001)
                        .collect();
                    
                    if nearest.len() == 1 {
                        Some(nearest[0].0.clone())
                    } else {
                        let idx = (self.rng.gen::<f64>() * nearest.len() as f64) as usize;
                        Some(nearest[idx].0.clone())
                    }
                }
            }
            crate::models::ResourceSelectionRule::MinWipDynamic => {
                if candidates.len() == 1 {
                    return Some(candidates[0].0.clone());
                }
                
                let mut route_wip_scores: Vec<(&crate::models::Connection, i32, f64)> = Vec::new();
                
                for (conn, _, distance, _) in &candidates {
                    let downstream_node_id = &conn.to_device_id;
                    
                    let remaining_routes: Vec<_> = self.state.product_routes
                        .iter()
                        .filter(|r| r.product_code == product_code)
                        .filter(|r| r.path.contains(downstream_node_id))
                        .collect();
                    
                    let min_wip = if remaining_routes.is_empty() {
                        0
                    } else {
                        let mut route_wips: Vec<i32> = Vec::new();
                        
                        for route in remaining_routes {
                            let downstream_idx = route.path.iter().position(|id| id == downstream_node_id);
                            let remaining_path: Vec<&String> = if let Some(idx) = downstream_idx {
                                route.path[idx..].iter().collect()
                            } else {
                                continue;
                            };
                            
                            let mut total_wip: i32 = 0;
                            
                            for node_id in &remaining_path {
                                if let Some(sim_dev) = self.state.devices.get(*node_id) {
                                    total_wip += sim_dev.wip;
                                    total_wip += sim_dev.wait_transport;
                                    if sim_dev.busy {
                                        total_wip += 1;
                                    }
                                }
                            }
                            
                            for i in 0..remaining_path.len().saturating_sub(1) {
                                let from_id = remaining_path[i];
                                let to_id = remaining_path[i + 1];
                                
                                for (conn_id, sim_conn) in &self.state.connections {
                                    if let Some(canvas_conn) = self.canvas_state.connections.get(conn_id) {
                                        if &canvas_conn.from_device_id == from_id && &canvas_conn.to_device_id == to_id {
                                            total_wip += sim_conn.inflight;
                                        }
                                    }
                                }
                            }
                            
                            route_wips.push(total_wip);
                        }
                        
                        route_wips.into_iter().min().unwrap_or(0)
                    };
                    
                    route_wip_scores.push((*conn, min_wip, *distance));
                }
                
                if route_wip_scores.is_empty() {
                    return None;
                }
                
                let min_wip = route_wip_scores.iter().map(|(_, wip, _)| *wip).min().unwrap_or(0);
                let min_wip_candidates: Vec<_> = route_wip_scores.iter()
                    .filter(|(_, wip, _)| *wip == min_wip)
                    .collect();
                
                if min_wip_candidates.len() == 1 {
                    Some(min_wip_candidates[0].0.clone())
                } else {
                    let min_distance = min_wip_candidates.iter().map(|(_, _, d)| *d).fold(f64::INFINITY, f64::min);
                    let nearest: Vec<_> = min_wip_candidates.iter()
                        .filter(|(_, _, d)| (*d - min_distance).abs() < 0.001)
                        .collect();
                    
                    if nearest.len() == 1 {
                        Some(nearest[0].0.clone())
                    } else {
                        let idx = (self.rng.gen::<f64>() * nearest.len() as f64) as usize;
                        Some(nearest[idx].0.clone())
                    }
                }
            }
            crate::models::ResourceSelectionRule::MinUtilrateDynamic => {
                if candidates.len() == 1 {
                    return Some(candidates[0].0.clone());
                }
                
                let mut route_util_scores: Vec<(&crate::models::Connection, f64, f64)> = Vec::new();
                let elapsed_s = self.state.elapsed_s.max(0.001);
                
                for (conn, _, distance, _) in &candidates {
                    let downstream_node_id = &conn.to_device_id;
                    
                    let remaining_routes: Vec<_> = self.state.product_routes
                        .iter()
                        .filter(|r| r.product_code == product_code)
                        .filter(|r| r.path.contains(downstream_node_id))
                        .collect();
                    
                    let max_util = if remaining_routes.is_empty() {
                        0.0
                    } else {
                        let mut route_max_utils: Vec<f64> = Vec::new();
                        
                        for route in remaining_routes {
                            let downstream_idx = route.path.iter().position(|id| id == downstream_node_id);
                            let remaining_path: Vec<&String> = if let Some(idx) = downstream_idx {
                                route.path[idx..].iter().collect()
                            } else {
                                continue;
                            };
                            
                            let mut max_util_in_route: f64 = 0.0;
                            
                            for node_id in &remaining_path {
                                if let Some(sim_dev) = self.state.devices.get(*node_id) {
                                    let util = sim_dev.total_proc_time_s / elapsed_s * 100.0;
                                    max_util_in_route = max_util_in_route.max(util);
                                }
                            }
                            
                            route_max_utils.push(max_util_in_route);
                        }
                        
                        route_max_utils.into_iter().fold(f64::INFINITY, f64::min)
                    };
                    
                    route_util_scores.push((*conn, max_util, *distance));
                }
                
                if route_util_scores.is_empty() {
                    return None;
                }
                
                let min_max_util = route_util_scores.iter().map(|(_, util, _)| *util).fold(f64::INFINITY, f64::min);
                let min_util_candidates: Vec<_> = route_util_scores.iter()
                    .filter(|(_, util, _)| (*util - min_max_util).abs() < 0.001)
                    .collect();
                
                if min_util_candidates.len() == 1 {
                    Some(min_util_candidates[0].0.clone())
                } else {
                    let min_distance = min_util_candidates.iter().map(|(_, _, d)| *d).fold(f64::INFINITY, f64::min);
                    let nearest: Vec<_> = min_util_candidates.iter()
                        .filter(|(_, _, d)| (*d - min_distance).abs() < 0.001)
                        .collect();
                    
                    if nearest.len() == 1 {
                        Some(nearest[0].0.clone())
                    } else {
                        let idx = (self.rng.gen::<f64>() * nearest.len() as f64) as usize;
                        Some(nearest[idx].0.clone())
                    }
                }
            }
        }
    }

    fn select_warehouse_by_priority(
        &self,
        candidates: &[(&crate::models::Connection, bool, f64, bool)],
        from_device_id: &str,
        product_code: &str,
    ) -> Option<crate::models::Connection> {
        let from_device = self.canvas_state.devices.get(from_device_id);
        let (from_x, from_y) = from_device.map_or((0.0, 0.0), |d| d.center());

        let warehouse_ids: Vec<String> = candidates.iter()
            .map(|(conn, _, _, _)| conn.to_device_id.clone())
            .collect();

        let mut remaining: Vec<String> = warehouse_ids.iter()
            .filter(|wh_id| {
                let remaining_capacity = self.get_warehouse_remaining_capacity(wh_id);
                remaining_capacity > 0
            })
            .cloned()
            .collect();

        if remaining.is_empty() {
            remaining = warehouse_ids.clone();
        }

        if remaining.len() == 1 {
            let wh_id = &remaining[0];
            return candidates.iter()
                .find(|(conn, _, _, _)| conn.to_device_id == *wh_id)
                .map(|(conn, _, _, _)| (*conn).clone());
        }

        for priority in &self.state.warehouse_selection_priorities {
            if remaining.len() <= 1 {
                break;
            }

            let scored = self.score_warehouses_by_priority(&remaining, from_x, from_y, product_code, priority);

            if let Some(best_score) = scored.values().copied().filter(|v| v.is_finite()).min_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal)) {
                let best: Vec<String> = scored.iter()
                    .filter(|(_, &v)| v.is_finite() && (v - best_score).abs() < 0.0001)
                    .map(|(id, _)| id.clone())
                    .collect();

                if best.len() == 1 {
                    let wh_id = &best[0];
                    return candidates.iter()
                        .find(|(conn, _, _, _)| conn.to_device_id == *wh_id)
                        .map(|(conn, _, _, _)| (*conn).clone());
                }

                remaining = best;
            }
        }

        remaining.sort();
        let wh_id = &remaining[0];
        candidates.iter()
            .find(|(conn, _, _, _)| conn.to_device_id == *wh_id)
            .map(|(conn, _, _, _)| (*conn).clone())
    }

    fn get_warehouse_remaining_capacity(&self, device_id: &str) -> i32 {
        let device = self.canvas_state.devices.get(device_id);
        let capacity = match device {
            Some(crate::models::Device::Warehouse(w)) => w.wh_capacity,
            Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
            _ => 0,
        };

        if capacity <= 0 {
            return i32::MAX;
        }

        let stock = self.state.storage.get(device_id)
            .map(|s| s.stock)
            .unwrap_or(0);
        let waiting = self.state.storage.get(device_id)
            .map(|s| s.waiting_entry_queue.len() as i32)
            .unwrap_or(0);

        (capacity - stock - waiting).max(0)
    }

    fn score_warehouses_by_priority(
        &self,
        warehouse_ids: &[String],
        from_x: f64,
        from_y: f64,
        product_code: &str,
        priority: &crate::models::WarehouseSelectionPriority,
    ) -> HashMap<String, f64> {
        let mut scores = HashMap::new();

        for wh_id in warehouse_ids {
            let device = match self.canvas_state.devices.get(wh_id) {
                Some(d) => d,
                None => {
                    scores.insert(wh_id.clone(), f64::NAN);
                    continue;
                }
            };

            let score = match priority {
                crate::models::WarehouseSelectionPriority::NearestDistance => {
                    let (to_x, to_y) = device.center();
                    let distance = ((to_x - from_x).powi(2) + (to_y - from_y).powi(2)).sqrt();
                    distance
                }
                crate::models::WarehouseSelectionPriority::FarthestDistance => {
                    let (to_x, to_y) = device.center();
                    let distance = ((to_x - from_x).powi(2) + (to_y - from_y).powi(2)).sqrt();
                    -distance
                }
                crate::models::WarehouseSelectionPriority::LowestUtilization => {
                    let capacity = match device {
                        crate::models::Device::Warehouse(w) => w.wh_capacity,
                        crate::models::Device::Buffer(b) => b.max_capacity.unwrap_or(0),
                        _ => 0,
                    };
                    if capacity <= 0 {
                        0.0
                    } else {
                        let stock = self.state.storage.get(wh_id)
                            .map(|s| s.stock)
                            .unwrap_or(0);
                        stock as f64 / capacity as f64
                    }
                }
                crate::models::WarehouseSelectionPriority::HighestUtilization => {
                    let capacity = match device {
                        crate::models::Device::Warehouse(w) => w.wh_capacity,
                        crate::models::Device::Buffer(b) => b.max_capacity.unwrap_or(0),
                        _ => 0,
                    };
                    if capacity <= 0 {
                        0.0
                    } else {
                        let stock = self.state.storage.get(wh_id)
                            .map(|s| s.stock)
                            .unwrap_or(0);
                        -(stock as f64 / capacity as f64)
                    }
                }
                crate::models::WarehouseSelectionPriority::ProductConcentrated => {
                    let same_product_count = self.state.storage.get(wh_id)
                        .map(|s| {
                            s.stored_process_product_ids.iter()
                                .filter(|pp_id| {
                                    self.state.process_products.get(*pp_id)
                                        .map(|pp| pp.product_code == product_code)
                                        .unwrap_or(false)
                                })
                                .count() as f64
                        })
                        .unwrap_or(0.0);
                    -same_product_count
                }
                crate::models::WarehouseSelectionPriority::ProductDispersed => {
                    let same_product_count = self.state.storage.get(wh_id)
                        .map(|s| {
                            s.stored_process_product_ids.iter()
                                .filter(|pp_id| {
                                    self.state.process_products.get(*pp_id)
                                        .map(|pp| pp.product_code == product_code)
                                        .unwrap_or(false)
                                })
                                .count() as f64
                        })
                        .unwrap_or(0.0);
                    same_product_count
                }
                crate::models::WarehouseSelectionPriority::LeastWaitingEntry => {
                    let waiting_count = self.state.storage.get(wh_id)
                        .map(|s| s.waiting_entry_queue.len() as f64)
                        .unwrap_or(0.0);
                    waiting_count
                }
            };

            scores.insert(wh_id.clone(), score);
        }

        scores
    }

    fn can_start_transport(&self, connection_id: &str) -> bool {
        let conn = match self.canvas_state.connections.get(connection_id) {
            Some(c) => c,
            None => return false,
        };

        match conn.transport_mode {
            crate::models::TransportMode::Continuous => {
                if conn.unlimited_transport {
                    true
                } else {
                    let sim_conn = self.state.connections.get(connection_id);
                    sim_conn.map_or(false, |sc| sc.inflight < conn.max_transport_count)
                }
            }
            crate::models::TransportMode::Discrete => {
                let sim_conn = self.state.connections.get(connection_id);
                sim_conn.map_or(false, |sc| sc.idle_carts > 0)
            }
        }
    }

    fn try_start_transport_from_device(&mut self, device_id: &str, time_s: f64) {
        let waiting_pps: Vec<(String, String)> = self.state.process_products.values()
            .filter(|pp| {
                pp.current_node_id.as_deref() == Some(device_id) &&
                pp.status == crate::models::ProcessProductStatus::WaitingForTransport
            })
            .map(|pp| (pp.id.clone(), pp.product_code.clone()))
            .collect();

        for (pp_id, product_code) in waiting_pps {
            if let Some(conn) = self.select_downstream_connection(device_id, &product_code) {
                if self.can_start_transport(&conn.id) {
                    if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
                        sim_dev.wait_transport = (sim_dev.wait_transport - 1).max(0);
                    }
                    self.start_transport(&conn.id, device_id, &conn.to_device_id, time_s, &product_code, Some(&pp_id));
                }
            }
        }
    }

    fn start_transport(&mut self, connection_id: &str, from_id: &str, to_id: &str, time_s: f64, product_code: &str, process_product_id: Option<&str>) {
        let conn = match self.canvas_state.connections.get(connection_id) {
            Some(c) => c.clone(),
            None => return,
        };
        
        let cart_capacity = if conn.transport_mode == crate::models::TransportMode::Discrete {
            conn.cart_capacity.max(1) as usize
        } else {
            1
        };
        
        let mut waiting_pps: Vec<_> = self.state.process_products.values()
            .filter(|pp| {
                pp.current_node_id.as_deref() == Some(from_id) && 
                pp.product_code == product_code &&
                pp.status == crate::models::ProcessProductStatus::WaitingForTransport
            })
            .collect();

        if let Some(id) = process_product_id {
            if !id.is_empty() && !waiting_pps.iter().any(|pp| pp.id == id) {
                if let Some(pp) = self.state.process_products.get(id) {
                    if pp.status == crate::models::ProcessProductStatus::WaitingForTransport {
                        waiting_pps.push(pp);
                    }
                }
            }
        }
        
        waiting_pps.sort_by(|a, b| {
            let a_time = a.node_visits.last().map(|v| v.arrive_time_s).unwrap_or(f64::MAX);
            let b_time = b.node_visits.last().map(|v| v.arrive_time_s).unwrap_or(f64::MAX);
            a_time.partial_cmp(&b_time).unwrap_or(std::cmp::Ordering::Equal)
        });

        let warehouse_remaining_capacity = if matches!(self.canvas_state.devices.get(to_id), Some(crate::models::Device::Warehouse(_))) {
            usize::MAX
        } else if matches!(self.canvas_state.devices.get(to_id), Some(crate::models::Device::Buffer(_))) {
            let capacity = match self.canvas_state.devices.get(to_id) {
                Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
                _ => 0,
            };
            let current_stock = self.state.storage.get(to_id)
                .map(|s| s.stock)
                .unwrap_or(0);
            let waiting_entry_count = self.state.storage.get(to_id)
                .map(|s| s.waiting_entry_queue.len() as i32)
                .unwrap_or(0);
            if capacity > 0 {
                (capacity - current_stock - waiting_entry_count).max(0) as usize
            } else {
                usize::MAX
            }
        } else {
            usize::MAX
        };

        let effective_capacity = cart_capacity.min(warehouse_remaining_capacity);
        
        let pp_ids: Vec<String> = waiting_pps.iter()
            .take(effective_capacity)
            .map(|pp| pp.id.clone())
            .collect();
        
        if pp_ids.is_empty() {
            return;
        }

        let can_start = match conn.transport_mode {
            crate::models::TransportMode::Continuous => {
                if conn.unlimited_transport {
                    true
                } else {
                    let sim_conn = self.state.connections.get(connection_id);
                    sim_conn.map_or(false, |sc| sc.inflight < conn.max_transport_count)
                }
            }
            crate::models::TransportMode::Discrete => {
                let sim_conn = self.state.connections.get(connection_id);
                sim_conn.map_or(false, |sc| sc.idle_carts > 0)
            }
        };

        if can_start && !pp_ids.is_empty() {
            let transport_time = self.calculate_transport_time(connection_id);
            
            let sequence_number = self.state.transport_records
                .get(connection_id)
                .map(|r| r.len() as i32 + 1)
                .unwrap_or(1);

            let transport_batch = if let Some(sim_conn) = self.state.connections.get_mut(connection_id) {
                let was_idle = sim_conn.inflight == 0;
                sim_conn.inflight += 1;
                if conn.transport_mode == crate::models::TransportMode::Discrete {
                    sim_conn.idle_carts -= 1;
                }
                sim_conn.batch_counter += 1;
                if was_idle {
                    sim_conn.busy_start_time = Some(time_s);
                }
                sim_conn.batch_counter
            } else {
                1
            };
            
            if let Some(sim_dev) = self.state.devices.get_mut(from_id) {
                let reduce_count = pp_ids.len() as i32;
                sim_dev.wait_transport = (sim_dev.wait_transport - reduce_count).max(0);
            }
            
            let conn_name = match self.canvas_state.connections.get(connection_id) {
                Some(c) => c.name.clone(),
                None => connection_id.to_string(),
            };
            
            for pp_id_str in &pp_ids {
                if let Some(pp) = self.state.process_products.get_mut(pp_id_str) {
                    if let Some(last_visit) = pp.node_visits.last_mut() {
                        last_visit.leave_time_s = Some(time_s);
                    }
                    
                    pp.connection_visits.push(crate::models::ConnectionVisit {
                        connection_id: connection_id.to_string(),
                        connection_name: conn_name.clone(),
                        arrive_time_s: time_s,
                        leave_time_s: None,
                    });
                    
                    pp.status = crate::models::ProcessProductStatus::InTransit;
                    pp.current_node_id = None;
                    pp.current_connection_id = Some(connection_id.to_string());
                }
            }

            if let Some(records) = self.state.processing_records.get_mut(from_id) {
                for pp_id_str in &pp_ids {
                    if let Some(record) = records.iter_mut().rev().find(|r| r.process_product_id == *pp_id_str && r.leave_time_s.is_none()) {
                        record.leave_time_s = Some(time_s);
                    }
                }
            }
            
            let record = TransportRecord {
                product_code: product_code.to_string(),
                process_product_ids: pp_ids.clone(),
                sequence_number,
                transport_batch,
                start_time_s: time_s,
                end_time_s: 0.0,
                duration_s: transport_time,
            };
            
            self.state.transport_records
                .entry(connection_id.to_string())
                .or_insert_with(Vec::new)
                .push(record);

            let arrival_time = time_s + transport_time;
            self.push_event(SimEvent::TransportComplete {
                connection_id: connection_id.to_string(),
                from_id: from_id.to_string(),
                to_id: to_id.to_string(),
                time_s: arrival_time,
                product_code: product_code.to_string(),
                process_product_ids: pp_ids,
            });
        } else if !pp_ids.is_empty() {
            for pp_id in &pp_ids {
                if let Some(pp) = self.state.process_products.get_mut(pp_id) {
                    pp.status = crate::models::ProcessProductStatus::InTransit;
                    pp.current_node_id = None;
                    pp.current_connection_id = Some(connection_id.to_string());
                }
            }
            if let Some(sim_conn) = self.state.connections.get_mut(connection_id) {
                for pp_id in &pp_ids {
                    sim_conn.pending_queue.push((from_id.to_string(), product_code.to_string(), time_s, pp_id.clone()));
                    sim_conn.queue += 1;
                }
            }
            if let Some(sim_dev) = self.state.devices.get_mut(from_id) {
                let add_count = pp_ids.len() as i32;
                sim_dev.wait_transport += add_count;
                if sim_dev.wait_transport > sim_dev.max_wait_transport {
                    sim_dev.max_wait_transport = sim_dev.wait_transport;
                }
            }
        }
    }

    fn try_start_pending_transport(&mut self, connection_id: &str, time_s: f64) {
        let conn = match self.canvas_state.connections.get(connection_id) {
            Some(c) => c.clone(),
            None => return,
        };
        
        let cart_capacity = if conn.transport_mode == crate::models::TransportMode::Discrete {
            conn.cart_capacity.max(1) as usize
        } else {
            1
        };
        
        let mut pending_items: Vec<(String, String, f64, String)> = Vec::new();
        
        if let Some(sim_conn) = self.state.connections.get_mut(connection_id) {
            while pending_items.len() < cart_capacity && !sim_conn.pending_queue.is_empty() {
                if !sim_conn.pending_queue.is_empty() {
                    let item = sim_conn.pending_queue.remove(0);
                    sim_conn.queue = sim_conn.queue.saturating_sub(1);
                    pending_items.push(item);
                }
            }
        }

        if pending_items.is_empty() {
            return;
        }

        let can_start = match conn.transport_mode {
            crate::models::TransportMode::Continuous => {
                if conn.unlimited_transport {
                    true
                } else {
                    let sim_conn = self.state.connections.get(connection_id);
                    sim_conn.map_or(false, |sc| sc.inflight < conn.max_transport_count)
                }
            }
            crate::models::TransportMode::Discrete => {
                let sim_conn = self.state.connections.get(connection_id);
                sim_conn.map_or(false, |sc| sc.idle_carts > 0)
            }
        };

        if !can_start {
            if let Some(sim_conn) = self.state.connections.get_mut(connection_id) {
                for item in pending_items {
                    sim_conn.pending_queue.insert(0, item);
                    sim_conn.queue += 1;
                }
            }
            return;
        }

        let pp_ids: Vec<String> = pending_items.iter()
            .filter(|(_, _, _, pp_id)| !pp_id.is_empty())
            .map(|(_, _, _, pp_id)| pp_id.clone())
            .collect();

        if pp_ids.is_empty() {
            return;
        }

        let from_id = pending_items[0].0.clone();
        let product_code = pending_items[0].1.clone();
        let to_id = conn.to_device_id.clone();

        let transport_time = self.calculate_transport_time(connection_id);
        
        let sequence_number = self.state.transport_records
            .get(connection_id)
            .map(|r| r.len() as i32 + 1)
            .unwrap_or(1);

        let transport_batch = if let Some(sim_conn) = self.state.connections.get_mut(connection_id) {
            let was_idle = sim_conn.inflight == 0;
            sim_conn.inflight += 1;
            if conn.transport_mode == crate::models::TransportMode::Discrete {
                sim_conn.idle_carts -= 1;
            }
            sim_conn.batch_counter += 1;
            if was_idle {
                sim_conn.busy_start_time = Some(time_s);
            }
            sim_conn.batch_counter
        } else {
            1
        };
        
        if let Some(sim_dev) = self.state.devices.get_mut(&from_id) {
            let reduce_count = pp_ids.len() as i32;
            sim_dev.wait_transport = (sim_dev.wait_transport - reduce_count).max(0);
        }
        
        let conn_name = conn.name.clone();
        
        for pp_id_str in &pp_ids {
            if let Some(pp) = self.state.process_products.get_mut(pp_id_str) {
                if let Some(last_visit) = pp.node_visits.last_mut() {
                    last_visit.leave_time_s = Some(time_s);
                }
                
                pp.connection_visits.push(crate::models::ConnectionVisit {
                    connection_id: connection_id.to_string(),
                    connection_name: conn_name.clone(),
                    arrive_time_s: time_s,
                    leave_time_s: None,
                });
                
                pp.status = crate::models::ProcessProductStatus::InTransit;
                pp.current_node_id = None;
                pp.current_connection_id = Some(connection_id.to_string());
            }
        }

        if let Some(records) = self.state.processing_records.get_mut(&from_id) {
            for pp_id_str in &pp_ids {
                if let Some(record) = records.iter_mut().rev().find(|r| r.process_product_id == *pp_id_str && r.leave_time_s.is_none()) {
                    record.leave_time_s = Some(time_s);
                }
            }
        }
        
        let record = TransportRecord {
            product_code: product_code.clone(),
            process_product_ids: pp_ids.clone(),
            sequence_number,
            transport_batch,
            start_time_s: time_s,
            end_time_s: 0.0,
            duration_s: transport_time,
        };
        
        self.state.transport_records
            .entry(connection_id.to_string())
            .or_insert_with(Vec::new)
            .push(record);

        let arrival_time = time_s + transport_time;
        self.push_event(SimEvent::TransportComplete {
            connection_id: connection_id.to_string(),
            from_id: from_id.clone(),
            to_id: to_id.clone(),
            time_s: arrival_time,
            product_code,
            process_product_ids: pp_ids,
        });
    }

    fn try_start_processing(&mut self, device_id: &str, time_s: f64, process_product_id: &str) {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d.clone(),
            None => return,
        };

        if sim_dev.busy || sim_dev.wip <= 0 {
            return;
        }

        let pp_id = if process_product_id.is_empty() {
            let waiting_pps: Vec<_> = self.state.process_products.values()
                .filter(|pp| pp.current_node_id.as_deref() == Some(device_id) && pp.status == crate::models::ProcessProductStatus::WaitingForProcessing)
                .collect();
            
            self.select_next_product(device_id, &waiting_pps)
        } else {
            process_product_id.to_string()
        };

        if pp_id.is_empty() {
            return;
        }

        let product_code = match self.state.process_products.get(&pp_id) {
            Some(pp) => pp.product_code.clone(),
            None => return,
        };

        if product_code.is_empty() {
            return;
        }

        let current_tools = self.get_product_tools(device_id, &product_code);
        let (tool_switch_time, needs_switch) = self.calculate_tool_switch_time(device_id, &product_code, &current_tools);
        
        let proc_time = self.calculate_process_time(device_id, &product_code);
        let total_time = if needs_switch { tool_switch_time + proc_time } else { proc_time };
        
        let start_wip = self.state.process_products.values()
            .filter(|pp| pp.current_node_id.as_deref() == Some(device_id) && pp.status == crate::models::ProcessProductStatus::WaitingForProcessing)
            .count() as i32;
        let start_wait_transport = sim_dev.wait_transport;
        let sequence_number = sim_dev.completed + 1;

        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.busy = true;
            sim_dev.wip -= 1;
            sim_dev.processing_product = Some(product_code.clone());
            sim_dev.total_proc_time_s += total_time;
        }
        
        self.update_total_wip();
        
        if let Some(pp) = self.state.process_products.get_mut(&pp_id) {
            pp.status = crate::models::ProcessProductStatus::Processing;
        }
        
        let materials_used = self.get_product_materials(device_id, &product_code);

        for (material_code, quantity) in &materials_used {
            *self.state.material_consumption.entry(material_code.clone()).or_insert(0.0) += quantity;
            
            let device_consumption = self.state.device_material_consumption
                .entry(device_id.to_string())
                .or_insert_with(HashMap::new);
            *device_consumption.entry(material_code.clone()).or_insert(0.0) += quantity;
        }
        
        let (arrive_time_s, leave_time_s) = self.state.process_products.get(&pp_id)
            .and_then(|pp| pp.node_visits.last())
            .map(|visit| (visit.arrive_time_s, visit.leave_time_s))
            .unwrap_or((time_s, None));
        
        let mut actual_start_time = time_s;
        
        if needs_switch {
            let switch_end_time = time_s + tool_switch_time;
            let switch_record = ProcessingRecord {
                product_code: product_code.clone(),
                process_product_id: pp_id.clone(),
                sequence_number,
                start_wip,
                start_wait_transport,
                materials_used: HashMap::new(),
                start_time_s: time_s,
                end_time_s: switch_end_time,
                duration_s: tool_switch_time,
                arrive_time_s,
                leave_time_s,
                task_type: "工具切换".to_string(),
                disassembly_product_ids: vec![],
            };
            
            self.state.processing_records
                .entry(device_id.to_string())
                .or_insert_with(Vec::new)
                .push(switch_record);
            
            actual_start_time = switch_end_time;
        }
        
        let record = ProcessingRecord {
            product_code: product_code.clone(),
            process_product_id: pp_id.clone(),
            sequence_number: if needs_switch { sequence_number + 1 } else { sequence_number },
            start_wip,
            start_wait_transport,
            materials_used,
            start_time_s: actual_start_time,
            end_time_s: 0.0,
            duration_s: proc_time,
            arrive_time_s,
            leave_time_s,
            task_type: "加工任务".to_string(),
            disassembly_product_ids: vec![],
        };
        
        self.state.processing_records
            .entry(device_id.to_string())
            .or_insert_with(Vec::new)
            .push(record);

        let complete_time = time_s + total_time;
        self.push_event(SimEvent::ProcessComplete {
            device_id: device_id.to_string(),
            time_s: complete_time,
            product_code: product_code.clone(),
            process_product_id: pp_id,
        });

        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.last_product_code = Some(product_code);
            sim_dev.last_tools = current_tools.clone();
        }

        let upstream_buffers: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                if from_device.is_buffer() {
                    Some(c.from_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for buffer_id in upstream_buffers {
            self.try_release_from_buffer(&buffer_id, time_s);
        }
    }

    fn select_next_product(&self, device_id: &str, waiting_pps: &[&crate::models::ProcessProduct]) -> String {
        if waiting_pps.is_empty() {
            return String::new();
        }

        if waiting_pps.len() == 1 {
            return waiting_pps[0].id.clone();
        }

        let sim_dev = self.state.devices.get(device_id);
        let has_last_product = sim_dev.map_or(false, |d| d.last_product_code.is_some());

        let strategy = self.state.product_selection_strategy;
        let consider_priority = self.state.consider_product_priority;

        if !has_last_product && strategy != crate::models::ProductSelectionStrategy::FirstComeFirstServed {
            return self.sort_by_arrival_time(waiting_pps).first()
                .map(|pp| pp.id.clone())
                .unwrap_or_default();
        }

        let candidates: Vec<&crate::models::ProcessProduct> = if consider_priority {
            self.filter_by_priority(waiting_pps)
        } else {
            waiting_pps.iter().copied().collect()
        };

        if candidates.is_empty() {
            return self.sort_by_arrival_time(waiting_pps).first()
                .map(|pp| pp.id.clone())
                .unwrap_or_default();
        }

        if candidates.len() == 1 {
            return candidates[0].id.clone();
        }

        match strategy {
            crate::models::ProductSelectionStrategy::FirstComeFirstServed => {
                self.sort_by_arrival_time(&candidates).first()
                    .map(|pp| pp.id.clone())
                    .unwrap_or_default()
            }
            crate::models::ProductSelectionStrategy::SameTypePriorityWithTool => {
                self.select_same_type_priority_with_tool(device_id, &candidates)
            }
            crate::models::ProductSelectionStrategy::SameToolPriority => {
                self.select_same_tool_priority(device_id, &candidates)
            }
        }
    }

    fn filter_by_priority<'a>(&self, pps: &[&'a crate::models::ProcessProduct]) -> Vec<&'a crate::models::ProcessProduct> {
        let mut min_priority: Option<i32> = None;
        for pp in pps {
            let product = self.canvas_state.products.get(&pp.product_code);
            let p = product.and_then(|p| p.priority);
            match (min_priority, p) {
                (None, None) => {}
                (None, Some(_)) => min_priority = p,
                (Some(_), None) => {}
                (Some(mp), Some(pv)) => {
                    if pv < mp {
                        min_priority = Some(pv);
                    }
                }
            }
        }

        let has_any_priority = pps.iter().any(|pp| {
            self.canvas_state.products.get(&pp.product_code)
                .and_then(|p| p.priority)
                .is_some()
        });

        if !has_any_priority {
            return pps.iter().copied().collect();
        }

        match min_priority {
            Some(mp) => pps.iter()
                .filter(|pp| {
                    self.canvas_state.products.get(&pp.product_code)
                        .and_then(|p| p.priority) == Some(mp)
                })
                .copied()
                .collect(),
            None => pps.iter()
                .filter(|pp| {
                    self.canvas_state.products.get(&pp.product_code)
                        .and_then(|p| p.priority)
                        .is_none()
                })
                .copied()
                .collect(),
        }
    }

    fn sort_by_arrival_time<'a>(&self, pps: &[&'a crate::models::ProcessProduct]) -> Vec<&'a crate::models::ProcessProduct> {
        let mut sorted: Vec<_> = pps.iter().copied().collect();
        sorted.sort_by(|a, b| {
            let a_time = a.node_visits.last().map(|v| v.arrive_time_s).unwrap_or(f64::MAX);
            let b_time = b.node_visits.last().map(|v| v.arrive_time_s).unwrap_or(f64::MAX);
            a_time.partial_cmp(&b_time).unwrap_or(std::cmp::Ordering::Equal)
        });
        sorted
    }

    fn sort_product_codes_by_arrival_time(&self, device_id: &str, product_codes: &[String]) -> String {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d,
            None => return product_codes.first().cloned().unwrap_or_default(),
        };

        let mut earliest: Option<(String, f64)> = None;

        for code in product_codes {
            let pp_ids: Vec<String> = {
                let assembly_wip = sim_dev.assembly_wip.get(code);
                let disassembly_wip = sim_dev.disassembly_wip.get(code);
                if let Some(ids) = assembly_wip {
                    ids.clone()
                } else if let Some(ids) = disassembly_wip {
                    ids.clone()
                } else {
                    continue;
                }
            };

            if let Some(first_pp_id) = pp_ids.first() {
                if let Some(pp) = self.state.process_products.get(first_pp_id) {
                    let arrive_time = pp.node_visits.last().map(|v| v.arrive_time_s).unwrap_or(f64::MAX);
                    if earliest.is_none() || arrive_time < earliest.as_ref().unwrap().1 {
                        earliest = Some((code.clone(), arrive_time));
                    }
                }
            }
        }

        earliest.map(|(code, _)| code).unwrap_or_else(|| product_codes.first().cloned().unwrap_or_default())
    }

    fn select_same_type_priority_with_tool(&self, device_id: &str, candidates: &[&crate::models::ProcessProduct]) -> String {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d,
            None => return self.sort_by_arrival_time(candidates).first().map(|pp| pp.id.clone()).unwrap_or_default(),
        };

        let last_product_code = match &sim_dev.last_product_code {
            Some(code) => code.clone(),
            None => return self.sort_by_arrival_time(candidates).first().map(|pp| pp.id.clone()).unwrap_or_default(),
        };

        let same_type: Vec<_> = candidates.iter()
            .filter(|pp| pp.product_code == last_product_code)
            .copied()
            .collect();

        if !same_type.is_empty() {
            return self.sort_by_arrival_time(&same_type).first().map(|pp| pp.id.clone()).unwrap_or_default();
        }

        let last_tool_keys: std::collections::HashSet<String> = sim_dev.last_tools.keys().cloned().collect();

        let mut exact_tool_match: Vec<_> = Vec::new();
        for pp in candidates {
            let tools = self.get_product_tools(device_id, &pp.product_code);
            let tool_keys: std::collections::HashSet<String> = tools.keys().cloned().collect();
            if tool_keys == last_tool_keys {
                exact_tool_match.push(*pp);
            }
        }

        if exact_tool_match.len() == 1 {
            return exact_tool_match[0].id.clone();
        } else if exact_tool_match.len() > 1 {
            let unique_codes: std::collections::HashSet<&str> = exact_tool_match.iter().map(|pp| pp.product_code.as_str()).collect();
            if unique_codes.len() == 1 {
                return self.sort_by_arrival_time(&exact_tool_match).first().map(|pp| pp.id.clone()).unwrap_or_default();
            }
            return self.sort_by_arrival_time(&exact_tool_match).first().map(|pp| pp.id.clone()).unwrap_or_default();
        }

        let mut best_count = 0usize;
        let mut best_pps: Vec<&crate::models::ProcessProduct> = Vec::new();

        for pp in candidates {
            let tools = self.get_product_tools(device_id, &pp.product_code);
            let tool_keys: std::collections::HashSet<&String> = tools.keys().collect();
            let common_count = tool_keys.intersection(&last_tool_keys.iter().collect()).count();

            if common_count > best_count {
                best_count = common_count;
                best_pps.clear();
                best_pps.push(*pp);
            } else if common_count == best_count && common_count > 0 {
                best_pps.push(*pp);
            }
        }

        if !best_pps.is_empty() {
            if best_pps.len() == 1 {
                return best_pps[0].id.clone();
            }
            let unique_codes: std::collections::HashSet<&str> = best_pps.iter().map(|pp| pp.product_code.as_str()).collect();
            if unique_codes.len() == 1 {
                return self.sort_by_arrival_time(&best_pps).first().map(|pp| pp.id.clone()).unwrap_or_default();
            }
            return self.sort_by_arrival_time(&best_pps).first().map(|pp| pp.id.clone()).unwrap_or_default();
        }

        self.sort_by_arrival_time(candidates).first().map(|pp| pp.id.clone()).unwrap_or_default()
    }

    fn select_same_tool_priority(&self, device_id: &str, candidates: &[&crate::models::ProcessProduct]) -> String {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d,
            None => return self.sort_by_arrival_time(candidates).first().map(|pp| pp.id.clone()).unwrap_or_default(),
        };

        let _last_product_code = match &sim_dev.last_product_code {
            Some(code) => code.clone(),
            None => return self.sort_by_arrival_time(candidates).first().map(|pp| pp.id.clone()).unwrap_or_default(),
        };

        let last_tool_keys: std::collections::HashSet<String> = sim_dev.last_tools.keys().cloned().collect();

        let mut exact_tool_match: Vec<_> = Vec::new();
        for pp in candidates {
            let tools = self.get_product_tools(device_id, &pp.product_code);
            let tool_keys: std::collections::HashSet<String> = tools.keys().cloned().collect();
            if tool_keys == last_tool_keys {
                exact_tool_match.push(*pp);
            }
        }

        if exact_tool_match.len() == 1 {
            return exact_tool_match[0].id.clone();
        } else if exact_tool_match.len() > 1 {
            let unique_codes: std::collections::HashSet<&str> = exact_tool_match.iter().map(|pp| pp.product_code.as_str()).collect();
            if unique_codes.len() == 1 {
                return self.sort_by_arrival_time(&exact_tool_match).first().map(|pp| pp.id.clone()).unwrap_or_default();
            }
            return self.sort_by_arrival_time(&exact_tool_match).first().map(|pp| pp.id.clone()).unwrap_or_default();
        }

        let mut best_count = 0usize;
        let mut best_pps: Vec<&crate::models::ProcessProduct> = Vec::new();

        for pp in candidates {
            let tools = self.get_product_tools(device_id, &pp.product_code);
            let tool_keys: std::collections::HashSet<&String> = tools.keys().collect();
            let common_count = tool_keys.intersection(&last_tool_keys.iter().collect()).count();

            if common_count > best_count {
                best_count = common_count;
                best_pps.clear();
                best_pps.push(*pp);
            } else if common_count == best_count && common_count > 0 {
                best_pps.push(*pp);
            }
        }

        if !best_pps.is_empty() {
            if best_pps.len() == 1 {
                return best_pps[0].id.clone();
            }
            let unique_codes: std::collections::HashSet<&str> = best_pps.iter().map(|pp| pp.product_code.as_str()).collect();
            if unique_codes.len() == 1 {
                return self.sort_by_arrival_time(&best_pps).first().map(|pp| pp.id.clone()).unwrap_or_default();
            }
            return self.sort_by_arrival_time(&best_pps).first().map(|pp| pp.id.clone()).unwrap_or_default();
        }

        self.sort_by_arrival_time(candidates).first().map(|pp| pp.id.clone()).unwrap_or_default()
    }

    fn select_assembly_product(&self, device_id: &str, eligible_products: &[String]) -> String {
        if eligible_products.is_empty() {
            return String::new();
        }
        if eligible_products.len() == 1 {
            return eligible_products[0].clone();
        }

        let strategy = self.state.product_selection_strategy;
        let consider_priority = self.state.consider_product_priority;

        let sim_dev = self.state.devices.get(device_id);
        let has_last_product = sim_dev.map_or(false, |d| d.last_product_code.is_some());

        if !has_last_product && strategy != crate::models::ProductSelectionStrategy::FirstComeFirstServed {
            return self.sort_product_codes_by_arrival_time(device_id, eligible_products);
        }

        let candidates: Vec<String> = if consider_priority {
            self.filter_products_by_priority(eligible_products)
        } else {
            eligible_products.to_vec()
        };

        if candidates.is_empty() {
            return self.sort_product_codes_by_arrival_time(device_id, eligible_products);
        }

        if candidates.len() == 1 {
            return candidates[0].clone();
        }

        match strategy {
            crate::models::ProductSelectionStrategy::FirstComeFirstServed => {
                self.sort_product_codes_by_arrival_time(device_id, &candidates)
            }
            crate::models::ProductSelectionStrategy::SameTypePriorityWithTool => {
                self.select_assembly_same_type_priority_with_tool(device_id, &candidates)
            }
            crate::models::ProductSelectionStrategy::SameToolPriority => {
                self.select_assembly_same_tool_priority(device_id, &candidates)
            }
        }
    }

    fn filter_products_by_priority(&self, product_codes: &[String]) -> Vec<String> {
        let mut min_priority: Option<i32> = None;
        for code in product_codes {
            let p = self.canvas_state.products.get(code).and_then(|p| p.priority);
            match (min_priority, p) {
                (None, None) => {}
                (None, Some(_)) => min_priority = p,
                (Some(_), None) => {}
                (Some(mp), Some(pv)) => {
                    if pv < mp {
                        min_priority = Some(pv);
                    }
                }
            }
        }

        let has_any_priority = product_codes.iter().any(|code| {
            self.canvas_state.products.get(code).and_then(|p| p.priority).is_some()
        });

        if !has_any_priority {
            return product_codes.to_vec();
        }

        match min_priority {
            Some(mp) => product_codes.iter()
                .filter(|code| {
                    self.canvas_state.products.get(*code).and_then(|p| p.priority) == Some(mp)
                })
                .cloned()
                .collect(),
            None => product_codes.iter()
                .filter(|code| {
                    self.canvas_state.products.get(*code).and_then(|p| p.priority).is_none()
                })
                .cloned()
                .collect(),
        }
    }

    fn select_assembly_same_type_priority_with_tool(&self, device_id: &str, candidates: &[String]) -> String {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d,
            None => return candidates[0].clone(),
        };

        let last_product_code = match &sim_dev.last_product_code {
            Some(code) => code.clone(),
            None => return candidates[0].clone(),
        };

        let same_type: Vec<_> = candidates.iter().filter(|c| **c == last_product_code).cloned().collect();
        if !same_type.is_empty() {
            return same_type[0].clone();
        }

        let last_tool_keys: std::collections::HashSet<String> = sim_dev.last_tools.keys().cloned().collect();

        let exact_tool_match: Vec<_> = candidates.iter()
            .filter(|c| {
                let tools = self.get_product_tools(device_id, c);
                let tool_keys: std::collections::HashSet<String> = tools.keys().cloned().collect();
                tool_keys == last_tool_keys
            })
            .cloned()
            .collect();

        if !exact_tool_match.is_empty() {
            if exact_tool_match.len() == 1 {
                return exact_tool_match[0].clone();
            }
            let unique_codes: std::collections::HashSet<&str> = exact_tool_match.iter().map(|s| s.as_str()).collect();
            if unique_codes.len() == 1 {
                return exact_tool_match[0].clone();
            }
            return exact_tool_match[0].clone();
        }

        let mut best_count = 0usize;
        let mut best_codes: Vec<String> = Vec::new();

        for code in candidates {
            let tools = self.get_product_tools(device_id, code);
            let tool_keys: std::collections::HashSet<&String> = tools.keys().collect();
            let common_count = tool_keys.intersection(&last_tool_keys.iter().collect()).count();

            if common_count > best_count {
                best_count = common_count;
                best_codes.clear();
                best_codes.push(code.clone());
            } else if common_count == best_count && common_count > 0 {
                best_codes.push(code.clone());
            }
        }

        if !best_codes.is_empty() {
            if best_codes.len() == 1 {
                return best_codes[0].clone();
            }
            let unique_codes: std::collections::HashSet<&str> = best_codes.iter().map(|s| s.as_str()).collect();
            if unique_codes.len() == 1 {
                return best_codes[0].clone();
            }
            return best_codes[0].clone();
        }

        candidates[0].clone()
    }

    fn select_assembly_same_tool_priority(&self, device_id: &str, candidates: &[String]) -> String {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d,
            None => return candidates[0].clone(),
        };

        let _last_product_code = match &sim_dev.last_product_code {
            Some(code) => code.clone(),
            None => return candidates[0].clone(),
        };

        let last_tool_keys: std::collections::HashSet<String> = sim_dev.last_tools.keys().cloned().collect();

        let exact_tool_match: Vec<_> = candidates.iter()
            .filter(|c| {
                let tools = self.get_product_tools(device_id, c);
                let tool_keys: std::collections::HashSet<String> = tools.keys().cloned().collect();
                tool_keys == last_tool_keys
            })
            .cloned()
            .collect();

        if !exact_tool_match.is_empty() {
            if exact_tool_match.len() == 1 {
                return exact_tool_match[0].clone();
            }
            let unique_codes: std::collections::HashSet<&str> = exact_tool_match.iter().map(|s| s.as_str()).collect();
            if unique_codes.len() == 1 {
                return exact_tool_match[0].clone();
            }
            return exact_tool_match[0].clone();
        }

        let mut best_count = 0usize;
        let mut best_codes: Vec<String> = Vec::new();

        for code in candidates {
            let tools = self.get_product_tools(device_id, code);
            let tool_keys: std::collections::HashSet<&String> = tools.keys().collect();
            let common_count = tool_keys.intersection(&last_tool_keys.iter().collect()).count();

            if common_count > best_count {
                best_count = common_count;
                best_codes.clear();
                best_codes.push(code.clone());
            } else if common_count == best_count && common_count > 0 {
                best_codes.push(code.clone());
            }
        }

        if !best_codes.is_empty() {
            if best_codes.len() == 1 {
                return best_codes[0].clone();
            }
            let unique_codes: std::collections::HashSet<&str> = best_codes.iter().map(|s| s.as_str()).collect();
            if unique_codes.len() == 1 {
                return best_codes[0].clone();
            }
            return best_codes[0].clone();
        }

        candidates[0].clone()
    }

    fn select_disassembly_item(&self, device_id: &str, eligible_items: &[String]) -> String {
        if eligible_items.is_empty() {
            return String::new();
        }
        if eligible_items.len() == 1 {
            return eligible_items[0].clone();
        }

        let strategy = self.state.product_selection_strategy;
        let consider_priority = self.state.consider_product_priority;

        let sim_dev = self.state.devices.get(device_id);
        let has_last_product = sim_dev.map_or(false, |d| d.last_product_code.is_some());

        if !has_last_product && strategy != crate::models::ProductSelectionStrategy::FirstComeFirstServed {
            return self.sort_product_codes_by_arrival_time(device_id, eligible_items);
        }

        let candidates: Vec<String> = if consider_priority {
            self.filter_products_by_priority(eligible_items)
        } else {
            eligible_items.to_vec()
        };

        if candidates.is_empty() {
            return self.sort_product_codes_by_arrival_time(device_id, eligible_items);
        }

        if candidates.len() == 1 {
            return candidates[0].clone();
        }

        match strategy {
            crate::models::ProductSelectionStrategy::FirstComeFirstServed => {
                self.sort_product_codes_by_arrival_time(device_id, &candidates)
            }
            crate::models::ProductSelectionStrategy::SameTypePriorityWithTool => {
                self.select_disassembly_same_type_priority_with_tool(device_id, &candidates)
            }
            crate::models::ProductSelectionStrategy::SameToolPriority => {
                self.select_disassembly_same_tool_priority(device_id, &candidates)
            }
        }
    }

    fn select_disassembly_same_type_priority_with_tool(&self, device_id: &str, candidates: &[String]) -> String {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d,
            None => return candidates[0].clone(),
        };

        let last_product_code = match &sim_dev.last_product_code {
            Some(code) => code.clone(),
            None => return candidates[0].clone(),
        };

        let same_type: Vec<_> = candidates.iter().filter(|c| **c == last_product_code).cloned().collect();
        if !same_type.is_empty() {
            return same_type[0].clone();
        }

        let last_tool_keys: std::collections::HashSet<String> = sim_dev.last_tools.keys().cloned().collect();

        let exact_tool_match: Vec<_> = candidates.iter()
            .filter(|c| {
                let tools = self.get_product_tools(device_id, c);
                let tool_keys: std::collections::HashSet<String> = tools.keys().cloned().collect();
                tool_keys == last_tool_keys
            })
            .cloned()
            .collect();

        if !exact_tool_match.is_empty() {
            if exact_tool_match.len() == 1 {
                return exact_tool_match[0].clone();
            }
            let unique_codes: std::collections::HashSet<&str> = exact_tool_match.iter().map(|s| s.as_str()).collect();
            if unique_codes.len() == 1 {
                return exact_tool_match[0].clone();
            }
            return exact_tool_match[0].clone();
        }

        let mut best_count = 0usize;
        let mut best_codes: Vec<String> = Vec::new();

        for code in candidates {
            let tools = self.get_product_tools(device_id, code);
            let tool_keys: std::collections::HashSet<&String> = tools.keys().collect();
            let common_count = tool_keys.intersection(&last_tool_keys.iter().collect()).count();

            if common_count > best_count {
                best_count = common_count;
                best_codes.clear();
                best_codes.push(code.clone());
            } else if common_count == best_count && common_count > 0 {
                best_codes.push(code.clone());
            }
        }

        if !best_codes.is_empty() {
            if best_codes.len() == 1 {
                return best_codes[0].clone();
            }
            let unique_codes: std::collections::HashSet<&str> = best_codes.iter().map(|s| s.as_str()).collect();
            if unique_codes.len() == 1 {
                return best_codes[0].clone();
            }
            return best_codes[0].clone();
        }

        candidates[0].clone()
    }

    fn select_disassembly_same_tool_priority(&self, device_id: &str, candidates: &[String]) -> String {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d,
            None => return candidates[0].clone(),
        };

        let _last_product_code = match &sim_dev.last_product_code {
            Some(code) => code.clone(),
            None => return candidates[0].clone(),
        };

        let last_tool_keys: std::collections::HashSet<String> = sim_dev.last_tools.keys().cloned().collect();

        let exact_tool_match: Vec<_> = candidates.iter()
            .filter(|c| {
                let tools = self.get_product_tools(device_id, c);
                let tool_keys: std::collections::HashSet<String> = tools.keys().cloned().collect();
                tool_keys == last_tool_keys
            })
            .cloned()
            .collect();

        if !exact_tool_match.is_empty() {
            if exact_tool_match.len() == 1 {
                return exact_tool_match[0].clone();
            }
            let unique_codes: std::collections::HashSet<&str> = exact_tool_match.iter().map(|s| s.as_str()).collect();
            if unique_codes.len() == 1 {
                return exact_tool_match[0].clone();
            }
            return exact_tool_match[0].clone();
        }

        let mut best_count = 0usize;
        let mut best_codes: Vec<String> = Vec::new();

        for code in candidates {
            let tools = self.get_product_tools(device_id, code);
            let tool_keys: std::collections::HashSet<&String> = tools.keys().collect();
            let common_count = tool_keys.intersection(&last_tool_keys.iter().collect()).count();

            if common_count > best_count {
                best_count = common_count;
                best_codes.clear();
                best_codes.push(code.clone());
            } else if common_count == best_count && common_count > 0 {
                best_codes.push(code.clone());
            }
        }

        if !best_codes.is_empty() {
            if best_codes.len() == 1 {
                return best_codes[0].clone();
            }
            let unique_codes: std::collections::HashSet<&str> = best_codes.iter().map(|s| s.as_str()).collect();
            if unique_codes.len() == 1 {
                return best_codes[0].clone();
            }
            return best_codes[0].clone();
        }

        candidates[0].clone()
    }

    fn get_product_tools(&self, device_id: &str, product_code: &str) -> HashMap<String, f64> {
        let device = match self.canvas_state.devices.get(device_id) {
            Some(d) => d,
            None => return HashMap::new(),
        };

        match device {
            crate::models::Device::Station(s) => {
                s.product_tools.get(product_code).cloned().unwrap_or_default()
            }
            crate::models::Device::AssemblyStation(a) => {
                a.product_tools.get(product_code).cloned().unwrap_or_default()
            }
            crate::models::Device::DisassemblyStation(d) => {
                d.product_tools.get(product_code).cloned().unwrap_or_default()
            }
            _ => HashMap::new(),
        }
    }

    fn calculate_tool_switch_time(&self, device_id: &str, product_code: &str, current_tools: &HashMap<String, f64>) -> (f64, bool) {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d,
            None => return (0.0, false),
        };

        match &sim_dev.last_product_code {
            None => {
                let total_time: f64 = current_tools.values().sum();
                if total_time > 0.0 {
                    (total_time, true)
                } else {
                    (0.0, false)
                }
            }
            Some(last_code) if last_code == product_code => {
                (0.0, false)
            }
            Some(_) => {
                let last_tools = &sim_dev.last_tools;
                let mut switch_time = 0.0;
                
                for (tool_code, install_time) in last_tools {
                    if !current_tools.contains_key(tool_code) {
                        switch_time += install_time;
                    }
                }
                
                for (tool_code, install_time) in current_tools {
                    if !last_tools.contains_key(tool_code) {
                        switch_time += install_time;
                    }
                }
                
                if switch_time > 0.0 {
                    (switch_time, true)
                } else {
                    (0.0, false)
                }
            }
        }
    }

    fn get_product_materials(&self, device_id: &str, product_code: &str) -> HashMap<String, f64> {
        let device = match self.canvas_state.devices.get(device_id) {
            Some(d) => d,
            None => return HashMap::new(),
        };

        match device {
            crate::models::Device::Station(s) => {
                s.product_materials.get(product_code).cloned().unwrap_or_default()
            }
            _ => HashMap::new(),
        }
    }

    fn calculate_process_time(&mut self, device_id: &str, product_code: &str) -> f64 {
        let device = match self.canvas_state.devices.get(device_id) {
            Some(d) => d.clone(),
            None => return 1.0,
        };

        match device {
            crate::models::Device::Station(s) => {
                if let Some(product_time) = s.product_process_times.get(product_code) {
                    self.calculate_time_from_config(product_time)
                } else {
                    self.calculate_time_from_station(&s)
                }
            }
            crate::models::Device::AssemblyStation(a) => {
                if let Some(product_time) = a.product_process_times.get(product_code) {
                    self.calculate_time_from_config(product_time)
                } else {
                    self.calculate_time_from_assembly(&a)
                }
            }
            crate::models::Device::DisassemblyStation(d) => {
                if let Some(product_time) = d.product_process_times.get(product_code) {
                    self.calculate_time_from_config(product_time)
                } else {
                    self.calculate_time_from_disassembly(&d)
                }
            }
            _ => 0.0,
        }
    }

    fn calculate_time_from_config(&mut self, config: &crate::models::ProductProcessTime) -> f64 {
        match config.dist_type {
            crate::models::DistributionType::Normal => {
                let mean = config.avg_time_s.unwrap_or(1.0);
                let std = config.stddev_s.unwrap_or(0.0);
                if std > 0.0 {
                    let mut value;
                    for _ in 0..25 {
                        value = self.rng.gen::<f64>() * std * 2.0 - std + mean;
                        if value > 0.0 {
                            return value;
                        }
                    }
                }
                mean.max(0.001)
            }
            crate::models::DistributionType::Triangular => {
                let min = config.min_time_s.unwrap_or(0.5);
                let max = config.max_time_s.unwrap_or(2.0);
                let mode = config.mode_time_s.unwrap_or(1.0);
                self.triangular_random(min, max, mode)
            }
            crate::models::DistributionType::Uniform => {
                let min = config.uniform_min_s.unwrap_or(0.5);
                let max = config.uniform_max_s.unwrap_or(2.0);
                self.rng.gen_range(min..=max)
            }
            crate::models::DistributionType::Exponential => {
                let mean = config.exp_mean_s.unwrap_or(1.0);
                let lambda = 1.0 / mean;
                (-self.rng.gen::<f64>().ln() / lambda).max(0.001)
            }
        }
    }

    fn calculate_time_from_station(&mut self, s: &crate::models::Station) -> f64 {
        match s.dist_type {
            crate::models::DistributionType::Normal => {
                let mean = s.avg_time_s.unwrap_or(1.0);
                let std = s.stddev_s.unwrap_or(0.0);
                if std > 0.0 {
                    let mut value;
                    for _ in 0..25 {
                        value = self.rng.gen::<f64>() * std * 2.0 - std + mean;
                        if value > 0.0 {
                            return value;
                        }
                    }
                }
                mean.max(0.001)
            }
            crate::models::DistributionType::Triangular => {
                let min = s.min_time_s.unwrap_or(0.5);
                let max = s.max_time_s.unwrap_or(2.0);
                let mode = s.mode_time_s.unwrap_or(1.0);
                self.triangular_random(min, max, mode)
            }
            crate::models::DistributionType::Uniform => {
                let min = s.uniform_min_s.unwrap_or(0.5);
                let max = s.uniform_max_s.unwrap_or(2.0);
                self.rng.gen_range(min..=max)
            }
            crate::models::DistributionType::Exponential => {
                let mean = s.exp_mean_s.unwrap_or(1.0);
                let lambda = 1.0 / mean;
                (-self.rng.gen::<f64>().ln() / lambda).max(0.001)
            }
        }
    }

    fn calculate_time_from_assembly(&mut self, a: &crate::models::AssemblyStation) -> f64 {
        match a.dist_type {
            crate::models::DistributionType::Normal => {
                let mean = a.avg_time_s.unwrap_or(1.0);
                let std = a.stddev_s.unwrap_or(0.0);
                if std > 0.0 {
                    let mut value;
                    for _ in 0..25 {
                        value = self.rng.gen::<f64>() * std * 2.0 - std + mean;
                        if value > 0.0 {
                            return value;
                        }
                    }
                }
                mean.max(0.001)
            }
            crate::models::DistributionType::Triangular => {
                let min = a.min_time_s.unwrap_or(0.5);
                let max = a.max_time_s.unwrap_or(2.0);
                let mode = a.mode_time_s.unwrap_or(1.0);
                self.triangular_random(min, max, mode)
            }
            crate::models::DistributionType::Uniform => {
                let min = a.uniform_min_s.unwrap_or(0.5);
                let max = a.uniform_max_s.unwrap_or(2.0);
                self.rng.gen_range(min..=max)
            }
            crate::models::DistributionType::Exponential => {
                let mean = a.exp_mean_s.unwrap_or(1.0);
                let lambda = 1.0 / mean;
                (-self.rng.gen::<f64>().ln() / lambda).max(0.001)
            }
        }
    }

    fn calculate_time_from_disassembly(&mut self, d: &crate::models::DisassemblyStation) -> f64 {
        match d.dist_type {
            crate::models::DistributionType::Normal => {
                let mean = d.avg_time_s.unwrap_or(1.0);
                let std = d.stddev_s.unwrap_or(0.0);
                if std > 0.0 {
                    let mut value;
                    for _ in 0..25 {
                        value = self.rng.gen::<f64>() * std * 2.0 - std + mean;
                        if value > 0.0 {
                            return value;
                        }
                    }
                }
                mean.max(0.001)
            }
            crate::models::DistributionType::Triangular => {
                let min = d.min_time_s.unwrap_or(0.5);
                let max = d.max_time_s.unwrap_or(2.0);
                let mode = d.mode_time_s.unwrap_or(1.0);
                self.triangular_random(min, max, mode)
            }
            crate::models::DistributionType::Uniform => {
                let min = d.uniform_min_s.unwrap_or(0.5);
                let max = d.uniform_max_s.unwrap_or(2.0);
                self.rng.gen_range(min..=max)
            }
            crate::models::DistributionType::Exponential => {
                let mean = d.exp_mean_s.unwrap_or(1.0);
                let lambda = 1.0 / mean;
                (-self.rng.gen::<f64>().ln() / lambda).max(0.001)
            }
        }
    }

    fn try_start_assembly(&mut self, device_id: &str, time_s: f64) {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d.clone(),
            None => return,
        };

        if sim_dev.busy {
            return;
        }

        let assembly_station = match self.canvas_state.devices.get(device_id) {
            Some(crate::models::Device::AssemblyStation(a)) => a.clone(),
            _ => return,
        };

        let assembly_products = assembly_station.assembly_products.clone();
        if assembly_products.is_empty() {
            return;
        }

        let eligible_products: Vec<String> = assembly_products.iter()
            .filter(|product_code| {
                if self.state.simulation_mode == crate::models::SimulationMode::FixedOutput
                    && self.state.stopped_feeding_products.contains(*product_code) {
                    return false;
                }
                let component_requirements = assembly_station.product_upstream_requirements.get(*product_code);
                if component_requirements.is_none() || component_requirements.unwrap().is_empty() {
                    return false;
                }
                let requirements = component_requirements.unwrap();
                for (component_code, required_qty) in requirements {
                    let required_qty = *required_qty as usize;
                    if required_qty == 0 {
                        continue;
                    }
                    let available = sim_dev.assembly_wip.get(component_code);
                    if available.is_none() || available.unwrap().len() < required_qty {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        if eligible_products.is_empty() {
            return;
        }

        let selected_product_code = self.select_assembly_product(device_id, &eligible_products);

        let mut selected_component_pp_ids: HashMap<String, Vec<String>> = HashMap::new();
        let requirements = assembly_station.product_upstream_requirements.get(&selected_product_code).unwrap();
        for (component_code, required_qty) in requirements {
            let required_qty = *required_qty as usize;
            if required_qty == 0 {
                continue;
            }
            if let Some(pp_ids) = sim_dev.assembly_wip.get(component_code) {
                if pp_ids.len() >= required_qty {
                    selected_component_pp_ids.insert(component_code.clone(), pp_ids[..required_qty].to_vec());
                }
            }
        }

        let product_code = selected_product_code;

        let current_tools = self.get_product_tools(device_id, &product_code);
        let (tool_switch_time, needs_switch) = self.calculate_tool_switch_time(device_id, &product_code, &current_tools);
        
        let proc_time = self.calculate_process_time(device_id, &product_code);
        let total_time = if needs_switch { tool_switch_time + proc_time } else { proc_time };
        
        let start_wip = self.state.process_products.values()
            .filter(|pp| pp.current_node_id.as_deref() == Some(device_id) && pp.status == crate::models::ProcessProductStatus::WaitingForProcessing)
            .count() as i32;
        let start_wait_transport = sim_dev.wait_transport;
        let sequence_number = sim_dev.completed + 1;

        let mut consumed_count = 0;
        for (component_code, pp_ids) in &selected_component_pp_ids {
            consumed_count += pp_ids.len();
            if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
                if let Some(wip_list) = sim_dev.assembly_wip.get_mut(component_code) {
                    for pp_id in pp_ids {
                        if let Some(pos) = wip_list.iter().position(|id| id == pp_id) {
                            wip_list.remove(pos);
                        }
                    }
                }
            }
            
            for pp_id in pp_ids {
                if let Some(pp) = self.state.process_products.get_mut(pp_id) {
                    if let Some(last_visit) = pp.node_visits.last_mut() {
                        last_visit.leave_time_s = Some(time_s);
                    }
                    pp.status = crate::models::ProcessProductStatus::Consumed;
                }
            }
        }

        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.busy = true;
            sim_dev.wip -= consumed_count as i32;
            sim_dev.processing_product = Some(product_code.clone());
            sim_dev.assembly_product_code = Some(product_code.clone());
            sim_dev.total_proc_time_s += total_time;
        }
        
        self.update_total_wip();

        let product = self.canvas_state.products.get(&product_code);
        let product_name = product.map_or(String::new(), |p| p.name.clone());
        let product_color = product.map_or(String::new(), |p| p.color.clone());
        
        let new_pp_id = self.generate_assembly_pp_id(device_id, &product_code);
        
        let device_name = match self.canvas_state.devices.get(device_id) {
            Some(d) => d.name().to_string(),
            None => device_id.to_string(),
        };

        let new_visits = vec![crate::models::NodeVisit {
            node_id: device_id.to_string(),
            node_name: device_name,
            arrive_time_s: time_s,
            leave_time_s: None,
        }];

        let new_process_product = crate::models::ProcessProduct {
            id: new_pp_id.clone(),
            product_code: product_code.clone(),
            product_name: product_name.clone(),
            product_color: product_color.clone(),
            status: crate::models::ProcessProductStatus::Processing,
            current_node_id: Some(device_id.to_string()),
            current_connection_id: None,
            node_visits: new_visits,
            connection_visits: vec![],
        };
        
        self.state.process_products.insert(new_pp_id.clone(), new_process_product);

        let mut actual_start_time = time_s;
        
        let mut upstream_materials: HashMap<String, f64> = HashMap::new();
        for (component_code, pp_ids) in &selected_component_pp_ids {
            upstream_materials.insert(component_code.clone(), pp_ids.len() as f64);
        }
        
        if needs_switch {
            let switch_end_time = time_s + tool_switch_time;
            let switch_record = ProcessingRecord {
                product_code: product_code.clone(),
                process_product_id: String::new(),
                sequence_number,
                start_wip,
                start_wait_transport,
                materials_used: HashMap::new(),
                start_time_s: time_s,
                end_time_s: switch_end_time,
                duration_s: tool_switch_time,
                arrive_time_s: time_s,
                leave_time_s: None,
                task_type: "工具切换".to_string(),
                disassembly_product_ids: vec![],
            };
            
            self.state.processing_records
                .entry(device_id.to_string())
                .or_insert_with(Vec::new)
                .push(switch_record);
            
            actual_start_time = switch_end_time;
        }
        
        let record = ProcessingRecord {
            product_code: product_code.clone(),
            process_product_id: new_pp_id.clone(),
            sequence_number: if needs_switch { sequence_number + 1 } else { sequence_number },
            start_wip,
            start_wait_transport,
            materials_used: upstream_materials,
            start_time_s: actual_start_time,
            end_time_s: 0.0,
            duration_s: proc_time,
            arrive_time_s: time_s,
            leave_time_s: None,
            task_type: "加工任务".to_string(),
            disassembly_product_ids: vec![],
        };

        self.state.processing_records
            .entry(device_id.to_string())
            .or_insert_with(Vec::new)
            .push(record);

        let complete_time = time_s + total_time;
        self.push_event(SimEvent::AssemblyComplete {
            device_id: device_id.to_string(),
            time_s: complete_time,
            product_code: product_code.clone(),
            process_product_id: new_pp_id,
        });

        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.last_product_code = Some(product_code);
            sim_dev.last_tools = current_tools.clone();
        }
    }

    fn try_start_disassembly(&mut self, device_id: &str, time_s: f64) {
        let sim_dev = match self.state.devices.get(device_id) {
            Some(d) => d.clone(),
            None => return,
        };

        if sim_dev.busy {
            return;
        }

        let disassembly_station = match self.canvas_state.devices.get(device_id) {
            Some(crate::models::Device::DisassemblyStation(d)) => d.clone(),
            _ => return,
        };

        let items = disassembly_station.items_to_disassemble.clone();
        if items.is_empty() {
            return;
        }

        let eligible_items: Vec<String> = items.iter()
            .filter(|item_code| {
                if let Some(pp_ids) = sim_dev.disassembly_wip.get(*item_code) {
                    !pp_ids.is_empty()
                } else {
                    false
                }
            })
            .cloned()
            .collect();

        if eligible_items.is_empty() {
            return;
        }

        let item_code = self.select_disassembly_item(device_id, &eligible_items);

        let item_pp_id = match sim_dev.disassembly_wip.get(&item_code) {
            Some(pp_ids) if !pp_ids.is_empty() => pp_ids[0].clone(),
            _ => return,
        };

        let current_tools = self.get_product_tools(device_id, &item_code);
        let (tool_switch_time, needs_switch) = self.calculate_tool_switch_time(device_id, &item_code, &current_tools);

        let proc_time = self.calculate_process_time(device_id, &item_code);
        let total_time = if needs_switch { tool_switch_time + proc_time } else { proc_time };

        let start_wip = self.state.process_products.values()
            .filter(|pp| pp.current_node_id.as_deref() == Some(device_id) && pp.status == crate::models::ProcessProductStatus::WaitingForProcessing)
            .count() as i32;
        let start_wait_transport = sim_dev.wait_transport;
        let sequence_number = sim_dev.completed + 1;

        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            if let Some(wip_list) = sim_dev.disassembly_wip.get_mut(&item_code) {
                if let Some(pos) = wip_list.iter().position(|id| *id == item_pp_id) {
                    wip_list.remove(pos);
                }
            }
            sim_dev.wip -= 1;
        }

        if let Some(pp) = self.state.process_products.get_mut(&item_pp_id) {
            if let Some(last_visit) = pp.node_visits.last_mut() {
                last_visit.leave_time_s = Some(time_s);
            }
            pp.status = crate::models::ProcessProductStatus::Consumed;
        }

        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.busy = true;
            sim_dev.processing_product = Some(item_code.clone());
            sim_dev.disassembly_item_code = Some(item_code.clone());
            sim_dev.total_proc_time_s += total_time;
        }

        self.update_total_wip();

        let disassembly_reqs = disassembly_station.product_disassembly_requirements.get(&item_code)
            .cloned()
            .unwrap_or_default();

        let mut new_pp_ids: Vec<String> = Vec::new();
        for (dp_code, qty) in &disassembly_reqs {
            let qty = *qty as usize;
            if qty == 0 {
                continue;
            }
            let product = self.canvas_state.products.get(dp_code);
            let product_name = product.map_or(String::new(), |p| p.name.clone());
            let product_color = product.map_or(String::new(), |p| p.color.clone());

            let device_name = match self.canvas_state.devices.get(device_id) {
                Some(d) => d.name().to_string(),
                None => device_id.to_string(),
            };

            for _ in 0..qty {
                let new_pp_id = self.generate_disassembly_pp_id(device_id, dp_code);
                let new_visits = vec![crate::models::NodeVisit {
                    node_id: device_id.to_string(),
                    node_name: device_name.clone(),
                    arrive_time_s: time_s,
                    leave_time_s: None,
                }];

                let new_process_product = crate::models::ProcessProduct {
                    id: new_pp_id.clone(),
                    product_code: dp_code.clone(),
                    product_name: product_name.clone(),
                    product_color: product_color.clone(),
                    status: crate::models::ProcessProductStatus::Processing,
                    current_node_id: Some(device_id.to_string()),
                    current_connection_id: None,
                    node_visits: new_visits,
                    connection_visits: vec![],
                };

                self.state.process_products.insert(new_pp_id.clone(), new_process_product);
                new_pp_ids.push(new_pp_id);
            }
        }

        let mut actual_start_time = time_s;

        let mut upstream_materials: HashMap<String, f64> = HashMap::new();
        upstream_materials.insert(item_code.clone(), 1.0);

        if needs_switch {
            let switch_end_time = time_s + tool_switch_time;
            let switch_record = ProcessingRecord {
                product_code: item_code.clone(),
                process_product_id: String::new(),
                sequence_number,
                start_wip,
                start_wait_transport,
                materials_used: HashMap::new(),
                start_time_s: time_s,
                end_time_s: switch_end_time,
                duration_s: tool_switch_time,
                arrive_time_s: time_s,
                leave_time_s: None,
                task_type: "工具切换".to_string(),
                disassembly_product_ids: vec![],
            };

            self.state.processing_records
                .entry(device_id.to_string())
                .or_insert_with(Vec::new)
                .push(switch_record);

            actual_start_time = switch_end_time;
        }

        let first_pp_id = new_pp_ids.first().cloned().unwrap_or_default();
        let record = ProcessingRecord {
            product_code: item_code.clone(),
            process_product_id: first_pp_id,
            sequence_number: if needs_switch { sequence_number + 1 } else { sequence_number },
            start_wip,
            start_wait_transport,
            materials_used: upstream_materials,
            start_time_s: actual_start_time,
            end_time_s: 0.0,
            duration_s: proc_time,
            arrive_time_s: time_s,
            leave_time_s: None,
            task_type: "拆解任务".to_string(),
            disassembly_product_ids: new_pp_ids,
        };

        self.state.processing_records
            .entry(device_id.to_string())
            .or_insert_with(Vec::new)
            .push(record);

        let complete_time = time_s + total_time;
        self.push_event(SimEvent::DisassemblyComplete {
            device_id: device_id.to_string(),
            time_s: complete_time,
            product_code: item_code.clone(),
            process_product_id: item_pp_id,
        });

        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.last_product_code = Some(item_code);
            sim_dev.last_tools = current_tools;
        }

        let upstream_buffers: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                if from_device.is_buffer() {
                    Some(c.from_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for buffer_id in upstream_buffers {
            self.try_release_from_buffer(&buffer_id, time_s);
        }
    }

    fn handle_disassembly_complete(&mut self, device_id: &str, time_s: f64, _product_code: &str, _process_product_id: &str) {
        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.busy = false;
            sim_dev.completed += 1;
            sim_dev.processing_product = None;
            sim_dev.disassembly_item_code = None;
        }

        self.update_total_wip();

        if let Some(records) = self.state.processing_records.get_mut(device_id) {
            if let Some(last_record) = records.last_mut() {
                last_record.end_time_s = time_s;
            }
        }

        let disassembly_products: Vec<String> = self.state.process_products.values()
            .filter(|pp| pp.current_node_id.as_deref() == Some(device_id) && pp.status == crate::models::ProcessProductStatus::Processing)
            .map(|pp| pp.id.clone())
            .collect();

        for pp_id in &disassembly_products {
            if let Some(pp) = self.state.process_products.get_mut(pp_id) {
                if let Some(last_visit) = pp.node_visits.last_mut() {
                    last_visit.leave_time_s = Some(time_s);
                }
                pp.status = crate::models::ProcessProductStatus::WaitingForTransport;
            }
        }

        if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
            sim_dev.wait_transport += disassembly_products.len() as i32;
            sim_dev.max_wait_transport = sim_dev.max_wait_transport.max(sim_dev.wait_transport);
        }

        self.update_total_wip();

        for pp_id in &disassembly_products {
            let product_code = self.state.process_products.get(pp_id)
                .map(|pp| pp.product_code.clone())
                .unwrap_or_default();

            if let Some(conn) = self.select_downstream_connection(device_id, &product_code) {
                if !self.can_start_transport(&conn.id) {
                    continue;
                }

                if let Some(sim_dev) = self.state.devices.get_mut(device_id) {
                    sim_dev.wait_transport -= 1;
                }

                self.update_total_wip();

                self.start_transport(&conn.id, device_id, &conn.to_device_id, time_s, &product_code, Some(pp_id));
            }
        }

        self.try_start_disassembly(device_id, time_s);

        let upstream_storages: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                if from_device.is_warehouse() || from_device.is_temp_store() {
                    Some(c.from_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for storage_id in upstream_storages {
            self.try_release_from_storage(&storage_id, time_s);
        }

        let upstream_buffers: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == device_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                if from_device.is_buffer() {
                    Some(c.from_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for buffer_id in upstream_buffers {
            self.try_release_from_buffer(&buffer_id, time_s);
        }

        let downstream_buffers: Vec<String> = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == device_id)
            .filter_map(|c| {
                let to_device = self.canvas_state.devices.get(&c.to_device_id)?;
                if to_device.is_buffer() {
                    Some(c.to_device_id.clone())
                } else {
                    None
                }
            })
            .collect();

        for buffer_id in downstream_buffers {
            self.check_buffer_capacity(&buffer_id);
        }

        let sim_dev = self.state.devices.get(device_id);
        if let Some(sim_dev) = sim_dev {
            if !sim_dev.busy && sim_dev.wip == 0 {
                let upstream_start_nodes = self.find_upstream_start_nodes(device_id);

                for start_node_id in upstream_start_nodes {
                    if let Some(crate::models::Device::StartNode(sn)) = self.canvas_state.devices.get(&start_node_id) {
                        if sn.feed_mode == crate::models::FeedMode::Idle && sn.feed_status == "投料中" {
                            self.push_event(SimEvent::DownstreamIdle {
                                start_node_id,
                                downstream_device_id: device_id.to_string(),
                                time_s,
                            });
                        }
                    }
                }
            }
        }
    }

    fn generate_disassembly_pp_id(&mut self, device_id: &str, product_code: &str) -> String {
        let counter_key = format!("{}_{}", device_id, product_code);
        let counter = self.state.disassembly_station_product_counters.entry(counter_key).or_insert(0);
        *counter += 1;
        let seq = Self::extract_device_sequence(device_id);
        format!("{}DIS{}{:04}", product_code, seq, counter)
    }

    fn triangular_random(&mut self, low: f64, high: f64, mode: f64) -> f64 {
        let u = self.rng.gen::<f64>();
        if mode == low {
            return low + (high - low) * u.sqrt();
        }
        if mode == high {
            return high - (high - low) * (1.0 - u).sqrt();
        }
        let f = (mode - low) / (high - low);
        if u < f {
            low + (high - low) * (u * f).sqrt()
        } else {
            high - (high - low) * ((1.0 - u) * (1.0 - f)).sqrt()
        }
    }

    fn process_waiting_entry_queue(&mut self, storage_id: &str, time_s: f64) {
        let capacity = match self.canvas_state.devices.get(storage_id) {
            Some(crate::models::Device::Warehouse(w)) => w.wh_capacity,
            Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
            Some(crate::models::Device::TempStore(_)) => 0,
            _ => return,
        };

        let is_warehouse = matches!(self.canvas_state.devices.get(storage_id), Some(crate::models::Device::Warehouse(_)));
        let is_tempstore = matches!(self.canvas_state.devices.get(storage_id), Some(crate::models::Device::TempStore(_)));

        loop {
            let current_stock = self.state.storage.get(storage_id)
                .map(|s| s.stock)
                .unwrap_or(0);

            if capacity > 0 && current_stock >= capacity {
                break;
            }

            let entry_item = match self.state.storage.get_mut(storage_id) {
                Some(s) => s.waiting_entry_queue.first().cloned(),
                None => break,
            };

            let item = match entry_item {
                Some(i) => i,
                None => break,
            };

            if let Some(sim_storage) = self.state.storage.get_mut(storage_id) {
                sim_storage.waiting_entry_queue.remove(0);
                sim_storage.stock += 1;
                sim_storage.max_stock = sim_storage.max_stock.max(sim_storage.stock);
                if !item.product_code.is_empty() {
                    sim_storage.stored_products.push(item.product_code.clone());
                }
                sim_storage.stored_process_product_ids.push(item.process_product_id.clone());
                sim_storage.records.push((time_s, "in".to_string(), sim_storage.stock));

                let change_record = StorageChangeRecord {
                    time_s,
                    change_type: "入库".to_string(),
                    current_stock: sim_storage.stock,
                    capacity,
                    process_product_id: item.process_product_id.clone(),
                    arrival_time_s: Some(item.arrival_time_s),
                };

                self.state.storage_change_records
                    .entry(storage_id.to_string())
                    .or_insert_with(Vec::new)
                    .push(change_record);
            }

            if let Some(pp) = self.state.process_products.get_mut(&item.process_product_id) {
                let new_status = if is_warehouse || is_tempstore {
                    crate::models::ProcessProductStatus::Stored
                } else {
                    crate::models::ProcessProductStatus::Buffering
                };
                pp.status = new_status;
            }

            self.record_storage_utilization(storage_id, time_s);
        }
    }

    fn try_signal_completion_from_storage(&mut self, storage_id: &str, time_s: f64, process_product_id: &str) {
        let downstream_is_endnode = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == storage_id)
            .all(|conn| matches!(self.canvas_state.devices.get(&conn.to_device_id), Some(crate::models::Device::EndNode(_))));

        if !downstream_is_endnode {
            return;
        }

        let is_in_storage = self.state.storage.get(storage_id)
            .map(|s| s.stored_process_product_ids.iter().any(|id| id == process_product_id))
            .unwrap_or(false);

        if !is_in_storage {
            return;
        }

        let end_node_id = self.canvas_state.connections
            .values()
            .find(|c| c.from_device_id == storage_id)
            .map(|c| c.to_device_id.clone())
            .unwrap_or_default();

        if end_node_id.is_empty() {
            return;
        }

        let capacity = match self.canvas_state.devices.get(storage_id) {
            Some(crate::models::Device::Warehouse(w)) => w.wh_capacity,
            Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
            Some(crate::models::Device::TempStore(_)) => 0,
            _ => return,
        };

        let product_code = self.state.process_products.get(process_product_id)
            .map(|pp| pp.product_code.clone())
            .unwrap_or_default();

        if let Some(sim_storage) = self.state.storage.get_mut(storage_id) {
            sim_storage.records.push((time_s, "信号完成".to_string(), sim_storage.stock));

            let change_record = StorageChangeRecord {
                time_s,
                change_type: "信号完成".to_string(),
                current_stock: sim_storage.stock,
                capacity,
                process_product_id: process_product_id.to_string(),
                arrival_time_s: None,
            };

            self.state.storage_change_records
                .entry(storage_id.to_string())
                .or_insert_with(Vec::new)
                .push(change_record);
        }

        self.state.completed_products += 1;
        if !product_code.is_empty() {
            *self.state.completed_products_by_code.entry(product_code.clone()).or_insert(0) += 1;
        }

        if self.state.simulation_mode == crate::models::SimulationMode::FixedOutput && !product_code.is_empty() {
            *self.state.end_node_completed_by_product
                .entry(end_node_id.clone())
                .or_insert_with(HashMap::new)
                .entry(product_code.clone())
                .or_insert(0) += 1;
            self.check_and_stop_feeding_for_product(&end_node_id, &product_code);
        }

        let pp = self.state.process_products.get(process_product_id);
        if let Some(pp) = pp {
            self.state.end_node_arrival_records
                .entry(end_node_id.clone())
                .or_insert_with(Vec::new)
                .push(crate::models::EndNodeArrivalRecord {
                    process_product_id: process_product_id.to_string(),
                    product_code: pp.product_code.clone(),
                    product_name: pp.product_name.clone(),
                    product_color: pp.product_color.clone(),
                    arrive_time_s: time_s,
                    node_visits: pp.node_visits.clone(),
                });
        }

        if let Some(pp) = self.state.process_products.get_mut(process_product_id) {
            if let Some(last_visit) = pp.node_visits.last_mut() {
                last_visit.leave_time_s = Some(time_s);
            }

            let end_node_name = match self.canvas_state.devices.get(&end_node_id) {
                Some(d) => d.name().to_string(),
                None => end_node_id.clone(),
            };
            pp.node_visits.push(crate::models::NodeVisit {
                node_id: end_node_id.clone(),
                node_name: end_node_name,
                arrive_time_s: time_s,
                leave_time_s: Some(time_s),
            });
            pp.status = crate::models::ProcessProductStatus::Completed;
            pp.current_node_id = Some(end_node_id.clone());
            pp.current_connection_id = None;
        }

        self.record_storage_utilization(storage_id, time_s);
    }

    fn try_release_from_storage(&mut self, storage_id: &str, time_s: f64) {
        let (release_mode, is_warehouse, is_tempstore) = match self.canvas_state.devices.get(storage_id) {
            Some(crate::models::Device::Warehouse(w)) => (w.release_mode, true, false),
            Some(crate::models::Device::TempStore(t)) => (t.release_mode, false, true),
            _ => return,
        };

        if !is_warehouse && !is_tempstore {
            return;
        }

        let outgoing: Vec<_> = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == storage_id)
            .collect();

        if outgoing.is_empty() {
            return;
        }

        let downstream_is_endnode = outgoing.iter().all(|conn| {
            matches!(self.canvas_state.devices.get(&conn.to_device_id), Some(crate::models::Device::EndNode(_)))
        });

        if downstream_is_endnode {
            return;
        }

        let sim_storage = match self.state.storage.get(storage_id) {
            Some(s) => s.clone(),
            None => return,
        };

        if sim_storage.stock == 0 {
            return;
        }

        let stored_pp_id = sim_storage.stored_process_product_ids.first().cloned().unwrap_or_default();
        let stored_product_code = sim_storage.stored_products.first().cloned().unwrap_or_default();
        
        if stored_pp_id.is_empty() {
            return;
        }

        let actual_product_code = self.state.process_products.get(&stored_pp_id)
            .map(|pp| pp.product_code.clone())
            .unwrap_or_else(|| stored_product_code.clone());

        if actual_product_code.is_empty() {
            return;
        }

        let can_release = match release_mode {
            crate::models::ReleaseMode::Immediate => true,
            crate::models::ReleaseMode::WaitForIdle => {
                let mut all_idle = true;
                for conn in &outgoing {
                    if let Some(sim_dev) = self.state.devices.get(&conn.to_device_id) {
                        if sim_dev.busy {
                            all_idle = false;
                            break;
                        }
                    }
                }
                all_idle
            }
        };

        if !can_release {
            return;
        }

        if let Some(conn) = self.select_downstream_connection(storage_id, &actual_product_code) {
            let to_device = self.canvas_state.devices.get(&conn.to_device_id);
            let is_station = matches!(to_device, Some(crate::models::Device::Station(_)));
            let is_end_node = matches!(to_device, Some(crate::models::Device::EndNode(_)));
            let is_assembly = matches!(to_device, Some(crate::models::Device::AssemblyStation(_)));
            let is_disassembly = matches!(to_device, Some(crate::models::Device::DisassemblyStation(_)));

            if !is_station && !is_end_node && !is_assembly && !is_disassembly {
                if let Some(sim_storage) = self.state.storage.get_mut(storage_id) {
                    sim_storage.pending_release = true;
                }
                return;
            }

            if !self.can_start_transport(&conn.id) {
                if let Some(sim_storage) = self.state.storage.get_mut(storage_id) {
                    sim_storage.pending_release = true;
                }
                return;
            }

            if let Some(sim_storage) = self.state.storage.get_mut(storage_id) {
                sim_storage.pending_release = false;
            }

            let transport_capacity = match conn.transport_mode {
                crate::models::TransportMode::Discrete => conn.cart_capacity.max(1) as usize,
                crate::models::TransportMode::Continuous => 1,
            };

            let downstream_remaining = if matches!(to_device, Some(crate::models::Device::Warehouse(_))) {
                usize::MAX
            } else if matches!(to_device, Some(crate::models::Device::Buffer(_))) {
                let capacity = match to_device {
                    Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
                    _ => 0,
                };
                let current_stock = self.state.storage.get(&conn.to_device_id)
                    .map(|s| s.stock)
                    .unwrap_or(0);
                let waiting_entry_count = self.state.storage.get(&conn.to_device_id)
                    .map(|s| s.waiting_entry_queue.len() as i32)
                    .unwrap_or(0);
                if capacity > 0 {
                    (capacity - current_stock - waiting_entry_count).max(0) as usize
                } else {
                    usize::MAX
                }
            } else {
                usize::MAX
            };

            let current_stock = self.state.storage.get(storage_id)
                .map(|s| s.stock)
                .unwrap_or(0) as usize;

            let release_count = current_stock.min(transport_capacity).min(downstream_remaining);
            if release_count == 0 {
                return;
            }

            let storage_name = match self.canvas_state.devices.get(storage_id) {
                Some(d) => d.name().to_string(),
                None => storage_id.to_string(),
            };

            let capacity = match self.canvas_state.devices.get(storage_id) {
                Some(crate::models::Device::Warehouse(w)) => w.wh_capacity,
                _ => 0,
            };

            for _ in 0..release_count {
                let pp_id = self.state.storage.get(storage_id)
                    .and_then(|s| s.stored_process_product_ids.first().cloned())
                    .unwrap_or_default();
                let product_code = self.state.storage.get(storage_id)
                    .and_then(|s| s.stored_products.first().cloned())
                    .unwrap_or_default();

                if pp_id.is_empty() {
                    break;
                }

                if let Some(sim_storage) = self.state.storage.get_mut(storage_id) {
                    sim_storage.stock -= 1;
                    sim_storage.records.push((time_s, "out".to_string(), sim_storage.stock));
                    if !sim_storage.stored_products.is_empty() {
                        sim_storage.stored_products.remove(0);
                    }
                    sim_storage.stored_process_product_ids.remove(0);

                    let change_record = StorageChangeRecord {
                        time_s,
                        change_type: "出库".to_string(),
                        current_stock: sim_storage.stock,
                        capacity,
                        process_product_id: pp_id.clone(),
                        arrival_time_s: None,
                    };

                    self.state.storage_change_records
                        .entry(storage_id.to_string())
                        .or_insert_with(Vec::new)
                        .push(change_record);
                }

                let (product_name, product_color) = match self.canvas_state.products.get(&product_code) {
                    Some(p) => (p.name.clone(), p.color.clone()),
                    None => (String::new(), String::new()),
                };

                if let Some(pp) = self.state.process_products.get_mut(&pp_id) {
                    if let Some(last_visit) = pp.node_visits.last_mut() {
                        last_visit.leave_time_s = Some(time_s);
                    }
                    pp.node_visits.push(crate::models::NodeVisit {
                        node_id: storage_id.to_string(),
                        node_name: storage_name.clone(),
                        arrive_time_s: time_s,
                        leave_time_s: None,
                    });
                    pp.status = crate::models::ProcessProductStatus::WaitingForTransport;
                    pp.current_node_id = Some(storage_id.to_string());
                    pp.current_connection_id = Some(conn.id.clone());
                } else {
                    let process_product = crate::models::ProcessProduct {
                        id: pp_id.clone(),
                        product_code: product_code.clone(),
                        product_name: product_name.clone(),
                        product_color: product_color.clone(),
                        status: crate::models::ProcessProductStatus::WaitingForTransport,
                        current_node_id: Some(storage_id.to_string()),
                        current_connection_id: Some(conn.id.clone()),
                        node_visits: vec![crate::models::NodeVisit {
                            node_id: storage_id.to_string(),
                            node_name: storage_name.clone(),
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        }],
                        connection_visits: vec![],
                    };
                    self.state.process_products.insert(pp_id.clone(), process_product);
                }
            }

            self.record_storage_utilization(storage_id, time_s);
            self.update_total_wip();

            self.start_transport(&conn.id, storage_id, &conn.to_device_id, time_s, &actual_product_code, None);

            self.process_waiting_entry_queue(storage_id, time_s);
        } else {
            if let Some(sim_storage) = self.state.storage.get_mut(storage_id) {
                sim_storage.pending_release = true;
            }
        }
    }

    fn try_release_from_buffer(&mut self, buffer_id: &str, time_s: f64) {
        let is_buffer = match self.canvas_state.devices.get(buffer_id) {
            Some(d) => d.is_buffer(),
            None => return,
        };

        if !is_buffer {
            return;
        }

        let outgoing: Vec<_> = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == buffer_id)
            .collect();

        if outgoing.is_empty() {
            return;
        }

        let sim_storage = match self.state.storage.get(buffer_id) {
            Some(s) => s.clone(),
            None => return,
        };

        if sim_storage.stock == 0 {
            return;
        }

        let stored_pp_id = sim_storage.stored_process_product_ids.first().cloned().unwrap_or_default();
        let stored_product_code = sim_storage.stored_products.first().cloned().unwrap_or_default();
        
        if stored_pp_id.is_empty() {
            return;
        }

        let actual_product_code = self.state.process_products.get(&stored_pp_id)
            .map(|pp| pp.product_code.clone())
            .unwrap_or_else(|| stored_product_code.clone());

        if actual_product_code.is_empty() {
            return;
        }

        let mut downstream_needs_product = false;
        for conn in &outgoing {
            if let Some(sim_dev) = self.state.devices.get(&conn.to_device_id) {
                let inflight_to_dev = self.state.connections.get(&conn.id)
                    .map(|sc| sc.inflight)
                    .unwrap_or(0);
                let raw_wip = sim_dev.wip + inflight_to_dev + if sim_dev.busy { 1 } else { 0 };
                
                let effective_wip = if let Some(crate::models::Device::AssemblyStation(a)) = self.canvas_state.devices.get(&conn.to_device_id) {
                    let mut max_set_size: i32 = 1;
                    for component_reqs in a.product_upstream_requirements.values() {
                        let set_size: i32 = component_reqs.values().map(|&qty| qty.max(1)).sum::<i32>().max(1);
                        max_set_size = max_set_size.max(set_size);
                    }
                    if max_set_size > 1 {
                        (raw_wip as f64 / max_set_size as f64).ceil() as i32
                    } else {
                        raw_wip
                    }
                } else {
                    raw_wip
                };

                if effective_wip <= 2 {
                    downstream_needs_product = true;
                    break;
                }
            }
        }

        if !downstream_needs_product {
            return;
        }

        let downstream_is_assembly = outgoing.iter().any(|c| {
            matches!(self.canvas_state.devices.get(&c.to_device_id), Some(crate::models::Device::AssemblyStation(_)))
        });

        if downstream_is_assembly {
            let buffer_products: HashMap<String, i32> = {
                let mut counts: HashMap<String, i32> = HashMap::new();
                if let Some(sim_storage) = self.state.storage.get(buffer_id) {
                    for pc in &sim_storage.stored_products {
                        *counts.entry(pc.clone()).or_insert(0) += 1;
                    }
                }
                counts
            };

            let mut has_complete_set = false;
            for conn in &outgoing {
                if let Some(crate::models::Device::AssemblyStation(a)) = self.canvas_state.devices.get(&conn.to_device_id) {
                    for component_reqs in a.product_upstream_requirements.values() {
                        let can_form_set = component_reqs.iter().all(|(comp_code, qty)| {
                            let available = buffer_products.get(comp_code).copied().unwrap_or(0);
                            available >= *qty
                        });
                        if can_form_set {
                            has_complete_set = true;
                            break;
                        }
                    }
                }
                if has_complete_set {
                    break;
                }
            }

            if !has_complete_set {
                return;
            }
        }

        if let Some(conn) = self.select_downstream_connection(buffer_id, &actual_product_code) {
            let to_device = self.canvas_state.devices.get(&conn.to_device_id);
            let is_station = matches!(to_device, Some(crate::models::Device::Station(_)));
            let is_end_node = matches!(to_device, Some(crate::models::Device::EndNode(_)));
            let is_assembly = matches!(to_device, Some(crate::models::Device::AssemblyStation(_)));
            let is_disassembly = matches!(to_device, Some(crate::models::Device::DisassemblyStation(_)));

            if !is_station && !is_end_node && !is_assembly && !is_disassembly {
                return;
            }

            if !self.can_start_transport(&conn.id) {
                return;
            }

            let transport_capacity = match conn.transport_mode {
                crate::models::TransportMode::Discrete => conn.cart_capacity.max(1) as usize,
                crate::models::TransportMode::Continuous => 1,
            };

            let downstream_remaining = if matches!(to_device, Some(crate::models::Device::Warehouse(_))) {
                usize::MAX
            } else if matches!(to_device, Some(crate::models::Device::Buffer(_))) {
                let capacity = match to_device {
                    Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
                    _ => 0,
                };
                let current_stock = self.state.storage.get(&conn.to_device_id)
                    .map(|s| s.stock)
                    .unwrap_or(0);
                let waiting_entry_count = self.state.storage.get(&conn.to_device_id)
                    .map(|s| s.waiting_entry_queue.len() as i32)
                    .unwrap_or(0);
                if capacity > 0 {
                    (capacity - current_stock - waiting_entry_count).max(0) as usize
                } else {
                    usize::MAX
                }
            } else {
                usize::MAX
            };

            let current_stock = self.state.storage.get(buffer_id)
                .map(|s| s.stock)
                .unwrap_or(0) as usize;

            let release_count = current_stock.min(transport_capacity).min(downstream_remaining);
            if release_count == 0 {
                return;
            }

            let buffer_name = match self.canvas_state.devices.get(buffer_id) {
                Some(d) => d.name().to_string(),
                None => buffer_id.to_string(),
            };

            let capacity = match self.canvas_state.devices.get(buffer_id) {
                Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
                _ => 0,
            };

            for _ in 0..release_count {
                let pp_id = self.state.storage.get(buffer_id)
                    .and_then(|s| s.stored_process_product_ids.first().cloned())
                    .unwrap_or_default();
                let product_code = self.state.storage.get(buffer_id)
                    .and_then(|s| s.stored_products.first().cloned())
                    .unwrap_or_default();

                if pp_id.is_empty() {
                    break;
                }

                if let Some(sim_storage) = self.state.storage.get_mut(buffer_id) {
                    sim_storage.stock -= 1;
                    sim_storage.records.push((time_s, "out".to_string(), sim_storage.stock));
                    if !sim_storage.stored_products.is_empty() {
                        sim_storage.stored_products.remove(0);
                    }
                    sim_storage.stored_process_product_ids.remove(0);

                    let change_record = StorageChangeRecord {
                        time_s,
                        change_type: "出库".to_string(),
                        current_stock: sim_storage.stock,
                        capacity,
                        process_product_id: pp_id.clone(),
                        arrival_time_s: None,
                    };

                    self.state.storage_change_records
                        .entry(buffer_id.to_string())
                        .or_insert_with(Vec::new)
                        .push(change_record);
                }

                let (product_name, product_color) = match self.canvas_state.products.get(&product_code) {
                    Some(p) => (p.name.clone(), p.color.clone()),
                    None => (String::new(), String::new()),
                };

                if let Some(pp) = self.state.process_products.get_mut(&pp_id) {
                    if let Some(last_visit) = pp.node_visits.last_mut() {
                        last_visit.leave_time_s = Some(time_s);
                    }
                    pp.node_visits.push(crate::models::NodeVisit {
                        node_id: buffer_id.to_string(),
                        node_name: buffer_name.clone(),
                        arrive_time_s: time_s,
                        leave_time_s: None,
                    });
                    pp.status = crate::models::ProcessProductStatus::WaitingForTransport;
                    pp.current_node_id = Some(buffer_id.to_string());
                    pp.current_connection_id = Some(conn.id.clone());
                } else {
                    let process_product = crate::models::ProcessProduct {
                        id: pp_id.clone(),
                        product_code: product_code.clone(),
                        product_name: product_name.clone(),
                        product_color: product_color.clone(),
                        status: crate::models::ProcessProductStatus::WaitingForTransport,
                        current_node_id: Some(buffer_id.to_string()),
                        current_connection_id: Some(conn.id.clone()),
                        node_visits: vec![crate::models::NodeVisit {
                            node_id: buffer_id.to_string(),
                            node_name: buffer_name.clone(),
                            arrive_time_s: time_s,
                            leave_time_s: None,
                        }],
                        connection_visits: vec![],
                    };
                    self.state.process_products.insert(pp_id.clone(), process_product);
                }
            }

            self.record_storage_utilization(buffer_id, time_s);
            self.update_total_wip();

            self.start_transport(&conn.id, buffer_id, &conn.to_device_id, time_s, &actual_product_code, None);
            
            self.process_waiting_entry_queue(buffer_id, time_s);
            self.check_buffer_capacity(buffer_id);
            
            self.try_transport_from_upstream_to_buffer(buffer_id, time_s);

            let upstream_start_nodes = self.find_upstream_start_nodes(buffer_id);
            for sn_id in upstream_start_nodes {
                if let Some(crate::models::Device::StartNode(sn)) = self.canvas_state.devices.get(&sn_id) {
                    if sn.feed_mode == crate::models::FeedMode::Idle && sn.feed_status == "投料中" {
                        self.push_event(SimEvent::DownstreamIdle {
                            start_node_id: sn_id,
                            downstream_device_id: buffer_id.to_string(),
                            time_s,
                        });
                    }
                }
            }
        }
    }

    fn try_transport_from_upstream_to_buffer(&mut self, buffer_id: &str, time_s: f64) {
        let max_capacity = match self.canvas_state.devices.get(buffer_id) {
            Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
            _ => return,
        };

        let current_stock = self.state.storage.get(buffer_id)
            .map(|s| s.stock)
            .unwrap_or(0);
        let waiting_entry_count = self.state.storage.get(buffer_id)
            .map(|s| s.waiting_entry_queue.len() as i32)
            .unwrap_or(0);

        if max_capacity > 0 && current_stock + waiting_entry_count >= max_capacity {
            return;
        }

        let upstream_devices: Vec<(String, String)> = self.canvas_state.connections
            .values()
            .filter(|c| c.to_device_id == buffer_id)
            .filter_map(|c| {
                let from_device = self.canvas_state.devices.get(&c.from_device_id)?;
                match from_device {
                    crate::models::Device::Station(_) => {
                        let sim_dev = self.state.devices.get(&c.from_device_id)?;
                        if sim_dev.wait_transport > 0 {
                            Some((c.from_device_id.clone(), c.id.clone()))
                        } else {
                            None
                        }
                    }
                    _ => None,
                }
            })
            .collect();

        let mut current_buffer_stock = self.state.storage.get(buffer_id)
            .map(|s| s.stock + s.waiting_entry_queue.len() as i32)
            .unwrap_or(0);

        for (upstream_device_id, connection_id) in upstream_devices {
            if max_capacity > 0 && current_buffer_stock >= max_capacity {
                break;
            }

            let mut waiting_pps: Vec<_> = self.state.process_products.values()
                .filter(|pp| pp.current_node_id.as_deref() == Some(&upstream_device_id)
                    && pp.status == crate::models::ProcessProductStatus::WaitingForTransport)
                .collect();

            waiting_pps.sort_by(|a, b| {
                let a_time = a.node_visits.last().map(|v| v.arrive_time_s).unwrap_or(f64::MAX);
                let b_time = b.node_visits.last().map(|v| v.arrive_time_s).unwrap_or(f64::MAX);
                a_time.partial_cmp(&b_time).unwrap_or(std::cmp::Ordering::Equal)
            });

            if let Some(pp) = waiting_pps.first() {
                let pp_id = pp.id.clone();
                let product_code = pp.product_code.clone();

                if product_code.is_empty() {
                    continue;
                }

                if let Some(sim_dev) = self.state.devices.get_mut(&upstream_device_id) {
                    sim_dev.wait_transport -= 1;
                }

                self.update_total_wip();

                self.start_transport(&connection_id, &upstream_device_id, buffer_id, time_s, &product_code, Some(&pp_id));

                current_buffer_stock += 1;
            }
        }
    }

    fn calculate_assembly_adjusted_capacity(&self, buffer_id: &str, raw_capacity: i32) -> i32 {
        let downstream_assembly: Vec<&crate::models::AssemblyStation> = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == buffer_id)
            .filter_map(|c| {
                if let Some(crate::models::Device::AssemblyStation(a)) = self.canvas_state.devices.get(&c.to_device_id) {
                    Some(a)
                } else {
                    None
                }
            })
            .collect();

        if downstream_assembly.is_empty() {
            return raw_capacity;
        }

        let mut max_set_size: i32 = 1;
        for assembly in &downstream_assembly {
            for (_assembly_product, component_reqs) in &assembly.product_upstream_requirements {
                let set_size: i32 = component_reqs.values().map(|&qty| qty.max(1)).sum::<i32>().max(1);
                max_set_size = max_set_size.max(set_size);
            }
        }

        if max_set_size <= 1 {
            raw_capacity
        } else {
            (raw_capacity as f64 / max_set_size as f64).ceil() as i32 * max_set_size
        }
    }

    fn check_buffer_capacity(&mut self, buffer_id: &str) {
        let max_capacity = match self.canvas_state.devices.get(buffer_id) {
            Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
            _ => return,
        };

        if max_capacity <= 0 {
            return;
        }

        let current_stock = self.state.storage.get(buffer_id)
            .map(|s| s.stock + s.waiting_entry_queue.len() as i32)
            .unwrap_or(0);

        let mut upstream_wfd_by_product: HashMap<String, i32> = HashMap::new();
        for conn in self.canvas_state.connections.values() {
            if conn.to_device_id == buffer_id {
                if let Some(sim_dev) = self.state.devices.get(&conn.from_device_id) {
                    let wt = sim_dev.wait_transport;
                    if wt > 0 {
                        let product_code = sim_dev.processing_product.clone()
                            .or_else(|| {
                                self.state.process_products.values()
                                    .filter(|pp| pp.current_node_id.as_deref() == Some(&conn.from_device_id))
                                    .filter(|pp| pp.status == crate::models::ProcessProductStatus::WaitingForTransport)
                                    .map(|pp| pp.product_code.clone())
                                    .next()
                            })
                            .unwrap_or_default();
                        if !product_code.is_empty() {
                            *upstream_wfd_by_product.entry(product_code).or_insert(0) += wt;
                        } else {
                            *upstream_wfd_by_product.entry("_unknown".to_string()).or_insert(0) += wt;
                        }
                    }
                }
            }
        }

        let downstream_is_assembly = self.canvas_state.connections
            .values()
            .filter(|c| c.from_device_id == buffer_id)
            .any(|c| matches!(self.canvas_state.devices.get(&c.to_device_id), Some(crate::models::Device::AssemblyStation(_))));

        let effective_max_capacity = if downstream_is_assembly {
            self.calculate_assembly_adjusted_capacity(buffer_id, max_capacity)
        } else {
            max_capacity
        };

        let upstream_wfd_total: i32 = upstream_wfd_by_product.values().sum();
        let potential_stock = current_stock + upstream_wfd_total;

        let start_node_ids = self.find_upstream_start_nodes(buffer_id);
        let time_s = self.state.elapsed_s;

        let mut resumed_start_nodes: Vec<(String, crate::models::FeedMode)> = Vec::new();

        for start_node_id in start_node_ids {
            if let Some(crate::models::Device::StartNode(sn)) = self.canvas_state.devices.get_mut(&start_node_id) {
                let product_code = sn.product_code.clone();
                
                if potential_stock < effective_max_capacity {
                    if sn.feed_status == "暂停投料"
                        && !self.state.stopped_feeding_products.contains(&product_code) {
                        let feed_mode = sn.feed_mode;
                        sn.feed_status = "投料中".to_string();
                        
                        self.state.feed_records
                            .entry(start_node_id.clone())
                            .or_insert_with(Vec::new)
                            .push(FeedRecord {
                                time_s,
                                event_type: "状态恢复".to_string(),
                                feed_status: "投料中".to_string(),
                                product_code,
                                process_product_id: String::new(),
                            });

                        resumed_start_nodes.push((start_node_id.clone(), feed_mode));
                    }
                } else {
                    if sn.feed_status == "投料中" {
                        sn.feed_status = "暂停投料".to_string();
                        
                        self.state.feed_records
                            .entry(start_node_id.clone())
                            .or_insert_with(Vec::new)
                            .push(FeedRecord {
                                time_s,
                                event_type: "状态暂停".to_string(),
                                feed_status: "暂停投料".to_string(),
                                product_code,
                                process_product_id: String::new(),
                            });
                    }
                }
            }
        }

        for (start_node_id, feed_mode) in resumed_start_nodes {
            match feed_mode {
                crate::models::FeedMode::Paced => {
                    self.push_event(SimEvent::Feed {
                        start_node_id: start_node_id.clone(),
                        time_s,
                    });
                }
                crate::models::FeedMode::Idle => {
                    let idle_downstream_ids: Vec<String> = self.canvas_state.connections
                        .values()
                        .filter(|c| c.from_device_id == start_node_id)
                        .filter_map(|c| {
                            let sim_dev = self.state.devices.get(&c.to_device_id)?;
                            if !sim_dev.busy && sim_dev.wip == 0 {
                                Some(c.to_device_id.clone())
                            } else {
                                None
                            }
                        })
                        .collect();

                    for downstream_id in idle_downstream_ids {
                        self.push_event(SimEvent::DownstreamIdle {
                            start_node_id: start_node_id.clone(),
                            downstream_device_id: downstream_id,
                            time_s,
                        });
                    }
                }
            }
        }
    }

    fn find_upstream_start_nodes(&self, device_id: &str) -> Vec<String> {
        let mut start_nodes = Vec::new();
        let mut visited = std::collections::HashSet::new();
        self.find_upstream_start_nodes_recursive(device_id, &mut start_nodes, &mut visited);
        start_nodes
    }

    fn find_upstream_start_nodes_recursive(
        &self,
        device_id: &str,
        start_nodes: &mut Vec<String>,
        visited: &mut std::collections::HashSet<String>,
    ) {
        if visited.contains(device_id) {
            return;
        }
        visited.insert(device_id.to_string());

        let device = match self.canvas_state.devices.get(device_id) {
            Some(d) => d,
            None => return,
        };

        if device.is_start() {
            start_nodes.push(device_id.to_string());
            return;
        }

        for conn in self.canvas_state.connections.values() {
            if conn.to_device_id == device_id {
                self.find_upstream_start_nodes_recursive(&conn.from_device_id, start_nodes, visited);
            }
        }
    }

    fn calculate_transport_time(&self, connection_id: &str) -> f64 {
        let conn = match self.canvas_state.connections.get(connection_id) {
            Some(c) => c,
            None => return 1.0,
        };

        let from_device = self.canvas_state.devices.get(&conn.from_device_id);
        let to_device = self.canvas_state.devices.get(&conn.to_device_id);

        if let (Some(from), Some(to)) = (from_device, to_device) {
            if from.is_start() || to.is_end() {
                return 0.0;
            }
        }

        let length_mm = conn.length_mm.unwrap_or(1000.0);
        let speed_mps = conn.transport_speed_mps.max(0.001);
        (length_mm / 1000.0) / speed_mps
    }

    pub fn start(&mut self) {
        if self.state.state == SimState::Idle {
            self.initialize();
            
            let events: Vec<SimEvent> = self.canvas_state.devices
                .iter()
                .filter(|(_, device)| device.is_start())
                .filter_map(|(id, device)| {
                    if let crate::models::Device::StartNode(sn) = device {
                        if sn.feed_mode == crate::models::FeedMode::Paced {
                            Some(SimEvent::Feed {
                                start_node_id: id.clone(),
                                time_s: 0.0,
                            })
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                })
                .collect();
            
            for event in events {
                self.push_event(event);
            }

            let mut idle_events: Vec<SimEvent> = Vec::new();
            for (id, device) in &self.canvas_state.devices {
                if device.is_start() {
                    if let crate::models::Device::StartNode(sn) = device {
                        if sn.feed_mode == crate::models::FeedMode::Idle {
                            let outgoing: Vec<_> = self.canvas_state.connections
                                .values()
                                .filter(|c| &c.from_device_id == id)
                                .collect();

                            for conn in &outgoing {
                                if let Some(sim_dev) = self.state.devices.get(&conn.to_device_id) {
                                    if !sim_dev.busy && sim_dev.wip == 0 {
                                        idle_events.push(SimEvent::DownstreamIdle {
                                            start_node_id: id.clone(),
                                            downstream_device_id: conn.to_device_id.clone(),
                                            time_s: 0.0,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            for event in idle_events {
                self.push_event(event);
            }
        }
        self.state.state = SimState::Running;
    }

    pub fn pause(&mut self) {
        if self.state.state == SimState::Running {
            self.state.state = SimState::Paused;
        }
    }

    pub fn resume(&mut self) {
        if self.state.state == SimState::Paused {
            self.state.state = SimState::Running;
        }
    }

    pub fn get_results(&self) -> SimulationResults {
        let mut device_stats = Vec::new();
        let mut connection_stats = Vec::new();
        let mut storage_stats = Vec::new();

        for (id, sim_dev) in &self.state.devices {
            let device = self.canvas_state.devices.get(id);
            let name = device.map(|d| d.name().to_string()).unwrap_or_default();
            
            let is_station = matches!(device, Some(crate::models::Device::Station(_)) | Some(crate::models::Device::AssemblyStation(_)) | Some(crate::models::Device::DisassemblyStation(_)));
            if !is_station {
                continue;
            }
            
            let actual_total_proc_time_s: f64 = if let Some(records) = self.state.processing_records.get(id) {
                records.iter()
                    .filter(|r| r.task_type != "工具切换")
                    .map(|r| {
                        if r.end_time_s > 0.0 {
                            r.duration_s
                        } else {
                            self.state.elapsed_s - r.start_time_s
                        }
                    })
                    .sum()
            } else {
                0.0
            };
            
            let completed_count = if let Some(records) = self.state.processing_records.get(id) {
                records.iter().filter(|r| r.end_time_s > 0.0 && r.task_type != "工具切换").count() as i32
            } else {
                0
            };
            
            let utilization = if self.state.elapsed_s > 0.0 {
                (actual_total_proc_time_s / self.state.elapsed_s * 100.0).min(100.0)
            } else {
                0.0
            };

            let avg_time = if completed_count > 0 {
                actual_total_proc_time_s / completed_count as f64
            } else {
                0.0
            };

            let mut by_product: HashMap<String, ProductStatistics> = HashMap::new();
            if let Some(records) = self.state.processing_records.get(id) {
                for record in records.iter().filter(|r| r.end_time_s > 0.0 && r.task_type != "工具切换") {
                    let entry = by_product.entry(record.product_code.clone()).or_insert_with(|| {
                        let product_name = self.canvas_state.products.get(&record.product_code)
                            .map(|p| p.name.clone())
                            .unwrap_or_default();
                        ProductStatistics {
                            product_code: record.product_code.clone(),
                            product_name,
                            count: 0,
                            avg_time_s: 0.0,
                        }
                    });
                    entry.count += 1;
                }
                for stats in by_product.values_mut() {
                    if stats.count > 0 {
                        stats.avg_time_s = avg_time;
                    }
                }
            }

            device_stats.push(DeviceStatistics {
                device_id: id.clone(),
                device_name: name,
                completed: completed_count,
                max_wip: sim_dev.max_wip,
                max_wait_transport: sim_dev.max_wait_transport,
                avg_proc_time_s: avg_time,
                total_proc_time_s: actual_total_proc_time_s,
                utilization,
                by_product,
            });
        }

        for (id, sim_conn) in &self.state.connections {
            let conn = self.canvas_state.connections.get(id);
            let name = conn.map(|c| c.name.clone()).unwrap_or_default();
            let from_device = conn.map(|c| c.from_device_id.clone()).unwrap_or_default();
            let to_device = conn.map(|c| c.to_device_id.clone()).unwrap_or_default();

            let mut total_busy_time = sim_conn.total_busy_time_s;
            if sim_conn.inflight > 0 {
                if let Some(start_time) = sim_conn.busy_start_time {
                    total_busy_time += self.state.elapsed_s - start_time;
                }
            }

            let utilization = if self.state.elapsed_s > 0.0 {
                (total_busy_time / self.state.elapsed_s * 100.0).min(100.0)
            } else {
                0.0
            };

            let from_is_start = self.canvas_state.devices.get(&from_device)
                .map_or(false, |d| d.is_start());
            let to_is_end = self.canvas_state.devices.get(&to_device)
                .map_or(false, |d| d.is_end());

            if from_is_start || to_is_end {
                continue;
            }

            connection_stats.push(ConnectionStatistics {
                connection_id: id.clone(),
                connection_name: name,
                transport_count: sim_conn.pe_count,
                utilization,
                from_device,
                to_device,
            });
        }

        for (id, sim_storage) in &self.state.storage {
            let device = self.canvas_state.devices.get(id);
            let name = device.map(|d| d.name().to_string()).unwrap_or_default();
            
            let capacity = match device {
                Some(crate::models::Device::Warehouse(w)) => w.wh_capacity,
                Some(crate::models::Device::Buffer(b)) => b.max_capacity.unwrap_or(0),
                _ => 0,
            };

            storage_stats.push(StorageStatistics {
                device_id: id.clone(),
                device_name: name,
                stock: sim_storage.stock,
                capacity,
                by_product: HashMap::new(),
                change_records: sim_storage.records.len() as i32,
                max_stock: sim_storage.max_stock,
                max_waiting_entry: sim_storage.max_waiting_entry,
            });
        }

        SimulationResults {
            duration_s: self.state.elapsed_s,
            completed_products: self.state.completed_products,
            completed_products_by_code: self.state.completed_products_by_code.clone(),
            device_stats,
            connection_stats,
            storage_stats,
            material_usage: HashMap::new(),
            processing_records: self.state.processing_records.clone(),
            transport_records: self.state.transport_records.clone(),
            storage_change_records: self.state.storage_change_records.clone(),
            material_consumption: self.state.material_consumption.clone(),
            device_material_consumption: self.state.device_material_consumption.clone(),
            feed_records: self.state.feed_records.clone(),
            max_total_wip: self.state.max_total_wip,
            device_utilization_history: self.state.devices.iter()
                .map(|(id, dev)| (id.clone(), dev.utilization_history.clone()))
                .collect(),
            connection_utilization_history: self.state.connections.iter()
                .filter(|(id, _)| {
                    if let Some(conn) = self.canvas_state.connections.get(*id) {
                        let from_is_start = self.canvas_state.devices.get(&conn.from_device_id)
                            .map_or(false, |d| d.is_start());
                        let to_is_end = self.canvas_state.devices.get(&conn.to_device_id)
                            .map_or(false, |d| d.is_end());
                        !from_is_start && !to_is_end
                    } else {
                        true
                    }
                })
                .map(|(id, conn)| (id.clone(), conn.utilization_history.clone()))
                .collect(),
            storage_utilization_history: self.state.storage.iter()
                .map(|(id, storage)| (id.clone(), storage.utilization_history.clone()))
                .collect(),
            storage_stock_history: self.state.storage.iter()
                .map(|(id, storage)| (id.clone(), storage.stock_history.clone()))
                .collect(),
            end_node_arrival_records: self.state.end_node_arrival_records.clone(),
            product_avg_process_times: self.calculate_product_avg_process_times(),
            simulation_mode: Some(self.state.simulation_mode),
            resource_selection_rule: Some(self.state.resource_selection_rule),
            warehouse_selection_priorities: self.state.warehouse_selection_priorities.clone(),
            wip_queue_records: self.collect_wip_queue_records(),
            product_selection_strategy: Some(self.state.product_selection_strategy),
            consider_product_priority: Some(self.state.consider_product_priority),
        }
    }
    
    fn collect_wip_queue_records(&self) -> HashMap<String, Vec<WipQueueRecord>> {
        let mut result: HashMap<String, Vec<WipQueueRecord>> = HashMap::new();

        for (device_id, sim_dev) in &self.state.devices {
            let device = self.canvas_state.devices.get(device_id);
            let is_station = matches!(device, Some(crate::models::Device::Station(_)) | Some(crate::models::Device::AssemblyStation(_)) | Some(crate::models::Device::DisassemblyStation(_)));
            if !is_station {
                continue;
            }

            let mut records: Vec<WipQueueRecord> = Vec::new();

            let pp_ids: Vec<String> = self.state.process_products.values()
                .filter(|pp| {
                    pp.current_node_id.as_deref() == Some(device_id.as_str())
                        && pp.status != crate::models::ProcessProductStatus::Completed
                })
                .map(|pp| pp.id.clone())
                .collect();

            for pp_id in pp_ids {
                if let Some(pp) = self.state.process_products.get(&pp_id) {
                    let node_visit = pp.node_visits.iter().rev().find(|v| v.node_id == *device_id);
                    let arrive_time = node_visit.map(|v| v.arrive_time_s).unwrap_or(0.0);

                    let dequeue_time = if sim_dev.busy && sim_dev.processing_product.as_deref() == Some(pp_id.as_str()) {
                        if let Some(proc_records) = self.state.processing_records.get(device_id) {
                            proc_records.iter().rev().find(|r| r.process_product_id == pp_id)
                                .map(|r| r.start_time_s)
                        } else {
                            None
                        }
                    } else {
                        None
                    };

                    records.push(WipQueueRecord {
                        process_product_id: pp_id,
                        product_code: pp.product_code.clone(),
                        arrive_time_s: arrive_time,
                        dequeue_time_s: dequeue_time,
                    });
                }
            }

            records.sort_by(|a, b| a.arrive_time_s.partial_cmp(&b.arrive_time_s).unwrap_or(std::cmp::Ordering::Equal));

            if !records.is_empty() {
                result.insert(device_id.clone(), records);
            }
        }

        result
    }

    fn calculate_product_avg_process_times(&self) -> Vec<ProductAvgProcessTime> {
        use std::collections::HashMap as StdHashMap;
        
        let mut product_times: StdHashMap<String, (f64, i32, String, String)> = StdHashMap::new();
        
        for pp in self.state.process_products.values() {
            if pp.status != crate::models::ProcessProductStatus::Completed {
                continue;
            }
            
            let first_station_time = pp.node_visits.iter()
                .skip(1)
                .find(|visit| {
                    if let Some(device) = self.canvas_state.devices.get(&visit.node_id) {
                        matches!(device, crate::models::Device::Station(_) | crate::models::Device::AssemblyStation(_) | crate::models::Device::DisassemblyStation(_))
                    } else {
                        false
                    }
                })
                .map(|visit| visit.arrive_time_s);
            
            let end_time = pp.node_visits.iter()
                .find(|visit| {
                    if let Some(device) = self.canvas_state.devices.get(&visit.node_id) {
                        device.is_end()
                    } else {
                        false
                    }
                })
                .map(|visit| visit.arrive_time_s);
            
            if let (Some(start), Some(end)) = (first_station_time, end_time) {
                let process_time = end - start;
                if process_time > 0.0 {
                    let entry = product_times.entry(pp.product_code.clone()).or_insert((0.0, 0, pp.product_name.clone(), pp.product_color.clone()));
                    entry.0 += process_time;
                    entry.1 += 1;
                }
            }
        }
        
        let mut result: Vec<ProductAvgProcessTime> = product_times
            .into_iter()
            .map(|(product_code, (total_time, count, product_name, product_color))| {
                ProductAvgProcessTime {
                    product_code,
                    product_name,
                    product_color,
                    count,
                    avg_process_time_s: if count > 0 { total_time / count as f64 } else { 0.0 },
                }
            })
            .collect();
        
        result.sort_by(|a, b| a.product_code.cmp(&b.product_code));
        result
    }

    fn calculate_product_routes(&self) -> Vec<crate::models::ProductRoute> {
        let mut routes: Vec<crate::models::ProductRoute> = Vec::new();
        
        let assembly_stations: Vec<(String, String, Vec<String>, Vec<String>)> = self.canvas_state.devices
            .values()
            .filter_map(|device| {
                if let crate::models::Device::AssemblyStation(a) = device {
                    Some((a.base.id.clone(), a.base.name.clone(), a.components.clone(), a.assembly_products.clone()))
                } else {
                    None
                }
            })
            .collect();

        for (assembly_id, assembly_name, components, assembly_products) in &assembly_stations {
            for component_code in components {
                let mut upstream_paths: Vec<Vec<String>> = Vec::new();
                
                let mut visited_upstream: std::collections::HashSet<String> = std::collections::HashSet::new();
                let mut queue: std::collections::VecDeque<Vec<String>> = std::collections::VecDeque::new();
                queue.push_back(vec![assembly_id.clone()]);
                
                while let Some(path) = queue.pop_front() {
                    let first_node = path.first().unwrap().clone();
                    
                    if visited_upstream.contains(&first_node) {
                        continue;
                    }
                    visited_upstream.insert(first_node.clone());
                    
                    if let Some(device) = self.canvas_state.devices.get(&first_node) {
                        if let crate::models::Device::StartNode(sn) = device {
                            if sn.product_code == *component_code {
                                upstream_paths.push(path.clone());
                                continue;
                            }
                        }
                    }
                    
                    let incoming: Vec<_> = self.canvas_state.connections
                        .values()
                        .filter(|c| c.to_device_id == first_node)
                        .collect();
                    
                    for conn in incoming {
                        let from_device_id = &conn.from_device_id;
                        if !path.contains(from_device_id) {
                            let mut new_path = vec![from_device_id.clone()];
                            new_path.extend(path.clone());
                            queue.push_back(new_path);
                        }
                    }
                }
                
                for upstream_path in &upstream_paths {
                    let full_path = upstream_path.clone();
                    let path_names: Vec<String> = full_path.iter()
                        .filter_map(|id| self.canvas_state.devices.get(id).map(|d| d.name().to_string()))
                        .collect();
                    
                    let first_node_id = full_path.first().unwrap().clone();
                    let first_node_name = self.canvas_state.devices.get(&first_node_id)
                        .map(|d| d.name().to_string())
                        .unwrap_or_default();
                    
                    let step_materials: Vec<std::collections::HashMap<String, f64>> = full_path.iter()
                        .filter_map(|id| {
                            if let Some(device) = self.canvas_state.devices.get(id) {
                                if let crate::models::Device::Station(s) = device {
                                    return Some(s.product_materials.get(component_code).cloned().unwrap_or_default());
                                }
                            }
                            None
                        })
                        .collect();
                    
                    routes.push(crate::models::ProductRoute {
                        product_code: component_code.clone(),
                        start_node_id: first_node_id,
                        start_node_name: first_node_name,
                        path: full_path,
                        path_names,
                        end_node_id: Some(assembly_id.clone()),
                        end_node_name: Some(assembly_name.clone()),
                        is_complete: true,
                        step_materials,
                        assembly_node_id: Some(assembly_id.clone()),
                        assembly_node_name: Some(assembly_name.clone()),
                        branch_paths: vec![],
                        route_type: crate::models::RouteType::ComponentToAssembly,
                    });
                }
            }
            
            for product_code in assembly_products {
                let mut downstream_paths: Vec<Vec<String>> = Vec::new();
                let mut visited_downstream: std::collections::HashSet<String> = std::collections::HashSet::new();
                let mut queue: std::collections::VecDeque<Vec<String>> = std::collections::VecDeque::new();
                queue.push_back(vec![assembly_id.clone()]);
                
                while let Some(path) = queue.pop_front() {
                    let last_node = path.last().unwrap().clone();
                    
                    if visited_downstream.contains(&last_node) {
                        continue;
                    }
                    visited_downstream.insert(last_node.clone());
                    
                    if let Some(device) = self.canvas_state.devices.get(&last_node) {
                        if device.is_end() {
                            downstream_paths.push(path.clone());
                            continue;
                        }
                    }
                    
                    let outgoing: Vec<_> = self.canvas_state.connections
                        .values()
                        .filter(|c| c.from_device_id == last_node)
                        .collect();
                    
                    let mut has_valid_downstream = false;
                    for conn in outgoing {
                        let to_device_id = &conn.to_device_id;
                        if let Some(to_device) = self.canvas_state.devices.get(to_device_id) {
                            let can_process = match to_device {
                                crate::models::Device::Station(s) => {
                                    if !s.processable_products.is_empty() {
                                        s.processable_products.contains(product_code)
                                    } else if !s.product_code.is_empty() {
                                        &s.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::AssemblyStation(a) => {
                                    if !a.components.is_empty() {
                                        a.components.contains(product_code)
                                    } else if !a.processable_products.is_empty() {
                                        a.processable_products.contains(product_code)
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::DisassemblyStation(d) => {
                                    d.items_to_disassemble.contains(product_code)
                                }
                                crate::models::Device::EndNode(_) => true,
                                crate::models::Device::Warehouse(w) => {
                                    if !w.processable_products.is_empty() {
                                        w.processable_products.contains(product_code)
                                    } else if !w.product_code.is_empty() {
                                        &w.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::TempStore(t) => {
                                    if !t.processable_products.is_empty() {
                                        t.processable_products.contains(product_code)
                                    } else if !t.product_code.is_empty() {
                                        &t.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::Buffer(b) => {
                                    if !b.processable_products.is_empty() {
                                        b.processable_products.contains(product_code)
                                    } else if !b.product_code.is_empty() {
                                        &b.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::StartNode(_) => false,
                                crate::models::Device::Workshop(_) => false,
                            };
                            
                            if can_process && !path.contains(to_device_id) {
                                let mut new_path = path.clone();
                                new_path.push(to_device_id.clone());
                                queue.push_back(new_path);
                                has_valid_downstream = true;
                            }
                        }
                    }
                    
                    if !has_valid_downstream && path.len() > 1 {
                        downstream_paths.push(path);
                    }
                }
                
                for downstream_path in &downstream_paths {
                    let full_path = downstream_path.clone();
                    let path_names: Vec<String> = full_path.iter()
                        .filter_map(|id| self.canvas_state.devices.get(id).map(|d| d.name().to_string()))
                        .collect();
                    
                    let last_node_id = full_path.last().unwrap();
                    let last_device = self.canvas_state.devices.get(last_node_id);
                    let is_complete = last_device.map_or(false, |d| d.is_end());
                    
                    let end_node_id = if is_complete {
                        Some(last_node_id.clone())
                    } else {
                        None
                    };
                    
                    let end_node_name = if let Some(ref id) = end_node_id {
                        self.canvas_state.devices.get(id).map(|d| d.name().to_string())
                    } else {
                        None
                    };
                    
                    let step_materials: Vec<std::collections::HashMap<String, f64>> = full_path.iter()
                        .filter_map(|id| {
                            if let Some(device) = self.canvas_state.devices.get(id) {
                                if let crate::models::Device::Station(s) = device {
                                    return Some(s.product_materials.get(product_code).cloned().unwrap_or_default());
                                }
                            }
                            None
                        })
                        .collect();
                    
                    routes.push(crate::models::ProductRoute {
                        product_code: product_code.clone(),
                        start_node_id: assembly_id.clone(),
                        start_node_name: assembly_name.clone(),
                        path: full_path,
                        path_names,
                        end_node_id,
                        end_node_name,
                        is_complete,
                        step_materials,
                        assembly_node_id: Some(assembly_id.clone()),
                        assembly_node_name: Some(assembly_name.clone()),
                        branch_paths: vec![],
                        route_type: crate::models::RouteType::AssemblyToEnd,
                    });
                    
                    break;
                }
            }
        }
        
        let start_nodes_with_product: Vec<(String, String, String)> = self.canvas_state.devices
            .values()
            .filter_map(|device| {
                if let crate::models::Device::StartNode(sn) = device {
                    if !sn.product_code.is_empty() {
                        Some((sn.base.id.clone(), sn.base.name.clone(), sn.product_code.clone()))
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .collect();

        for (start_node_id, start_node_name, product_code) in start_nodes_with_product {
            let mut reaches_assembly = false;
            let mut reaches_disassembly = false;
            let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();
            let mut queue: std::collections::VecDeque<String> = std::collections::VecDeque::new();
            queue.push_back(start_node_id.clone());
            
            while let Some(node_id) = queue.pop_front() {
                if visited.contains(&node_id) {
                    continue;
                }
                visited.insert(node_id.clone());
                
                for conn in self.canvas_state.connections.values() {
                    if conn.from_device_id == node_id {
                        if let Some(crate::models::Device::AssemblyStation(a)) = self.canvas_state.devices.get(&conn.to_device_id) {
                            if a.components.contains(&product_code) || a.processable_products.contains(&product_code) {
                                reaches_assembly = true;
                                break;
                            }
                        }
                        if let Some(crate::models::Device::DisassemblyStation(d)) = self.canvas_state.devices.get(&conn.to_device_id) {
                            if d.items_to_disassemble.contains(&product_code) {
                                reaches_disassembly = true;
                                break;
                            }
                        }
                        if !visited.contains(&conn.to_device_id) {
                            queue.push_back(conn.to_device_id.clone());
                        }
                    }
                }
                
                if reaches_assembly || reaches_disassembly {
                    break;
                }
            }
            
            if reaches_assembly {
                continue;
            }
            
            if reaches_disassembly {
                continue;
            }
            
            let mut current_paths: Vec<Vec<String>> = vec![vec![start_node_id.clone()]];
            let mut completed_routes: Vec<Vec<String>> = Vec::new();
            
            while !current_paths.is_empty() {
                let mut new_paths: Vec<Vec<String>> = Vec::new();
                
                for path in current_paths {
                    let last_node_id = path.last().unwrap().clone();
                    
                    if let Some(device) = self.canvas_state.devices.get(&last_node_id) {
                        if device.is_end() {
                            completed_routes.push(path);
                            continue;
                        }
                    }
                    
                    let outgoing: Vec<_> = self.canvas_state.connections
                        .values()
                        .filter(|c| c.from_device_id == last_node_id)
                        .collect();
                    
                    let mut valid_downstreams: Vec<String> = Vec::new();
                    
                    for conn in outgoing {
                        let to_device_id = &conn.to_device_id;
                        if let Some(to_device) = self.canvas_state.devices.get(to_device_id) {
                            let can_process = match to_device {
                                crate::models::Device::Station(s) => {
                                    if !s.processable_products.is_empty() {
                                        s.processable_products.contains(&product_code)
                                    } else if !s.product_code.is_empty() {
                                        &s.product_code == &product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::AssemblyStation(_) => false,
                                crate::models::Device::DisassemblyStation(_) => false,
                                crate::models::Device::EndNode(_) => true,
                                crate::models::Device::Warehouse(w) => {
                                    if !w.processable_products.is_empty() {
                                        w.processable_products.contains(&product_code)
                                    } else if !w.product_code.is_empty() {
                                        &w.product_code == &product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::TempStore(t) => {
                                    if !t.processable_products.is_empty() {
                                        t.processable_products.contains(&product_code)
                                    } else if !t.product_code.is_empty() {
                                        &t.product_code == &product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::Buffer(b) => {
                                    if !b.processable_products.is_empty() {
                                        b.processable_products.contains(&product_code)
                                    } else if !b.product_code.is_empty() {
                                        &b.product_code == &product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::StartNode(_) => false,
                                crate::models::Device::Workshop(_) => false,
                            };
                            
                            if can_process && !path.contains(to_device_id) {
                                valid_downstreams.push(to_device_id.clone());
                            }
                        }
                    }
                    
                    if valid_downstreams.is_empty() {
                        completed_routes.push(path);
                    } else {
                        for downstream_id in valid_downstreams {
                            let mut new_path = path.clone();
                            new_path.push(downstream_id);
                            new_paths.push(new_path);
                        }
                    }
                }
                
                current_paths = new_paths;
            }
            
            for path in completed_routes {
                let last_node_id = path.last().unwrap();
                let last_device = self.canvas_state.devices.get(last_node_id);
                
                let is_complete = last_device.map_or(false, |d| d.is_end());
                
                let end_node_id = if is_complete {
                    Some(last_node_id.clone())
                } else {
                    None
                };
                
                let end_node_name = if let Some(ref id) = end_node_id {
                    self.canvas_state.devices.get(id).map(|d| d.name().to_string())
                } else {
                    None
                };
                
                let path_names: Vec<String> = path.iter()
                    .filter_map(|id| self.canvas_state.devices.get(id).map(|d| d.name().to_string()))
                    .collect();
                
                let step_materials: Vec<std::collections::HashMap<String, f64>> = path.iter()
                    .filter_map(|id| {
                        if let Some(device) = self.canvas_state.devices.get(id) {
                            if let crate::models::Device::Station(s) = device {
                                return Some(s.product_materials.get(&product_code).cloned().unwrap_or_default());
                            }
                        }
                        None
                    })
                    .collect();
                
                routes.push(crate::models::ProductRoute {
                    product_code: product_code.clone(),
                    start_node_id: start_node_id.clone(),
                    start_node_name: start_node_name.clone(),
                    path: path.clone(),
                    path_names,
                    end_node_id,
                    end_node_name,
                    is_complete,
                    step_materials,
                    assembly_node_id: None,
                    assembly_node_name: None,
                    branch_paths: vec![],
                    route_type: crate::models::RouteType::Normal,
                });
            }
        }

        let disassembly_stations: Vec<(String, String, Vec<String>, Vec<String>)> = self.canvas_state.devices
            .values()
            .filter_map(|device| {
                if let crate::models::Device::DisassemblyStation(d) = device {
                    Some((d.base.id.clone(), d.base.name.clone(), d.items_to_disassemble.clone(), d.disassembly_products.clone()))
                } else {
                    None
                }
            })
            .collect();

        for (disassembly_id, disassembly_name, items, disassembly_products) in &disassembly_stations {
            for item_code in items {
                let mut upstream_paths: Vec<Vec<String>> = Vec::new();

                let mut visited_upstream: std::collections::HashSet<String> = std::collections::HashSet::new();
                let mut queue: std::collections::VecDeque<Vec<String>> = std::collections::VecDeque::new();
                queue.push_back(vec![disassembly_id.clone()]);

                while let Some(path) = queue.pop_front() {
                    let first_node = path.first().unwrap().clone();

                    if visited_upstream.contains(&first_node) {
                        continue;
                    }
                    visited_upstream.insert(first_node.clone());

                    if let Some(device) = self.canvas_state.devices.get(&first_node) {
                        if let crate::models::Device::StartNode(sn) = device {
                            if sn.product_code == *item_code {
                                upstream_paths.push(path.clone());
                                continue;
                            }
                        }
                        if let crate::models::Device::DisassemblyStation(ds) = device {
                            if ds.disassembly_products.contains(item_code) && first_node != *disassembly_id {
                                upstream_paths.push(path.clone());
                                continue;
                            }
                        }
                    }

                    let incoming: Vec<_> = self.canvas_state.connections
                        .values()
                        .filter(|c| c.to_device_id == first_node)
                        .collect();

                    for conn in incoming {
                        let from_device_id = &conn.from_device_id;
                        if !path.contains(from_device_id) {
                            let mut new_path = vec![from_device_id.clone()];
                            new_path.extend(path.clone());
                            queue.push_back(new_path);
                        }
                    }
                }

                for upstream_path in &upstream_paths {
                    let full_path = upstream_path.clone();
                    let path_names: Vec<String> = full_path.iter()
                        .filter_map(|id| self.canvas_state.devices.get(id).map(|d| d.name().to_string()))
                        .collect();

                    let first_node_id = full_path.first().unwrap().clone();
                    let first_node_name = self.canvas_state.devices.get(&first_node_id)
                        .map(|d| d.name().to_string())
                        .unwrap_or_default();

                    let step_materials: Vec<std::collections::HashMap<String, f64>> = full_path.iter()
                        .filter_map(|id| {
                            if let Some(device) = self.canvas_state.devices.get(id) {
                                if let crate::models::Device::Station(s) = device {
                                    return Some(s.product_materials.get(item_code).cloned().unwrap_or_default());
                                }
                            }
                            None
                        })
                        .collect();

                    routes.push(crate::models::ProductRoute {
                        product_code: item_code.clone(),
                        start_node_id: first_node_id,
                        start_node_name: first_node_name,
                        path: full_path,
                        path_names,
                        end_node_id: Some(disassembly_id.clone()),
                        end_node_name: Some(disassembly_name.clone()),
                        is_complete: true,
                        step_materials,
                        assembly_node_id: None,
                        assembly_node_name: None,
                        branch_paths: vec![],
                        route_type: crate::models::RouteType::InputToDisassembly,
                    });
                }
            }

            for product_code in disassembly_products {
                let mut downstream_paths: Vec<Vec<String>> = Vec::new();
                let mut visited_downstream: std::collections::HashSet<String> = std::collections::HashSet::new();
                let mut queue: std::collections::VecDeque<Vec<String>> = std::collections::VecDeque::new();
                queue.push_back(vec![disassembly_id.clone()]);

                while let Some(path) = queue.pop_front() {
                    let last_node = path.last().unwrap().clone();

                    if visited_downstream.contains(&last_node) {
                        continue;
                    }
                    visited_downstream.insert(last_node.clone());

                    if let Some(device) = self.canvas_state.devices.get(&last_node) {
                        if device.is_end() {
                            downstream_paths.push(path.clone());
                            continue;
                        }
                    }

                    let outgoing: Vec<_> = self.canvas_state.connections
                        .values()
                        .filter(|c| c.from_device_id == last_node)
                        .collect();

                    let mut has_valid_downstream = false;
                    for conn in outgoing {
                        let to_device_id = &conn.to_device_id;
                        if let Some(to_device) = self.canvas_state.devices.get(to_device_id) {
                            let can_process = match to_device {
                                crate::models::Device::Station(s) => {
                                    if !s.processable_products.is_empty() {
                                        s.processable_products.contains(product_code)
                                    } else if !s.product_code.is_empty() {
                                        &s.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::AssemblyStation(a) => {
                                    if !a.components.is_empty() {
                                        a.components.contains(product_code)
                                    } else if !a.processable_products.is_empty() {
                                        a.processable_products.contains(product_code)
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::DisassemblyStation(d) => {
                                    d.items_to_disassemble.contains(product_code)
                                }
                                crate::models::Device::EndNode(_) => true,
                                crate::models::Device::Warehouse(w) => {
                                    if !w.processable_products.is_empty() {
                                        w.processable_products.contains(product_code)
                                    } else if !w.product_code.is_empty() {
                                        &w.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::TempStore(t) => {
                                    if !t.processable_products.is_empty() {
                                        t.processable_products.contains(product_code)
                                    } else if !t.product_code.is_empty() {
                                        &t.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::Buffer(b) => {
                                    if !b.processable_products.is_empty() {
                                        b.processable_products.contains(product_code)
                                    } else if !b.product_code.is_empty() {
                                        &b.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                crate::models::Device::StartNode(_) => false,
                                crate::models::Device::Workshop(_) => false,
                            };

                            if can_process && !path.contains(to_device_id) {
                                let mut new_path = path.clone();
                                new_path.push(to_device_id.clone());
                                queue.push_back(new_path);
                                has_valid_downstream = true;
                            }
                        }
                    }

                    if !has_valid_downstream && path.len() > 1 {
                        downstream_paths.push(path);
                    }
                }

                for downstream_path in &downstream_paths {
                    let full_path = downstream_path.clone();
                    let path_names: Vec<String> = full_path.iter()
                        .filter_map(|id| self.canvas_state.devices.get(id).map(|d| d.name().to_string()))
                        .collect();

                    let last_node_id = full_path.last().unwrap();
                    let last_device = self.canvas_state.devices.get(last_node_id);
                    let is_complete = last_device.map_or(false, |d| d.is_end());

                    let end_node_id = if is_complete {
                        Some(last_node_id.clone())
                    } else {
                        None
                    };

                    let end_node_name = if let Some(ref id) = end_node_id {
                        self.canvas_state.devices.get(id).map(|d| d.name().to_string())
                    } else {
                        None
                    };

                    let step_materials: Vec<std::collections::HashMap<String, f64>> = full_path.iter()
                        .filter_map(|id| {
                            if let Some(device) = self.canvas_state.devices.get(id) {
                                if let crate::models::Device::Station(s) = device {
                                    return Some(s.product_materials.get(product_code).cloned().unwrap_or_default());
                                }
                            }
                            None
                        })
                        .collect();

                    routes.push(crate::models::ProductRoute {
                        product_code: product_code.clone(),
                        start_node_id: disassembly_id.clone(),
                        start_node_name: disassembly_name.clone(),
                        path: full_path,
                        path_names,
                        end_node_id,
                        end_node_name,
                        is_complete,
                        step_materials,
                        assembly_node_id: None,
                        assembly_node_name: None,
                        branch_paths: vec![],
                        route_type: crate::models::RouteType::DisassemblyOutput,
                    });

                    break;
                }
            }
        }
        
        routes
    }
}
