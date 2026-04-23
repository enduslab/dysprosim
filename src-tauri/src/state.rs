use std::sync::Mutex;
use crate::models::CanvasState;
use crate::simulation::SimulationEngine;

pub struct AppState {
    pub canvas: Mutex<CanvasState>,
    pub simulation: Mutex<SimulationEngine>,
}

impl AppState {
    pub fn new() -> Self {
        let canvas = CanvasState::default();
        let simulation = SimulationEngine::new(canvas.clone());
        Self {
            canvas: Mutex::new(canvas),
            simulation: Mutex::new(simulation),
        }
    }
}
