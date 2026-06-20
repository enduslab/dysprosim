use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ShapeType {
    Rect,
    Circle,
    Ellipse,
    Diamond,
    Tri,
    Trap,
    InvertedTrap,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FeedMode {
    Idle,
    Paced,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum DistributionType {
    #[default]
    Normal,
    Triangular,
    Uniform,
    Exponential,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProductProcessTime {
    #[serde(default)]
    pub dist_type: DistributionType,
    pub avg_time_s: Option<f64>,
    pub stddev_s: Option<f64>,
    pub min_time_s: Option<f64>,
    pub max_time_s: Option<f64>,
    pub mode_time_s: Option<f64>,
    pub uniform_min_s: Option<f64>,
    pub uniform_max_s: Option<f64>,
    pub exp_mean_s: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum IncomingRule {
    Immediate,
    CollectAll,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CapacityMode {
    Fixed,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TransportMode {
    Continuous,
    Discrete,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ReleaseMode {
    #[default]
    Immediate,
    WaitForIdle,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ResourceSelectionRule {
    Basic,
    MinWipDynamic,
    MinUtilrateDynamic,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum SimulationMode {
    #[default]
    FixedDuration,
    FixedOutput,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum SimulationTimeUnit {
    Seconds,
    Minutes,
    Hours,
    #[default]
    Days,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum TransportSpeedTimeUnit {
    #[default]
    Seconds,
    Minutes,
    Hours,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum SimulationCompletionStatus {
    #[default]
    Normal,
    TargetReachedEarly,
    DeadlineNotMet,
    OnTime,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LineStyle {
    Straight,
    Curve,
    FreePolyline,
    Elbow,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WarehouseSelectionPriority {
    NearestDistance,
    FarthestDistance,
    LowestUtilization,
    HighestUtilization,
    ProductConcentrated,
    ProductDispersed,
    LeastWaitingEntry,
}

impl WarehouseSelectionPriority {
    pub fn is_conflict_with(&self, other: &Self) -> bool {
        matches!(
            (self, other),
            (Self::NearestDistance, Self::FarthestDistance)
            | (Self::FarthestDistance, Self::NearestDistance)
            | (Self::LowestUtilization, Self::HighestUtilization)
            | (Self::HighestUtilization, Self::LowestUtilization)
            | (Self::ProductConcentrated, Self::ProductDispersed)
            | (Self::ProductDispersed, Self::ProductConcentrated)
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceBase {
    pub id: String,
    pub shape_type: ShapeType,
    pub x_mm: f64,
    pub y_mm: f64,
    pub params: HashMap<String, f64>,
    pub fill: String,
    pub outline: String,
    pub equip_id: String,
    pub name: String,
    pub desc: String,
    pub tag: String,
    #[serde(default)]
    pub workshop_id: Option<String>,
    #[serde(default)]
    pub workshop_top: Option<f64>,
    #[serde(default)]
    pub workshop_bottom: Option<f64>,
    #[serde(default)]
    pub workshop_left: Option<f64>,
    #[serde(default)]
    pub workshop_right: Option<f64>,
}

impl DeviceBase {
    pub fn new(shape_type: ShapeType, x_mm: f64, y_mm: f64, params: HashMap<String, f64>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            shape_type,
            x_mm,
            y_mm,
            params,
            fill: "#FFFFFF".to_string(),
            outline: "#334155".to_string(),
            equip_id: String::new(),
            name: String::new(),
            desc: String::new(),
            tag: String::new(),
            workshop_id: None,
            workshop_top: None,
            workshop_bottom: None,
            workshop_left: None,
            workshop_right: None,
        }
    }

    pub fn bbox_mm(&self) -> (f64, f64) {
        match self.shape_type {
            ShapeType::Rect => {
                let w = self.params.get("width").copied().unwrap_or(800.0);
                let h = self.params.get("height").copied().unwrap_or(600.0);
                (w, h)
            }
            ShapeType::Circle => {
                let d = self.params.get("diameter").copied().unwrap_or(600.0);
                (d, d)
            }
            ShapeType::Ellipse => {
                let w = self.params.get("width").copied().unwrap_or(800.0);
                let h = self.params.get("height").copied().unwrap_or(600.0);
                (w, h)
            }
            ShapeType::Diamond => {
                let side = self.params.get("side").copied().unwrap_or(400.0);
                let diag = side * 2.0_f64.sqrt();
                (diag, diag)
            }
            ShapeType::Tri => {
                let base = self.params.get("base").copied().unwrap_or(800.0);
                let h = self.params.get("height").copied().unwrap_or(600.0);
                (base, h)
            }
            ShapeType::Trap => {
                let top = self.params.get("top").copied().unwrap_or(600.0);
                let bottom = self.params.get("bottom").copied().unwrap_or(900.0);
                let h = self.params.get("height").copied().unwrap_or(600.0);
                (top.max(bottom), h)
            }
            ShapeType::InvertedTrap => {
                let top = self.params.get("top").copied().unwrap_or(600.0);
                let bottom = self.params.get("bottom").copied().unwrap_or(900.0);
                let h = self.params.get("height").copied().unwrap_or(600.0);
                (top.max(bottom), h)
            }
        }
    }

    pub fn center_mm(&self) -> (f64, f64) {
        let (w, h) = self.bbox_mm();
        (self.x_mm + w / 2.0, self.y_mm + h / 2.0)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartNode {
    #[serde(flatten)]
    pub base: DeviceBase,
    pub product_code: String,
    pub product_name: String,
    pub product_color: String,
    pub feed_mode: FeedMode,
    pub feed_interval_s: f64,
    pub feed_status: String,
}

impl StartNode {
    pub fn new(x_mm: f64, y_mm: f64) -> Self {
        let mut params = HashMap::new();
        params.insert("diameter".to_string(), 400.0);
        params.insert("rotation_deg".to_string(), 0.0);
        
        Self {
            base: DeviceBase {
                id: Uuid::new_v4().to_string(),
                shape_type: ShapeType::Circle,
                x_mm,
                y_mm,
                params,
                fill: "#D1FAE5".to_string(),
                outline: "#10B981".to_string(),
                equip_id: String::new(),
                name: String::new(),
                desc: String::new(),
                tag: String::new(),
                workshop_id: None,
                workshop_top: None,
                workshop_bottom: None,
                workshop_left: None,
                workshop_right: None,
            },
            product_code: String::new(),
            product_name: String::new(),
            product_color: String::new(),
            feed_mode: FeedMode::Idle,
            feed_interval_s: 1.0,
            feed_status: "投料中".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndNode {
    #[serde(flatten)]
    pub base: DeviceBase,
    #[serde(default)]
    pub target_outputs: HashMap<String, i32>,
}

impl EndNode {
    pub fn new(x_mm: f64, y_mm: f64) -> Self {
        let mut params = HashMap::new();
        params.insert("side".to_string(), 300.0);
        params.insert("rotation_deg".to_string(), 0.0);
        
        Self {
            base: DeviceBase {
                id: Uuid::new_v4().to_string(),
                shape_type: ShapeType::Diamond,
                x_mm,
                y_mm,
                params,
                fill: "#EDE9FE".to_string(),
                outline: "#8B5CF6".to_string(),
                equip_id: String::new(),
                name: String::new(),
                desc: String::new(),
                tag: String::new(),
                workshop_id: None,
                workshop_top: None,
                workshop_bottom: None,
                workshop_left: None,
                workshop_right: None,
            },
            target_outputs: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Station {
    #[serde(flatten)]
    pub base: DeviceBase,
    pub product_code: String,
    pub product_name: String,
    pub product_color: String,
    pub processable_products: Vec<String>,
    pub incoming_rule: IncomingRule,
    pub dist_type: DistributionType,
    pub avg_time_s: Option<f64>,
    pub stddev_s: Option<f64>,
    pub min_time_s: Option<f64>,
    pub max_time_s: Option<f64>,
    pub mode_time_s: Option<f64>,
    pub uniform_min_s: Option<f64>,
    pub uniform_max_s: Option<f64>,
    pub exp_mean_s: Option<f64>,
    pub required_materials: HashMap<String, f64>,
    #[serde(default)]
    pub product_materials: HashMap<String, HashMap<String, f64>>,
    #[serde(default)]
    pub product_process_times: HashMap<String, ProductProcessTime>,
    #[serde(default)]
    pub product_tools: HashMap<String, HashMap<String, f64>>,
}

impl Station {
    pub fn new(shape_type: ShapeType, x_mm: f64, y_mm: f64, params: HashMap<String, f64>) -> Self {
        Self {
            base: DeviceBase::new(shape_type, x_mm, y_mm, params),
            product_code: String::new(),
            product_name: String::new(),
            product_color: String::new(),
            processable_products: Vec::new(),
            incoming_rule: IncomingRule::Immediate,
            dist_type: DistributionType::Normal,
            avg_time_s: Some(1.0),
            stddev_s: None,
            min_time_s: None,
            max_time_s: None,
            mode_time_s: None,
            uniform_min_s: None,
            uniform_max_s: None,
            exp_mean_s: None,
            required_materials: HashMap::new(),
            product_materials: HashMap::new(),
            product_process_times: HashMap::new(),
            product_tools: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssemblyStation {
    #[serde(flatten)]
    pub base: DeviceBase,
    #[serde(default)]
    pub processable_products: Vec<String>,
    #[serde(default)]
    pub components: Vec<String>,
    #[serde(default)]
    pub assembly_products: Vec<String>,
    pub dist_type: DistributionType,
    pub avg_time_s: Option<f64>,
    pub stddev_s: Option<f64>,
    pub min_time_s: Option<f64>,
    pub max_time_s: Option<f64>,
    pub mode_time_s: Option<f64>,
    pub uniform_min_s: Option<f64>,
    pub uniform_max_s: Option<f64>,
    pub exp_mean_s: Option<f64>,
    #[serde(default)]
    pub product_process_times: HashMap<String, ProductProcessTime>,
    #[serde(default)]
    pub product_tools: HashMap<String, HashMap<String, f64>>,
    #[serde(default)]
    pub product_upstream_requirements: HashMap<String, HashMap<String, i32>>,
}

impl AssemblyStation {
    pub fn new(x_mm: f64, y_mm: f64) -> Self {
        let mut params = HashMap::new();
        params.insert("top_width".to_string(), 300.0);
        params.insert("bottom_width".to_string(), 500.0);
        params.insert("height".to_string(), 200.0);
        params.insert("rotation_deg".to_string(), 0.0);
        
        Self {
            base: DeviceBase::new(ShapeType::Trap, x_mm, y_mm, params),
            processable_products: Vec::new(),
            components: Vec::new(),
            assembly_products: Vec::new(),
            dist_type: DistributionType::Normal,
            avg_time_s: Some(1.0),
            stddev_s: None,
            min_time_s: None,
            max_time_s: None,
            mode_time_s: None,
            uniform_min_s: None,
            uniform_max_s: None,
            exp_mean_s: None,
            product_process_times: HashMap::new(),
            product_tools: HashMap::new(),
            product_upstream_requirements: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisassemblyStation {
    #[serde(flatten)]
    pub base: DeviceBase,
    #[serde(default)]
    pub items_to_disassemble: Vec<String>,
    #[serde(default)]
    pub disassembly_products: Vec<String>,
    pub dist_type: DistributionType,
    pub avg_time_s: Option<f64>,
    pub stddev_s: Option<f64>,
    pub min_time_s: Option<f64>,
    pub max_time_s: Option<f64>,
    pub mode_time_s: Option<f64>,
    pub uniform_min_s: Option<f64>,
    pub uniform_max_s: Option<f64>,
    pub exp_mean_s: Option<f64>,
    #[serde(default)]
    pub product_process_times: HashMap<String, ProductProcessTime>,
    #[serde(default)]
    pub product_tools: HashMap<String, HashMap<String, f64>>,
    #[serde(default)]
    pub product_disassembly_requirements: HashMap<String, HashMap<String, i32>>,
}

impl DisassemblyStation {
    pub fn new(x_mm: f64, y_mm: f64) -> Self {
        let mut params = HashMap::new();
        params.insert("top_width".to_string(), 500.0);
        params.insert("bottom_width".to_string(), 300.0);
        params.insert("height".to_string(), 200.0);
        params.insert("rotation_deg".to_string(), 0.0);

        Self {
            base: DeviceBase::new(ShapeType::InvertedTrap, x_mm, y_mm, params),
            items_to_disassemble: Vec::new(),
            disassembly_products: Vec::new(),
            dist_type: DistributionType::Normal,
            avg_time_s: Some(1.0),
            stddev_s: None,
            min_time_s: None,
            max_time_s: None,
            mode_time_s: None,
            uniform_min_s: None,
            uniform_max_s: None,
            exp_mean_s: None,
            product_process_times: HashMap::new(),
            product_tools: HashMap::new(),
            product_disassembly_requirements: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Warehouse {
    #[serde(flatten)]
    pub base: DeviceBase,
    pub product_code: String,
    pub product_name: String,
    pub product_color: String,
    pub wh_capacity: i32,
    #[serde(default)]
    pub release_mode: ReleaseMode,
    #[serde(default)]
    pub processable_products: Vec<String>,
}

impl Warehouse {
    pub fn new(x_mm: f64, y_mm: f64) -> Self {
        let mut params = HashMap::new();
        params.insert("top".to_string(), 600.0);
        params.insert("bottom".to_string(), 900.0);
        params.insert("height".to_string(), 600.0);
        params.insert("rotation_deg".to_string(), 0.0);
        
        Self {
            base: DeviceBase {
                id: Uuid::new_v4().to_string(),
                shape_type: ShapeType::Trap,
                x_mm,
                y_mm,
                params,
                fill: "#FFFFFF".to_string(),
                outline: "#64748B".to_string(),
                equip_id: String::new(),
                name: String::new(),
                desc: String::new(),
                tag: String::new(),
                workshop_id: None,
                workshop_top: None,
                workshop_bottom: None,
                workshop_left: None,
                workshop_right: None,
            },
            product_code: String::new(),
            product_name: String::new(),
            product_color: String::new(),
            wh_capacity: 0,
            release_mode: ReleaseMode::Immediate,
            processable_products: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempStore {
    #[serde(flatten)]
    pub base: DeviceBase,
    pub product_code: String,
    pub product_name: String,
    pub product_color: String,
    #[serde(default)]
    pub release_mode: ReleaseMode,
    #[serde(default)]
    pub processable_products: Vec<String>,
}

impl TempStore {
    pub fn new(x_mm: f64, y_mm: f64) -> Self {
        let mut params = HashMap::new();
        params.insert("base".to_string(), 800.0);
        params.insert("height".to_string(), 600.0);
        params.insert("rotation_deg".to_string(), 0.0);
        
        Self {
            base: DeviceBase {
                id: Uuid::new_v4().to_string(),
                shape_type: ShapeType::Tri,
                x_mm,
                y_mm,
                params,
                fill: "#FFFFFF".to_string(),
                outline: "#64748B".to_string(),
                equip_id: String::new(),
                name: String::new(),
                desc: String::new(),
                tag: String::new(),
                workshop_id: None,
                workshop_top: None,
                workshop_bottom: None,
                workshop_left: None,
                workshop_right: None,
            },
            product_code: String::new(),
            product_name: String::new(),
            product_color: String::new(),
            release_mode: ReleaseMode::Immediate,
            processable_products: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Buffer {
    #[serde(flatten)]
    pub base: DeviceBase,
    pub product_code: String,
    pub product_name: String,
    pub product_color: String,
    pub capacity_mode: CapacityMode,
    pub max_capacity: Option<i32>,
    pub buffer_duration_s: Option<f64>,
    pub current_stock: i32,
    pub start_node_ids: String,
    #[serde(default)]
    pub processable_products: Vec<String>,
}

impl Buffer {
    pub fn new(x_mm: f64, y_mm: f64) -> Self {
        let mut params = HashMap::new();
        params.insert("width".to_string(), 800.0);
        params.insert("height".to_string(), 400.0);
        params.insert("rotation_deg".to_string(), 0.0);
        
        Self {
            base: DeviceBase {
                id: Uuid::new_v4().to_string(),
                shape_type: ShapeType::Rect,
                x_mm,
                y_mm,
                params,
                fill: "#FFFFFF".to_string(),
                outline: "#64748B".to_string(),
                equip_id: String::new(),
                name: String::new(),
                desc: String::new(),
                tag: String::new(),
                workshop_id: None,
                workshop_top: None,
                workshop_bottom: None,
                workshop_left: None,
                workshop_right: None,
            },
            product_code: String::new(),
            product_name: String::new(),
            product_color: String::new(),
            capacity_mode: CapacityMode::Fixed,
            max_capacity: None,
            buffer_duration_s: None,
            current_stock: 0,
            start_node_ids: String::new(),
            processable_products: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workshop {
    #[serde(flatten)]
    pub base: DeviceBase,
    pub width_mm: f64,
    pub height_mm: f64,
}

impl Workshop {
    pub fn new(x_mm: f64, y_mm: f64, width_mm: f64, height_mm: f64, workshop_number: i32) -> Self {
        let mut params = HashMap::new();
        params.insert("width".to_string(), width_mm);
        params.insert("height".to_string(), height_mm);
        params.insert("rotation_deg".to_string(), 0.0);
        
        let workshop_id = format!("WORKSHOP{:02}", workshop_number);
        let workshop_name = format!("厂房{:02}", workshop_number);
        
        Self {
            base: DeviceBase {
                id: workshop_id,
                shape_type: ShapeType::Rect,
                x_mm,
                y_mm,
                params,
                fill: "#F8FAFC".to_string(),
                outline: "#64748B".to_string(),
                equip_id: String::new(),
                name: workshop_name,
                desc: String::new(),
                tag: String::new(),
                workshop_id: None,
                workshop_top: None,
                workshop_bottom: None,
                workshop_left: None,
                workshop_right: None,
            },
            width_mm,
            height_mm,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Device {
    StartNode(StartNode),
    EndNode(EndNode),
    Station(Station),
    AssemblyStation(AssemblyStation),
    DisassemblyStation(DisassemblyStation),
    Warehouse(Warehouse),
    TempStore(TempStore),
    Buffer(Buffer),
    Workshop(Workshop),
}

impl Device {
    pub fn id(&self) -> &str {
        match self {
            Device::StartNode(d) => &d.base.id,
            Device::EndNode(d) => &d.base.id,
            Device::Station(d) => &d.base.id,
            Device::AssemblyStation(d) => &d.base.id,
            Device::DisassemblyStation(d) => &d.base.id,
            Device::Warehouse(d) => &d.base.id,
            Device::TempStore(d) => &d.base.id,
            Device::Buffer(d) => &d.base.id,
            Device::Workshop(d) => &d.base.id,
        }
    }

    pub fn name(&self) -> &str {
        match self {
            Device::StartNode(d) => &d.base.name,
            Device::EndNode(d) => &d.base.name,
            Device::Station(d) => &d.base.name,
            Device::AssemblyStation(d) => &d.base.name,
            Device::DisassemblyStation(d) => &d.base.name,
            Device::Warehouse(d) => &d.base.name,
            Device::TempStore(d) => &d.base.name,
            Device::Buffer(d) => &d.base.name,
            Device::Workshop(d) => &d.base.name,
        }
    }

    pub fn equip_id(&self) -> &str {
        match self {
            Device::StartNode(d) => &d.base.equip_id,
            Device::EndNode(d) => &d.base.equip_id,
            Device::Station(d) => &d.base.equip_id,
            Device::AssemblyStation(d) => &d.base.equip_id,
            Device::DisassemblyStation(d) => &d.base.equip_id,
            Device::Warehouse(d) => &d.base.equip_id,
            Device::TempStore(d) => &d.base.equip_id,
            Device::Buffer(d) => &d.base.equip_id,
            Device::Workshop(d) => &d.base.equip_id,
        }
    }

    pub fn position(&self) -> (f64, f64) {
        match self {
            Device::StartNode(d) => (d.base.x_mm, d.base.y_mm),
            Device::EndNode(d) => (d.base.x_mm, d.base.y_mm),
            Device::Station(d) => (d.base.x_mm, d.base.y_mm),
            Device::AssemblyStation(d) => (d.base.x_mm, d.base.y_mm),
            Device::DisassemblyStation(d) => (d.base.x_mm, d.base.y_mm),
            Device::Warehouse(d) => (d.base.x_mm, d.base.y_mm),
            Device::TempStore(d) => (d.base.x_mm, d.base.y_mm),
            Device::Buffer(d) => (d.base.x_mm, d.base.y_mm),
            Device::Workshop(d) => (d.base.x_mm, d.base.y_mm),
        }
    }

    pub fn bbox(&self) -> (f64, f64) {
        match self {
            Device::StartNode(d) => d.base.bbox_mm(),
            Device::EndNode(d) => d.base.bbox_mm(),
            Device::Station(d) => d.base.bbox_mm(),
            Device::AssemblyStation(d) => d.base.bbox_mm(),
            Device::DisassemblyStation(d) => d.base.bbox_mm(),
            Device::Warehouse(d) => d.base.bbox_mm(),
            Device::TempStore(d) => d.base.bbox_mm(),
            Device::Buffer(d) => d.base.bbox_mm(),
            Device::Workshop(d) => d.base.bbox_mm(),
        }
    }

    pub fn center(&self) -> (f64, f64) {
        let (x, y) = self.position();
        let (w, h) = self.bbox();
        (x + w / 2.0, y + h / 2.0)
    }

    pub fn is_start(&self) -> bool {
        matches!(self, Device::StartNode(_))
    }

    pub fn is_end(&self) -> bool {
        matches!(self, Device::EndNode(_))
    }

    pub fn is_station(&self) -> bool {
        matches!(self, Device::Station(_))
    }

    pub fn is_assembly_station(&self) -> bool {
        matches!(self, Device::AssemblyStation(_))
    }

    pub fn is_disassembly_station(&self) -> bool {
        matches!(self, Device::DisassemblyStation(_))
    }

    pub fn is_warehouse(&self) -> bool {
        matches!(self, Device::Warehouse(_))
    }

    pub fn is_temp_store(&self) -> bool {
        matches!(self, Device::TempStore(_))
    }

    pub fn is_buffer(&self) -> bool {
        matches!(self, Device::Buffer(_))
    }

    pub fn is_workshop(&self) -> bool {
        matches!(self, Device::Workshop(_))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub from_device_id: String,
    pub from_anchor_index: i32,
    pub to_device_id: String,
    pub to_anchor_index: i32,
    pub name: String,
    pub length_mm: Option<f64>,
    pub auto_chain: bool,
    pub continuous_transport: bool,
    pub is_end_link: bool,
    pub transport_speed_mps: f64,
    #[serde(default)]
    pub transport_speed_time_unit: TransportSpeedTimeUnit,
    pub transport_mode: TransportMode,
    pub max_transport_count: i32,
    pub unlimited_transport: bool,
    pub cart_count: i32,
    pub cart_capacity: i32,
    pub line_style: LineStyle,
    pub curve_control_x: Option<f64>,
    pub curve_control_y: Option<f64>,
    pub intermediate_points: Vec<(f64, f64)>,
    #[serde(default)]
    pub elbow_offset: Option<f64>,
}

impl Connection {
    pub fn new(from_device_id: String, to_device_id: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            from_device_id,
            from_anchor_index: 0,
            to_device_id,
            to_anchor_index: 0,
            name: String::new(),
            length_mm: None,
            auto_chain: false,
            continuous_transport: true,
            is_end_link: false,
            transport_speed_mps: 1.0,
            transport_speed_time_unit: TransportSpeedTimeUnit::Seconds,
            transport_mode: TransportMode::Continuous,
            max_transport_count: 1,
            unlimited_transport: true,
            cart_count: 1,
            cart_capacity: 1,
            line_style: LineStyle::Elbow,
            curve_control_x: None,
            curve_control_y: None,
            intermediate_points: Vec::new(),
            elbow_offset: None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ProductSelectionStrategy {
    #[default]
    FirstComeFirstServed,
    SameTypePriorityWithTool,
    SameToolPriority,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub code: String,
    pub name: String,
    pub color: String,
    #[serde(default)]
    pub bom: HashMap<String, f64>,
    #[serde(default)]
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Material {
    pub code: String,
    pub name: String,
    #[serde(default)]
    pub unit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub code: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub grid_step_mm: f64,
    pub show_grid: bool,
    pub show_rulers: bool,
    pub snap_threshold_mm: f64,
    #[serde(default = "default_daily_work_hours")]
    pub daily_work_hours: f64,
}

fn default_daily_work_hours() -> f64 { 8.0 }

impl Default for Settings {
    fn default() -> Self {
        Self {
            grid_step_mm: 100.0,
            show_grid: true,
            show_rulers: true,
            snap_threshold_mm: 20.0,
            daily_work_hours: 8.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationRecord {
    pub id: String,
    pub timestamp: String,
    pub duration_s: f64,
    pub completed_products: i32,
    pub results: crate::simulation::SimulationResults,
    pub process_products: Vec<ProcessProduct>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessProductStatus {
    WaitingForProcessing,
    Processing,
    WaitingForTransport,
    InTransit,
    WaitingForStorage,
    Stored,
    Buffering,
    TempStored,
    Completed,
    Consumed,
}

impl std::fmt::Display for ProcessProductStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProcessProductStatus::WaitingForProcessing => write!(f, "等待加工"),
            ProcessProductStatus::Processing => write!(f, "加工中"),
            ProcessProductStatus::WaitingForTransport => write!(f, "等待运输"),
            ProcessProductStatus::InTransit => write!(f, "运输中"),
            ProcessProductStatus::WaitingForStorage => write!(f, "等待入库"),
            ProcessProductStatus::Stored => write!(f, "已入库"),
            ProcessProductStatus::Buffering => write!(f, "缓存中"),
            ProcessProductStatus::TempStored => write!(f, "临时入库"),
            ProcessProductStatus::Completed => write!(f, "已完成"),
            ProcessProductStatus::Consumed => write!(f, "已消耗"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeVisit {
    pub node_id: String,
    pub node_name: String,
    pub arrive_time_s: f64,
    pub leave_time_s: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionVisit {
    pub connection_id: String,
    pub connection_name: String,
    pub arrive_time_s: f64,
    pub leave_time_s: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessProduct {
    pub id: String,
    pub product_code: String,
    pub product_name: String,
    pub product_color: String,
    pub status: ProcessProductStatus,
    pub current_node_id: Option<String>,
    pub current_connection_id: Option<String>,
    pub node_visits: Vec<NodeVisit>,
    pub connection_visits: Vec<ConnectionVisit>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasState {
    pub width_mm: f64,
    pub height_mm: f64,
    pub devices: HashMap<String, Device>,
    pub connections: HashMap<String, Connection>,
    pub products: HashMap<String, Product>,
    pub materials: HashMap<String, Material>,
    pub tools: HashMap<String, Tool>,
    pub settings: Settings,
    #[serde(default)]
    pub simulation_records: Vec<SimulationRecord>,
    #[serde(rename = "device_connection_counter", default)]
    pub device_counters: HashMap<String, i32>,
    #[serde(default)]
    pub connection_counter: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndNodeArrivalRecord {
    pub process_product_id: String,
    pub product_code: String,
    pub product_name: String,
    pub product_color: String,
    pub arrive_time_s: f64,
    pub node_visits: Vec<NodeVisit>,
}

impl Default for CanvasState {
    fn default() -> Self {
        Self {
            width_mm: 8000.0,
            height_mm: 8000.0,
            devices: HashMap::new(),
            connections: HashMap::new(),
            products: HashMap::new(),
            materials: HashMap::new(),
            tools: HashMap::new(),
            settings: Settings::default(),
            simulation_records: Vec::new(),
            device_counters: HashMap::new(),
            connection_counter: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationParams {
    pub resource_selection_rule: ResourceSelectionRule,
    pub product_selection_strategy: ProductSelectionStrategy,
    pub consider_product_priority: bool,
    pub warehouse_selection_priorities: Vec<WarehouseSelectionPriority>,
    pub utilization_sample_interval_s: f64,
    pub simulation_mode: SimulationMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutData {
    pub canvas_width_mm: f64,
    pub canvas_height_mm: f64,
    pub devices: Vec<Device>,
    pub connections: Vec<Connection>,
    pub products: Vec<Product>,
    pub materials: Vec<Material>,
    pub tools: Vec<Tool>,
    pub settings: Settings,
    #[serde(default)]
    pub simulation_records: Vec<SimulationRecord>,
    #[serde(default)]
    pub simulation_params: Option<SimulationParams>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchPath {
    pub from_node_id: String,
    pub from_node_name: String,
    pub path: Vec<String>,
    pub path_names: Vec<String>,
    pub required_quantity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RouteType {
    Normal,
    ComponentToAssembly,
    AssemblyToEnd,
    InputToDisassembly,
    DisassemblyOutput,
}

impl Default for RouteType {
    fn default() -> Self {
        RouteType::Normal
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductRoute {
    pub product_code: String,
    pub start_node_id: String,
    pub start_node_name: String,
    pub path: Vec<String>,
    pub path_names: Vec<String>,
    pub end_node_id: Option<String>,
    pub end_node_name: Option<String>,
    pub is_complete: bool,
    #[serde(default)]
    pub step_materials: Vec<HashMap<String, f64>>,
    #[serde(default)]
    pub assembly_node_id: Option<String>,
    #[serde(default)]
    pub assembly_node_name: Option<String>,
    #[serde(default)]
    pub branch_paths: Vec<BranchPath>,
    #[serde(default)]
    pub route_type: RouteType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductRouteCheckResult {
    pub all_start_nodes_have_product: bool,
    pub start_nodes_without_product: Vec<StartNodeInfo>,
    pub routes: Vec<ProductRoute>,
    pub incomplete_route_start_nodes: Vec<StartNodeInfo>,
    #[serde(default)]
    pub assembly_station_errors: Vec<AssemblyStationError>,
    #[serde(default)]
    pub disassembly_station_errors: Vec<DisassemblyStationError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssemblyStationError {
    pub id: String,
    pub name: String,
    pub error_type: AssemblyStationErrorType,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    #[serde(default)]
    pub component_code: Option<String>,
    #[serde(default)]
    pub component_name: Option<String>,
    #[serde(default)]
    pub upstream_node_id: Option<String>,
    #[serde(default)]
    pub upstream_node_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AssemblyStationErrorType {
    NoProductSelected,
    NoComponentSelected,
    NoAssemblyProductSelected,
    UpstreamQuantityZero,
    ComponentQuantityZero,
    NoComponentForProduct,
    ComponentUnreachable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartNodeInfo {
    pub id: String,
    pub name: String,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DisassemblyStationErrorType {
    NoItemToDisassemble,
    NoDisassemblyProduct,
    NoProductForItem,
    DisassemblyProductQuantityZero,
    ItemUnreachable,
    AssemblyProductAsItem,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisassemblyStationError {
    pub id: String,
    pub name: String,
    pub error_type: DisassemblyStationErrorType,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    #[serde(default)]
    pub disassembly_product_code: Option<String>,
    #[serde(default)]
    pub disassembly_product_name: Option<String>,
}
