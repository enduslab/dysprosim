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
    pub layout_path: String,
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
    let simulation_control_items = r#"

给出针对性优化建议时，参考软件中可选的模拟控制项，内容如下：

# 资源选择规则说明

## 基础规则

设备或起点选择下游节点的规则如下：

1. **产品匹配：** 必须从设置的允许加工产品包括了当前节点所设置的产品的下游节点中选择。如果没有设置产品则表示能加工所有产品。

2. **优先空闲：** 在满足第一条件的情况下，优先选择空闲的设备。

3. **距离最近：** 如果有多台满足第二条件的设备，则选择距离最近的。

4. **随机选择：** 如果有多台第三条件相同的设备，则随机选择一台。

---

## 动态平衡算法(在制品)

当某个产品从一个节点（可以是起点、设备、缓冲区、仓库、临时堆场）出发时，按如下步骤执行：

1. **检测下游节点数量：** 检测当前节点的允许加工本产品的直接下游节点数量。如果只有1个则不做任何额外处理，直接选择该节点；如果大于1个，则进入下一步。

2. **获取剩余路线：** 从当前产品的产品工艺路线中，获取分别从当前节点允许加工本产品的不同下游节点为起点的剩余路线。

3. **计算在制品总量：** 分别计算每条剩余路线中的所有节点和连线的当前在制品总量。计算公式为：在制品总量 = Σ(节点wip) + Σ(连线inflight)。其中节点wip包含等待加工、加工中、等待运输的产品数量。

4. **处理分支情况：** 如果某个下游节点对应多条剩余路线（因为存在分支），应计算每条路线的在制品总量，然后保留最小的。

5. **选择最优路线：** 选择计算得到的其中当前在制品总量最少的一条剩余路线。

6. **处理相同情况：** 如果多条路线的在制品总量相同，则选择距离最近的下游节点。

> **说明：** 此策略旨在平衡各条生产线的负载，避免某些路线过度拥挤而其他路线空闲的情况，从而提高整体生产效率。

---

## 动态平衡算法(设备利用率)

当某个产品从一个节点出发时，按如下步骤执行：

1. **检测下游节点数量：** 检测当前节点的允许加工本产品的直接下游节点数量。如果只有1个则不做任何额外处理，直接选择该节点；如果大于1个，则进入下一步。

2. **获取剩余路线：** 从当前产品的产品工艺路线中，获取分别从当前节点允许加工本产品的不同下游节点为起点的剩余路线。

3. **计算设备利用率：** 对于每条剩余路线，计算路线上所有设备的利用率。设备利用率计算公式为：利用率 = 设备累计加工时间 / 模拟已运行时间 × 100%。

4. **确定路线最高利用率：** 对于每条路线，找出该路线上所有设备中的最高利用率值。

5. **处理分支情况：** 如果某个下游节点对应多条剩余路线（因为存在分支），应计算每条路线的最高设备利用率，然后保留最小的。

6. **选择最优路线：** 选择其中最高设备利用率最低的一条路线。这样可以避免将产品发送到已经有高利用率设备的路线，实现负载均衡。

7. **处理相同情况：** 如果多条路线的最高设备利用率相同，则选择距离最近的下游节点。如果距离也相同，则随机选择。

> **说明：** 此策略通过关注路线上最繁忙的设备（瓶颈设备），避免进一步加重其负担，从而实现更均衡的设备利用率分布，减少某些设备过载而其他设备空闲的情况。

---

## 缓冲区控制逻辑

缓冲区是平衡上下游工序生产节拍的关键设备。其控制逻辑涉及入站运输、出站释放和容量管控三个方面。

缓冲区通过监控潜在库存来控制上游起点的投料节奏，防止缓冲区溢出：

1. **潜在库存计算：** 潜在库存 = 缓冲区当前库存 + 所有上游加工站的等待运输产品数之和。

