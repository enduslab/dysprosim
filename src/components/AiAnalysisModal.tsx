import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import type { SimulationRecord, SimulationResults, AiAnalysisRecord } from '../types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const MAX_SELECT_COUNT = 3;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const priorityLabels: Record<string, string> = {
  nearest_distance: '距离最近',
  farthest_distance: '距离最远',
  lowest_utilization: '利用率最低',
  highest_utilization: '利用率最高',
  product_concentrated: '按产品集中',
  product_dispersed: '按产品分散',
  least_waiting_entry: '等待入库最少',
};

function computeProductMaterialConsumption(
  results: SimulationResults,
  products: Record<string, { name: string; color: string }>,
  materials: Record<string, { name: string; unit: string }>,
) {
  const productMaterialMap: Record<string, Record<string, { quantity: number; unit: string }>> = {};
  Object.values(results.processing_records).forEach(records => {
    records.forEach(record => {
      if (record.task_type === '工具切换') return;
      const productCode = record.product_code;
      if (!productMaterialMap[productCode]) {
        productMaterialMap[productCode] = {};
      }
      Object.entries(record.materials_used).forEach(([materialCode, qty]) => {
        if (!productMaterialMap[productCode][materialCode]) {
          const material = materials[materialCode];
          productMaterialMap[productCode][materialCode] = {
            quantity: 0,
            unit: material?.unit || ''
          };
        }
        productMaterialMap[productCode][materialCode].quantity += qty;
      });
    });
  });

  return Object.entries(productMaterialMap).map(([productCode, mats]) => {
    const product = products[productCode];
    return {
      productCode,
      productName: product?.name || productCode,
      productColor: product?.color || '#3B82F6',
      materials: Object.entries(mats).map(([code, data]) => ({
        code,
        name: materials[code]?.name || code,
        quantity: data.quantity,
        unit: data.unit
      })).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    };
  }).sort((a, b) => a.productName.localeCompare(b.productName, 'zh-CN'));
}

