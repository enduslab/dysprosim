import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAppStore } from '../store';

interface SimControlDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SimControlDialog({ isOpen, onClose }: SimControlDialogProps) {
  const { 
    simulation, 
    startSimulation, 
    pauseSimulation, 
    resetSimulation,
    loadSimulationState,
  } = useAppStore();

  const [duration, setDuration] = useState(simulation.duration_s);
  const [speed, setSpeed] = useState(simulation.speed);

  useEffect(() => {
    if (isOpen) {
      loadSimulationState();
    }
  }, [isOpen, loadSimulationState]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (simulation.state === 'running') {
      await pauseSimulation();
    } else {
      await startSimulation();
    }
  };

  const handleReset = async () => {
    await resetSimulation();
  };

  const getStateLabel = (state: string): string => {
    switch (state) {
      case 'idle': return '空闲';
      case 'running': return '运行中';
      case 'paused': return '已暂停';
      case 'completed': return '已完成';
      default: return state;
    }
  };

  const getStateColor = (state: string): string => {
    switch (state) {
      case 'idle': return '#64748B';
      case 'running': return '#10B981';
      case 'paused': return '#F59E0B';
      case 'completed': return '#3B82F6';
      default: return '#64748B';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="模拟控制面板" width={500}>
      <div className="sim-control-dialog">
        <div className="property-group">
          <div className="property-group-title">模拟状态</div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px',
            padding: '12px',
            background: '#F8FAFC',
            borderRadius: '6px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getStateColor(simulation.state),
              animation: simulation.state === 'running' ? 'pulse 1s infinite' : 'none'
            }} />
            <span style={{ fontWeight: 500 }}>{getStateLabel(simulation.state)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="property-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <label className="property-label" style={{ marginBottom: '4px' }}>已运行时间</label>
              <span style={{ fontSize: '24px', fontWeight: 600 }}>{formatTime(simulation.elapsed_s)}</span>
            </div>
            <div className="property-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <label className="property-label" style={{ marginBottom: '4px' }}>总时长</label>
              <span style={{ fontSize: '24px', fontWeight: 600 }}>{formatTime(simulation.duration_s)}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="property-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <label className="property-label" style={{ marginBottom: '4px' }}>完成产品</label>
              <span style={{ fontSize: '20px', fontWeight: 500, color: '#10B981' }}>
                {simulation.completed_products} 件
              </span>
            </div>
            <div className="property-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <label className="property-label" style={{ marginBottom: '4px' }}>模拟速度</label>
              <span style={{ fontSize: '20px', fontWeight: 500 }}>{simulation.speed}x</span>
            </div>
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">模拟设置</div>
          
          <div className="property-row">
            <label className="property-label">模拟时长</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
              <input
                type="number"
                className="property-input"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value) || 3600)}
                min={60}
                max={86400}
                disabled={simulation.state !== 'idle'}
              />
              <span style={{ fontSize: '12px' }}>秒</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">模拟速度</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
              <input
                type="range"
                min={1}
                max={100}
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                disabled={simulation.state !== 'idle'}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: '40px', fontSize: '12px' }}>{speed}x</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
          <button
            className="btn btn-primary"
            onClick={handlePlayPause}
            disabled={simulation.state === 'completed'}
            style={{ minWidth: '100px' }}
          >
            {simulation.state === 'running' ? '暂停' : '开始'}
          </button>
          <button
            className="btn"
            onClick={handleReset}
            style={{ minWidth: '100px' }}
          >
            重置
          </button>
          <button
            className="btn"
            onClick={onClose}
            style={{ minWidth: '100px' }}
          >
            关闭
          </button>
        </div>
      </div>
    </Modal>
  );
}