2. **投料暂停：** 当潜在库存 ≥ 缓冲区最大容量时，缓冲区上游路径对应的所有起点暂停投料。

3. **投料恢复：** 当潜在库存 < 缓冲区最大容量时，恢复已暂停起点的投料（但受固定产量模式等其他规则约束的起点除外）。

4. **上游起点查找：** 系统会沿缓冲区的上游路径回溯，找到所有直接或间接向缓冲区供货的起点节点。

5. **触发时机：** 以下事件会触发容量管控检查：
   - 缓冲区向下游释放产品后
   - 缓冲区收到上游运来的产品后
   - 缓冲区的上游加工站完成加工后

---

## 仓库与临时堆场控制逻辑

当仓库或临时堆场有库存时，按以下规则将产品释放到下游：

#### 2.1 投放模式

| 模式 | 说明 |
|------|------|
| 等待空闲 | 仅当所有下游设备都空闲时才释放产品（默认模式） |
| 立即投放 | 只要有库存就立即释放产品 |


### 4. 与缓冲区的区别

| 特性 | 仓库/临时堆场 | 缓冲区 |
|------|--------------|--------|
| 容量限制 | 仓库有容量限制，临时堆场无限制 | 有容量限制 |
| 投放模式 | 可选"等待空闲"或"立即投放" | 固定为下游WIP≤2时释放 |
| 下游设备限制 | 仅限加工站、装配站、终点 | 加工站、装配站、终点 |
| 投料控制 | 无 | 有（控制上游起点投料） |
| 入库队列 | 有等待入库队列 | 直接入库 |


---

## 加工制品选择策略

当设备完成当前制品加工后，需要从等待加工队列中选择下一个加工制品时，按以下策略执行。该策略适用于工作站、装配站和拆解站，在模拟运行前设置，运行中不可更改。

### 1. 先到先生产（默认策略）

按产品到达设备的时间先后顺序选择，先到达的产品优先加工。

**选择步骤：**
1. 收集当前设备等待加工队列中的所有产品
2. 按到达时间（`arrive_time_s`）升序排列
3. 选择到达时间最早的产品

### 2. 同类优先兼顾工具

优先选择与上一次加工产品编码相同的产品；若无同类产品，则优先选择工具完全相同的产品；若工具也不完全相同，则选择相同工具数量最多的产品。

**选择步骤：**
1. **同类优先：** 从候选产品中筛选与上一次加工产品编码（`product_code`）相同的产品。若有，从中按到达时间最早的选择
2. **工具完全相同：** 若无同类产品，筛选工具编码集合与上一次加工完全一致的产品（忽略工具安装时间数字）。若有，从中按到达时间最早的选择
3. **最多相同工具：** 若无工具完全相同的产品，计算每个候选产品与上一次加工的相同工具编码数量，选择相同工具数量最多的产品。若有多个，按到达时间最早的选择
4. **兜底：** 若以上条件均无法筛选出产品，按到达时间最早的选择

> **说明：** "工具完全相同"是指工具编码集合完全一致，忽略工具后面的安装时间数字。例如 {T1: 2, T2: 1} 和 {T1: 1, T2: 2} 算工具完全相同。"最多相同工具"按相同工具编码的数量计，例如 {T1, T2} 和 {T1, T2, T3} 的相同工具数量为2（T1和T2）。

### 3. 同工具优先

优先选择工具编码集合与上一次加工完全相同的产品；若工具不完全相同，则选择相同工具数量最多的产品。

**选择步骤：**
1. **工具完全相同：** 从候选产品中筛选工具编码集合与上一次加工完全一致的产品（忽略工具安装时间数字）。若有，从中按到达时间最早的选择
2. **最多相同工具：** 若无工具完全相同的产品，计算每个候选产品与上一次加工的相同工具编码数量，选择相同工具数量最多的产品。若有多个，按到达时间最早的选择
3. **兜底：** 若以上条件均无法筛选出产品，按到达时间最早的选择

