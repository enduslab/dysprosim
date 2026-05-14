import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';
import { save, open } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';

const changeTypeLabels: Record<string, string> = {
  resource_selection_rule: '资源选择规则',
  product_selection_strategy: '产品选择策略',
  consider_product_priority: '是否考虑产品优先级',
  warehouse_selection_priorities: '仓库选择优先级',
  device_config: '设备配置',
  product_priority: '产品优先级',
  add_buffer: '添加缓冲区',
  clone_device: '复制设备',
  set_resource_selection_rule: '设置资源选择规则',
  set_product_selection_strategy: '设置产品选择策略',
  set_warehouse_selection_priorities: '设置仓库选择优先级',
  set_consider_product_priority: '设置是否考虑产品优先级',
  set_release_mode: '设置投放模式',
  set_buffer_capacity: '设置缓冲区容量',
  set_product_priority: '设置产品优先级',
};

const ruleLabels: Record<string, string> = {
  basic: '基础',
  min_wip: '最小在制品',
  min_utilrate: '最低利用率',
  min_wip_dynamic: '最小在制品(动态)',
  min_utilrate_dynamic: '最低利用率(动态)',
};

const strategyLabels: Record<string, string> = {
  first_come_first_served: '先到先生产',
  same_type_priority_with_tool: '同类优先兼顾工具',
  same_tool_priority: '同工具优先',
  shortest_processing_time: '最短加工时间优先',
  earliest_due_date: '最早到期日优先',
  critical_ratio: '临界比优先',
  priority_based: '基于优先级',
};

const priorityLabels: Record<string, string> = {
  nearest_distance: '距离最近',
  farthest_distance: '距离最远',
  lowest_utilization: '利用率最低',
  highest_utilization: '利用率最高',
  product_concentrated: '按产品集中',
  product_dispersed: '按产品分散',
  least_waiting_entry: '等待入库最少',
};

const reasoningTranslations: [RegExp, string][] = [
  [/\bset_resource_selection_rule\b/g, '设置资源选择规则'],
  [/\bset_product_selection_strategy\b/g, '设置加工制品选择策略'],
  [/\bset_warehouse_selection_priorities\b/g, '设置仓库选择优先级'],
  [/\bset_consider_product_priority\b/g, '设置是否考虑产品优先级'],
  [/\bset_release_mode\b/g, '设置投放模式'],
  [/\bset_buffer_capacity\b/g, '设置缓冲区容量'],
  [/\bset_product_priority\b/g, '设置产品优先级'],
  [/\bsame_type_priority_with_tool\b/g, '同类优先兼顾工具'],
  [/\bsame_tool_priority\b/g, '同工具优先'],
  [/\bresource_selection_rule:\s*basic\b/g, '资源选择规则: 基础规则'],
  [/\bselection_rule\s*=\s*basic\b/g, '选择规则=基础规则'],
  [/\bresource_selection_rule\b/g, '资源选择规则'],
  [/\bproduct_selection_strategy\b/g, '加工制品选择策略'],
  [/\bconsider_product_priority\b/g, '是否考虑产品优先级'],
  [/\bwarehouse_selection_priorities\b/g, '仓库选择优先级'],
  [/\bdevice_config\b/g, '设备配置'],
  [/\bproduct_priority\b/g, '产品优先级'],
  [/\badd_buffer\b/g, '添加缓冲区'],
  [/\bclone_device\b/g, '复制设备'],
  [/\bproduct_selection_rule\b/g, '产品选择规则'],
  [/\bmin_wip_dynamic\b/g, '最小在制品(动态)'],
  [/\bmin_utilrate_dynamic\b/g, '最低利用率(动态)'],
  [/\bmin_wip\b/g, '最小在制品'],
  [/\bmin_utilrate\b/g, '最低利用率'],
  [/\bfirst_come_first_served\b/g, '先到先生产'],
  [/\bshortest_processing_time\b/g, '最短加工时间优先'],
  [/\bearliest_due_date\b/g, '最早到期日优先'],
  [/\bcritical_ratio\b/g, '临界比优先'],
  [/\bpriority_based\b/g, '基于优先级'],
  [/\bnearest_distance\b/g, '距离最近'],
  [/\bfarthest_distance\b/g, '距离最远'],
  [/\blowest_utilization\b/g, '利用率最低'],
  [/\bhighest_utilization\b/g, '利用率最高'],
  [/\bproduct_concentrated\b/g, '按产品集中'],
  [/\bproduct_dispersed\b/g, '按产品分散'],
  [/\bleast_waiting_entry\b/g, '等待入库最少'],
  [/\bwait_for_idle\b/g, '等待空闲'],
  [/\bimmediate\b/g, '立即投放'],
  [/\bmax_capacity\b/g, '最大容量'],
  [/\brelease_mode\b/g, '投放模式'],
];

