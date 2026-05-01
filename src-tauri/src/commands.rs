use crate::models::*;
use crate::state::AppState;
use std::fs;
use std::collections::HashMap;
use tauri::State;
use tauri::Manager;

#[tauri::command]
pub fn get_canvas_state(state: State<'_, AppState>) -> Result<CanvasState, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.clone())
}

#[tauri::command]
pub fn set_canvas_size(state: State<'_, AppState>, width_mm: f64, height_mm: f64) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.width_mm = width_mm;
    canvas.height_mm = height_mm;
    Ok(())
}

#[tauri::command]
pub fn clear_canvas(state: State<'_, AppState>) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.devices.clear();
    canvas.connections.clear();
    Ok(())
}

#[derive(serde::Serialize)]
pub struct AddDeviceResult {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub fn add_device(state: State<'_, AppState>, mut device: Device) -> Result<AddDeviceResult, String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    
    let (prefix, name_prefix, number_width) = match &device {
        Device::StartNode(_) => ("START", "起点", 3),
        Device::EndNode(_) => ("END", "终点", 3),
        Device::Station(_) => ("EQUI", "设备", 3),
        Device::AssemblyStation(_) => ("ASS", "装配站", 3),
        Device::DisassemblyStation(_) => ("DIS", "拆解站", 3),
        Device::Warehouse(_) => ("WH", "仓库", 3),
        Device::TempStore(_) => ("TMP", "临时堆场", 3),
        Device::Buffer(_) => ("BUF", "缓冲区", 3),
        Device::Workshop(_) => ("WORKSHOP", "厂房", 2),
    };
    
    let counter = canvas.device_counters.entry(prefix.to_string()).or_insert(0);
    *counter += 1;
    let number = if number_width == 2 {
        format!("{:02}", counter)
    } else {
        format!("{:03}", counter)
    };
    
    let new_id = format!("{}{}", prefix, number);
    let new_name = format!("{}{}", name_prefix, number);
    
    match &mut device {
        Device::StartNode(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
        Device::EndNode(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
        Device::Station(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
        Device::AssemblyStation(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
        Device::DisassemblyStation(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
        Device::Warehouse(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
        Device::TempStore(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
        Device::Buffer(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
        Device::Workshop(d) => {
            d.base.id = new_id.clone();
            d.base.name = new_name.clone();
        }
    }
    
    canvas.devices.insert(new_id.clone(), device);
    Ok(AddDeviceResult { id: new_id, name: new_name })
}

#[tauri::command]
pub fn update_device(state: State<'_, AppState>, device: Device) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    let id = device.id().to_string();
    if canvas.devices.contains_key(&id) {
        canvas.devices.insert(id, device);
        Ok(())
    } else {
        Err("Device not found".to_string())
    }
}

#[tauri::command]
pub fn delete_device(state: State<'_, AppState>, device_id: String) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.devices.remove(&device_id);
    canvas.connections.retain(|_, c| {
        c.from_device_id != device_id && c.to_device_id != device_id
    });
    Ok(())
}

#[tauri::command]
pub fn add_connection(state: State<'_, AppState>, mut connection: Connection) -> Result<Connection, String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.connection_counter += 1;
    let seq = canvas.connection_counter;
    let id = format!("PATH{:03}", seq);
    let name = format!("路径{:03}", seq);
    connection.id = id.clone();
    connection.name = name;
    canvas.connections.insert(id.clone(), connection.clone());
    Ok(connection)
}

#[tauri::command]
pub fn update_connection(state: State<'_, AppState>, connection: Connection) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    let id = connection.id.clone();
    if canvas.connections.contains_key(&id) {
        canvas.connections.insert(id, connection);
        Ok(())
    } else {
        Err("Connection not found".to_string())
    }
}

#[tauri::command]
pub fn delete_connection(state: State<'_, AppState>, connection_id: String) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.connections.remove(&connection_id);
    Ok(())
}

#[tauri::command]
pub fn get_devices(state: State<'_, AppState>) -> Result<Vec<Device>, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.devices.values().cloned().collect())
}

#[tauri::command]
pub fn get_connections(state: State<'_, AppState>) -> Result<Vec<Connection>, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.connections.values().cloned().collect())
}

#[tauri::command]
pub fn save_layout(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    
    let layout = LayoutData {
        canvas_width_mm: canvas.width_mm,
        canvas_height_mm: canvas.height_mm,
        devices: canvas.devices.values().cloned().collect(),
        connections: canvas.connections.values().cloned().collect(),
        products: canvas.products.values().cloned().collect(),
        materials: canvas.materials.values().cloned().collect(),
        tools: canvas.tools.values().cloned().collect(),
        settings: canvas.settings.clone(),
        simulation_records: canvas.simulation_records.clone(),
    };
    
    let json = serde_json::to_string_pretty(&layout).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn load_layout(state: State<'_, AppState>, path: String) -> Result<LayoutData, String> {
    let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let layout: LayoutData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.width_mm = layout.canvas_width_mm;
    canvas.height_mm = layout.canvas_height_mm;
    canvas.devices = layout.devices.iter().map(|d| (d.id().to_string(), d.clone())).collect();
    canvas.connections = layout.connections.iter().map(|c| (c.id.clone(), c.clone())).collect();
    canvas.products = layout.products.iter().map(|p| (p.code.clone(), p.clone())).collect();
    canvas.materials = layout.materials.iter().map(|m| (m.code.clone(), m.clone())).collect();
    canvas.tools = layout.tools.iter().map(|t| (t.code.clone(), t.clone())).collect();
    canvas.settings = layout.settings.clone();
    canvas.simulation_records = layout.simulation_records.clone();
    
    canvas.device_counters.clear();
    for device in &layout.devices {
        let id = device.id();
        let (prefix, number_str) = if id.starts_with("START") {
            ("START", id.strip_prefix("START").unwrap_or("0"))
        } else if id.starts_with("END") {
            ("END", id.strip_prefix("END").unwrap_or("0"))
        } else if id.starts_with("EQUI") {
            ("EQUI", id.strip_prefix("EQUI").unwrap_or("0"))
        } else if id.starts_with("ASS") {
            ("ASS", id.strip_prefix("ASS").unwrap_or("0"))
        } else if id.starts_with("WH") {
            ("WH", id.strip_prefix("WH").unwrap_or("0"))
        } else if id.starts_with("TMP") {
            ("TMP", id.strip_prefix("TMP").unwrap_or("0"))
        } else if id.starts_with("BUF") {
            ("BUF", id.strip_prefix("BUF").unwrap_or("0"))
        } else if id.starts_with("WORKSHOP") {
            ("WORKSHOP", id.strip_prefix("WORKSHOP").unwrap_or("0"))
        } else {
            continue;
        };
        
        if let Ok(number) = number_str.parse::<i32>() {
            let counter = canvas.device_counters.entry(prefix.to_string()).or_insert(0);
            *counter = (*counter).max(number);
        }
    }
    
    canvas.connection_counter = 0;
    for connection in &layout.connections {
        if let Some(number_str) = connection.id.strip_prefix("PATH") {
            if let Ok(number) = number_str.parse::<i32>() {
                canvas.connection_counter = canvas.connection_counter.max(number);
            }
        }
    }
    
    Ok(layout)
}

#[tauri::command]
pub fn start_simulation(state: State<'_, AppState>) -> Result<(), String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    
    let saved_duration = simulation.state().duration_s;
    let saved_speed = simulation.state().speed;
    let saved_rule = simulation.state().resource_selection_rule;
    let saved_interval = simulation.state().utilization_sample_interval_s;
    let saved_mode = simulation.state().simulation_mode;
    let saved_priorities = simulation.state().warehouse_selection_priorities.clone();
    let saved_strategy = simulation.state().product_selection_strategy;
    let saved_consider_priority = simulation.state().consider_product_priority;
    
    let engine = crate::simulation::SimulationEngine::new(canvas.clone());
    *simulation = engine;
    simulation.set_duration(saved_duration);
    simulation.set_speed(saved_speed);
    simulation.set_resource_selection_rule(saved_rule);
    simulation.set_utilization_sample_interval(saved_interval);
    simulation.set_simulation_mode(saved_mode);
    simulation.set_warehouse_selection_priorities(saved_priorities);
    simulation.set_product_selection_strategy(saved_strategy);
    simulation.set_consider_product_priority(saved_consider_priority);
    simulation.start();
    
    Ok(())
}

#[tauri::command]
pub fn pause_simulation(state: State<'_, AppState>) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.pause();
    Ok(())
}

#[tauri::command]
pub fn resume_simulation(state: State<'_, AppState>) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.resume();
    Ok(())
}

#[tauri::command]
pub fn reset_simulation(state: State<'_, AppState>) -> Result<(), String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    
    let saved_duration = simulation.state().duration_s;
    let saved_speed = simulation.state().speed;
    let saved_mode = simulation.state().simulation_mode;
    let saved_priorities = simulation.state().warehouse_selection_priorities.clone();
    let saved_strategy = simulation.state().product_selection_strategy;
    let saved_consider_priority = simulation.state().consider_product_priority;
    
    let engine = crate::simulation::SimulationEngine::new(canvas.clone());
    *simulation = engine;
    simulation.set_duration(saved_duration);
    simulation.set_speed(saved_speed);
    simulation.set_simulation_mode(saved_mode);
    simulation.set_warehouse_selection_priorities(saved_priorities);
    simulation.set_product_selection_strategy(saved_strategy);
    simulation.set_consider_product_priority(saved_consider_priority);
    
    Ok(())
}

#[tauri::command]
pub fn step_simulation(state: State<'_, AppState>, dt_s: f64) -> Result<bool, String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    Ok(simulation.step(dt_s))
}

#[tauri::command]
pub fn set_simulation_speed(state: State<'_, AppState>, speed: f64) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.set_speed(speed);
    Ok(())
}

#[tauri::command]
pub fn set_simulation_duration(state: State<'_, AppState>, duration_s: f64) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.set_duration(duration_s);
    Ok(())
}

#[tauri::command]
pub fn set_resource_selection_rule(state: State<'_, AppState>, rule: crate::models::ResourceSelectionRule) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.set_resource_selection_rule(rule);
    Ok(())
}

#[tauri::command]
pub fn set_simulation_mode(state: State<'_, AppState>, mode: crate::models::SimulationMode) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.set_simulation_mode(mode);
    Ok(())
}

#[tauri::command]
pub fn set_utilization_sample_interval(state: State<'_, AppState>, interval_s: f64) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.set_utilization_sample_interval(interval_s);
    Ok(())
}

#[tauri::command]
pub fn set_warehouse_selection_priorities(state: State<'_, AppState>, priorities: Vec<crate::models::WarehouseSelectionPriority>) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.set_warehouse_selection_priorities(priorities);
    Ok(())
}

#[tauri::command]
pub fn set_product_selection_strategy(state: State<'_, AppState>, strategy: crate::models::ProductSelectionStrategy) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.set_product_selection_strategy(strategy);
    Ok(())
}

#[tauri::command]
pub fn set_consider_product_priority(state: State<'_, AppState>, consider: bool) -> Result<(), String> {
    let mut simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    simulation.set_consider_product_priority(consider);
    Ok(())
}

#[tauri::command]
pub fn get_simulation_state(state: State<'_, AppState>) -> Result<crate::simulation::SimulationState, String> {
    let simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    Ok(simulation.state().clone())
}

#[tauri::command]
pub fn get_simulation_results(state: State<'_, AppState>) -> Result<crate::simulation::SimulationResults, String> {
    let simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    Ok(simulation.get_results())
}

#[tauri::command]
pub fn save_simulation_record(state: State<'_, AppState>) -> Result<String, String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    let simulation = state.simulation.lock().map_err(|e| e.to_string())?;
    
    let results = simulation.get_results();
    let id = uuid::Uuid::new_v4().to_string();
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    let process_products: Vec<crate::models::ProcessProduct> = simulation.state().process_products.values().cloned().collect();
    
    let record = crate::models::SimulationRecord {
        id: id.clone(),
        timestamp,
        duration_s: results.duration_s,
        completed_products: results.completed_products,
        results,
        process_products,
    };
    
    canvas.simulation_records.push(record);
    Ok(id)
}

#[tauri::command]
pub fn get_simulation_records(state: State<'_, AppState>) -> Result<Vec<crate::models::SimulationRecord>, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.simulation_records.clone())
}

#[tauri::command]
pub fn get_simulation_record(state: State<'_, AppState>, record_id: String) -> Result<Option<crate::models::SimulationRecord>, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.simulation_records.iter().find(|r| r.id == record_id).cloned())
}

#[tauri::command]
pub fn delete_simulation_record(state: State<'_, AppState>, record_id: String) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.simulation_records.retain(|r| r.id != record_id);
    Ok(())
}

#[tauri::command]
pub fn add_product(state: State<'_, AppState>, product: Product) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.products.insert(product.code.clone(), product);
    Ok(())
}

#[tauri::command]
pub fn update_product(state: State<'_, AppState>, product: Product) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.products.insert(product.code.clone(), product);
    Ok(())
}

#[tauri::command]
pub fn delete_product(state: State<'_, AppState>, code: String) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.products.remove(&code);
    Ok(())
}

#[tauri::command]
pub fn get_products(state: State<'_, AppState>) -> Result<Vec<Product>, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.products.values().cloned().collect())
}

#[tauri::command]
pub fn add_material(state: State<'_, AppState>, material: Material) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.materials.insert(material.code.clone(), material);
    Ok(())
}

#[tauri::command]
pub fn update_material(state: State<'_, AppState>, material: Material) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.materials.insert(material.code.clone(), material);
    Ok(())
}

#[tauri::command]
pub fn delete_material(state: State<'_, AppState>, code: String) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.materials.remove(&code);
    Ok(())
}

#[tauri::command]
pub fn get_materials(state: State<'_, AppState>) -> Result<Vec<Material>, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.materials.values().cloned().collect())
}

#[tauri::command]
pub fn add_tool(state: State<'_, AppState>, tool: Tool) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.tools.insert(tool.code.clone(), tool);
    Ok(())
}

#[tauri::command]
pub fn update_tool(state: State<'_, AppState>, tool: Tool) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.tools.insert(tool.code.clone(), tool);
    Ok(())
}

#[tauri::command]
pub fn delete_tool(state: State<'_, AppState>, code: String) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.tools.remove(&code);
    Ok(())
}

#[tauri::command]
pub fn get_tools(state: State<'_, AppState>) -> Result<Vec<Tool>, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.tools.values().cloned().collect())
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    Ok(canvas.settings.clone())
}

#[tauri::command]
pub fn update_settings(state: State<'_, AppState>, settings: Settings) -> Result<(), String> {
    let mut canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    canvas.settings = settings;
    Ok(())
}

#[tauri::command]
pub fn get_product_routes(state: State<'_, AppState>) -> Result<ProductRouteCheckResult, String> {
    let canvas = state.canvas.lock().map_err(|e| e.to_string())?;
    
    let mut start_nodes_without_product: Vec<StartNodeInfo> = Vec::new();
    let mut start_nodes_with_product: Vec<(String, String, String)> = Vec::new();
    
    for device in canvas.devices.values() {
        if let Device::StartNode(start_node) = device {
            if start_node.product_code.is_empty() {
                start_nodes_without_product.push(StartNodeInfo {
                    id: start_node.base.id.clone(),
                    name: start_node.base.name.clone(),
                    product_code: None,
                    product_name: None,
                });
            } else {
                start_nodes_with_product.push((
                    start_node.base.id.clone(),
                    start_node.base.name.clone(),
                    start_node.product_code.clone(),
                ));
            }
        }
    }
    
    let all_start_nodes_have_product = start_nodes_without_product.is_empty();
    
    let assembly_station_errors = check_assembly_stations(&canvas);
    let disassembly_station_errors = check_disassembly_stations(&canvas);
    
    let has_errors = !all_start_nodes_have_product || !assembly_station_errors.is_empty() || !disassembly_station_errors.is_empty();
    
    if has_errors {
        return Ok(ProductRouteCheckResult {
            all_start_nodes_have_product,
            start_nodes_without_product,
            routes: Vec::new(),
            incomplete_route_start_nodes: Vec::new(),
            assembly_station_errors,
            disassembly_station_errors,
        });
    }
    
    let mut routes: Vec<ProductRoute> = Vec::new();
    let mut incomplete_route_start_nodes: Vec<StartNodeInfo> = Vec::new();
    
    let assembly_stations: Vec<(String, String, Vec<String>, Vec<String>)> = canvas.devices
        .values()
        .filter_map(|device| {
            if let Device::AssemblyStation(a) = device {
                Some((a.base.id.clone(), a.base.name.clone(), a.components.clone(), a.assembly_products.clone()))
            } else {
                None
            }
        })
        .collect();

    for (assembly_id, assembly_name, components, _) in &assembly_stations {
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
                
                if let Some(device) = canvas.devices.get(&first_node) {
                    if let Device::StartNode(sn) = device {
                        if sn.product_code == *component_code {
                            upstream_paths.push(path.clone());
                            continue;
                        }
                    }
                }
                
                let incoming: Vec<_> = canvas.connections
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
                    .filter_map(|id| canvas.devices.get(id).map(|d| d.name().to_string()))
                    .collect();
                
                let first_node_id = full_path.first().unwrap().clone();
                let first_node_name = canvas.devices.get(&first_node_id)
                    .map(|d| d.name().to_string())
                    .unwrap_or_default();
                
                let step_materials: Vec<HashMap<String, f64>> = full_path.iter()
                    .filter_map(|id| {
                        if let Some(Device::Station(s)) = canvas.devices.get(id) {
                            return Some(s.product_materials.get(component_code).cloned().unwrap_or_default());
                        }
                        None
                    })
                    .collect();
                
                routes.push(ProductRoute {
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
    }

    for (assembly_id, assembly_name, _, assembly_products) in &assembly_stations {
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
                
                if let Some(device) = canvas.devices.get(&last_node) {
                    if device.is_end() {
                        downstream_paths.push(path.clone());
                        continue;
                    }
                }
                
                if let Some(Device::AssemblyStation(a)) = canvas.devices.get(&last_node) {
                    if a.base.id != *assembly_id {
                        let is_component = if !a.components.is_empty() {
                            a.components.contains(product_code)
                        } else if !a.processable_products.is_empty() {
                            a.processable_products.contains(product_code)
                        } else {
                            false
                        };
                        if is_component {
                            downstream_paths.push(path.clone());
                            continue;
                        }
                    }
                }
                
                let outgoing: Vec<_> = canvas.connections
                    .values()
                    .filter(|c| c.from_device_id == last_node)
                    .collect();
                
                let mut has_valid_downstream = false;
                for conn in outgoing {
                    let to_device_id = &conn.to_device_id;
                    if let Some(to_device) = canvas.devices.get(to_device_id) {
                        let can_process = match to_device {
                            Device::Station(s) => {
                                if !s.processable_products.is_empty() {
                                    s.processable_products.contains(&product_code.to_string())
                                } else if !s.product_code.is_empty() {
                                    &s.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::AssemblyStation(a) => {
                                if !a.components.is_empty() {
                                    a.components.contains(&product_code.to_string())
                                } else if !a.processable_products.is_empty() {
                                    a.processable_products.contains(&product_code.to_string())
                                } else {
                                    true
                                }
                            }
                            Device::EndNode(_) => true,
                            Device::Warehouse(w) => {
                                if !w.processable_products.is_empty() {
                                    w.processable_products.contains(&product_code.to_string())
                                } else if !w.product_code.is_empty() {
                                    &w.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::TempStore(t) => {
                                if !t.processable_products.is_empty() {
                                    t.processable_products.contains(&product_code.to_string())
                                } else if !t.product_code.is_empty() {
                                    &t.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::Buffer(b) => {
                                if !b.processable_products.is_empty() {
                                    b.processable_products.contains(&product_code.to_string())
                                } else if !b.product_code.is_empty() {
                                    &b.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::StartNode(_) => false,
                            Device::Workshop(_) => false,
                            Device::DisassemblyStation(_) => false,
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
                    .filter_map(|id| canvas.devices.get(id).map(|d| d.name().to_string()))
                    .collect();
                
                let last_node_id = full_path.last().unwrap();
                let last_device = canvas.devices.get(last_node_id);
                
                let is_end = last_device.map_or(false, |d| d.is_end());
                let is_component_at_assembly = last_device.map_or(false, |d| {
                    if let Device::AssemblyStation(a) = d {
                        if a.base.id != *assembly_id {
                            let is_comp = if !a.components.is_empty() {
                                a.components.contains(product_code)
                            } else if !a.processable_products.is_empty() {
                                a.processable_products.contains(product_code)
                            } else {
                                false
                            };
                            return is_comp;
                        }
                    }
                    false
                });
                
                let is_complete = is_end || is_component_at_assembly;
                
                let end_node_id = if is_complete {
                    Some(last_node_id.clone())
                } else {
                    None
                };
                
                let end_node_name = if let Some(ref id) = end_node_id {
                    canvas.devices.get(id).map(|d| d.name().to_string())
                } else {
                    None
                };
                
                let step_materials: Vec<HashMap<String, f64>> = full_path.iter()
                    .filter_map(|id| {
                        if let Some(Device::Station(s)) = canvas.devices.get(id) {
                            return Some(s.product_materials.get(product_code).cloned().unwrap_or_default());
                        }
                        None
                    })
                    .collect();
                
                routes.push(ProductRoute {
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
            }
        }
    }

    let disassembly_stations: Vec<(String, String, Vec<String>, Vec<String>)> = canvas.devices
        .values()
        .filter_map(|device| {
            if let Device::DisassemblyStation(d) = device {
                Some((d.base.id.clone(), d.base.name.clone(), d.items_to_disassemble.clone(), d.disassembly_products.clone()))
            } else {
                None
            }
        })
        .collect();

    for (disassembly_id, disassembly_name, items_to_disassemble, _) in &disassembly_stations {
        for item_code in items_to_disassemble {
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

                if let Some(device) = canvas.devices.get(&first_node) {
                    if let Device::StartNode(sn) = device {
                        if sn.product_code == *item_code {
                            upstream_paths.push(path.clone());
                            continue;
                        }
                    }
                    if let Device::DisassemblyStation(ds) = device {
                        if ds.base.id != *disassembly_id && ds.disassembly_products.contains(item_code) {
                            upstream_paths.push(path.clone());
                            continue;
                        }
                    }
                }

                let incoming: Vec<_> = canvas.connections
                    .values()
                    .filter(|c| c.to_device_id == first_node)
                    .collect();

                for conn in incoming {
                    let from_device_id = &conn.from_device_id;
                    if !path.contains(from_device_id) {
                        if let Some(from_device) = canvas.devices.get(from_device_id) {
                            let can_traverse = match from_device {
                                Device::StartNode(_) => true,
                                Device::Station(s) => {
                                    if !s.processable_products.is_empty() {
                                        s.processable_products.contains(&item_code.to_string())
                                    } else if !s.product_code.is_empty() {
                                        &s.product_code == item_code
                                    } else {
                                        true
                                    }
                                }
                                Device::DisassemblyStation(_) => true,
                                Device::Warehouse(_) | Device::Buffer(_) | Device::TempStore(_) => true,
                                Device::AssemblyStation(_) => false,
                                Device::EndNode(_) | Device::Workshop(_) => false,
                            };
                            if can_traverse {
                                let mut new_path = vec![from_device_id.clone()];
                                new_path.extend(path.clone());
                                queue.push_back(new_path);
                            }
                        }
                    }
                }
            }

            for upstream_path in &upstream_paths {
                let full_path = upstream_path.clone();
                let path_names: Vec<String> = full_path.iter()
                    .filter_map(|id| canvas.devices.get(id).map(|d| d.name().to_string()))
                    .collect();

                let first_node_id = full_path.first().unwrap().clone();
                let first_node_name = canvas.devices.get(&first_node_id)
                    .map(|d| d.name().to_string())
                    .unwrap_or_default();

                let step_materials: Vec<HashMap<String, f64>> = full_path.iter()
                    .filter_map(|id| {
                        if let Some(Device::Station(s)) = canvas.devices.get(id) {
                            return Some(s.product_materials.get(item_code).cloned().unwrap_or_default());
                        }
                        None
                    })
                    .collect();

                routes.push(ProductRoute {
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
    }

    for (disassembly_id, disassembly_name, _, disassembly_products) in &disassembly_stations {
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

                if let Some(device) = canvas.devices.get(&last_node) {
                    if device.is_end() {
                        downstream_paths.push(path.clone());
                        continue;
                    }
                }

                if let Some(Device::AssemblyStation(a)) = canvas.devices.get(&last_node) {
                    if a.base.id != *disassembly_id {
                        let is_component = if !a.components.is_empty() {
                            a.components.contains(product_code)
                        } else if !a.processable_products.is_empty() {
                            a.processable_products.contains(product_code)
                        } else {
                            false
                        };
                        if is_component {
                            downstream_paths.push(path.clone());
                            continue;
                        }
                    }
                }

                if let Some(Device::DisassemblyStation(ds)) = canvas.devices.get(&last_node) {
                    if ds.base.id != *disassembly_id {
                        let is_item = ds.items_to_disassemble.contains(product_code);
                        if is_item {
                            downstream_paths.push(path.clone());
                            continue;
                        }
                    }
                }

                let outgoing: Vec<_> = canvas.connections
                    .values()
                    .filter(|c| c.from_device_id == last_node)
                    .collect();

                let mut has_valid_downstream = false;
                for conn in outgoing {
                    let to_device_id = &conn.to_device_id;
                    if let Some(to_device) = canvas.devices.get(to_device_id) {
                        let can_process = match to_device {
                            Device::Station(s) => {
                                if !s.processable_products.is_empty() {
                                    s.processable_products.contains(&product_code.to_string())
                                } else if !s.product_code.is_empty() {
                                    &s.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::AssemblyStation(a) => {
                                if !a.components.is_empty() {
                                    a.components.contains(&product_code.to_string())
                                } else if !a.processable_products.is_empty() {
                                    a.processable_products.contains(&product_code.to_string())
                                } else {
                                    true
                                }
                            }
                            Device::DisassemblyStation(d) => {
                                d.items_to_disassemble.contains(&product_code.to_string())
                            }
                            Device::EndNode(_) => true,
                            Device::Warehouse(w) => {
                                if !w.processable_products.is_empty() {
                                    w.processable_products.contains(&product_code.to_string())
                                } else if !w.product_code.is_empty() {
                                    &w.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::TempStore(t) => {
                                if !t.processable_products.is_empty() {
                                    t.processable_products.contains(&product_code.to_string())
                                } else if !t.product_code.is_empty() {
                                    &t.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::Buffer(b) => {
                                if !b.processable_products.is_empty() {
                                    b.processable_products.contains(&product_code.to_string())
                                } else if !b.product_code.is_empty() {
                                    &b.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::StartNode(_) => false,
                            Device::Workshop(_) => false,
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
                    .filter_map(|id| canvas.devices.get(id).map(|d| d.name().to_string()))
                    .collect();

                let last_node_id = full_path.last().unwrap();
                let last_device = canvas.devices.get(last_node_id);

                let is_end = last_device.map_or(false, |d| d.is_end());
                let is_component_at_assembly = last_device.map_or(false, |d| {
                    if let Device::AssemblyStation(a) = d {
                        let is_comp = if !a.components.is_empty() {
                            a.components.contains(product_code)
                        } else if !a.processable_products.is_empty() {
                            a.processable_products.contains(product_code)
                        } else {
                            false
                        };
                        return is_comp;
                    }
                    false
                });
                let is_item_at_disassembly = last_device.map_or(false, |d| {
                    if let Device::DisassemblyStation(ds) = d {
                        return ds.items_to_disassemble.contains(product_code);
                    }
                    false
                });

                let is_complete = is_end || is_component_at_assembly || is_item_at_disassembly;

                let end_node_id = if is_complete {
                    Some(last_node_id.clone())
                } else {
                    None
                };

                let end_node_name = if let Some(ref id) = end_node_id {
                    canvas.devices.get(id).map(|d| d.name().to_string())
                } else {
                    None
                };

                let step_materials: Vec<HashMap<String, f64>> = full_path.iter()
                    .filter_map(|id| {
                        if let Some(Device::Station(s)) = canvas.devices.get(id) {
                            return Some(s.product_materials.get(product_code).cloned().unwrap_or_default());
                        }
                        None
                    })
                    .collect();

                routes.push(ProductRoute {
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
            }
        }
    }

    for (start_node_id, start_node_name, product_code) in &start_nodes_with_product {
        let mut reaches_assembly_or_disassembly = false;
        let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut queue: std::collections::VecDeque<String> = std::collections::VecDeque::new();
        queue.push_back(start_node_id.clone());
        
        while let Some(node_id) = queue.pop_front() {
            if visited.contains(&node_id) {
                continue;
            }
            visited.insert(node_id.clone());
            
            for conn in canvas.connections.values() {
                if conn.from_device_id == node_id {
                    if let Some(Device::AssemblyStation(a)) = canvas.devices.get(&conn.to_device_id) {
                        let is_component = if !a.components.is_empty() {
                            a.components.contains(&product_code.to_string())
                        } else if !a.processable_products.is_empty() {
                            a.processable_products.contains(&product_code.to_string())
                        } else {
                            false
                        };
                        if is_component {
                            reaches_assembly_or_disassembly = true;
                            break;
                        }
                    }
                    if let Some(Device::DisassemblyStation(d)) = canvas.devices.get(&conn.to_device_id) {
                        if d.items_to_disassemble.contains(&product_code.to_string()) {
                            reaches_assembly_or_disassembly = true;
                            break;
                        }
                    }
                    if !visited.contains(&conn.to_device_id) {
                        queue.push_back(conn.to_device_id.clone());
                    }
                }
            }
            
            if reaches_assembly_or_disassembly {
                break;
            }
        }
        
        if reaches_assembly_or_disassembly {
            continue;
        }
        
        let mut current_paths: Vec<Vec<String>> = vec![vec![start_node_id.clone()]];
        let mut completed_routes: Vec<Vec<String>> = Vec::new();
        
        while !current_paths.is_empty() {
            let mut new_paths: Vec<Vec<String>> = Vec::new();
            
            for path in current_paths {
                let last_node_id = path.last().unwrap().clone();
                
                if let Some(device) = canvas.devices.get(&last_node_id) {
                    if device.is_end() {
                        completed_routes.push(path);
                        continue;
                    }
                }
                
                let outgoing: Vec<_> = canvas.connections
                    .values()
                    .filter(|c| c.from_device_id == last_node_id)
                    .collect();
                
                let mut valid_downstreams: Vec<String> = Vec::new();
                
                for conn in outgoing {
                    let to_device_id = &conn.to_device_id;
                    if let Some(to_device) = canvas.devices.get(to_device_id) {
                        let can_process = match to_device {
                            Device::Station(s) => {
                                if !s.processable_products.is_empty() {
                                    s.processable_products.contains(&product_code.to_string())
                                } else if !s.product_code.is_empty() {
                                    &s.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::AssemblyStation(_) => false,
                            Device::DisassemblyStation(_) => false,
                            Device::EndNode(_) => true,
                            Device::Warehouse(w) => {
                                if !w.processable_products.is_empty() {
                                    w.processable_products.contains(&product_code.to_string())
                                } else if !w.product_code.is_empty() {
                                    &w.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::TempStore(t) => {
                                if !t.processable_products.is_empty() {
                                    t.processable_products.contains(&product_code.to_string())
                                } else if !t.product_code.is_empty() {
                                    &t.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::Buffer(b) => {
                                if !b.processable_products.is_empty() {
                                    b.processable_products.contains(&product_code.to_string())
                                } else if !b.product_code.is_empty() {
                                    &b.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::StartNode(_) => false,
                            Device::Workshop(_) => false,
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
        
        let mut has_complete_route = false;
        
        for path in completed_routes {
            let last_node_id = path.last().unwrap();
            let last_device = canvas.devices.get(last_node_id);
            
            let is_complete = last_device.map_or(false, |d| d.is_end());
            
            if is_complete {
                has_complete_route = true;
            }
            
            let end_node_id = if is_complete {
                Some(last_node_id.clone())
            } else {
                None
            };
            
            let end_node_name = if let Some(ref id) = end_node_id {
                canvas.devices.get(id).map(|d| d.name().to_string())
            } else {
                None
            };
            
            let path_names: Vec<String> = path.iter()
                .filter_map(|id| canvas.devices.get(id).map(|d| d.name().to_string()))
                .collect();
            
            let step_materials: Vec<HashMap<String, f64>> = path.iter()
                .filter_map(|id| {
                    if let Some(device) = canvas.devices.get(id) {
                        if let Device::Station(s) = device {
                            return Some(s.product_materials.get(product_code).cloned().unwrap_or_default());
                        }
                    }
                    None
                })
                .collect();
            
            routes.push(ProductRoute {
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
                branch_paths: Vec::new(),
                route_type: crate::models::RouteType::Normal,
            });
        }
        
        if !has_complete_route {
            let product_name = canvas.products.get(product_code)
                .map(|p| p.name.clone())
                .unwrap_or_default();
            
            incomplete_route_start_nodes.push(StartNodeInfo {
                id: start_node_id.clone(),
                name: start_node_name.clone(),
                product_code: Some(product_code.clone()),
                product_name: Some(product_name),
            });
        }
    }
    
    for (start_node_id, start_node_name, product_code) in &start_nodes_with_product {
        let has_complete = routes.iter().any(|r| {
            r.product_code == *product_code &&
            r.start_node_id == *start_node_id &&
            r.is_complete
        });
        
        if !has_complete {
            let already_in_list = incomplete_route_start_nodes.iter().any(|s| {
                s.id == *start_node_id
            });
            if !already_in_list {
                let product_name = canvas.products.get(product_code)
                    .map(|p| p.name.clone())
                    .unwrap_or_default();
                
                incomplete_route_start_nodes.push(StartNodeInfo {
                    id: start_node_id.clone(),
                    name: start_node_name.clone(),
                    product_code: Some(product_code.clone()),
                    product_name: Some(product_name),
                });
            }
        }
    }
    
    Ok(ProductRouteCheckResult {
        all_start_nodes_have_product,
        start_nodes_without_product,
        routes,
        incomplete_route_start_nodes,
        assembly_station_errors,
        disassembly_station_errors,
    })
}

fn check_assembly_stations(canvas: &CanvasState) -> Vec<crate::models::AssemblyStationError> {
    let mut errors: Vec<crate::models::AssemblyStationError> = Vec::new();
    
    for device in canvas.devices.values() {
        if let Device::AssemblyStation(assembly) = device {
            if assembly.components.is_empty() && assembly.processable_products.is_empty() {
                errors.push(crate::models::AssemblyStationError {
                    id: assembly.base.id.clone(),
                    name: assembly.base.name.clone(),
                    error_type: crate::models::AssemblyStationErrorType::NoComponentSelected,
                    product_code: None,
                    product_name: None,
                    component_code: None,
                    component_name: None,
                    upstream_node_id: None,
                    upstream_node_name: None,
                });
            }

            if assembly.assembly_products.is_empty() && assembly.processable_products.is_empty() {
                errors.push(crate::models::AssemblyStationError {
                    id: assembly.base.id.clone(),
                    name: assembly.base.name.clone(),
                    error_type: crate::models::AssemblyStationErrorType::NoAssemblyProductSelected,
                    product_code: None,
                    product_name: None,
                    component_code: None,
                    component_name: None,
                    upstream_node_id: None,
                    upstream_node_name: None,
                });
            }

            for product_code in &assembly.assembly_products {
                let product_name = canvas.products.get(product_code)
                    .map(|p| p.name.clone())
                    .unwrap_or_default();

                let component_reqs = assembly.product_upstream_requirements.get(product_code);

                if component_reqs.is_none() || component_reqs.unwrap().is_empty() {
                    errors.push(crate::models::AssemblyStationError {
                        id: assembly.base.id.clone(),
                        name: assembly.base.name.clone(),
                        error_type: crate::models::AssemblyStationErrorType::NoComponentForProduct,
                        product_code: Some(product_code.clone()),
                        product_name: Some(product_name.clone()),
                        component_code: None,
                        component_name: None,
                        upstream_node_id: None,
                        upstream_node_name: None,
                    });
                    continue;
                }

                let reqs = component_reqs.unwrap();

                for (component_code, qty) in reqs {
                    let component_name = canvas.products.get(component_code)
                        .map(|p| p.name.clone())
                        .unwrap_or_default();

                    if *qty == 0 {
                        errors.push(crate::models::AssemblyStationError {
                            id: assembly.base.id.clone(),
                            name: assembly.base.name.clone(),
                            error_type: crate::models::AssemblyStationErrorType::ComponentQuantityZero,
                            product_code: Some(product_code.clone()),
                            product_name: Some(product_name.clone()),
                            component_code: Some(component_code.clone()),
                            component_name: Some(component_name.clone()),
                            upstream_node_id: None,
                            upstream_node_name: None,
                        });
                    }

                    let component_reachable = self_reachable_from_start(canvas, &assembly.base.id, component_code);
                    if !component_reachable {
                        errors.push(crate::models::AssemblyStationError {
                            id: assembly.base.id.clone(),
                            name: assembly.base.name.clone(),
                            error_type: crate::models::AssemblyStationErrorType::ComponentUnreachable,
                            product_code: Some(product_code.clone()),
                            product_name: Some(product_name.clone()),
                            component_code: Some(component_code.clone()),
                            component_name: Some(component_name.clone()),
                            upstream_node_id: None,
                            upstream_node_name: None,
                        });
                    }
                }
            }
        }
    }
    
    errors
}

fn self_reachable_from_start(canvas: &CanvasState, assembly_id: &str, component_code: &str) -> bool {
    let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut queue: std::collections::VecDeque<String> = std::collections::VecDeque::new();
    queue.push_back(assembly_id.to_string());

    while let Some(node_id) = queue.pop_front() {
        if visited.contains(&node_id) {
            continue;
        }
        visited.insert(node_id.clone());

        for conn in canvas.connections.values() {
            if conn.to_device_id == node_id {
                let from_device = match canvas.devices.get(&conn.from_device_id) {
                    Some(d) => d,
                    None => continue,
                };

                match from_device {
                    Device::StartNode(sn) => {
                        if sn.product_code == component_code {
                            return true;
                        }
                    }
                    Device::Station(s) => {
                        if s.processable_products.contains(&component_code.to_string())
                            || s.product_code == component_code
                            || s.processable_products.is_empty() {
                            queue.push_back(conn.from_device_id.clone());
                        }
                    }
                    Device::Warehouse(_) | Device::Buffer(_) | Device::TempStore(_) => {
                        queue.push_back(conn.from_device_id.clone());
                    }
                    Device::AssemblyStation(_) => {
                        queue.push_back(conn.from_device_id.clone());
                    }
                    _ => {}
                }
            }
        }
    }

    false
}

fn check_disassembly_stations(canvas: &CanvasState) -> Vec<crate::models::DisassemblyStationError> {
    let mut errors: Vec<crate::models::DisassemblyStationError> = Vec::new();

    let all_assembly_products: std::collections::HashSet<String> = canvas.devices
        .values()
        .filter_map(|d| {
            if let Device::AssemblyStation(a) = d {
                Some(a.assembly_products.clone())
            } else {
                None
            }
        })
        .flatten()
        .collect();

    for device in canvas.devices.values() {
        if let Device::DisassemblyStation(disassembly) = device {
            if disassembly.items_to_disassemble.is_empty() {
                errors.push(crate::models::DisassemblyStationError {
                    id: disassembly.base.id.clone(),
                    name: disassembly.base.name.clone(),
                    error_type: crate::models::DisassemblyStationErrorType::NoItemToDisassemble,
                    product_code: None,
                    product_name: None,
                    disassembly_product_code: None,
                    disassembly_product_name: None,
                });
            }

            if disassembly.disassembly_products.is_empty() {
                errors.push(crate::models::DisassemblyStationError {
                    id: disassembly.base.id.clone(),
                    name: disassembly.base.name.clone(),
                    error_type: crate::models::DisassemblyStationErrorType::NoDisassemblyProduct,
                    product_code: None,
                    product_name: None,
                    disassembly_product_code: None,
                    disassembly_product_name: None,
                });
            }

            for item_code in &disassembly.items_to_disassemble {
                let item_name = canvas.products.get(item_code)
                    .map(|p| p.name.clone())
                    .unwrap_or_default();

                if all_assembly_products.contains(item_code) {
                    errors.push(crate::models::DisassemblyStationError {
                        id: disassembly.base.id.clone(),
                        name: disassembly.base.name.clone(),
                        error_type: crate::models::DisassemblyStationErrorType::AssemblyProductAsItem,
                        product_code: Some(item_code.clone()),
                        product_name: Some(item_name.clone()),
                        disassembly_product_code: None,
                        disassembly_product_name: None,
                    });
                }

                let product_reqs = disassembly.product_disassembly_requirements.get(item_code);
                if product_reqs.is_none() || product_reqs.unwrap().is_empty() {
                    errors.push(crate::models::DisassemblyStationError {
                        id: disassembly.base.id.clone(),
                        name: disassembly.base.name.clone(),
                        error_type: crate::models::DisassemblyStationErrorType::NoProductForItem,
                        product_code: Some(item_code.clone()),
                        product_name: Some(item_name.clone()),
                        disassembly_product_code: None,
                        disassembly_product_name: None,
                    });
                    continue;
                }

                let reqs = product_reqs.unwrap();
                let mut has_nonzero = false;
                for (dp_code, qty) in reqs {
                    let dp_name = canvas.products.get(dp_code)
                        .map(|p| p.name.clone())
                        .unwrap_or_default();

                    if *qty == 0 {
                        errors.push(crate::models::DisassemblyStationError {
                            id: disassembly.base.id.clone(),
                            name: disassembly.base.name.clone(),
                            error_type: crate::models::DisassemblyStationErrorType::DisassemblyProductQuantityZero,
                            product_code: Some(item_code.clone()),
                            product_name: Some(item_name.clone()),
                            disassembly_product_code: Some(dp_code.clone()),
                            disassembly_product_name: Some(dp_name),
                        });
                    } else {
                        has_nonzero = true;
                    }
                }

                if !has_nonzero {
                    errors.push(crate::models::DisassemblyStationError {
                        id: disassembly.base.id.clone(),
                        name: disassembly.base.name.clone(),
                        error_type: crate::models::DisassemblyStationErrorType::NoProductForItem,
                        product_code: Some(item_code.clone()),
                        product_name: Some(item_name.clone()),
                        disassembly_product_code: None,
                        disassembly_product_name: None,
                    });
                }

                let item_reachable = item_reachable_from_start(canvas, &disassembly.base.id, item_code);
                if !item_reachable {
                    errors.push(crate::models::DisassemblyStationError {
                        id: disassembly.base.id.clone(),
                        name: disassembly.base.name.clone(),
                        error_type: crate::models::DisassemblyStationErrorType::ItemUnreachable,
                        product_code: Some(item_code.clone()),
                        product_name: Some(item_name),
                        disassembly_product_code: None,
                        disassembly_product_name: None,
                    });
                }
            }
        }
    }

    errors
}

fn item_reachable_from_start(canvas: &CanvasState, disassembly_id: &str, item_code: &str) -> bool {
    let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut queue: std::collections::VecDeque<String> = std::collections::VecDeque::new();
    queue.push_back(disassembly_id.to_string());

    while let Some(node_id) = queue.pop_front() {
        if visited.contains(&node_id) {
            continue;
        }
        visited.insert(node_id.clone());

        for conn in canvas.connections.values() {
            if conn.to_device_id == node_id {
                let from_device = match canvas.devices.get(&conn.from_device_id) {
                    Some(d) => d,
                    None => continue,
                };

                match from_device {
                    Device::StartNode(sn) => {
                        if sn.product_code == item_code {
                            return true;
                        }
                    }
                    Device::Station(s) => {
                        if s.processable_products.contains(&item_code.to_string())
                            || s.product_code == item_code
                            || s.processable_products.is_empty() {
                            queue.push_back(conn.from_device_id.clone());
                        }
                    }
                    Device::Warehouse(_) | Device::Buffer(_) | Device::TempStore(_) => {
                        queue.push_back(conn.from_device_id.clone());
                    }
                    Device::DisassemblyStation(ds) => {
                        if ds.disassembly_products.contains(&item_code.to_string()) {
                            return true;
                        }
                        queue.push_back(conn.from_device_id.clone());
                    }
                    _ => {}
                }
            }
        }
    }

    false
}

#[tauri::command]
pub fn open_user_manual(app: tauri::AppHandle) -> Result<(), String> {
    let resource_path = app.path().resource_dir()
        .map_err(|e| e.to_string())?
        .join("usermanual.html");

    let path_str = resource_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &path_str])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