### 4. 首次加工退化

如果设备是第一次加工（没有上一次加工记录），则"同类优先兼顾工具"和"同工具优先"策略均退化为"先到先生产"。

### 5. 产品优先级

当勾选"考虑产品优先级"时，在选择策略执行前先进行优先级筛选：

1. **筛选最高优先级：** 从候选产品中找出设置了优先级且优先级数值最小（最高优先级）的产品。优先级数值1为最高，5为最低
2. **保留最高优先级产品：** 仅保留优先级等于最高优先级的产品作为候选。未设置优先级的产品不参与优先级比较
3. **策略选择：** 在筛选后的候选产品中，按当前选择策略（先到先生产/同类优先兼顾工具/同工具优先）选择具体的制品
4. **无优先级产品：** 如果所有候选产品均未设置优先级，则不进行筛选，所有产品均参与策略选择

> **说明：** 产品优先级为可选属性，默认为"未设置"。在产品管理界面中可设置1-5级优先级。

---

## 多仓库选择优先级

当产品需要运往仓库/缓冲区，且存在多个可选的仓库/缓冲区时，系统按优先级规则逐级筛选，直到选出唯一的仓库。

### 1. 基本筛选

1. **容量过滤：** 首先筛选出有剩余容量的仓库/缓冲区。如果所有仓库/缓冲区都无剩余容量，则从全部候选中继续选择
2. **唯一候选：** 如果筛选后仅剩1个候选，直接选择该仓库/缓冲区

### 2. 逐级优先级筛选

系统按用户设置的优先级列表顺序，逐级对候选仓库/缓冲区进行评分和筛选：

1. **评分：** 根据当前优先级规则，为每个候选仓库/缓冲区计算评分
2. **筛选：** 找出评分最优（最低）的仓库/缓冲区。如果有多个评分相同且最优，则保留这些候选进入下一级筛选
3. **终止：** 如果某一级筛选后仅剩1个候选，直接选择该仓库/缓冲区；否则继续下一级优先级筛选
4. **兜底：** 如果所有优先级规则筛选完毕仍有多个候选，按仓库ID字典序选择第一个

### 3. 优先级规则说明

| 优先级规则 | 评分方式 | 说明 |
|-----------|---------|------|
| 距离最近 | 仓库与出发设备的欧几里得距离 | 优先选择距离最近的仓库 |
| 距离最远 | 仓库与出发设备的欧几里得距离（取负值） | 优先选择距离最远的仓库 |
| 利用率最低 | 当前库存 / 容量 | 优先选择利用率最低的仓库 |
| 利用率最高 | 当前库存 / 容量（取负值） | 优先选择利用率最高的仓库 |
| 按产品集中 | 当前仓库中与运输产品相同编码的存储数量（取负值） | 优先选择已存储同类产品最多的仓库 |
| 按产品分散 | 当前仓库中与运输产品相同编码的存储数量 | 优先选择已存储同类产品最少的仓库 |
| 等待入库最少 | 当前仓库等待入库队列长度 | 优先选择等待入库数量最少的仓库 |

### 4. 冲突规则

以下规则对互为冲突，不可同时选择：

| 规则A | 规则B | 冲突原因 |
|-------|-------|---------|
| 距离最近 | 距离最远 | 方向相反 |
| 利用率最低 | 利用率最高 | 方向相反 |
| 按产品集中 | 按产品分散 | 方向相反 |

### 5. 使用示例

假设有3个仓库，优先级设置为：1.利用率最低 → 2.距离最近