function generateMdForRecord(record: SimulationRecord, canvas: { products: Record<string, { name: string; color: string }>; materials: Record<string, { name: string; unit: string }>; devices: Record<string, { type: string; name: string }> }): string {
  const results = record.results;

  let md = `# 模拟运行统计报告\n\n`;
  md += `> 记录时间: ${new Date(record.timestamp).toLocaleString()}\n\n`;

  md += '## 总体统计\n\n';
  md += '| 指标 | 数值 |\n';
  md += '|------|------|\n';
  md += `| 模拟时长 | ${formatTime(results.duration_s)} |\n`;
  md += `| 完成产品 | ${results.completed_products} 件 |\n`;
  md += `| 整体最大在制品数 | ${results.max_total_wip || 0} 件 |\n`;
  md += `| 模拟模式 | ${results.simulation_mode === 'fixed_output' ? '固定产量' : '固定时长'} |\n`;
  md += `| 资源选择规则 | ${results.resource_selection_rule === 'min_wip_dynamic' ? '动态平衡(在制品)' : results.resource_selection_rule === 'min_utilrate_dynamic' ? '动态平衡(利用率)' : '基础规则'} |\n`;
  md += `| 多仓库选择优先级 | ${(results.warehouse_selection_priorities || []).map((p: string, i: number) => `${i + 1}:${priorityLabels[p] || p}`).join(' → ')} |\n`;
  md += '\n';

  const productCounts = results.completed_products_by_code || {};
  if (Object.keys(productCounts).length > 0) {
    md += '### 完成产品数（按产品种类）\n\n';
    md += '| 产品 | 数量 |\n';
    md += '|------|------|\n';
    for (const [code, count] of Object.entries(productCounts)) {
      const name = canvas.products?.[code]?.name || code;
      md += `| ${name} | ${count} |\n`;
    }
    md += '\n';
  }

  if (results.product_avg_process_times && results.product_avg_process_times.length > 0) {
    md += '### 产品平均处理时长\n\n';
    md += '| 产品 | 加工次数 | 平均处理时长(秒) |\n';
    md += '|------|----------|------------------|\n';
    for (const stat of results.product_avg_process_times) {
      md += `| ${stat.product_name || stat.product_code} | ${stat.count} | ${stat.avg_process_time_s.toFixed(2)} |\n`;
    }
    md += '\n';
  }

  if (results.material_consumption && Object.keys(results.material_consumption).length > 0) {
    md += '### 原料消耗量\n\n';
    md += '| 原料 | 消耗量 |\n';
    md += '|------|--------|\n';
    for (const [code, qty] of Object.entries(results.material_consumption)) {
      const material = canvas.materials?.[code];
      const unit = material?.unit || '';
      md += `| ${material?.name || code} | ${qty.toFixed(2)}${unit} |\n`;
    }
    md += '\n';
  }

  const productMaterialData = computeProductMaterialConsumption(results, canvas.products || {}, canvas.materials || {});
  if (productMaterialData.length > 0) {
    const allMats = [...new Set(productMaterialData.flatMap(p => p.materials.map(m => m.code)))];
    if (allMats.length > 0) {
      md += '### 按产品各类原料总消耗量\n\n';
      md += '| 产品 | 原料 | 计量单位 | 消耗数量 |\n';
      md += '|------|------|----------|----------|\n';
      for (const p of productMaterialData) {
        for (let mIdx = 0; mIdx < p.materials.length; mIdx++) {
          const m = p.materials[mIdx];
          md += `| ${mIdx === 0 ? p.productName : ''} | ${m.name} | ${m.unit || '-'} | ${m.quantity.toFixed(2)}${m.unit || ''} |\n`;
        }
      }
      md += '\n';
    }
  }

  md += '## 设备统计\n\n';
  for (const stat of results.device_stats) {
    const device = canvas.devices[stat.device_id];
    const deviceType = device?.type || '';
    md += `### ${stat.device_name} (${deviceType})\n\n`;
    md += '| 指标 | 数值 |\n';
    md += '|------|------|\n';
    md += `| 完成加工数 | ${stat.completed} 件 |\n`;
    md += `| 利用率 | ${stat.utilization.toFixed(1)}% |\n`;
    md += `| 最大在制品数 | ${stat.max_wip} 件 |\n`;
    md += `| 平均加工时长 | ${stat.avg_proc_time_s.toFixed(2)}s |\n`;
    md += '\n';

    if (stat.by_product && Object.keys(stat.by_product).length > 0) {
      md += '| 产品 | 加工数 | 平均时长(秒) |\n';
      md += '|------|--------|---------------|\n';
      for (const [code, data] of Object.entries(stat.by_product)) {
        md += `| ${data.product_name || code} | ${data.count} | ${data.avg_time_s.toFixed(2)} |\n`;
      }
      md += '\n';
    }

    const devMatConsumption = results.device_material_consumption?.[stat.device_id] || {};
    if (Object.keys(devMatConsumption).length > 0) {
      md += '**原材料消耗:**\n\n';
      md += '| 原材料 | 消耗量 |\n';
      md += '|--------|--------|\n';
      for (const [mCode, amount] of Object.entries(devMatConsumption)) {
        const name = canvas.materials?.[mCode]?.name || mCode;
        md += `| ${name} | ${amount.toFixed(2)} |\n`;
      }
      md += '\n';
    }
  }

  if (results.connection_stats && results.connection_stats.length > 0) {
    md += '## 运输线路统计\n\n';
    md += '| 线路 | 起始设备 | 目标设备 | 运输次数 | 利用率 |\n';
    md += '|------|----------|----------|----------|--------|\n';
    for (const stat of results.connection_stats) {
      md += `| ${stat.connection_name} | ${stat.from_device} | ${stat.to_device} | ${stat.transport_count} | ${stat.utilization.toFixed(1)}% |\n`;
    }
    md += '\n';
  }

  if (results.storage_stats && results.storage_stats.length > 0) {
    md += '## 存储统计\n\n';
    for (const stat of results.storage_stats) {
      md += `### ${stat.device_name}\n\n`;
      md += '| 指标 | 数值 |\n';
      md += '|------|------|\n';
      md += `| 最大容量 | ${stat.capacity} |\n`;
      md += `| 最终暂存量 | ${stat.stock} |\n`;
      md += `| 最大暂存量 | ${stat.max_stock ?? stat.stock} |\n`;
      md += `| 最大等待入库数 | ${stat.max_waiting_entry ?? 0} |\n`;
      md += `| 最大利用率 | ${stat.capacity > 0 ? ((stat.max_stock ?? stat.stock) / stat.capacity * 100).toFixed(1) + '%' : '-'} |\n`;
      md += '\n';

      if (stat.by_product && Object.keys(stat.by_product).length > 0) {
        md += '| 产品 | 数量 |\n';
        md += '|------|------|\n';
        for (const [pCode, count] of Object.entries(stat.by_product)) {
          const pName = canvas.products?.[pCode]?.name || pCode;
          md += `| ${pName} | ${count} |\n`;
        }
        md += '\n';
      }
    }
  }

  {
    const ganttSegments: {
      deviceName: string;
      productCode: string;
      productName: string;
      startTime: number;
      endTime: number;
      count: number;
      taskType: string;
    }[] = [];

    Object.entries(results.processing_records).forEach(([deviceId, records]) => {
      const device = canvas.devices[deviceId];
      if (!device) return;
      const deviceType = device.type;
      const isProcessingDevice = !['StartNode', 'EndNode', 'Warehouse', 'Buffer', 'TempStore'].includes(deviceType);
      if (!isProcessingDevice || records.length === 0) return;

      const sortedRecords = [...records]
        .filter(r => r.end_time_s > 0)
        .sort((a, b) => a.start_time_s - b.start_time_s);
      if (sortedRecords.length === 0) return;

      interface Segment {
        productCode: string;
        productName: string;
        startTime: number;
        endTime: number;
        count: number;
        taskType: string;
      }

      const segments: Segment[] = [];

      sortedRecords.forEach(record => {
        const code = record.product_code;
        const product = canvas.products?.[code];
        const productName = product?.name || code;
        const isToolSwitch = record.task_type === '工具切换';

        if (isToolSwitch) {
          segments.push({
            productCode: code,
            productName: `${productName} (工具切换)`,
            startTime: record.start_time_s,
            endTime: record.end_time_s,
            count: 1,
            taskType: '工具切换'
          });
        } else {
          const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
          if (lastSegment === null) {
            segments.push({
              productCode: code,
              productName,
              startTime: record.start_time_s,
              endTime: record.end_time_s,
              count: 1,
              taskType: '加工任务'
            });
          } else if (lastSegment.productCode !== code || lastSegment.taskType === '工具切换') {
            segments.push({
              productCode: code,
              productName,
              startTime: record.start_time_s,
              endTime: record.end_time_s,
              count: 1,
              taskType: '加工任务'
            });
          } else {
            const gap = record.start_time_s - lastSegment.endTime;
            if (gap < 1) {
              lastSegment.endTime = record.end_time_s;
              lastSegment.count += 1;
            } else {
              segments.push({
                productCode: code,
                productName,
                startTime: record.start_time_s,
                endTime: record.end_time_s,
                count: 1,
                taskType: '加工任务'
              });
            }
          }
        }
      });

      segments.forEach(segment => {
        ganttSegments.push({
          deviceName: device.name || deviceId,
          productCode: segment.productCode,
          productName: segment.productName,
          startTime: segment.startTime,
          endTime: segment.endTime,
          count: segment.count,
          taskType: segment.taskType
        });
      });
    });

    ganttSegments.sort((a, b) => {
      const nameCmp = a.deviceName.localeCompare(b.deviceName, 'zh-CN');
      if (nameCmp !== 0) return nameCmp;
      return a.startTime - b.startTime;
    });

    if (ganttSegments.length > 0) {
      md += '## 甘特图数据（设备加工时间线）\n\n';
      md += '| 节点名称 | 产品 | 任务类型 | 开始时间 | 结束时间 | 完成产品个数 |\n';
      md += '|----------|------|----------|----------|----------|---------------|\n';
      for (const seg of ganttSegments) {
        md += `| ${seg.deviceName} | ${seg.productName} | ${seg.taskType} | ${formatTime(seg.startTime)} | ${formatTime(seg.endTime)} | ${seg.count} |\n`;
      }
      md += '\n';
    }
  }

  return md;
}