function translateReasoningText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of reasoningTranslations) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function formatChangeValue(change: { type: string; value: unknown; device_id?: string; field?: string }): string {
  const v = change.value;
  switch (change.type) {
    case 'resource_selection_rule':
    case 'set_resource_selection_rule':
      return ruleLabels[String(v)] || String(v);
    case 'product_selection_strategy':
    case 'set_product_selection_strategy':
      return strategyLabels[String(v)] || String(v);
    case 'warehouse_selection_priorities':
    case 'set_warehouse_selection_priorities': {
      const arr = Array.isArray(v) ? v : [v];
      return arr.map((p: string) => priorityLabels[p] || p).join(', ');
    }
    case 'consider_product_priority':
    case 'set_consider_product_priority':
      return v ? '是' : '否';
    case 'device_config':
      if (change.field === 'release_mode' || change.field === 'set_release_mode') {
        return String(v) === 'wait_for_idle' ? '等待空闲' : '立即投放';
      }
      if (change.field === 'max_capacity' || change.field === 'set_buffer_capacity') {
        return `容量: ${v}`;
      }
      return String(v);
    case 'set_release_mode':
      return String(v) === 'wait_for_idle' ? '等待空闲' : '立即投放';
    case 'set_buffer_capacity':
      return `容量: ${v}`;
    case 'add_buffer': {
      const bv = typeof v === 'object' && v !== null ? v as Record<string, unknown> : null;
      if (bv) {
        return `容量: ${bv.capacity || 10}`;
      }
      return `容量: ${v}`;
    }
    case 'clone_device': {
      const cv = typeof v === 'object' && v !== null ? v as Record<string, unknown> : null;
      if (cv) {
        return `复制数量: ${cv.count || 1}`;
      }
      return `复制数量: ${v}`;
    }
    case 'product_priority':
    case 'set_product_priority':
      return v === null ? '无优先级' : `优先级: ${v}`;
    default:
      return String(v);
  }
}

function renderMarkdown(md: string): string {
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
    if (inTable) flushTable();
    if (line.startsWith('### ')) htmlParts.push(`<h4>${processInline(line.slice(4))}</h4>`);
    else if (line.startsWith('## ')) htmlParts.push(`<h3>${processInline(line.slice(3))}</h3>`);
    else if (line.startsWith('# ')) htmlParts.push(`<h2>${processInline(line.slice(2))}</h2>`);
    else if (line.startsWith('> ')) htmlParts.push(`<blockquote>${processInline(line.slice(2))}</blockquote>`);
    else if (line.startsWith('---')) htmlParts.push('<hr/>');
    else if (line.trim() === '') htmlParts.push('<br/>');
    else htmlParts.push(`<p>${processInline(line)}</p>`);
  }
  if (inTable) flushTable();
  return htmlParts.join('\n');
}

interface AiOptimizationModalProps {
  onClose: () => void;
}