1. 第一级按"利用率最低"评分，假设仓库A利用率30%、仓库B利用率50%、仓库C利用率30%
2. 仓库A和C评分相同且最优，进入下一级
3. 第二级按"距离最近"评分，假设仓库A距离100、仓库C距离50
4. 仓库C距离最近，选择仓库C
"#;

    if record_count == 1 {
        format!("这些文件是离散生产节拍模拟工具生成的模拟运行数据报告，阅读收到的报告，分析、总结这次模拟生产的总体情况、可能存在的问题。请用中文回答，使用Markdown格式。{}", simulation_control_items)
    } else {
        format!("这些文件是离散生产节拍模拟工具生成的模拟运行数据报告，阅读收到的所有报告，分析、对比、总结这些模拟生产的总体情况、可能存在的问题、不同模拟之间的差异。请用中文回答，使用Markdown格式。{}", simulation_control_items)
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
pub fn get_ai_analysis_records(app: tauri::AppHandle, layout_path: String) -> Result<Vec<AiAnalysisRecord>, String> {
    let path = get_ai_analysis_path(&app)?;
    if path.exists() {
        let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let all_records: Vec<AiAnalysisRecord> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        let filtered: Vec<AiAnalysisRecord> = all_records
            .into_iter()
            .filter(|r| r.layout_path == layout_path)
            .collect();
        Ok(filtered)
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub fn save_ai_analysis_record(
    app: tauri::AppHandle,
    record_ids: Vec<String>,
    layout_path: String,
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
        layout_path,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationChange {
    #[serde(rename = "type")]
    pub change_type: String,
    pub value: serde_json::Value,
    #[serde(default)]
    pub device_id: Option<String>,
    #[serde(default)]
    pub field: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationSuggestion {
    pub can_optimize: bool,
    pub should_continue: bool,
    pub changes: Vec<OptimizationChange>,
    pub reasoning: String,
}

fn build_optimization_prompt() -> String {
    let simulation_control_items = r#"

# 可调整的配置参数

你可以建议调整以下参数来优化生产系统：

## 全局策略参数
- **resource_selection_rule**: 资源选择规则，可选值："basic"（基础规则）、"min_wip_dynamic"（最小在制品动态平衡）、"min_utilrate_dynamic"（最低利用率动态平衡）
- **warehouse_selection_priorities**: 仓库选择优先级列表，可选值数组，按优先级从高到低排列，可选值："nearest_distance"、"farthest_distance"、"lowest_utilization"、"highest_utilization"、"product_concentrated"、"product_dispersed"、"least_waiting_entry"。注意冲突规则：距离最近与距离最远互斥、利用率最低与利用率最高互斥、按产品集中与按产品分散互斥
- **product_selection_strategy**: 加工制品选择策略，可选值："first_come_first_served"（先到先生产）、"same_type_priority_with_tool"（同类优先兼顾工具）、"same_tool_priority"（同工具优先）
- **consider_product_priority**: 是否考虑产品优先级，布尔值 true/false

## 设备级参数
- **仓库/临时堆场投放模式 (release_mode)**: 可选值："wait_for_idle"（等待空闲）、"immediate"（立即投放）
- **缓冲区容量 (max_capacity)**: 正整数，设置缓冲区的最大容量
- **产品优先级 (product_priority)**: 1-5的整数，1为最高优先级，5为最低优先级，null表示无优先级

## 结构性调整
- **添加缓冲区 (add_buffer)**: 在瓶颈设备前添加缓冲区，需要指定：upstream_device_id（上游设备ID）、downstream_device_id（瓶颈设备ID）、capacity（缓冲区容量）、product_code（产品编码）
- **复制瓶颈节点 (clone_device)**: 复制瓶颈加工节点以增加产能，需要指定：device_id（要复制的设备ID）、count（复制数量，1-3）

**注意：不能修改任何设备的加工时间参数，加工时间是物理约束。**
"#;

    format!(
        "你是一个专业的离散生产系统优化专家。你将收到一份模拟运行数据报告，请分析当前生产系统的问题和瓶颈，并提出具体的配置优化建议。{}",
        simulation_control_items
    )
}

#[tauri::command]
pub async fn call_ai_optimization(
    app: tauri::AppHandle,
    md_content: String,
    iteration: usize,
    max_iterations: usize,
    previous_changes_json: Option<String>,
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

    let system_prompt = build_optimization_prompt();

    let mut user_content = format!(
        "这是第 {}/{} 次优化迭代。请分析以下模拟数据，判断是否还有优化空间，如果有，提出具体的配置调整建议。\n\n",
        iteration, max_iterations
    );

    if let Some(ref prev) = previous_changes_json {
        user_content.push_str(&format!("之前迭代已经做过的调整：{}\n\n", prev));
    }

    user_content.push_str(&md_content);

    user_content.push_str(r#"

请严格按照以下JSON格式返回你的分析和建议（不要包含其他文字，只返回JSON）：

{
  "can_optimize": true或false,
  "should_continue": true或false,
  "changes": [
    {"type": "resource_selection_rule", "value": "min_wip_dynamic"},
    {"type": "product_selection_strategy", "value": "same_tool_priority"},
    {"type": "consider_product_priority", "value": true},
    {"type": "warehouse_selection_priorities", "value": ["nearest_distance", "lowest_utilization"]},
    {"type": "device_config", "device_id": "设备ID", "field": "release_mode", "value": "immediate"},
    {"type": "product_priority", "device_id": "产品编码", "field": "priority", "value": 1},
    {"type": "add_buffer", "value": {"upstream_device_id": "上游设备ID", "downstream_device_id": "下游瓶颈设备ID", "capacity": 10, "product_code": "产品编码"}},
    {"type": "clone_device", "value": {"device_id": "要复制的设备ID", "count": 1}}
  ],
  "reasoning": "详细说明你的分析过程、发现的问题、建议的调整及预期效果"
}

说明：
- can_optimize: 根据当前数据和可调参数，判断是否还有优化空间
- should_continue: 是否建议继续下一轮优化迭代（当达到最大迭代次数时，如果认为还有优化空间设为true）
- changes: 具体的配置调整列表，每项包含type和value
- reasoning: 详细的分析说明

如果判断无法再优化，返回：{"can_optimize": false, "should_continue": false, "changes": [], "reasoning": "说明原因"}

重要要求：
1. reasoning字段必须使用中文输出，不要使用英文。以下是参数的中英文对照，在推理中请使用中文名称：
   - resource_selection_rule → 资源选择规则（basic→基础规则, min_wip_dynamic→最小在制品动态平衡, min_utilrate_dynamic→最低利用率动态平衡）
   - product_selection_strategy → 加工制品选择策略（first_come_first_served→先到先生产, same_type_priority_with_tool→同类优先兼顾工具, same_tool_priority→同工具优先）
   - consider_product_priority → 是否考虑产品优先级
   - warehouse_selection_priorities → 仓库选择优先级（nearest_distance→距离最近, farthest_distance→距离最远, lowest_utilization→利用率最低, highest_utilization→利用率最高, product_concentrated→按产品集中, product_dispersed→按产品分散, least_waiting_entry→等待入库最少）
   - device_config/release_mode → 投放模式（wait_for_idle→等待空闲, immediate→立即投放）
   - device_config/max_capacity → 缓冲区容量
   - add_buffer → 添加缓冲区
   - clone_device → 复制瓶颈设备
   - product_priority → 产品优先级
2. 严禁编造或推测报告中不存在的数据。所有引用的数值必须来自提供的模拟数据报告，不得虚构任何指标数据。
3. 分析必须基于报告中的实际数据，如果报告中没有某项数据，不要自行推测。
4. 重要：报告中所有利用率（包括设备利用率、路径利用率等）的数值已经是百分比形式（范围0-100），不需要再乘以100。例如报告中显示利用率45.2，含义就是45.2%，不要理解为0.452%或将其转换为4520%。
"#);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(API_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;

    let mut req_builder = client.post(&url).json(&ChatRequest {
        model: model.clone(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: system_prompt,
            },
            ChatMessage {
                role: "user".to_string(),
                content: user_content,
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
