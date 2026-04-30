use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const DEFAULT_OLLAMA_BASE_URL: &str = "http://140.206.81.138:11434/v1";
const DEFAULT_OLLAMA_MODEL: &str = "qwen3.6:latest";
const API_TIMEOUT_SECS: u64 = 300;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiApiConfig {
    pub use_custom_api: bool,
    pub custom_base_url: Option<String>,
    pub custom_api_key: Option<String>,
    pub custom_model: Option<String>,
}

impl Default for AiApiConfig {
    fn default() -> Self {
        Self {
            use_custom_api: false,
            custom_base_url: None,
            custom_api_key: None,
            custom_model: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiAnalysisRecord {
    pub id: String,
    pub record_ids: Vec<String>,
    pub timestamp: String,
    pub prompt: String,
    pub result: String,
    pub model_used: String,
}

fn get_ai_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_dir.join("ai_config.json"))
}

fn get_ai_analysis_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_dir.join("ai_analysis_records.json"))
}

fn simple_encrypt(text: &str) -> String {
    let bytes = text.as_bytes();
    let key = 0x5A;
    let encrypted: Vec<u8> = bytes.iter().map(|b| b ^ key).collect();
    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &encrypted)
}

fn simple_decrypt(encoded: &str) -> Result<String, String> {
    let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encoded)
        .map_err(|e| format!("Base64 decode error: {}", e))?;
    let key = 0x5A;
    let decrypted: Vec<u8> = decoded.iter().map(|b| b ^ key).collect();
    String::from_utf8(decrypted).map_err(|e| format!("UTF-8 decode error: {}", e))
}

#[tauri::command]
pub fn get_ai_api_config(app: tauri::AppHandle) -> Result<AiApiConfig, String> {
    let path = get_ai_config_path(&app)?;
    if path.exists() {
        let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let mut config: AiApiConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        if let Some(ref key) = config.custom_api_key {
            if !key.is_empty() {
                config.custom_api_key = Some(simple_decrypt(key).unwrap_or_else(|_| key.clone()));
            }
        }
        Ok(config)
    } else {
        Ok(AiApiConfig::default())
    }
}

#[tauri::command]
pub fn save_ai_api_config(app: tauri::AppHandle, config: AiApiConfig) -> Result<(), String> {
    let path = get_ai_config_path(&app)?;
    let mut config_to_save = config.clone();
    if let Some(ref key) = config_to_save.custom_api_key {
        if !key.is_empty() {
            config_to_save.custom_api_key = Some(simple_encrypt(key));
        }
    }
    let json = serde_json::to_string_pretty(&config_to_save).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct ChatResponseChoice {
    message: ChatResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ChatResponseMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatResponseChoice>,
}

#[tauri::command]
pub async fn test_ai_connection(app: tauri::AppHandle) -> Result<String, String> {
    let config = get_ai_api_config(app)?;

    let (base_url, api_key, model) = if config.use_custom_api {
        let base_url = config
            .custom_base_url
            .ok_or("未配置自定义API地址")?;
        let model = config.custom_model.ok_or("未配置自定义模型名称")?;
        (base_url, config.custom_api_key.unwrap_or_default(), model)
    } else {
        (
            DEFAULT_OLLAMA_BASE_URL.to_string(),
            String::new(),
            DEFAULT_OLLAMA_MODEL.to_string(),
        )
    };

    let url = format!(
        "{}/chat/completions",
        base_url.trim_end_matches('/')
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;

    let mut req_builder = client.post(&url).json(&ChatRequest {
        model: model.clone(),
        messages: vec![ChatMessage {
            role: "user".to_string(),
            content: "你好，请回复'连接成功'".to_string(),
        }],
        stream: false,
    });

    if !api_key.is_empty() {
        req_builder = req_builder.bearer_auth(&api_key);
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("连接失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API返回错误 (HTTP {}): {}", status, body));
    }

    Ok(format!("连接成功，使用模型: {}", model))
}

fn build_prompt(record_count: usize) -> String {
    if record_count == 1 {
        "这些文件是离散生产节拍模拟工具生成的模拟运行数据报告，阅读收到的报告，分析、总结这次模拟生产的总体情况、可能存在的问题。请用中文回答，使用Markdown格式。".to_string()
    } else {
        "这些文件是离散生产节拍模拟工具生成的模拟运行数据报告，阅读收到的所有报告，分析、对比、总结这些模拟生产的总体情况、可能存在的问题、不同模拟之间的差异。请用中文回答，使用Markdown格式。".to_string()
    }
}

#[tauri::command]
pub async fn call_ai_analysis(
    app: tauri::AppHandle,
    md_content: String,
    record_count: usize,
) -> Result<String, String> {
    let config = get_ai_api_config(app)?;

    let (base_url, api_key, model) = if config.use_custom_api {
        let base_url = config
            .custom_base_url
            .ok_or("未配置自定义API地址")?;
        let model = config.custom_model.ok_or("未配置自定义模型名称")?;
        (base_url, config.custom_api_key.unwrap_or_default(), model)
    } else {
        (
            DEFAULT_OLLAMA_BASE_URL.to_string(),
            String::new(),
            DEFAULT_OLLAMA_MODEL.to_string(),
        )
    };

    let url = format!(
        "{}/chat/completions",
        base_url.trim_end_matches('/')
    );

    let prompt = build_prompt(record_count);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(API_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;

    let mut req_builder = client.post(&url).json(&ChatRequest {
        model: model.clone(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: "你是一个专业的离散生产系统分析专家，擅长分析生产模拟数据、识别瓶颈问题、提出优化建议。".to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: format!("{}\n\n{}", prompt, md_content),
            },
        ],
        stream: false,
    });

    if !api_key.is_empty() {
        req_builder = req_builder.bearer_auth(&api_key);
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("请求AI服务失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("AI服务返回错误 (HTTP {}): {}", status, body));
    }

    let chat_response: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("解析AI响应失败: {}", e))?;

    let result = chat_response
        .choices
        .first()
        .ok_or("AI响应中没有返回结果")?
        .message
        .content
        .clone();

    Ok(result)
}

#[tauri::command]
pub fn get_ai_analysis_records(app: tauri::AppHandle) -> Result<Vec<AiAnalysisRecord>, String> {
    let path = get_ai_analysis_path(&app)?;
    if path.exists() {
        let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&json).map_err(|e| e.to_string())
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub fn save_ai_analysis_record(
    app: tauri::AppHandle,
    record_ids: Vec<String>,
    prompt: String,
    result: String,
    model_used: String,
) -> Result<AiAnalysisRecord, String> {
    let path = get_ai_analysis_path(&app)?;

    let mut records = if path.exists() {
        let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str::<Vec<AiAnalysisRecord>>(&json).unwrap_or_default()
    } else {
        Vec::new()
    };

    let id = uuid::Uuid::new_v4().to_string();
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let analysis_record = AiAnalysisRecord {
        id: id.clone(),
        record_ids,
        timestamp,
        prompt,
        result,
        model_used,
    };

    records.push(analysis_record.clone());

    let json = serde_json::to_string_pretty(&records).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(analysis_record)
}

#[tauri::command]
pub fn delete_ai_analysis_record(app: tauri::AppHandle, record_id: String) -> Result<(), String> {
    let path = get_ai_analysis_path(&app)?;

    let mut records = if path.exists() {
        let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str::<Vec<AiAnalysisRecord>>(&json).unwrap_or_default()
    } else {
        return Ok(());
    };

    records.retain(|r| r.id != record_id);

    let json = serde_json::to_string_pretty(&records).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(())
}