export default function AiOptimizationModal({ onClose }: AiOptimizationModalProps) {
  const optimizationRunning = useAppStore((s) => s.optimizationRunning);
  const optimizationResult = useAppStore((s) => s.optimizationResult);
  const optimizationCurrentIteration = useAppStore((s) => s.optimizationCurrentIteration);
  const optimizationMaxIterations = useAppStore((s) => s.optimizationMaxIterations);
  const optimizationStatusMessage = useAppStore((s) => s.optimizationStatusMessage);
  const runAiOptimization = useAppStore((s) => s.runAiOptimization);
  const cancelAiOptimization = useAppStore((s) => s.cancelAiOptimization);
  const currentFilePath = useAppStore((s) => s.currentFilePath);

  const [maxIterations, setMaxIterations] = useState(5);
  const [savingLayouts, setSavingLayouts] = useState(false);
  const [savedFiles, setSavedFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'progress' | 'report'>('progress');

  const [position, setPosition] = useState({ x: 0, y: -80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  const goodIterations = optimizationResult
    ? optimizationResult.iterations.filter((it) => it.is_improvement)
    : [];

  const generateReportMd = useCallback((): string => {
    if (!optimizationResult) return '';
    const r = optimizationResult;
    let md = `# AI 自动优化报告\n\n`;
    md += `> 生成时间: ${new Date().toLocaleString()}\n\n`;

    md += `## 优化概况\n\n`;
    md += `- 总迭代次数: ${r.total_iterations}\n`;
    md += `- 最佳迭代: 第 ${r.best_iteration} 次\n`;
    md += `- 停止原因: ${r.stopped_reason}\n`;
    md += `- 基线完成产品数: ${r.baseline_completed_products}\n`;
    md += `- 基线最大在制品数: ${r.baseline_max_wip}\n\n`;

    if (goodIterations.length > 0) {
      md += `## 识别为好的优化配置\n\n`;
      for (const it of goodIterations) {
        const layoutFileName = getLayoutFileName(it.iteration);
        md += `### 优化布局 ${layoutFileName}\n\n`;
        md += `**迭代次数**: 第 ${it.iteration} 次\n\n`;

        md += `**配置变更**:\n`;
        for (const change of it.changes) {
          md += `- ${changeTypeLabels[change.type] || change.type}: ${formatChangeValue(change)}\n`;
        }
        md += '\n';

        md += `**实际应用的变更**:\n`;
        for (const ac of it.applied_changes) {
          md += `- ${ac}\n`;
        }
        md += '\n';

        md += `**效果指标**:\n`;
        md += `- 完成产品数: ${it.completed_products}\n`;
        md += `- 最大在制品数: ${it.max_total_wip}\n`;
        if (it.product_avg_process_times.length > 0) {
          md += `- 产品平均加工时间:\n`;
          for (const pt of it.product_avg_process_times) {
            md += `  - ${pt.product_name || pt.product_code}: ${pt.avg_process_time_s.toFixed(3)}s\n`;
          }
        }
        md += '\n';

        md += `**改善详情**:\n`;
        for (const detail of it.improvement_details) {
          md += `- ${detail}\n`;
        }
        md += '\n';

        md += `**AI分析推理**:\n\n${translateReasoningText(it.reasoning)}\n\n`;
        md += `---\n\n`;
      }
    } else {
      md += `## 优化结果\n\n`;
      md += `在所有迭代中未发现比基线更好的配置。\n\n`;
    }

    md += `## 所有迭代详情\n\n`;
    md += `| 迭代 | 完成产品数 | 最大WIP | 是否改善 | 改善详情 |\n`;
    md += `|------|----------|--------|---------|--------|\n`;
    for (const it of r.iterations) {
      const improveText = it.is_improvement ? '✓' : '✗';
      const detailText = it.improvement_details.length > 0 ? it.improvement_details.join('; ') : '-';
      md += `| ${it.iteration} | ${it.completed_products} | ${it.max_total_wip} | ${improveText} | ${detailText} |\n`;
    }

    return md;
  }, [optimizationResult]);

  const getLayoutFileName = useCallback((iteration: number): string => {
    if (currentFilePath) {
      const fileName = currentFilePath.split(/[\\/]/).pop() || '';
      const baseName = fileName.replace(/\.[^.]+$/, '');
      return `${baseName}_${iteration}`;
    }
    const now = new Date();
    const timeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return `${timeStr}_${iteration}`;
  }, [currentFilePath]);

  const handleSaveGoodLayouts = useCallback(async () => {
    if (!optimizationResult || goodIterations.length === 0) return;

    const selectedDir = await open({
      directory: true,
      multiple: false,
      title: '选择保存优化布局的文件夹',
    });

    if (!selectedDir || typeof selectedDir !== 'string') return;

    setSavingLayouts(true);
    const saved: string[] = [];

    try {
      for (const it of goodIterations) {
        if (!it.layout_snapshot) continue;

        const fileName = getLayoutFileName(it.iteration);
        const filePath = await join(selectedDir, `${fileName}.json`);

        try {
          const simParams = it.simulation_params_snapshot ? {
            resource_selection_rule: it.simulation_params_snapshot.resource_selection_rule,
            product_selection_strategy: it.simulation_params_snapshot.product_selection_strategy,
            consider_product_priority: it.simulation_params_snapshot.consider_product_priority ?? false,
            warehouse_selection_priorities: it.simulation_params_snapshot.warehouse_selection_priorities || [],
            utilization_sample_interval_s: it.simulation_params_snapshot.utilization_sample_interval_s || 1.0,
            simulation_mode: it.simulation_params_snapshot.simulation_mode || 'fixed_duration',
          } : undefined;

          await invoke('save_canvas_state_to_path', {
            canvasState: it.layout_snapshot,
            path: filePath,
            simulationParamsOverride: simParams,
          });
          saved.push(filePath);
        } catch (err) {
          console.error(`Failed to save layout ${fileName}:`, err);
        }
      }

      setSavedFiles(saved);
    } catch (err) {
      console.error('Failed to save layouts:', err);
    } finally {
      setSavingLayouts(false);
    }
  }, [optimizationResult, goodIterations, getLayoutFileName]);

  const handleExportReport = useCallback(async () => {
    const md = generateReportMd();
    try {
      const filePath = await save({
        defaultPath: 'AI优化报告.md',
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (filePath) {
        await invoke('write_text_to_file', { path: filePath, content: md });
      }
    } catch (err) {
      console.error('Failed to export report:', err);
    }
  }, [generateReportMd]);

  const handleStartOptimization = useCallback(() => {
    runAiOptimization(maxIterations);
  }, [runAiOptimization, maxIterations]);

  useEffect(() => {
    if (optimizationResult && !optimizationRunning) {
      setActiveTab('report');
    }
  }, [optimizationResult, optimizationRunning]);

  const progressPercent = optimizationMaxIterations > 0
    ? Math.round((optimizationCurrentIteration / optimizationMaxIterations) * 100)
    : 0;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div
        className="ai-modal"
        style={{
          width: '900px',
          transform: `translateX(calc(-50% + ${position.x}px)) translateY(calc(-50% + ${position.y}px))`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="ai-modal-header"
          onMouseDown={handleDragMouseDown}
          style={{ cursor: 'move' }}
        >
          <span className="ai-modal-title">AI 自动优化</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ai-modal-body">
          <div className="ai-analysis-tabs">
            <button
              className={`ai-tab ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => setActiveTab('progress')}
            >
              优化进度
            </button>
            <button
              className={`ai-tab ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
              disabled={!optimizationResult}
            >
              优化报告
            </button>
          </div>

          <div className="ai-analysis-content">
            {activeTab === 'progress' && (
              <div className="opt-progress-panel">
                {!optimizationRunning && !optimizationResult && (
                  <div className="opt-start-section">
                    <div className="opt-start-hint">
                      AI将自动分析当前布局的最新模拟结果，迭代优化配置参数，寻找更优的生产方案。
                    </div>
                    <div className="opt-start-params">
                      <label className="opt-param-label">
                        最大迭代次数：
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={maxIterations}
                          onChange={(e) => setMaxIterations(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                          className="opt-param-input"
                        />
                      </label>
                    </div>
                    <div className="opt-start-note">
                      <p>优化过程中可调整的参数包括：</p>
                      <ul>
                        <li>全局策略参数（资源选择规则、产品选择策略等）</li>
                        <li>仓库投放模式</li>
                        <li>缓冲区设置及容量</li>
                        <li>产品优先级</li>
                        <li>瓶颈设备复制（每次最多增加3台）</li>
                      </ul>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleStartOptimization}
                      style={{ width: '100%', marginTop: '12px' }}
                    >
                      开始优化
                    </button>
                  </div>
                )}

                {optimizationRunning && (
                  <div className="opt-running-section">
                    <div className="opt-progress-bar-container">
                      <div
                        className="opt-progress-bar"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="opt-progress-text">
                      迭代 {optimizationCurrentIteration} / {optimizationMaxIterations}
                    </div>
                    <div className="opt-status-message">
                      {optimizationStatusMessage}
                    </div>
                    <button
                      className="btn"
                      onClick={cancelAiOptimization}
                      style={{ marginTop: '12px' }}
                    >
                      取消优化
                    </button>
                  </div>
                )}

                {!optimizationRunning && optimizationResult && (
                  <div className="opt-completed-section">
                    <div className="opt-completed-summary">
                      <h3>优化完成</h3>
                      <p>停止原因：{optimizationResult.stopped_reason}</p>
                      <p>总迭代次数：{optimizationResult.total_iterations}</p>
                      <p>识别到 {goodIterations.length} 个改善配置</p>
                    </div>

                    {optimizationResult.iterations.length > 0 && (
                      <div className="opt-iterations-summary">
                        <table className="ai-md-table">
                          <thead>
                            <tr>
                              <th>迭代</th>
                              <th>完成产品数</th>
                              <th>最大WIP</th>
                              <th>改善</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: 'var(--bg-sidebar)' }}>
                              <td>基线</td>
                              <td>{optimizationResult.baseline_completed_products}</td>
                              <td>{optimizationResult.baseline_max_wip}</td>
                              <td>-</td>
                            </tr>
                            {optimizationResult.iterations.map((it) => (
                              <tr key={it.iteration} style={it.is_improvement ? { background: 'rgba(34,197,94,0.1)' } : {}}>
                                <td>第 {it.iteration} 次</td>
                                <td>{it.completed_products}</td>
                                <td>{it.max_total_wip}</td>
                                <td>{it.is_improvement ? '✓' : '✗'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="opt-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => setActiveTab('report')}
                      >
                        查看详细报告
                      </button>
                      {goodIterations.length > 0 && (
                        <button
                          className="btn"
                          onClick={handleSaveGoodLayouts}
                          disabled={savingLayouts}
                        >
                          {savingLayouts ? '保存中...' : `保存 ${goodIterations.length} 个优化布局`}
                        </button>
                      )}
                    </div>

                    {savedFiles.length > 0 && (
                      <div className="opt-saved-files" style={{ marginTop: '12px' }}>
                        <p style={{ fontWeight: 600, marginBottom: '4px' }}>已保存的布局文件：</p>
                        {savedFiles.map((f, i) => (
                          <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'report' && optimizationResult && (
              <div className="opt-report-panel">
                <div className="ai-result-toolbar">
                  <button className="btn" onClick={handleExportReport} style={{ fontSize: '12px' }}>
                    导出报告
                  </button>
                  {goodIterations.length > 0 && (
                    <button
                      className="btn"
                      onClick={handleSaveGoodLayouts}
                      disabled={savingLayouts}
                      style={{ fontSize: '12px' }}
                    >
                      {savingLayouts ? '保存中...' : `保存优化布局 (${goodIterations.length})`}
                    </button>
                  )}
                </div>
                <div
                  className="ai-result-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(generateReportMd()) }}
                />

                {savedFiles.length > 0 && (
                  <div className="opt-saved-files" style={{ marginTop: '12px', padding: '0 16px 16px' }}>
                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>已保存的布局文件：</p>
                    {savedFiles.map((f, i) => (
                      <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        {f}
                      </div>
                    ))}
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
