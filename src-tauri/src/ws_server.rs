use serde::{Deserialize, Serialize};
use std::net::TcpListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tungstenite::accept_hdr;
use tungstenite::handshake::server::{Request, Response};
use tungstenite::Message;

use reqwest::StatusCode;

const WS_PATH: &str = "/ws/simulation";

pub fn compute_bneedpipe(socketname: &str) -> &'static str {
    if socketname == "0" {
        "0"
    } else if socketname.split(',').all(|part| part.trim().parse::<f64>().is_ok()) {
        "2"
    } else {
        "1"
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "runId")]
    pub run_id: String,
    #[serde(rename = "productId")]
    pub product_id: String,
    #[serde(rename = "stepName")]
    pub step_name: String,
    #[serde(rename = "deviceId")]
    pub device_id: String,
    pub tag: String,
    pub neededtime: String,
    pub bneedpipe: String,
    pub socketname: String,
    #[serde(rename = "enterTime")]
    pub enter_time: String,
    #[serde(rename = "endTime", skip_serializing_if = "String::is_empty")]
    pub end_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "runId")]
    pub run_id: String,
    #[serde(rename = "productId")]
    pub product_id: String,
    #[serde(rename = "stepName")]
    pub step_name: String,
    pub tag: String,
    pub neededtime: String,
    pub bneedpipe: String,
    pub socketname: String,
    #[serde(rename = "enterTime")]
    pub enter_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AckEvent {
    pub ts: String,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "runId")]
    pub run_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductEndEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "runId")]
    pub run_id: String,
    #[serde(rename = "productId")]
    pub product_id: String,
    pub tag: String,
    pub neededtime: String,
    pub bneedpipe: String,
    pub socketname: String,
    #[serde(rename = "enterTime")]
    pub enter_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessCompletedEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "runId")]
    pub run_id: String,
    pub tag: String,
    pub neededtime: String,
    pub bneedpipe: String,
    pub socketname: String,
    #[serde(rename = "enterTime")]
    pub enter_time: String,
}

pub struct WsServer {
    clients: Arc<Mutex<Vec<tungstenite::protocol::WebSocket<std::net::TcpStream>>>>,
    running: Arc<AtomicBool>,
    port: u16,
    log_file_path: Arc<Mutex<Option<String>>>,
}

impl WsServer {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(Vec::new())),
            running: Arc::new(AtomicBool::new(false)),
            port: 0,
            log_file_path: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start(&mut self, port: u16) -> Result<(), String> {
        if self.running.load(Ordering::Relaxed) {
            return Ok(());
        }

        let addr = format!("0.0.0.0:{}", port);
        let listener = TcpListener::bind(&addr).map_err(|e| format!("WebSocket绑定端口{}失败: {}", port, e))?;
        listener.set_nonblocking(true).map_err(|e| format!("设置非阻塞失败: {}", e))?;
        self.port = port;

        // 设置日志文件路径
        let log_dir = std::env::current_dir().unwrap_or_default();
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let log_path = format!("{}/ws_sim_log_{}.jsonl", log_dir.display(), timestamp);
        *self.log_file_path.lock().unwrap() = Some(log_path.clone());

        self.running.store(true, Ordering::Relaxed);

        let clients = self.clients.clone();
        let running = self.running.clone();
        let log_file_path = self.log_file_path.clone();

        std::thread::spawn(move || {
            while running.load(Ordering::Relaxed) {
                match listener.accept() {
                    Ok((stream, _addr)) => {
                        stream.set_nonblocking(false).ok();
                        let callback = |req: &Request, mut response: Response| {
                            if req.uri().path() != WS_PATH {
                                eprintln!(
                                    "WebSocket拒绝连接: 路径不匹配 (期望: {}, 实际: {})",
                                    WS_PATH,
                                    req.uri().path()
                                );
                                *response.status_mut() = StatusCode::NOT_FOUND;
                            }
                            Ok(response)
                        };
                        match accept_hdr(stream, callback) {
                            Ok(ws) => {
                                let mut clients = clients.lock().unwrap();
                                clients.push(ws);
                            }
                            Err(e) => {
                                eprintln!("WebSocket accept error: {}", e);
                            }
                        }
                    }
                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                    }
                    Err(e) => {
                        eprintln!("WebSocket accept error: {}", e);
                        std::thread::sleep(std::time::Duration::from_millis(100));
                    }
                }
            }

            // 写日志文件结束标记
            let path = log_file_path.lock().unwrap();
            if let Some(path) = &*path {
                if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
                    use std::io::Write;
                    let _ = writeln!(file, "{{\"type\": \"server-stopped\"}}");
                }
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::Relaxed);

        // Close all client connections
        let mut clients = self.clients.lock().unwrap();
        clients.clear();

        *self.log_file_path.lock().unwrap() = None;
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    fn send_json(&self, json: &str) {
        // 写入日志文件
        let log_path = self.log_file_path.lock().unwrap();
        if let Some(log_path) = &*log_path {
            if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(log_path) {
                use std::io::Write;
                let _ = writeln!(file, "{}", json);
            }
        }
        drop(log_path);

        // 通过WebSocket发送
        let mut clients = self.clients.lock().unwrap();
        clients.retain_mut(|client| {
            match client.send(Message::Text(json.to_string())) {
                Ok(()) => true,
                Err(_) => {
                    let _ = client.close(None);
                    false
                }
            }
        });
    }

    pub fn broadcast(&self, event: &StepEvent) {
        let json = serde_json::to_string(event).unwrap_or_default();
        self.send_json(&json);
    }

    pub fn broadcast_entry(&self, event: &EntryEvent) {
        let json = serde_json::to_string(event).unwrap_or_default();
        self.send_json(&json);
    }

    pub fn broadcast_ack(&self, event: &AckEvent) {
        let json = serde_json::to_string(event).unwrap_or_default();
        self.send_json(&json);
    }

    pub fn broadcast_product_end(&self, event: &ProductEndEvent) {
        let json = serde_json::to_string(event).unwrap_or_default();
        self.send_json(&json);
    }

    pub fn broadcast_process_completed(&self, event: &ProcessCompletedEvent) {
        let json = serde_json::to_string(event).unwrap_or_default();
        self.send_json(&json);
    }

    pub fn broadcast_text(&self, text: &str) {
        let mut clients = self.clients.lock().unwrap();
        clients.retain_mut(|client| {
            match client.send(Message::Text(text.to_string())) {
                Ok(()) => true,
                Err(_) => {
                    let _ = client.close(None);
                    false
                }
            }
        });
    }

    pub fn close_all_clients(&self) {
        let mut clients = self.clients.lock().unwrap();
        for client in clients.iter_mut() {
            let _ = client.close(None);
        }
        clients.clear();
    }
}

// 全局WebSocket服务器实例
lazy_static::lazy_static! {
    pub static ref WS_SERVER: Arc<Mutex<WsServer>> = Arc::new(Mutex::new(WsServer::new()));
}