type TabType = 'select' | 'result' | 'history';

interface AiAnalysisModalProps {
  onClose: () => void;
}

export default function AiAnalysisModal({ onClose }: AiAnalysisModalProps) {
  const canvas = useAppStore((state) => state.canvas);
  const callAiAnalysis = useAppStore((state) => state.callAiAnalysis);
  const saveAiAnalysisRecord = useAppStore((state) => state.saveAiAnalysisRecord);
  const deleteAiAnalysisRecord = useAppStore((state) => state.deleteAiAnalysisRecord);
  const aiAnalysisLoading = useAppStore((state) => state.aiAnalysisLoading);
  const aiAnalysisRecords = useAppStore((state) => state.aiAnalysisRecords);
  const loadAiAnalysisRecords = useAppStore((state) => state.loadAiAnalysisRecords);

  const [activeTab, setActiveTab] = useState<TabType>('select');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<AiAnalysisRecord | null>(null);

  const [position, setPosition] = useState({ x: 0, y: -80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const records = canvas.simulation_records || [];

  useEffect(() => {
    loadAiAnalysisRecords();
  }, []);

  useEffect(() => {
    if (selectedHistoryId) {
      const record = aiAnalysisRecords.find(r => r.id === selectedHistoryId);
      setSelectedHistoryRecord(record || null);
    } else {
      setSelectedHistoryRecord(null);
    }
  }, [selectedHistoryId, aiAnalysisRecords]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const toggleRecordSelection = (id: string) => {
    setSelectedRecordIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(rid => rid !== id);
      }
      if (prev.length >= MAX_SELECT_COUNT) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmitAnalysis = async () => {
    if (selectedRecordIds.length === 0) return;

    setAnalysisError(null);
    setAnalysisResult(null);

    const selectedRecords = records.filter(r => selectedRecordIds.includes(r.id));
    const canvasData = {
      products: canvas.products,
      materials: canvas.materials,
      devices: canvas.devices,
    };

    const mdParts = selectedRecords.map(record => generateMdForRecord(record, canvasData));
    const combinedMd = mdParts.join('\n\n---\n\n');

    try {
      const result = await callAiAnalysis(combinedMd, selectedRecordIds.length);
      setAnalysisResult(result);

      const modelUsed = 'AI';
      const prompt = selectedRecordIds.length === 1
        ? '分析单次模拟生产总体情况和可能存在的问题'
        : '对比分析多次模拟生产的总体情况、可能存在的问题和差异';

      await saveAiAnalysisRecord(selectedRecordIds, prompt, result, modelUsed);
      setActiveTab('result');
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopyResult = () => {
    const text = selectedHistoryRecord?.result || analysisResult || '';
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const handleExportResult = async () => {
    const text = selectedHistoryRecord?.result || analysisResult || '';
    if (!text) return;

    try {
      const mdPath = await save({
        defaultPath: `AI分析结果_${new Date().toLocaleDateString().replace(/[\/\s]/g, '-')}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (mdPath) {
        await writeTextFile(mdPath, text, { append: false });
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    await deleteAiAnalysisRecord(id);
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
      setSelectedHistoryRecord(null);
    }
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split('\n');
    const htmlParts: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];

    const processInline = (text: string): string => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    };

    const flushTable = () => {
      if (tableRows.length === 0) return;
      htmlParts.push('<table class="ai-md-table"><tbody>');
      tableRows.forEach((row, idx) => {
        if (idx === 1 && row.match(/^\|[\s\-:|]+\|$/)) return;
        const cells = row.split('|').filter(c => c.trim() !== '');
        const tag = idx === 0 ? 'th' : 'td';
        htmlParts.push('<tr>' + cells.map(c => `<${tag}>${processInline(c.trim())}</${tag}>`).join('') + '</tr>');
      });
      htmlParts.push('</tbody></table>');
      tableRows = [];
      inTable = false;
    };

    for (const line of lines) {
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        tableRows.push(line);
        continue;
      }

      if (inTable) {
        flushTable();
      }

      if (line.startsWith('### ')) {
        htmlParts.push(`<h4>${processInline(line.slice(4))}</h4>`);
      } else if (line.startsWith('## ')) {
        htmlParts.push(`<h3>${processInline(line.slice(3))}</h3>`);
      } else if (line.startsWith('# ')) {
        htmlParts.push(`<h2>${processInline(line.slice(2))}</h2>`);
      } else if (line.startsWith('> ')) {
        htmlParts.push(`<blockquote>${processInline(line.slice(2))}</blockquote>`);
      } else if (line.startsWith('---')) {
        htmlParts.push('<hr/>');
      } else if (line.trim() === '') {
        htmlParts.push('<br/>');
      } else {
        htmlParts.push(`<p>${processInline(line)}</p>`);
      }
    }

    if (inTable) {
      flushTable();
    }

    return htmlParts.join('\n');
  };

  const currentResult = selectedHistoryRecord?.result || analysisResult;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div
        className="ai-modal"
        style={{
          transform: `translateX(calc(-50% + ${position.x}px)) translateY(calc(-50% + ${position.y}px))`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="ai-modal-header"
          onMouseDown={handleDragMouseDown}
          style={{ cursor: 'move' }}
        >
          <span className="ai-modal-title">AI 分析</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ai-modal-body">
        <div className="ai-analysis-tabs">
          <button
            className={`ai-tab ${activeTab === 'select' ? 'active' : ''}`}
            onClick={() => setActiveTab('select')}
          >
            选择分析
          </button>
          <button
            className={`ai-tab ${activeTab === 'result' ? 'active' : ''}`}
            onClick={() => setActiveTab('result')}
            disabled={!analysisResult && !selectedHistoryRecord}
          >
            分析结果
          </button>
          <button
            className={`ai-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            历史记录
          </button>
        </div>

        <div className="ai-analysis-content">
          {activeTab === 'select' && (
            <div className="ai-select-panel">
              <div className="ai-select-hint">
                选择需要分析的模拟记录（最多 {MAX_SELECT_COUNT} 条），选多条时将进行对比分析
              </div>
              {records.length === 0 ? (
                <div className="ai-no-records">暂无模拟记录，请先运行模拟并保存记录</div>
              ) : (
                <div className="ai-record-list">
                  {records.map(record => (
                    <div
                      key={record.id}
                      className={`ai-record-item ${selectedRecordIds.includes(record.id) ? 'selected' : ''}`}
                      onClick={() => toggleRecordSelection(record.id)}
                    >
                      <div className="ai-record-checkbox">
                        {selectedRecordIds.includes(record.id) ? '☑' : '☐'}
                      </div>
                      <div className="ai-record-info">
                        <div className="ai-record-time">{record.timestamp}</div>
                        <div className="ai-record-summary">
                          时长: {formatTime(record.duration_s)} | 完成产品: {record.completed_products} 件
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(aiAnalysisLoading || analysisError) && (
                <div className="ai-analysis-status">
                  {aiAnalysisLoading && (
                    <div className="ai-loading">
                      <div className="ai-loading-spinner" />
                      <span>正在分析中，请稍候...</span>
                    </div>
                  )}
                  {analysisError && (
                    <div className="ai-error">
                      <div className="ai-error-msg">{analysisError}</div>
                      <button className="btn btn-primary" onClick={handleSubmitAnalysis} style={{ marginTop: '8px', fontSize: '12px' }}>
                        重试
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="ai-select-actions">
                <span className="ai-selected-count">
                  已选择 {selectedRecordIds.length} / {MAX_SELECT_COUNT} 条
                </span>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitAnalysis}
                  disabled={selectedRecordIds.length === 0 || aiAnalysisLoading}
                >
                  {aiAnalysisLoading ? '分析中...' : '提交分析'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'result' && (
            <div className="ai-result-panel">
              {currentResult ? (
                <>
                  <div className="ai-result-toolbar">
                    <button className="btn" onClick={handleCopyResult} style={{ fontSize: '12px' }}>
                      复制
                    </button>
                    <button className="btn" onClick={handleExportResult} style={{ fontSize: '12px' }}>
                      导出MD
                    </button>
                  </div>
                  <div
                    className="ai-result-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(currentResult) }}
                  />
                </>
              ) : (
                <div className="ai-no-result">暂无分析结果</div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="ai-history-panel">
              {aiAnalysisRecords.length === 0 ? (
                <div className="ai-no-records">暂无历史分析记录</div>
              ) : (
                <div className="ai-history-layout">
                  <div className="ai-history-list">
                    {aiAnalysisRecords.map(record => (
                      <div
                        key={record.id}
                        className={`ai-history-item ${selectedHistoryId === record.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedHistoryId(record.id);
                          setActiveTab('result');
                        }}
                      >
                        <div className="ai-history-time">{record.timestamp}</div>
                        <div className="ai-history-summary">
                          {record.record_ids.length === 1 ? '单次分析' : `${record.record_ids.length}次对比分析`}
                        </div>
                        <button
                          className="ai-history-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(record.id);
                          }}
                          title="删除"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
