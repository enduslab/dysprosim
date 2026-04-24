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
    
    let engine = crate::simulation::SimulationEngine::new(canvas.clone());
    *simulation = engine;
    simulation.set_duration(saved_duration);
    simulation.set_speed(saved_speed);
    simulation.set_resource_selection_rule(saved_rule);
    simulation.set_utilization_sample_interval(saved_interval);
    simulation.set_simulation_mode(saved_mode);
    simulation.set_warehouse_selection_priorities(saved_priorities);
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
    
    let engine = crate::simulation::SimulationEngine::new(canvas.clone());
    *simulation = engine;
    simulation.set_duration(saved_duration);
    simulation.set_speed(saved_speed);
    simulation.set_simulation_mode(saved_mode);
    simulation.set_warehouse_selection_priorities(saved_priorities);
    
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
    
    let has_errors = !all_start_nodes_have_product || !assembly_station_errors.is_empty();
    
    if has_errors {
        return Ok(ProductRouteCheckResult {
            all_start_nodes_have_product,
            start_nodes_without_product,
            routes: Vec::new(),
            incomplete_route_start_nodes: Vec::new(),
            assembly_station_errors,
        });
    }
    
    let mut routes: Vec<ProductRoute> = Vec::new();
    let mut incomplete_route_start_nodes: Vec<StartNodeInfo> = Vec::new();
    
    for (start_node_id, start_node_name, product_code) in &start_nodes_with_product {
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
                            Device::AssemblyStation(a) => {
                                if !a.processable_products.is_empty() {
                                    a.processable_products.contains(&product_code.to_string())
                                } else {
                                    true
                                }
                            }
                            Device::EndNode(_) => true,
                            Device::Warehouse(w) => {
                                if !w.product_code.is_empty() {
                                    &w.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::TempStore(t) => {
                                if !t.product_code.is_empty() {
                                    &t.product_code == product_code
                                } else {
                                    true
                                }
                            }
                            Device::Buffer(b) => {
                                if !b.product_code.is_empty() {
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
    
    Ok(ProductRouteCheckResult {
        all_start_nodes_have_product,
        start_nodes_without_product,
        routes,
        incomplete_route_start_nodes,
        assembly_station_errors,
    })
}

fn check_assembly_stations(canvas: &CanvasState) -> Vec<crate::models::AssemblyStationError> {
    let mut errors: Vec<crate::models::AssemblyStationError> = Vec::new();
    
    for device in canvas.devices.values() {
        if let Device::AssemblyStation(assembly) = device {
            if assembly.processable_products.is_empty() {
                errors.push(crate::models::AssemblyStationError {
                    id: assembly.base.id.clone(),
                    name: assembly.base.name.clone(),
                    error_type: crate::models::AssemblyStationErrorType::NoProductSelected,
                    product_code: None,
                    product_name: None,
                    upstream_node_id: None,
                    upstream_node_name: None,
                });
            } else {
                for product_code in &assembly.processable_products {
                    let product_name = canvas.products.get(product_code)
                        .map(|p| p.name.clone())
                        .unwrap_or_default();
                    
                    let incoming_connections: Vec<_> = canvas.connections
                        .values()
                        .filter(|c| c.to_device_id == assembly.base.id)
                        .collect();
                    
                    let mut connected_upstream_nodes: std::collections::HashSet<String> = 
                        std::collections::HashSet::new();
                    
                    for conn in &incoming_connections {
                        if let Some(upstream_device) = canvas.devices.get(&conn.from_device_id) {
                            let can_provide = match upstream_device {
                                Device::StartNode(sn) => &sn.product_code == product_code,
                                Device::Station(s) => {
                                    if !s.processable_products.is_empty() {
                                        s.processable_products.contains(&product_code.to_string())
                                    } else if !s.product_code.is_empty() {
                                        &s.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                Device::Warehouse(w) => {
                                    if !w.product_code.is_empty() {
                                        &w.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                Device::Buffer(b) => {
                                    if !b.product_code.is_empty() {
                                        &b.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                Device::TempStore(t) => {
                                    if !t.product_code.is_empty() {
                                        &t.product_code == product_code
                                    } else {
                                        true
                                    }
                                }
                                _ => false,
                            };
                            
                            if can_provide {
                                connected_upstream_nodes.insert(conn.from_device_id.clone());
                            }
                        }
                    }
                    
                    let upstream_reqs = assembly.product_upstream_requirements.get(product_code);
                    
                    if upstream_reqs.is_none() || upstream_reqs.unwrap().is_empty() {
                        if !connected_upstream_nodes.is_empty() {
                            for upstream_id in &connected_upstream_nodes {
                                let upstream_name = canvas.devices.get(upstream_id)
                                    .map(|d| d.name().to_string())
                                    .unwrap_or_default();
                                
                                errors.push(crate::models::AssemblyStationError {
                                    id: assembly.base.id.clone(),
                                    name: assembly.base.name.clone(),
                                    error_type: crate::models::AssemblyStationErrorType::UpstreamQuantityZero,
                                    product_code: Some(product_code.clone()),
                                    product_name: Some(product_name.clone()),
                                    upstream_node_id: Some(upstream_id.clone()),
                                    upstream_node_name: Some(upstream_name),
                                });
                            }
                        } else {
                            errors.push(crate::models::AssemblyStationError {
                                id: assembly.base.id.clone(),
                                name: assembly.base.name.clone(),
                                error_type: crate::models::AssemblyStationErrorType::UpstreamQuantityZero,
                                product_code: Some(product_code.clone()),
                                product_name: Some(product_name.clone()),
                                upstream_node_id: None,
                                upstream_node_name: None,
                            });
                        }
                    } else {
                        for upstream_id in &connected_upstream_nodes {
                            let required_qty = upstream_reqs.unwrap().get(upstream_id);
                            
                            if required_qty.is_none() || *required_qty.unwrap() == 0 {
                                let upstream_name = canvas.devices.get(upstream_id)
                                    .map(|d| d.name().to_string())
                                    .unwrap_or_default();
                                
                                errors.push(crate::models::AssemblyStationError {
                                    id: assembly.base.id.clone(),
                                    name: assembly.base.name.clone(),
                                    error_type: crate::models::AssemblyStationErrorType::UpstreamQuantityZero,
                                    product_code: Some(product_code.clone()),
                                    product_name: Some(product_name.clone()),
                                    upstream_node_id: Some(upstream_id.clone()),
                                    upstream_node_name: Some(upstream_name),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    errors
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
