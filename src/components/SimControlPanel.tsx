import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import type { ResourceSelectionRule, Device, SimulationMode, EndNode, WarehouseSelectionPriority } from '../types';
import { calculateConnectionLengthMm, calculateElbowIntermediatePoints, getDeviceAnchorPx } from '../utils/connectionUtils';
import ProductRoutesModal from './ProductRoutesModal';
import ValidationErrorModal from './ValidationErrorModal';

export default function SimControlPanel() {
  const simulation = useAppStore((state) => state.simulation);
  const routeValidated = useAppStore((state) => state.routeValidated);
  const setRouteValidated = useAppStore((state) => state.setRouteValidated);
  const startSimulation = useAppStore((state) => state.startSimulation);
  const pauseSimulation = useAppStore((state) => state.pauseSimulation);
  const resumeSimulation = useAppStore((state) => state.resumeSimulation);
  const resetSimulation = useAppStore((state) => state.resetSimulation);
  const stepSimulation = useAppStore((state) => state.stepSimulation);
  const setSimulationSpeed = useAppStore((state) => state.setSimulationSpeed);
  const setSimulationDuration = useAppStore((state) => state.setSimulationDuration);
  const setResourceSelectionRule = useAppStore((state) => state.setResourceSelectionRule);
  const setSimulationMode = useAppStore((state) => state.setSimulationMode);
  const setUtilizationSampleInterval = useAppStore((state) => state.setUtilizationSampleInterval);
  const setWarehouseSelectionPriorities = useAppStore((state) => state.setWarehouseSelectionPriorities);
  const loadSimulationState = useAppStore((state) => state.loadSimulationState);
  const saveSimulationRecord = useAppStore((state) => state.saveSimulationRecord);
  const openRecordsModal = useAppStore((state) => state.openRecordsModal);
  const openProductRoutesModal = useAppStore((state) => state.openProductRoutesModal);
  const showProductRoutesModal = useAppStore((state) => state.showProductRoutesModal);
  const closeProductRoutesModal = useAppStore((state) => state.closeProductRoutesModal);
  const validationErrors = useAppStore((state) => state.validationErrors);
  const showValidationErrorModal = useAppStore((state) => state.showValidationErrorModal);
  const openValidationErrorModal = useAppStore((state) => state.openValidationErrorModal);
  const closeValidationErrorModal = useAppStore((state) => state.closeValidationErrorModal);
  const canvas = useAppStore((state) => state.canvas);
  const updateConnection = useAppStore((state) => state.updateConnection);
  const zoom = useAppStore((state) => state.zoom);

  const getProductRoutes = useAppStore((state) => state.getProductRoutes);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(simulation.speed);
  const stepSimulationRef = useRef(stepSimulation);
  const isSteppingRef = useRef<boolean>(false);
  const accumulatedTimeRef = useRef<number>(0);

  const [durationInput, setDurationInput] = useState(String(simulation.duration_s));
  const [speedInput, setSpeedInput] = useState(String(simulation.speed));
  const [sampleIntervalInput, setSampleIntervalInput] = useState(String(simulation.utilization_sample_interval_s || 1));
  const [showSettings, setShowSettings] = useState(false);
  const [showRuleHelp, setShowRuleHelp] = useState(false);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speedRef.current = simulation.speed;
    stepSimulationRef.current = stepSimulation;
  }, [simulation.speed, stepSimulation]);

  useEffect(() => {
    setDurationInput(String(simulation.duration_s));
    setSpeedInput(String(simulation.speed));
    setSampleIntervalInput(String(simulation.utilization_sample_interval_s || 1));
  }, [simulation.duration_s, simulation.speed, simulation.utilization_sample_interval_s]);

  useEffect(() => {
    if (simulation.state === 'running') {
      const animate = async (timestamp: number) => {
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = timestamp;
        }
        
        const deltaTime = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;
        
        accumulatedTimeRef.current += deltaTime * speedRef.current;
        
        if (!isSteppingRef.current && accumulatedTimeRef.current > 0) {
          const dt = accumulatedTimeRef.current;
          accumulatedTimeRef.current = 0;
          isSteppingRef.current = true;
          
          try {
            const completed = await stepSimulationRef.current(dt);
            if (completed) {
              isSteppingRef.current = false;
              return;
            }
          } finally {
            isSteppingRef.current = false;
          }
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      lastTimeRef.current = 0;
      accumulatedTimeRef.current = 0;
      isSteppingRef.current = false;
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastTimeRef.current = 0;
      accumulatedTimeRef.current = 0;
      isSteppingRef.current = false;
    }
  }, [simulation.state]);

  useEffect(() => {
    loadSimulationState();
  }, [loadSimulationState]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, .sim-setting-item')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (simulation.state === 'running') {
      pauseSimulation();
    } else if (simulation.state === 'paused') {
      resumeSimulation();
    } else {
      startSimulation();
    }
  };

  const handleDurationChange = () => {
    const value = parseFloat(durationInput);
    if (!isNaN(value) && value > 0) {
      setSimulationDuration(value);
    }
  };

  const handleSpeedChange = () => {
    const value = parseFloat(speedInput);
    if (!isNaN(value) && value >= 0.1 && value <= 100) {
      setSimulationSpeed(value);
    }
  };

  const handleSampleIntervalChange = () => {
    const value = parseFloat(sampleIntervalInput);
    if (!isNaN(value) && value >= 1) {
      setUtilizationSampleInterval(value);
    }
  };

  const handleGetRoute = async () => {
    try {
      const pxPerMm = canvas.settings.px_per_mm || 0.2;
      
      const connections = Object.values(canvas.connections);
      for (const conn of connections) {
        const fromDevice = canvas.devices[conn.from_device_id];
        const toDevice = canvas.devices[conn.to_device_id];
        
        if (fromDevice && toDevice) {
          let intermediatePts = conn.intermediate_points || [];
          if (conn.line_style === 'elbow') {
            const fromAnchorPt = getDeviceAnchorPx(fromDevice as Device, conn.from_anchor_index, zoom, pxPerMm);
            const toAnchorPt = getDeviceAnchorPx(toDevice as Device, conn.to_anchor_index, zoom, pxPerMm);
            intermediatePts = calculateElbowIntermediatePoints(
              fromAnchorPt, toAnchorPt,
              conn.from_anchor_index, conn.to_anchor_index,
              conn.elbow_offset
            );
          }
          const newLengthMm = calculateConnectionLengthMm(
            fromDevice as Device,
            toDevice as Device,
            conn.from_anchor_index,
            conn.to_anchor_index,
            intermediatePts,
            zoom,
            pxPerMm
          );
          
          if (conn.length_mm !== newLengthMm) {
            await updateConnection({
              ...conn,
              length_mm: newLengthMm,
            });
          }
        }
      }
      
      const result = await getProductRoutes();
      
      const errors: string[] = [];
      
      if (result.assembly_station_errors && result.assembly_station_errors.length > 0) {
        for (const error of result.assembly_station_errors) {
          if (error.error_type === 'NoComponentSelected') {
            errors.push(`装配站「${error.name}」未选择任何组件`);
          } else if (error.error_type === 'NoAssemblyProductSelected') {
            errors.push(`装配站「${error.name}」未选择任何装配成品`);
          } else if (error.error_type === 'NoComponentForProduct') {
            errors.push(`装配站「${error.name}」的装配成品「${error.product_name || error.product_code}」未设置组件需求`);
          } else if (error.error_type === 'ComponentQuantityZero') {
            errors.push(`装配站「${error.name}」的装配成品「${error.product_name || error.product_code}」的组件「${error.component_name || error.component_code}」需求数量为 0`);
          } else if (error.error_type === 'ComponentUnreachable') {
            errors.push(`装配站「${error.name}」的装配成品「${error.product_name || error.product_code}」的组件「${error.component_name || error.component_code}」无法从上游获取`);
          } else if (error.error_type === 'NoProductSelected') {
            errors.push(`装配站「${error.name}」未选择任何产品`);
          } else if (error.error_type === 'UpstreamQuantityZero') {
            if (error.upstream_node_id) {
              errors.push(`装配站「${error.name}」的产品「${error.product_name || error.product_code}」上游节点「${error.upstream_node_name || error.upstream_node_id}」的来料用量为 0`);
            } else {
              errors.push(`装配站「${error.name}」的产品「${error.product_name || error.product_code}」未设置上游来料需求`);
            }
          }
        }
      }

      if (result.disassembly_station_errors && result.disassembly_station_errors.length > 0) {
        for (const error of result.disassembly_station_errors) {
          if (error.error_type === 'NoItemToDisassemble') {
            errors.push(`拆解站「${error.name}」未选择任何待拆解品`);
          } else if (error.error_type === 'NoDisassemblyProduct') {
            errors.push(`拆解站「${error.name}」未选择任何拆解产物`);
          } else if (error.error_type === 'NoProductForItem') {
            errors.push(`拆解站「${error.name}」的待拆解品「${error.product_name || error.product_code}」未设置拆解产物数量`);
          } else if (error.error_type === 'DisassemblyProductQuantityZero') {
            errors.push(`拆解站「${error.name}」的待拆解品「${error.product_name || error.product_code}」的拆解产物「${error.disassembly_product_name || error.disassembly_product_code}」产出数量为 0`);
          } else if (error.error_type === 'ItemUnreachable') {
            errors.push(`拆解站「${error.name}」的待拆解品「${error.product_name || error.product_code}」无法从起点或上游拆解站获取`);
          } else if (error.error_type === 'AssemblyProductAsItem') {
            errors.push(`拆解站「${error.name}」的待拆解品「${error.product_name || error.product_code}」是装配成品，不能作为待拆解品`);
          }
        }
      }
      
      if (!result.all_start_nodes_have_product) {
        for (const node of result.start_nodes_without_product) {
          errors.push(`起点「${node.name}」未选择产品`);
        }
      }
      
      if (result.incomplete_route_start_nodes.length > 0) {
        for (const node of result.incomplete_route_start_nodes) {
          errors.push(`起点「${node.name}」的产品「${node.product_name || node.product_code || '未知'}」没有完整工艺路线`);
        }
      }
      
      if (simulation.simulation_mode === 'fixed_output') {
        const completeRoutes = result.routes.filter(r => r.is_complete && r.end_node_id);
        const checkedPairs = new Set<string>();
        
        for (const route of completeRoutes) {
          const pairKey = `${route.end_node_id}:${route.product_code}`;
          if (checkedPairs.has(pairKey)) continue;
          checkedPairs.add(pairKey);
          
          const endNode = canvas.devices[route.end_node_id!];
          if (!endNode || endNode.type !== 'EndNode') continue;
          
          const targets = (endNode as EndNode).target_outputs || {};
          const target = targets[route.product_code];
          if (!target || target <= 0) {
            errors.push(`固定产量模式下，起点「${route.start_node_name}」的产品「${route.product_code}」在终点「${route.end_node_name}」未设置目标产量`);
          }
        }
      }
      
      if (errors.length > 0) {
        openValidationErrorModal(errors);
        setRouteValidated(false);
        return;
      }

      const currentPriorities = simulation.warehouse_selection_priorities || ['nearest_distance', 'lowest_utilization', 'product_concentrated', 'least_waiting_entry'] as WarehouseSelectionPriority[];
      const priorityLabelMap: Record<WarehouseSelectionPriority, string> = {
        nearest_distance: '距离最近',
        farthest_distance: '距离最远',
        lowest_utilization: '利用率最低',
        highest_utilization: '利用率最高',
        product_concentrated: '按产品集中',
        product_dispersed: '按产品分散',
        least_waiting_entry: '等待入库最少',
      };
      const conflictPairs: [WarehouseSelectionPriority, WarehouseSelectionPriority][] = [
        ['nearest_distance', 'farthest_distance'],
        ['lowest_utilization', 'highest_utilization'],
        ['product_concentrated', 'product_dispersed'],
      ];
      for (const [a, b] of conflictPairs) {
        if (currentPriorities.includes(a) && currentPriorities.includes(b)) {
          errors.push(`多仓库选择优先级冲突：「${priorityLabelMap[a]}」和「${priorityLabelMap[b]}」不能同时出现在优先级选择中`);
        }
      }
      if (errors.length > 0) {
        openValidationErrorModal(errors);
        setRouteValidated(false);
        return;
      }

      const routeCount = result.routes.length;
      const completeRouteCount = result.routes.filter(r => r.is_complete).length;
      alert(`模拟前检查通过！\n\n共发现 ${routeCount} 条工艺路线\n其中完整路线 ${completeRouteCount} 条`);
      setRouteValidated(true);
    } catch (error) {
      console.error('模拟前检查失败:', error);
      alert('模拟前检查失败，请检查控制台日志');
    }
  };

  const isIdle = simulation.state === 'idle';
  const isPaused = simulation.state === 'paused';
  const isRunning = simulation.state === 'running';
  const isCompleted = simulation.state === 'completed';

  return (
    <div 
      ref={panelRef}
      className="sim-control-panel"
      style={{
        transform: `translateX(calc(-50% + ${position.x}px)) translateY(${position.y}px)`,
      }}
    >
      <div 
        className="sim-controls-row"
        onMouseDown={handleMouseDown}
        style={{ cursor: 'move' }}
      >
        <button
          className={`sim-control-btn ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="设置"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>

        <button
          className={`sim-control-btn ${routeValidated ? 'success' : ''}`}
          onClick={handleGetRoute}
          title="模拟前检查"
          disabled={isRunning}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </button>

        <button
          className="sim-control-btn"
          onClick={openProductRoutesModal}
          title={routeValidated ? '查看工艺路线' : '请先进行模拟前检查'}
          disabled={isRunning || !routeValidated}
          style={!routeValidated ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="12" r="3" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <circle cx="19" cy="12" r="3" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </button>

        <button
          className={`sim-control-btn ${isIdle || isPaused ? 'play' : ''}`}
          onClick={handlePlayPause}
          title={isRunning ? '暂停' : (routeValidated ? '开始' : '请先进行模拟前检查')}
          disabled={isCompleted || (isIdle && !routeValidated)}
          style={isIdle && !routeValidated ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          {isRunning ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          className="sim-control-btn"
          onClick={resetSimulation}
          title="重置"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <button
          className="sim-control-btn"
          onClick={async () => {
            if (isCompleted || isPaused) {
              try {
                await saveSimulationRecord();
                alert('模拟记录已保存');
              } catch (error) {
                console.error('保存模拟记录失败:', error);
              }
            }
          }}
          title="保存模拟记录"
          disabled={!isCompleted && !isPaused}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>

        <button
          className="sim-control-btn"
          onClick={() => openRecordsModal()}
          title="查看历史记录"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        <div className="sim-time">
          {formatTime(simulation.elapsed_s)} / {formatTime(simulation.duration_s)}
        </div>

        <div className="sim-stats">
          完成: <strong>{simulation.completed_products}</strong> 件
        </div>

        <div className="sim-stats">
          速度: <strong>{simulation.speed}x</strong>
        </div>
      </div>

      {showSettings && (
        <div className="sim-settings-row">
          <div className="sim-setting-item">
            <label>模拟模式</label>
            <select
              value={simulation.simulation_mode || 'fixed_duration'}
              onChange={(e) => setSimulationMode(e.target.value as SimulationMode)}
              disabled={isRunning}
            >
              <option value="fixed_duration">固定时长</option>
              <option value="fixed_output">固定产量</option>
            </select>
          </div>
          {(simulation.simulation_mode === 'fixed_duration' || !simulation.simulation_mode) && (
            <div className="sim-setting-item">
              <label>模拟时长(秒)</label>
              <input
                type="number"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                onBlur={handleDurationChange}
                onKeyDown={(e) => e.key === 'Enter' && handleDurationChange()}
                disabled={isRunning}
                min="1"
                step="60"
              />
            </div>
          )}
          <div className="sim-setting-item">
            <label>加速倍数</label>
            <input
              type="number"
              value={speedInput}
              onChange={(e) => setSpeedInput(e.target.value)}
              onBlur={handleSpeedChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSpeedChange()}
              min="0.1"
              max="100"
              step="1"
            />
          </div>
          <div className="sim-setting-item">
            <label>资源选择规则</label>
            <div className="rule-select-wrapper">
              <select
                value={simulation.resource_selection_rule}
                onChange={(e) => setResourceSelectionRule(e.target.value as ResourceSelectionRule)}
                disabled={isRunning}
              >
                <option value="basic">基础规则</option>
                <option value="min_wip_dynamic">动态平衡算法(在制品)</option>
                <option value="min_utilrate_dynamic">动态平衡算法(设备利用率)</option>
              </select>
              <button 
                className="rule-help-btn"
                onClick={() => setShowRuleHelp(!showRuleHelp)}
                title="查看规则说明"
              >
                ?
              </button>
              {showRuleHelp && (
                <div className="rule-help-tooltip">
                  <div className="rule-help-item">
                    <strong>基础规则：</strong>根据下一级加工设施闲忙状态、距离、在制品数选择后续加工路线。
                  </div>
                  <div className="rule-help-item">
                    <strong>动态平衡算法(在制品)：</strong>旨在平衡各条生产线的负载，避免某些路线过度拥挤而其他路线空闲的情况，从而提高整体生产效率。
                  </div>
                  <div className="rule-help-item">
                    <strong>动态平衡算法(设备利用率)：</strong>选择路线上最高设备利用率较低的路线，避免设备利用率差异过大，实现负载均衡。
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="sim-setting-item">
            <label>利用率采样间隔(秒)</label>
            <input
              type="number"
              value={sampleIntervalInput}
              onChange={(e) => setSampleIntervalInput(e.target.value)}
              onBlur={handleSampleIntervalChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSampleIntervalChange()}
              disabled={isRunning}
              min="1"
              step="1"
            />
          </div>
        </div>
      )}

      {showSettings && (
        <div className="sim-settings-row warehouse-priority-row">
          <label className="warehouse-priority-label">多仓库选择优先级</label>
          <div className="warehouse-priority-options">
            {([0, 1, 2, 3] as const).map((idx) => {
              const levelLabels = ['优先等级1', '优先等级2', '优先等级3', '优先等级4'];
              const currentPriorities = simulation.warehouse_selection_priorities || ['nearest_distance', 'lowest_utilization', 'product_concentrated', 'least_waiting_entry'] as WarehouseSelectionPriority[];
              const currentValue = currentPriorities[idx] || 'nearest_distance';
              return (
                <div key={idx} className="warehouse-priority-item">
                  <label>{levelLabels[idx]}</label>
                  <select
                    value={currentValue}
                    onChange={(e) => {
                      const newPriorities = [...currentPriorities] as WarehouseSelectionPriority[];
                      newPriorities[idx] = e.target.value as WarehouseSelectionPriority;
                      setWarehouseSelectionPriorities(newPriorities);
                    }}
                    disabled={isRunning}
                  >
                    <option value="nearest_distance">距离最近</option>
                    <option value="farthest_distance">距离最远</option>
                    <option value="lowest_utilization">利用率最低</option>
                    <option value="highest_utilization">利用率最高</option>
                    <option value="product_concentrated">按产品集中</option>
                    <option value="product_dispersed">按产品分散</option>
                    <option value="least_waiting_entry">等待入库最少</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showProductRoutesModal && (
        <ProductRoutesModal onClose={closeProductRoutesModal} />
      )}

      {showValidationErrorModal && validationErrors && (
        <ValidationErrorModal errors={validationErrors} onClose={closeValidationErrorModal} />
      )}
    </div>
  );
}
