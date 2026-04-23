import { useState } from 'react';
import { useAppStore } from '../store';

const SelectIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="M13 13l6 6" />
  </svg>
);

const RectIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const CircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const StartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" fill="#E8F5E9" stroke="#66BB6A" />
    <path d="M10 8l6 4-6 4V8z" fill="#66BB6A" />
  </svg>
);

const EndIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#F3E5F5" stroke="#AB47BC" transform="rotate(45 12 12)" />
  </svg>
);

const StraightLineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="20" x2="20" y2="4" />
    <circle cx="4" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="4" r="2" fill="currentColor" />
  </svg>
);

const PolylineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4,20 4,12 20,12 20,4" />
    <circle cx="4" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="4" r="2" fill="currentColor" />
  </svg>
);

const CurveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 20 Q 12 4, 20 20" />
    <circle cx="4" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="20" r="2" fill="currentColor" />
  </svg>
);

const FreePolylineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4,20 8,8 16,16 20,4" />
    <circle cx="4" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="4" r="2" fill="currentColor" />
  </svg>
);

const WarehouseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21V8l9-5 9 5v13" fill="#FFF7ED" />
    <path d="M3 21h18M9 21v-6h6v6" />
  </svg>
);

const TempStoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3L3 21h18L12 3z" fill="#E3F2FD" />
  </svg>
);

const BufferIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="6" width="18" height="12" rx="3" fill="#F3E5F5" />
    <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2,2" />
  </svg>
);

const AssemblyStationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="4,6 20,10 20,18 4,18" fill="#E8F5E9" />
  </svg>
);

const WorkshopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" fill="#F8FAFC" />
    <line x1="7" y1="3" x2="7" y2="21" strokeDasharray="4,4" />
    <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="4,4" />
    <line x1="17" y1="3" x2="17" y2="21" strokeDasharray="4,4" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    style={{ 
      width: '10px', 
      height: '10px',
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s'
    }}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default function Toolbox() {
  const { 
    toolMode, 
    setToolMode, 
    deviceTypeToAdd, 
    setDeviceTypeToAdd,
    connectionLineStyle,
    setConnectionLineStyle,
  } = useAppStore();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const isDeviceActive = deviceTypeToAdd === 'rect' || deviceTypeToAdd === 'circle' || deviceTypeToAdd === 'station';
  const isAssemblyActive = deviceTypeToAdd === 'assembly_station';
  const isConnectionActive = connectionLineStyle !== null;
  const isStorageActive = deviceTypeToAdd === 'warehouse' || deviceTypeToAdd === 'temp_store';

  const getDeviceIcon = () => {
    if (deviceTypeToAdd === 'rect') return <RectIcon />;
    if (deviceTypeToAdd === 'circle') return <CircleIcon />;
    return <RectIcon />;
  };

  const getConnectionIcon = () => {
    if (connectionLineStyle === 'straight') return <StraightLineIcon />;
    if (connectionLineStyle === 'elbow') return <PolylineIcon />;
    if (connectionLineStyle === 'curve') return <CurveIcon />;
    if (connectionLineStyle === 'free_polyline') return <FreePolylineIcon />;
    return <PolylineIcon />;
  };

  const getStorageIcon = () => {
    if (deviceTypeToAdd === 'warehouse') return <WarehouseIcon />;
    if (deviceTypeToAdd === 'temp_store') return <TempStoreIcon />;
    return <WarehouseIcon />;
  };

  const handleSelectTool = () => {
    setToolMode('select');
    setDeviceTypeToAdd(null);
  };

  const handleDeviceSelect = (type: string) => {
    setToolMode('device');
    setDeviceTypeToAdd(type);
    setExpandedGroups(prev => ({ ...prev, device: false }));
  };

  const handleConnectionSelect = (style: string) => {
    setToolMode('connection');
    setConnectionLineStyle(style);
    setExpandedGroups(prev => ({ ...prev, connection: false }));
  };

  const handleStorageSelect = (type: string) => {
    setToolMode('device');
    setDeviceTypeToAdd(type);
    setExpandedGroups(prev => ({ ...prev, storage: false }));
  };

  return (
    <div className="toolbox">
      <div className="toolbox-group">
        <button
          className={`toolbox-button ${toolMode === 'select' ? 'active' : ''}`}
          onClick={handleSelectTool}
          title="选择工具"
        >
          <SelectIcon />
        </button>
      </div>

      <div className="toolbox-group">
        <div className="toolbox-expandable">
          <button
            className={`toolbox-button main-button ${isDeviceActive ? 'active' : ''}`}
            onClick={() => toggleGroup('device')}
            title="创建加工站"
          >
            {getDeviceIcon()}
            <span className="chevron-icon"><ChevronIcon expanded={expandedGroups['device']} /></span>
          </button>
          {expandedGroups['device'] && (
            <div className="toolbox-submenu">
              <button
                className={`toolbox-button sub-button ${deviceTypeToAdd === 'rect' ? 'active' : ''}`}
                onClick={() => handleDeviceSelect('rect')}
                title="矩形加工站"
              >
                <RectIcon />
              </button>
              <button
                className={`toolbox-button sub-button ${deviceTypeToAdd === 'circle' ? 'active' : ''}`}
                onClick={() => handleDeviceSelect('circle')}
                title="圆形加工站"
              >
                <CircleIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbox-group">
        <button
          className={`toolbox-button ${isAssemblyActive ? 'active' : ''}`}
          onClick={() => { setToolMode('device'); setDeviceTypeToAdd('assembly_station'); }}
          title="创建装配站"
        >
          <AssemblyStationIcon />
        </button>
      </div>

      <div className="toolbox-group">
        <button
          className={`toolbox-button ${deviceTypeToAdd === 'start' ? 'active' : ''}`}
          onClick={() => { setToolMode('device'); setDeviceTypeToAdd('start'); }}
          title="创建起点"
        >
          <StartIcon />
        </button>
        <button
          className={`toolbox-button ${deviceTypeToAdd === 'end' ? 'active' : ''}`}
          onClick={() => { setToolMode('device'); setDeviceTypeToAdd('end'); }}
          title="创建终点"
        >
          <EndIcon />
        </button>
      </div>

      <div className="toolbox-group">
        <div className="toolbox-expandable">
          <button
            className={`toolbox-button main-button ${isConnectionActive ? 'active' : ''}`}
            onClick={() => toggleGroup('connection')}
            title="创建连线"
          >
            {getConnectionIcon()}
            <span className="chevron-icon"><ChevronIcon expanded={expandedGroups['connection']} /></span>
          </button>
          {expandedGroups['connection'] && (
            <div className="toolbox-submenu">
              <button
                className={`toolbox-button sub-button ${connectionLineStyle === 'straight' ? 'active' : ''}`}
                onClick={() => handleConnectionSelect('straight')}
                title="直线"
              >
                <StraightLineIcon />
              </button>
              <button
                className={`toolbox-button sub-button ${connectionLineStyle === 'elbow' ? 'active' : ''}`}
                onClick={() => handleConnectionSelect('elbow')}
                title="肘形连线"
              >
                <PolylineIcon />
              </button>
              <button
                className={`toolbox-button sub-button ${connectionLineStyle === 'curve' ? 'active' : ''}`}
                onClick={() => handleConnectionSelect('curve')}
                title="曲线"
              >
                <CurveIcon />
              </button>
              <button
                className={`toolbox-button sub-button ${connectionLineStyle === 'free_polyline' ? 'active' : ''}`}
                onClick={() => handleConnectionSelect('free_polyline')}
                title="手动折线"
              >
                <FreePolylineIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbox-group">
        <div className="toolbox-expandable">
          <button
            className={`toolbox-button main-button ${isStorageActive ? 'active' : ''}`}
            onClick={() => toggleGroup('storage')}
            title="创建仓储"
          >
            {getStorageIcon()}
            <span className="chevron-icon"><ChevronIcon expanded={expandedGroups['storage']} /></span>
          </button>
          {expandedGroups['storage'] && (
            <div className="toolbox-submenu">
              <button
                className={`toolbox-button sub-button ${deviceTypeToAdd === 'warehouse' ? 'active' : ''}`}
                onClick={() => handleStorageSelect('warehouse')}
                title="仓库"
              >
                <WarehouseIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbox-group">
        <button
          className={`toolbox-button ${deviceTypeToAdd === 'buffer' ? 'active' : ''}`}
          onClick={() => { setToolMode('device'); setDeviceTypeToAdd('buffer'); }}
          title="创建缓冲区"
        >
          <BufferIcon />
        </button>
      </div>

      <div className="toolbox-group">
        <button
          className={`toolbox-button ${deviceTypeToAdd === 'workshop' ? 'active' : ''}`}
          onClick={() => { setToolMode('device'); setDeviceTypeToAdd('workshop'); }}
          title="创建厂房"
        >
          <WorkshopIcon />
        </button>
      </div>
    </div>
  );
}
