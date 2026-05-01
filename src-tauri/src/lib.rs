pub mod models;
pub mod simulation;
pub mod commands;
pub mod state;
pub mod ai;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let state = state::AppState::new();
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_canvas_state,
            commands::set_canvas_size,
            commands::clear_canvas,
            commands::add_device,
            commands::update_device,
            commands::delete_device,
            commands::add_connection,
            commands::update_connection,
            commands::delete_connection,
            commands::get_devices,
            commands::get_connections,
            commands::save_layout,
            commands::load_layout,
            commands::start_simulation,
            commands::pause_simulation,
            commands::resume_simulation,
            commands::reset_simulation,
            commands::step_simulation,
            commands::set_simulation_speed,
            commands::set_simulation_duration,
            commands::set_resource_selection_rule,
            commands::set_simulation_mode,
            commands::set_utilization_sample_interval,
            commands::set_warehouse_selection_priorities,
            commands::set_product_selection_strategy,
            commands::set_consider_product_priority,
            commands::get_simulation_state,
            commands::get_simulation_results,
            commands::save_simulation_record,
            commands::get_simulation_records,
            commands::get_simulation_record,
            commands::delete_simulation_record,
            commands::add_product,
            commands::update_product,
            commands::delete_product,
            commands::get_products,
            commands::add_material,
            commands::update_material,
            commands::delete_material,
            commands::get_materials,
            commands::add_tool,
            commands::update_tool,
            commands::delete_tool,
            commands::get_tools,
            commands::get_settings,
            commands::update_settings,
            commands::get_product_routes,
            commands::open_user_manual,
            ai::get_ai_api_config,
            ai::save_ai_api_config,
            ai::test_ai_connection,
            ai::call_ai_analysis,
            ai::get_ai_analysis_records,
            ai::save_ai_analysis_record,
            ai::delete_ai_analysis_record,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
