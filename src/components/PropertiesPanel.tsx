import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import type { Device, StartNode, EndNode, Station, AssemblyStation, DisassemblyStation, Warehouse, Buffer, TempStore, ProductProcessTime, TransportSpeedTimeUnit } from '../types';

function secondsToHms(totalSeconds: number | null): { hours: number; minutes: number; seconds: number } {
  if (totalSeconds == null || isNaN(totalSeconds)) return { hours: 0, minutes: 0, seconds: 0 };
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round((totalSeconds % 60) * 100) / 100;
  return { hours: h, minutes: m, seconds: s };
}

function hmsToSeconds(hours: number, minutes: number, seconds: number): number {
  return hours * 3600 + minutes * 60 + seconds;
}

function TimeInputHms({ value, onChange, style }: {
  value: number | null;
  onChange: (value: number | null) => void;
  style?: React.CSSProperties;
}) {
  const hms = secondsToHms(value);
  const [hours, setHours] = useState(String(hms.hours));
  const [minutes, setMinutes] = useState(String(hms.minutes));
  const [seconds, setSeconds] = useState(String(hms.seconds));

  useEffect(() => {
    const hms = secondsToHms(value);
    setHours(String(hms.hours));
    setMinutes(String(hms.minutes));
    setSeconds(String(hms.seconds));
  }, [value]);

  const commit = () => {
    const h = parseFloat(hours) || 0;
    const m = parseFloat(minutes) || 0;
    const s = parseFloat(seconds) || 0;
    const total = hmsToSeconds(h, m, s);
    onChange(total > 0 ? total : null);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', ...style }}>
      <input
        type="number"
        className="property-input time-input-hms"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        min="0"
      />
      <span style={{ fontSize: '11px' }}>时</span>
      <input
        type="number"
        className="property-input time-input-hms"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        min="0"
        max="59"
      />
      <span style={{ fontSize: '11px' }}>分</span>
      <input
        type="number"
        className="property-input time-input-hms"
        value={seconds}
        onChange={(e) => setSeconds(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        min="0"
        max="59"
        step="0.1"
      />
      <span style={{ fontSize: '11px' }}>秒</span>
    </div>
  );
}

function ImeInput({ value, onChange, className, placeholder, style }: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [internalValue, setInternalValue] = useState(value);
  const isComposing = useRef(false);

  useEffect(() => {
    if (!isComposing.current) {
      setInternalValue(value);
    }
  }, [value]);

  return (
    <input
      type="text"
      className={className}
      value={internalValue}
      placeholder={placeholder}
      style={style}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={(e) => {
        isComposing.current = false;
        const newValue = (e.target as HTMLInputElement).value;
        setInternalValue(newValue);
        onChange(newValue);
      }}
      onChange={(e) => {
        const newValue = e.target.value;
        setInternalValue(newValue);
        if (!isComposing.current) {
          onChange(newValue);
        }
      }}
    />
  );
}

type DeviceTab = 'basic' | 'product' | 'processing' | 'warehouse' | 'buffer' | 'feed' | 'tempstore' | 'target';
type ConnectionTab = 'basic' | 'transport';

export default function PropertiesPanel() {
  const {
    canvas,
    selectedDeviceId,
    selectedConnectionId,
    updateDevice,
    updateConnection,
    deleteDevice,
    deleteConnection,
    openRecordsModal,
  } = useAppStore();

  const [deviceTab, setDeviceTab] = useState<DeviceTab>('basic');
  const [connectionTab, setConnectionTab] = useState<ConnectionTab>('basic');

  const device = selectedDeviceId ? canvas.devices[selectedDeviceId] : null;
  const connection = selectedConnectionId ? canvas.connections[selectedConnectionId] : null;

  useEffect(() => {
    if (!device) return;
    const tabs = getDeviceTabs();
    const tabKeys = tabs.map(t => t.key);
    if (!tabKeys.includes(deviceTab)) {
      setDeviceTab('basic');
    }
  }, [selectedDeviceId]);

  const products = Object.values(canvas.products);

  const handleDeviceChange = (field: string, value: string | number | string[] | Record<string, Record<string, number>> | Record<string, ProductProcessTime> | Record<string, string[]> | Record<string, number> | null) => {
    if (!device) return;
    const updatedDevice = { ...device, [field]: value } as Device;
    updateDevice(updatedDevice);
  };

  const handleProductSelect = (productCode: string) => {
    if (!device) return;
    const product = canvas.products[productCode];
    if (product) {
      const updatedDevice = {
        ...device,
        product_code: product.code,
        product_name: product.name,
        product_color: product.color,
        ...(device.type === 'StartNode' ? { fill: product.color } : {}),
      } as Device;
      updateDevice(updatedDevice);
    } else {
      const updatedDevice = {
        ...device,
        product_code: productCode,
        product_name: '',
        product_color: '',
      } as Device;
      updateDevice(updatedDevice);
    }
  };

  const handleConnectionChange = (field: string, value: string | number | boolean) => {
    if (!connection) return;
    const updatedConnection = { ...connection, [field]: value };
    if (field === 'line_style') {
      if (value === 'elbow') {
        updatedConnection.elbow_offset = connection.elbow_offset ?? 30;
      } else {
        updatedConnection.elbow_offset = null;
      }
    }
    updateConnection(updatedConnection);
  };

  const getUpstreamDevices = (deviceId: string): string[] => {
    const upstream: string[] = [];
    for (const conn of Object.values(canvas.connections)) {
      if (conn.to_device_id === deviceId) {
        upstream.push(conn.from_device_id);
      }
    }
    return upstream;
  };

  const getDownstreamDevices = (deviceId: string): string[] => {
    const downstream: string[] = [];
    for (const conn of Object.values(canvas.connections)) {
      if (conn.from_device_id === deviceId) {
        downstream.push(conn.to_device_id);
      }
    }
    return downstream;
  };

  const getDeviceTabs = (): { key: DeviceTab; label: string }[] => {
    const tabs: { key: DeviceTab; label: string }[] = [
      { key: 'basic', label: '基础信息' },
    ];
    
    if (device?.type === 'StartNode') {
      tabs.push({ key: 'product', label: '产品设置' });
      tabs.push({ key: 'feed', label: '投料设置' });
    } else if (device?.type === 'Station') {
      tabs.push({ key: 'product', label: '产品设置' });
      tabs.push({ key: 'processing', label: '加工设置' });
    } else if (device?.type === 'AssemblyStation') {
      tabs.push({ key: 'product', label: '产品设置' });
      tabs.push({ key: 'processing', label: '装配设置' });
    } else if (device?.type === 'DisassemblyStation') {
      tabs.push({ key: 'product', label: '产品设置' });
      tabs.push({ key: 'processing', label: '拆解设置' });
    } else if (device?.type === 'Warehouse') {
      tabs.push({ key: 'product', label: '产品设置' });
      tabs.push({ key: 'warehouse', label: '仓库设置' });
    } else if (device?.type === 'Buffer') {
      tabs.push({ key: 'product', label: '产品设置' });
      tabs.push({ key: 'buffer', label: '缓冲区设置' });
    } else if (device?.type === 'TempStore') {
      tabs.push({ key: 'product', label: '产品设置' });
      tabs.push({ key: 'tempstore', label: '投放设置' });
    } else if (device?.type === 'EndNode') {
      tabs.push({ key: 'target', label: '目标产量' });
    }
    
    return tabs;
  };

  if (!device && !connection) {
    return (
      <>
        <div className="properties-panel">
          <div className="properties-header">属性</div>
          <div className="properties-content">
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <p>选择设备或连接查看属性</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (connection) {
    const fromDevice = canvas.devices[connection.from_device_id];
    const toDevice = canvas.devices[connection.to_device_id];
    
    const connectionLength = connection.length_mm != null ? connection.length_mm / 1000 : 0;

    return (
      <>
      <div className="properties-panel">
        <div className="properties-header">
          <span>连接属性</span>
          <div className="header-actions">
            <button
              className="icon-btn"
              title="查看详细记录数据"
              onClick={() => openRecordsModal(undefined, selectedConnectionId || undefined)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
            </button>
            <button
              className="icon-btn danger"
              title="删除连接"
              onClick={() => deleteConnection(connection.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>
        <div className="properties-tabs">
          <button
            className={`properties-tab ${connectionTab === 'basic' ? 'active' : ''}`}
            onClick={() => setConnectionTab('basic')}
          >
            基础信息
          </button>
          <button
            className={`properties-tab ${connectionTab === 'transport' ? 'active' : ''}`}
            onClick={() => setConnectionTab('transport')}
          >
            运输设置
          </button>
        </div>
        <div className="properties-content">
          {connectionTab === 'basic' && (
            <div className="property-group">
              <div className="property-row">
                <span className="property-label">名称</span>
                <ImeInput
                  className="property-input"
                  value={connection.name}
                  onChange={(v) => handleConnectionChange('name', v)}
                />
              </div>
              <div className="property-row">
                <span className="property-label">起点ID</span>
                <span className="property-value" style={{ fontSize: '11px' }}>
                  {connection.from_device_id.substring(0, 8)}...
                </span>
              </div>
              <div className="property-row">
                <span className="property-label">起点名称</span>
                <span className="property-value">
                  {fromDevice?.name || connection.from_device_id}
                </span>
              </div>
              <div className="property-row">
                <span className="property-label">终点ID</span>
                <span className="property-value" style={{ fontSize: '11px' }}>
                  {connection.to_device_id.substring(0, 8)}...
                </span>
              </div>
              <div className="property-row">
                <span className="property-label">终点名称</span>
                <span className="property-value">
                  {toDevice?.name || connection.to_device_id}
                </span>
              </div>
              <div className="property-row">
                <span className="property-label">连线长度</span>
                <span className="property-value">{connectionLength.toFixed(2)} m</span>
              </div>
              <div className="property-row">
                <span className="property-label">线型</span>
                <select
                  className="property-select"
                  value={connection.line_style}
                  onChange={(e) => handleConnectionChange('line_style', e.target.value)}
                >
                  <option value="straight">直线</option>
                  <option value="elbow">肘形连接线</option>
                  <option value="curve">曲线</option>
                  <option value="free_polyline">手动折线</option>
                </select>
              </div>
            </div>
          )}

          {connectionTab === 'transport' && (
            <div className="property-group">
              <div className="property-row">
                <span className="property-label">运输模式</span>
                <select
                  className="property-select"
                  value={connection.transport_mode}
                  onChange={(e) => handleConnectionChange('transport_mode', e.target.value)}
                >
                  <option value="continuous">连续运输</option>
                  <option value="discrete">离散运输</option>
                </select>
              </div>
              <div className="property-row">
                <span className="property-label">运输速度</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1 }}>
                  <input
                    type="number"
                    className="property-input"
                    value={(() => {
                      const unit = connection.transport_speed_time_unit || 'seconds';
                      const mps = connection.transport_speed_mps;
                      if (unit === 'seconds') return mps;
                      if (unit === 'minutes') return mps * 60;
                      return mps * 3600;
                    })()}
                    onChange={(e) => {
                      const unit = connection.transport_speed_time_unit || 'seconds';
                      const val = parseFloat(e.target.value) || 0;
                      let mps = val;
                      if (unit === 'minutes') mps = val / 60;
                      else if (unit === 'hours') mps = val / 3600;
                      handleConnectionChange('transport_speed_mps', mps);
                    }}
                    step="0.1"
                    min="0.1"
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '11px' }}>m/</span>
                  <select
                    value={connection.transport_speed_time_unit || 'seconds'}
                    onChange={(e) => {
                      const newUnit = e.target.value as TransportSpeedTimeUnit;
                      const oldUnit = connection.transport_speed_time_unit || 'seconds';
                      const mps = connection.transport_speed_mps;
                      let displayVal = mps;
                      if (oldUnit === 'minutes') displayVal = mps * 60;
                      else if (oldUnit === 'hours') displayVal = mps * 3600;
                      let newMps = displayVal;
                      if (newUnit === 'minutes') newMps = displayVal / 60;
                      else if (newUnit === 'hours') newMps = displayVal / 3600;
                      const updated = { ...connection, transport_speed_time_unit: newUnit, transport_speed_mps: newMps };
                      updateConnection(updated);
                    }}
                    style={{ minWidth: '50px' }}
                  >
                    <option value="seconds">秒</option>
                    <option value="minutes">分</option>
                    <option value="hours">时</option>
                  </select>
                </div>
              </div>
              {connection.transport_mode === 'continuous' && (
                <>
                  <div className="property-row">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={connection.unlimited_transport}
                        onChange={(e) => handleConnectionChange('unlimited_transport', e.target.checked)}
                      />
                      <span style={{ fontSize: '12px' }}>无限制并发</span>
                    </label>
                  </div>
                  {!connection.unlimited_transport && (
                    <div className="property-row">
                      <span className="property-label">最大并发数</span>
                      <input
                        type="number"
                        className="property-input"
                        value={connection.max_transport_count}
                        onChange={(e) => handleConnectionChange('max_transport_count', parseInt(e.target.value) || 1)}
                        min="1"
                        max="100"
                      />
                    </div>
                  )}
                </>
              )}
              {connection.transport_mode === 'discrete' && (
                <>
                  <div className="property-row">
                    <span className="property-label">小车数量</span>
                    <input
                      type="number"
                      className="property-input"
                      value={connection.cart_count}
                      onChange={(e) => handleConnectionChange('cart_count', parseInt(e.target.value) || 1)}
                      min="1"
                      max="50"
                    />
                  </div>
                  <div className="property-row">
                    <span className="property-label">小车单次运量</span>
                    <input
                      type="number"
                      className="property-input"
                      value={connection.cart_capacity || 1}
                      onChange={(e) => handleConnectionChange('cart_capacity', parseInt(e.target.value) || 1)}
                      min="1"
                      max="100"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

if (device) {
  const upstreamDevices = getUpstreamDevices(device.id);
  const downstreamDevices = getDownstreamDevices(device.id);
  const tabs = getDeviceTabs();

  return (
    <>
      <div className="properties-panel">
        <div className="properties-header">
          <span>{device.name}属性</span>
          <div className="header-actions">
            <button
              className="icon-btn"
              title="查看详细记录数据"
              onClick={() => openRecordsModal(selectedDeviceId || undefined, undefined)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
            </button>
            <button
              className="icon-btn danger"
              title="删除设备"
              onClick={() => deleteDevice(device.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>
        <div className="properties-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`properties-tab ${deviceTab === tab.key ? 'active' : ''}`}
              onClick={() => setDeviceTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="properties-content">
          {deviceTab === 'basic' && (
            <>
              <div className="property-group">
                <div className="property-row">
                  <span className="property-label">ID</span>
                  <span className="property-value" style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {device.id.substring(0, 8)}...
                  </span>
                </div>
                <div className="property-row">
                  <span className="property-label">名称</span>
                  <ImeInput
                    className="property-input"
                    value={device.name}
                    onChange={(v) => handleDeviceChange('name', v)}
                  />
                </div>
                <div className="property-row">
                  <span className="property-label">编号</span>
                  <ImeInput
                    className="property-input"
                    value={device.equip_id}
                    onChange={(v) => handleDeviceChange('equip_id', v)}
                  />
                </div>
                <div className="property-row">
                  <span className="property-label">描述</span>
                  <ImeInput
                    className="property-input"
                    value={device.desc}
                    onChange={(v) => handleDeviceChange('desc', v)}
                  />
                </div>
                <div className="property-row">
                  <span className="property-label">填充颜色</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={device.fill || '#FFFFFF'}
                      onChange={(e) => handleDeviceChange('fill', e.target.value)}
                      style={{ width: '40px', height: '28px', border: '1px solid #D1D9E0', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <ImeInput
                      className="property-input"
                      value={device.fill || '#FFFFFF'}
                      onChange={(v) => handleDeviceChange('fill', v)}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="property-row">
                  <span className="property-label">边框颜色</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={device.outline || '#D1D9E0'}
                      onChange={(e) => handleDeviceChange('outline', e.target.value)}
                      style={{ width: '40px', height: '28px', border: '1px solid #D1D9E0', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <ImeInput
                      className="property-input"
                      value={device.outline || '#D1D9E0'}
                      onChange={(v) => handleDeviceChange('outline', v)}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="property-row">
                  <span className="property-label">位置 X</span>
                  <input
                    type="number"
                    className="property-input"
                    value={device.x_mm}
                    onChange={(e) => handleDeviceChange('x_mm', parseFloat(e.target.value))}
                  />
                  <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                </div>
                <div className="property-row">
                  <span className="property-label">位置 Y</span>
                  <input
                    type="number"
                    className="property-input"
                    value={device.y_mm}
                    onChange={(e) => handleDeviceChange('y_mm', parseFloat(e.target.value))}
                  />
                  <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                </div>
              </div>

              <div className="property-group">
                <div className="property-group-title">尺寸</div>
                {device.shape_type === 'rect' && device.type !== 'Workshop' && (
                  <>
                    <div className="property-row">
                      <span className="property-label">宽度</span>
                      <input
                        type="number"
                        className="property-input"
                        value={device.params.width || 400}
                        onChange={(e) => {
                          const updatedDevice = {
                            ...device,
                            params: { ...device.params, width: parseFloat(e.target.value) }
                          } as Device;
                          updateDevice(updatedDevice);
                        }}
                      />
                      <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                    </div>
                    <div className="property-row">
                      <span className="property-label">高度</span>
                      <input
                        type="number"
                        className="property-input"
                        value={device.params.height || 300}
                        onChange={(e) => {
                          const updatedDevice = {
                            ...device,
                            params: { ...device.params, height: parseFloat(e.target.value) }
                          } as Device;
                          updateDevice(updatedDevice);
                        }}
                      />
                      <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                    </div>
                  </>
                )}
                {device.type === 'Workshop' && (
                  <>
                    <div className="property-row">
                      <span className="property-label">宽度</span>
                      <input
                        type="number"
                        className="property-input"
                        value={(device as import('../types').Workshop).width_mm || 2000}
                        onChange={(e) => {
                          const updatedDevice = {
                            ...device,
                            width_mm: parseFloat(e.target.value),
                            params: { ...device.params, width: parseFloat(e.target.value) }
                          } as Device;
                          updateDevice(updatedDevice);
                        }}
                      />
                      <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                    </div>
                    <div className="property-row">
                      <span className="property-label">高度</span>
                      <input
                        type="number"
                        className="property-input"
                        value={(device as import('../types').Workshop).height_mm || 1500}
                        onChange={(e) => {
                          const updatedDevice = {
                            ...device,
                            height_mm: parseFloat(e.target.value),
                            params: { ...device.params, height: parseFloat(e.target.value) }
                          } as Device;
                          updateDevice(updatedDevice);
                        }}
                      />
                      <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                    </div>
                  </>
                )}
                {device.shape_type === 'circle' && (
                  <div className="property-row">
                    <span className="property-label">直径</span>
                    <input
                      type="number"
                      className="property-input"
                      value={device.params.diameter || 200}
                      onChange={(e) => {
                        const updatedDevice = {
                          ...device,
                          params: { ...device.params, diameter: parseFloat(e.target.value) }
                        } as Device;
                        updateDevice(updatedDevice);
                      }}
                    />
                    <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                  </div>
                )}
                {device.shape_type === 'diamond' && (
                  <div className="property-row">
                    <span className="property-label">边长</span>
                    <input
                      type="number"
                      className="property-input"
                      value={device.params.side || 150}
                      onChange={(e) => {
                        const updatedDevice = {
                          ...device,
                          params: { ...device.params, side: parseFloat(e.target.value) }
                        } as Device;
                        updateDevice(updatedDevice);
                      }}
                    />
                    <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                  </div>
                )}
                {device.shape_type === 'tri' && (
                  <>
                    <div className="property-row">
                      <span className="property-label">底边</span>
                      <input
                        type="number"
                        className="property-input"
                        value={device.params.base || 400}
                        onChange={(e) => {
                          const updatedDevice = {
                            ...device,
                            params: { ...device.params, base: parseFloat(e.target.value) }
                          } as Device;
                          updateDevice(updatedDevice);
                        }}
                      />
                      <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                    </div>
                    <div className="property-row">
                      <span className="property-label">高度</span>
                      <input
                        type="number"
                        className="property-input"
                        value={device.params.height || 300}
                        onChange={(e) => {
                          const updatedDevice = {
                            ...device,
                            params: { ...device.params, height: parseFloat(e.target.value) }
                          } as Device;
                          updateDevice(updatedDevice);
                        }}
                      />
                      <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                    </div>
                  </>
                )}
                {device.shape_type === 'trap' && (
                  <>
                    <div className="property-row">
                      <span className="property-label">底边宽度</span>
                      <input
                        type="number"
                        className="property-input"
                        value={device.params.bottom || 210}
                        onChange={(e) => {
                          const updatedDevice = {
                            ...device,
                            params: { ...device.params, bottom: parseFloat(e.target.value) }
                          } as Device;
                          updateDevice(updatedDevice);
                        }}
                      />
                      <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                    </div>
                    <div className="property-row">
                      <span className="property-label">总高度</span>
                      <input
                        type="number"
                        className="property-input"
                        value={device.params.height || 252}
                        onChange={(e) => {
                          const updatedDevice = {
                            ...device,
                            params: { ...device.params, height: parseFloat(e.target.value) }
                          } as Device;
                          updateDevice(updatedDevice);
                        }}
                      />
                      <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                    </div>
                  </>
                )}
              </div>

              {device.type !== 'StartNode' && device.type !== 'EndNode' && device.type !== 'Workshop' && (
                <div className="property-group">
                  <div className="property-group-title">厂房信息</div>
                  <div className="property-row">
                    <span className="property-label">所属厂房</span>
                    <select
                      className="property-input"
                      value={device.workshop_id || ''}
                      onChange={(e) => {
                        const workshopId = e.target.value || undefined;
                        if (workshopId) {
                          const workshop = canvas.devices[workshopId];
                          if (workshop) {
                            let w = 0, h = 0;
                            switch (device.shape_type) {
                              case 'rect':
                                w = device.params.width || 400;
                                h = device.params.height || 300;
                                break;
                              case 'circle':
                                w = device.params.diameter || 300;
                                h = w;
                                break;
                              case 'diamond':
                                w = device.params.side || 150;
                                h = w;
                                break;
                              case 'tri':
                                w = device.params.base || 400;
                                h = device.params.height || 300;
                                break;
                              case 'trap':
                                w = device.params.bottom || 300;
                                h = device.params.height || 300;
                                break;
                            }
                            const distances = {
                              top: device.y_mm - workshop.y_mm,
                              bottom: (workshop.y_mm + (workshop as import('../types').Workshop).height_mm) - (device.y_mm + h),
                              left: device.x_mm - workshop.x_mm,
                              right: (workshop.x_mm + (workshop as import('../types').Workshop).width_mm) - (device.x_mm + w),
                            };
                            updateDevice({
                              ...device,
                              workshop_id: workshopId,
                              workshop_top: distances.top,
                              workshop_bottom: distances.bottom,
                              workshop_left: distances.left,
                              workshop_right: distances.right,
                            });
                          }
                        } else {
                          updateDevice({
                            ...device,
                            workshop_id: undefined,
                            workshop_top: undefined,
                            workshop_bottom: undefined,
                            workshop_left: undefined,
                            workshop_right: undefined,
                          });
                        }
                      }}
                    >
                      <option value="">无</option>
                      {Object.values(canvas.devices)
                        .filter(d => d.type === 'Workshop')
                        .map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                  </div>
                  {device.workshop_id && (
                    <>
                      <div className="property-row">
                        <span className="property-label">上边距</span>
                        <input
                          type="number"
                          className="property-input"
                          value={device.workshop_top || 0}
                          onChange={(e) => {
                            const newTop = parseFloat(e.target.value);
                            const workshop = canvas.devices[device.workshop_id!];
                            if (workshop) {
                              let h = 0;
                              switch (device.shape_type) {
                                case 'rect': h = device.params.height || 300; break;
                                case 'circle': h = device.params.diameter || 300; break;
                                case 'diamond': h = device.params.side || 150; break;
                                case 'tri': h = device.params.height || 300; break;
                                case 'trap': h = device.params.height || 300; break;
                              }
                              const workshopHeight = (workshop as import('../types').Workshop).height_mm;
                              const newY = workshop.y_mm + newTop;
                              updateDevice({
                                ...device,
                                y_mm: newY,
                                workshop_top: newTop,
                                workshop_bottom: (workshop.y_mm + workshopHeight) - (newY + h),
                              });
                            }
                          }}
                        />
                        <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                      </div>
                      <div className="property-row">
                        <span className="property-label">下边距</span>
                        <input
                          type="number"
                          className="property-input"
                          value={device.workshop_bottom || 0}
                          onChange={(e) => {
                            const newBottom = parseFloat(e.target.value);
                            const workshop = canvas.devices[device.workshop_id!];
                            if (workshop) {
                              let h = 0;
                              switch (device.shape_type) {
                                case 'rect': h = device.params.height || 300; break;
                                case 'circle': h = device.params.diameter || 300; break;
                                case 'diamond': h = device.params.side || 150; break;
                                case 'tri': h = device.params.height || 300; break;
                                case 'trap': h = device.params.height || 300; break;
                              }
                              const workshopHeight = (workshop as import('../types').Workshop).height_mm;
                              const newY = workshop.y_mm + workshopHeight - newBottom - h;
                              updateDevice({
                                ...device,
                                y_mm: newY,
                                workshop_top: newY - workshop.y_mm,
                                workshop_bottom: newBottom,
                              });
                            }
                          }}
                        />
                        <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                      </div>
                      <div className="property-row">
                        <span className="property-label">左边距</span>
                        <input
                          type="number"
                          className="property-input"
                          value={device.workshop_left || 0}
                          onChange={(e) => {
                            const newLeft = parseFloat(e.target.value);
                            const workshop = canvas.devices[device.workshop_id!];
                            if (workshop) {
                              let w = 0;
                              switch (device.shape_type) {
                                case 'rect': w = device.params.width || 400; break;
                                case 'circle': w = device.params.diameter || 300; break;
                                case 'diamond': w = device.params.side || 150; break;
                                case 'tri': w = device.params.base || 400; break;
                                case 'trap': w = device.params.bottom || 300; break;
                              }
                              const workshopWidth = (workshop as import('../types').Workshop).width_mm;
                              const newX = workshop.x_mm + newLeft;
                              updateDevice({
                                ...device,
                                x_mm: newX,
                                workshop_left: newLeft,
                                workshop_right: (workshop.x_mm + workshopWidth) - (newX + w),
                              });
                            }
                          }}
                        />
                        <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                      </div>
                      <div className="property-row">
                        <span className="property-label">右边距</span>
                        <input
                          type="number"
                          className="property-input"
                          value={device.workshop_right || 0}
                          onChange={(e) => {
                            const newRight = parseFloat(e.target.value);
                            const workshop = canvas.devices[device.workshop_id!];
                            if (workshop) {
                              let w = 0;
                              switch (device.shape_type) {
                                case 'rect': w = device.params.width || 400; break;
                                case 'circle': w = device.params.diameter || 300; break;
                                case 'diamond': w = device.params.side || 150; break;
                                case 'tri': w = device.params.base || 400; break;
                                case 'trap': w = device.params.bottom || 300; break;
                              }
                              const workshopWidth = (workshop as import('../types').Workshop).width_mm;
                              const newX = workshop.x_mm + workshopWidth - newRight - w;
                              updateDevice({
                                ...device,
                                x_mm: newX,
                                workshop_left: newX - workshop.x_mm,
                                workshop_right: newRight,
                              });
                            }
                          }}
                        />
                        <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="property-group">
                <div className="property-group-title">连接信息</div>
                <div className="property-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="property-label" style={{ marginBottom: '4px' }}>上游节点</span>
                  {upstreamDevices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                      {upstreamDevices.map(id => (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{id.substring(0, 8)}...</span>
                          <span style={{ fontSize: '12px' }}>{canvas.devices[id]?.name || '未知'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>无</span>
                  )}
                </div>
                <div className="property-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="property-label" style={{ marginBottom: '4px' }}>下游节点</span>
                  {downstreamDevices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                      {downstreamDevices.map(id => (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{id.substring(0, 8)}...</span>
                          <span style={{ fontSize: '12px' }}>{canvas.devices[id]?.name || '未知'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>无</span>
                  )}
                </div>
              </div>
            </>
          )}

          {deviceTab === 'product' && (
            <ProductSettingsTab
              device={device}
              onChange={handleDeviceChange}
              onProductSelect={handleProductSelect}
              products={products}
            />
          )}

          {deviceTab === 'processing' && device.type === 'Station' && (
            <ProcessingSettingsTab
              device={device as Station}
              onChange={handleDeviceChange}
            />
          )}

          {deviceTab === 'processing' && device.type === 'AssemblyStation' && (
            <AssemblySettingsTab
              device={device as AssemblyStation}
              onChange={handleDeviceChange}
            />
          )}

          {deviceTab === 'processing' && device.type === 'DisassemblyStation' && (
            <DisassemblySettingsTab
              device={device as DisassemblyStation}
              onChange={handleDeviceChange}
            />
          )}

          {deviceTab === 'warehouse' && device.type === 'Warehouse' && (
            <WarehouseSettingsTab
              device={device as Warehouse}
              onChange={handleDeviceChange}
            />
          )}

          {deviceTab === 'tempstore' && device.type === 'TempStore' && (
            <TempStoreSettingsTab
              device={device as TempStore}
              onChange={handleDeviceChange}
            />
          )}

          {deviceTab === 'buffer' && device.type === 'Buffer' && (
            <BufferSettingsTab
              device={device as Buffer}
              onChange={handleDeviceChange}
            />
          )}

          {deviceTab === 'feed' && device.type === 'StartNode' && (
            <FeedSettingsTab
              device={device as StartNode}
              onChange={handleDeviceChange}
            />
          )}

          {deviceTab === 'target' && device.type === 'EndNode' && (
            <TargetOutputSettingsTab
              device={device as EndNode}
              onChange={handleDeviceChange}
            />
          )}
        </div>
      </div>
    </>
  );
}

return null;
}

interface Product {
  code: string;
  name: string;
  color: string;
}

function ProductSelector({ 
  value, 
  products, 
  onSelect,
  showColor = true 
}: { 
  value: string; 
  products: Product[]; 
  onSelect: (code: string) => void;
  showColor?: boolean;
}) {
  let selectedProduct = products.find(p => p.code === value);
  let effectiveValue = value;
  if (!selectedProduct && value) {
    const foundByName = products.find(p => p.name === value);
    if (foundByName) {
      selectedProduct = foundByName;
      effectiveValue = foundByName.code;
    }
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <select
          className="property-select"
          value={effectiveValue}
          onChange={(e) => onSelect(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">-- 选择产品 --</option>
          {products.map(p => (
            <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
          ))}
        </select>
        {showColor && selectedProduct && (
          <div 
            style={{ 
              width: '20px', 
              height: '20px', 
              backgroundColor: selectedProduct.color,
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              flexShrink: 0
            }}
            title={selectedProduct.color}
          />
        )}
      </div>
      {effectiveValue && !selectedProduct && (
        <ImeInput
          className="property-input"
          value={value}
          onChange={(v) => onSelect(v)}
          placeholder="输入自定义产品编码"
          style={{ fontSize: '11px' }}
        />
      )}
    </div>
  );
}

function MultiProductSelector({
  selectedCodes,
  products,
  onChange,
}: {
  selectedCodes: string[];
  products: Product[];
  onChange: (codes: string[]) => void;
}) {
  const handleToggle = (code: string) => {
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter(c => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '4px',
        padding: '8px',
        border: '1px solid var(--border-light)',
        borderRadius: '4px',
        maxHeight: '150px',
        overflowY: 'auto'
      }}>
        {products.map(p => (
          <label 
            key={p.code} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: selectedCodes.includes(p.code) ? 'var(--bg-hover)' : 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            <input
              type="checkbox"
              checked={selectedCodes.includes(p.code)}
              onChange={() => handleToggle(p.code)}
              style={{ margin: 0 }}
            />
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: p.color,
                border: '1px solid #CBD5E1',
                borderRadius: '2px'
              }}
            />
            <span>{p.code}</span>
          </label>
        ))}
      </div>
      {selectedCodes.length > 0 && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          已选择: {selectedCodes.join(', ')}
        </div>
      )}
    </div>
  );
}

function ProductSettingsTab({ 
  device, 
  onChange, 
  onProductSelect, 
  products
}: { 
  device: Device; 
  onChange: (field: string, value: string | number | string[] | Record<string, Record<string, number>>) => void;
  onProductSelect: (productCode: string) => void;
  products: Product[];
}) {
  if (device.type === 'AssemblyStation') {
    const assembly = device as AssemblyStation;
    const handleComponentsChange = (codes: string[]) => {
      onChange('components', codes);
    };
    const handleAssemblyProductsChange = (codes: string[]) => {
      onChange('assembly_products', codes);
    };
    
    return (
      <div className="property-group">
        <div className="property-row">
          <span className="property-label">组件</span>
          <MultiProductSelector 
            selectedCodes={assembly.components || []} 
            products={products} 
            onChange={handleComponentsChange}
          />
        </div>
        <div className="property-row">
          <span className="property-label">装配成品</span>
          <MultiProductSelector 
            selectedCodes={assembly.assembly_products || []} 
            products={products} 
            onChange={handleAssemblyProductsChange}
          />
        </div>
      </div>
    );
  }

  if (device.type === 'DisassemblyStation') {
    const disassembly = device as DisassemblyStation;
    const handleItemsToDisassembleChange = (codes: string[]) => {
      onChange('items_to_disassemble', codes);
    };
    const handleDisassemblyProductsChange = (codes: string[]) => {
      onChange('disassembly_products', codes);
    };
    
    return (
      <div className="property-group">
        <div className="property-row">
          <span className="property-label">待拆解品</span>
          <MultiProductSelector 
            selectedCodes={disassembly.items_to_disassemble || []} 
            products={products} 
            onChange={handleItemsToDisassembleChange}
          />
        </div>
        <div className="property-row">
          <span className="property-label">拆解产物</span>
          <MultiProductSelector 
            selectedCodes={disassembly.disassembly_products || []} 
            products={products} 
            onChange={handleDisassemblyProductsChange}
          />
        </div>
      </div>
    );
  }

  if (device.type === 'Station') {
    const station = device as Station;
    const handleProcessableProductsChange = (codes: string[]) => {
      onChange('processable_products', codes);
    };
    
    return (
      <div className="property-group">
        <div className="property-row">
          <span className="property-label">可加工产品</span>
          <MultiProductSelector 
            selectedCodes={station.processable_products || []} 
            products={products} 
            onChange={handleProcessableProductsChange}
          />
        </div>
      </div>
    );
  }

  if (device.type === 'Warehouse' || device.type === 'TempStore') {
    const storage = device as Warehouse | TempStore;
    const handleProcessableProductsChange = (codes: string[]) => {
      onChange('processable_products', codes);
    };
    
    return (
      <div className="property-group">
        <div className="property-row">
          <span className="property-label">允许存储产品</span>
          <MultiProductSelector 
            selectedCodes={storage.processable_products || []} 
            products={products} 
            onChange={handleProcessableProductsChange}
          />
        </div>
      </div>
    );
  }
  
  const deviceWithProduct = device as StartNode | Buffer;
  const displayProductName = deviceWithProduct.product_name 
    || products.find(p => p.code === deviceWithProduct.product_code)?.name 
    || '';
  
  return (
    <div className="property-group">
      <div className="property-row">
        <span className="property-label">产品</span>
        <ProductSelector 
          value={deviceWithProduct.product_code || ''} 
          products={products} 
          onSelect={onProductSelect}
        />
      </div>
      {displayProductName && (
        <div className="property-row">
          <span className="property-label">产品名称</span>
          <span className="property-value">{displayProductName}</span>
        </div>
      )}
    </div>
  );
}

function ProcessingSettingsTab({ device, onChange }: { device: Station; onChange: (field: string, value: string | number | string[] | Record<string, Record<string, number>> | Record<string, ProductProcessTime> | Record<string, string[]> | null) => void }) {
  const canvas = useAppStore((state) => state.canvas);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleProductExpand = (code: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const updateProductProcessTime = (productCode: string, config: ProductProcessTime | null) => {
    const newTimes = { ...device.product_process_times };
    if (config === null) {
      delete newTimes[productCode];
    } else {
      newTimes[productCode] = config;
    }
    onChange('product_process_times', newTimes);
  };

  const updateProductTools = (productCode: string, tools: Record<string, number>) => {
    const newTools = { ...device.product_tools };
    if (Object.keys(tools).length === 0) {
      delete newTools[productCode];
    } else {
      newTools[productCode] = tools;
    }
    onChange('product_tools', newTools);
  };

  const toggleTool = (productCode: string, toolCode: string) => {
    const currentTools = device.product_tools?.[productCode] || {};
    const newTools = { ...currentTools };
    if (newTools[toolCode] !== undefined) {
      delete newTools[toolCode];
    } else {
      newTools[toolCode] = 10;
    }
    updateProductTools(productCode, newTools);
  };

  const updateToolInstallTime = (productCode: string, toolCode: string, installTime: number) => {
    const currentTools = device.product_tools?.[productCode] || {};
    const newTools = { ...currentTools, [toolCode]: installTime };
    updateProductTools(productCode, newTools);
  };

  const updateProductMaterials = (productCode: string, materials: Record<string, number>) => {
    const newMaterials = { ...device.product_materials };
    if (Object.keys(materials).length === 0) {
      delete newMaterials[productCode];
    } else {
      newMaterials[productCode] = materials;
    }
    onChange('product_materials', newMaterials);
  };

  const toggleMaterial = (productCode: string, materialCode: string) => {
    const currentMaterials = device.product_materials?.[productCode] || {};
    const newMaterials = { ...currentMaterials };
    if (newMaterials[materialCode] !== undefined) {
      delete newMaterials[materialCode];
    } else {
      newMaterials[materialCode] = 1;
    }
    updateProductMaterials(productCode, newMaterials);
  };

  const updateMaterialQuantity = (productCode: string, materialCode: string, quantity: number) => {
    const currentMaterials = device.product_materials?.[productCode] || {};
    const newMaterials = { ...currentMaterials, [materialCode]: quantity };
    updateProductMaterials(productCode, newMaterials);
  };

  const renderTimeInputs = (config: ProductProcessTime, productCode: string) => {
    const updateField = (field: keyof ProductProcessTime, value: number | null) => {
      const newConfig = { ...config, [field]: value };
      updateProductProcessTime(productCode, newConfig);
    };

    const updateDistType = (distType: string) => {
      const newConfig: ProductProcessTime = {
        dist_type: distType as ProductProcessTime['dist_type'],
        avg_time_s: null,
        stddev_s: null,
        min_time_s: null,
        max_time_s: null,
        mode_time_s: null,
        uniform_min_s: null,
        uniform_max_s: null,
        exp_mean_s: null,
      };
      updateProductProcessTime(productCode, newConfig);
    };

    return (
      <>
        <div className="property-row" style={{ paddingLeft: '16px' }}>
          <span className="property-label">分布类型</span>
          <select
            className="property-select"
            value={config.dist_type}
            onChange={(e) => updateDistType(e.target.value)}
          >
            <option value="normal">正态分布</option>
            <option value="triangular">三角分布</option>
            <option value="uniform">均匀分布</option>
            <option value="exponential">指数分布</option>
          </select>
        </div>
        {config.dist_type === 'normal' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">平均时间</span>
              <TimeInputHms value={config.avg_time_s} onChange={(v) => updateField('avg_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">标准差</span>
              <TimeInputHms value={config.stddev_s} onChange={(v) => updateField('stddev_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'triangular' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最小时间</span>
              <TimeInputHms value={config.min_time_s} onChange={(v) => updateField('min_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">众数时间</span>
              <TimeInputHms value={config.mode_time_s} onChange={(v) => updateField('mode_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最大时间</span>
              <TimeInputHms value={config.max_time_s} onChange={(v) => updateField('max_time_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'uniform' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最小时间</span>
              <TimeInputHms value={config.uniform_min_s} onChange={(v) => updateField('uniform_min_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最大时间</span>
              <TimeInputHms value={config.uniform_max_s} onChange={(v) => updateField('uniform_max_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'exponential' && (
          <div className="property-row" style={{ paddingLeft: '16px' }}>
            <span className="property-label">平均时间</span>
            <TimeInputHms value={config.exp_mean_s} onChange={(v) => updateField('exp_mean_s', v)} />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="property-group">
      <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '12px' }}>
        默认加工时间
      </div>
      <div className="property-row">
        <span className="property-label">分布类型</span>
        <select
          className="property-select"
          value={device.dist_type}
          onChange={(e) => onChange('dist_type', e.target.value)}
        >
          <option value="normal">正态分布</option>
          <option value="triangular">三角分布</option>
          <option value="uniform">均匀分布</option>
          <option value="exponential">指数分布</option>
        </select>
      </div>
      {device.dist_type === 'normal' && (
        <>
          <div className="property-row">
            <span className="property-label">平均时间</span>
            <TimeInputHms value={device.avg_time_s} onChange={(v) => onChange('avg_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">标准差</span>
            <TimeInputHms value={device.stddev_s} onChange={(v) => onChange('stddev_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'triangular' && (
        <>
          <div className="property-row">
            <span className="property-label">最小时间</span>
            <TimeInputHms value={device.min_time_s} onChange={(v) => onChange('min_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">众数时间</span>
            <TimeInputHms value={device.mode_time_s} onChange={(v) => onChange('mode_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">最大时间</span>
            <TimeInputHms value={device.max_time_s} onChange={(v) => onChange('max_time_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'uniform' && (
        <>
          <div className="property-row">
            <span className="property-label">最小时间</span>
            <TimeInputHms value={device.uniform_min_s} onChange={(v) => onChange('uniform_min_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">最大时间</span>
            <TimeInputHms value={device.uniform_max_s} onChange={(v) => onChange('uniform_max_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'exponential' && (
        <div className="property-row">
          <span className="property-label">平均时间</span>
          <TimeInputHms value={device.exp_mean_s} onChange={(v) => onChange('exp_mean_s', v || 0)} />
        </div>
      )}

      {device.processable_products.length > 0 && (
        <>
          <div style={{ marginTop: '16px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '12px' }}>
            各产品加工时间配置
          </div>
          {device.processable_products.map(code => {
            const product = canvas.products[code];
            const productName = product?.name || code;
            const hasCustomConfig = device.product_process_times && device.product_process_times[code];
            const isExpanded = expandedProducts.has(code);
            
            return (
              <div key={code} style={{ marginBottom: '8px', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px',
                  }}
                  onClick={() => toggleProductExpand(code)}
                >
                  <span style={{ marginRight: '8px', fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '2px', 
                    background: product?.color || '#888',
                    marginRight: '8px',
                    border: '1px solid rgba(0,0,0,0.2)'
                  }} />
                  <span style={{ flex: 1, fontSize: '12px' }}>{productName}</span>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px', 
                    borderRadius: '3px',
                    background: hasCustomConfig ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: hasCustomConfig ? 'white' : 'var(--text-muted)'
                  }}>
                    {hasCustomConfig ? '自定义' : '默认'}
                  </span>
                </div>
                
                {isExpanded && (
                  <div style={{ padding: '8px 0' }}>
                    <div className="property-row" style={{ paddingLeft: '16px' }}>
                      <span className="property-label">使用设置</span>
                      <select
                        className="property-select"
                        value={hasCustomConfig ? 'custom' : 'default'}
                        onChange={(e) => {
                          if (e.target.value === 'default') {
                            updateProductProcessTime(code, null);
                          } else {
                            updateProductProcessTime(code, {
                              dist_type: device.dist_type,
                              avg_time_s: device.avg_time_s,
                              stddev_s: device.stddev_s,
                              min_time_s: device.min_time_s,
                              max_time_s: device.max_time_s,
                              mode_time_s: device.mode_time_s,
                              uniform_min_s: device.uniform_min_s,
                              uniform_max_s: device.uniform_max_s,
                              exp_mean_s: device.exp_mean_s,
                            });
                          }
                        }}
                      >
                        <option value="default">使用默认设置</option>
                        <option value="custom">自定义设置</option>
                      </select>
                    </div>
                    
                    {hasCustomConfig && renderTimeInputs(device.product_process_times[code], code)}
                    
                    <div style={{ marginTop: '12px', paddingLeft: '16px', paddingRight: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        加工工具
                      </div>
                      {Object.keys(canvas.tools).length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          暂无工具，请在"设置"菜单中添加工具
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Object.values(canvas.tools).map(tool => {
                            const currentTools = device.product_tools?.[code] || {};
                            const isSelected = currentTools[tool.code] !== undefined;
                            const installTime = currentTools[tool.code] || 10;
                            return (
                              <div
                                key={tool.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                                  background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTool(code, tool.code)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ flex: 1, fontSize: '12px' }}>{tool.name} ({tool.code})</span>
                                {isSelected && (
                                  <>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>安装时间:</span>
                                    <input
                                      type="number"
                                      value={installTime}
                                      onChange={(e) => updateToolInstallTime(code, tool.code, parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="1"
                                      style={{
                                        width: '60px',
                                        padding: '2px 4px',
                                        fontSize: '11px',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '3px',
                                      }}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>秒</span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '12px', paddingLeft: '16px', paddingRight: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        使用原料
                      </div>
                      {Object.keys(canvas.materials).length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          暂无原料，请在"原料管理"中添加原料
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Object.values(canvas.materials).map(material => {
                            const currentMaterials = device.product_materials?.[code] || {};
                            const isSelected = currentMaterials[material.code] !== undefined;
                            const quantity = currentMaterials[material.code] || 1;
                            return (
                              <div
                                key={material.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                                  background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleMaterial(code, material.code)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ flex: 1, fontSize: '12px' }}>{material.name} ({material.code})</span>
                                {isSelected && (
                                  <>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>用量:</span>
                                    <input
                                      type="number"
                                      value={quantity}
                                      onChange={(e) => updateMaterialQuantity(code, material.code, parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="0.01"
                                      style={{
                                        width: '60px',
                                        padding: '2px 4px',
                                        fontSize: '11px',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '3px',
                                      }}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{material.unit || '件'}</span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function WarehouseSettingsTab({ device, onChange }: { device: Warehouse; onChange: (field: string, value: string | number | string[]) => void }) {
  return (
    <div className="property-group">
      <div className="property-row">
        <span className="property-label">容量</span>
        <input
          type="number"
          className="property-input"
          value={device.wh_capacity}
          onChange={(e) => onChange('wh_capacity', parseInt(e.target.value))}
          min="0"
        />
        <span style={{ marginLeft: '4px', fontSize: '12px' }}>件 (0=无限制)</span>
      </div>
      <div className="property-row">
        <span className="property-label">投放模式</span>
        <select
          className="property-select"
          value={device.release_mode || 'immediate'}
          onChange={(e) => onChange('release_mode', e.target.value)}
        >
          <option value="immediate">立即投放</option>
          <option value="wait_for_idle">等待空闲</option>
        </select>
      </div>
    </div>
  );
}

function TempStoreSettingsTab({ device, onChange }: { device: TempStore; onChange: (field: string, value: string | number | string[]) => void }) {
  return (
    <div className="property-group">
      <div className="property-row">
        <span className="property-label">投放模式</span>
        <select
          className="property-select"
          value={device.release_mode || 'immediate'}
          onChange={(e) => onChange('release_mode', e.target.value)}
        >
          <option value="immediate">立即投放</option>
          <option value="wait_for_idle">等待空闲</option>
        </select>
      </div>
    </div>
  );
}

function BufferSettingsTab({ device, onChange }: { device: Buffer; onChange: (field: string, value: string | number | string[] | null) => void }) {
  return (
    <div className="property-group">
      <div className="property-row">
        <span className="property-label">最大容量</span>
        <input
          type="number"
          className="property-input"
          value={device.max_capacity || ''}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onChange('max_capacity', isNaN(val) ? null : val);
          }}
          min="1"
        />
        <span style={{ marginLeft: '4px', fontSize: '12px' }}>件</span>
      </div>
    </div>
  );
}

function FeedSettingsTab({ device, onChange }: { device: StartNode; onChange: (field: string, value: string | number | string[]) => void }) {
  return (
    <div className="property-group">
      <div className="property-row">
        <span className="property-label">投料模式</span>
        <select
          className="property-select"
          value={device.feed_mode}
          onChange={(e) => onChange('feed_mode', e.target.value)}
        >
          <option value="idle">下游空闲</option>
          <option value="paced">固定节拍</option>
        </select>
      </div>
      {device.feed_mode === 'paced' && (
        <div className="property-row">
          <span className="property-label">投料间隔</span>
          <TimeInputHms value={device.feed_interval_s} onChange={(v) => onChange('feed_interval_s', v || 0)} />
        </div>
      )}
    </div>
  );
}

function TargetOutputSettingsTab({ device, onChange }: { device: EndNode; onChange: (field: string, value: string | number | string[] | Record<string, Record<string, number>> | Record<string, ProductProcessTime> | Record<string, string[]> | Record<string, number> | null) => void }) {
  const canvas = useAppStore((state) => state.canvas);
  const simulation = useAppStore((state) => state.simulation);
  const isFixedOutputMode = simulation.simulation_mode === 'fixed_output';

  const reachableProducts = new Map<string, string>();
  let hasUpstreamProductConfig = false;

  const traceUpstreamProducts = (deviceId: string, visited: Set<string>) => {
    if (visited.has(deviceId)) return;
    visited.add(deviceId);

    const dev = canvas.devices[deviceId];
    if (!dev) return;

    if (dev.type === 'StartNode') {
      const sn = dev as StartNode;
      if (sn.product_code) {
        const product = canvas.products[sn.product_code];
        reachableProducts.set(sn.product_code, product?.name || sn.product_name || sn.product_code);
      }
    } else if (dev.type === 'Station') {
      const st = dev as Station;
      if (st.processable_products && st.processable_products.length > 0) {
        hasUpstreamProductConfig = true;
        for (const code of st.processable_products) {
          const product = canvas.products[code];
          reachableProducts.set(code, product?.name || code);
        }
      }
    } else if (dev.type === 'AssemblyStation') {
      const as_ = dev as AssemblyStation;
      if (as_.assembly_products && as_.assembly_products.length > 0) {
        hasUpstreamProductConfig = true;
        for (const code of as_.assembly_products) {
          const product = canvas.products[code];
          reachableProducts.set(code, product?.name || code);
        }
      }
      if (as_.components && as_.components.length > 0) {
        for (const code of as_.components) {
          const product = canvas.products[code];
          reachableProducts.set(code, product?.name || code);
        }
      }
    } else if (dev.type === 'DisassemblyStation') {
      const ds = dev as DisassemblyStation;
      if (ds.items_to_disassemble && ds.items_to_disassemble.length > 0) {
        hasUpstreamProductConfig = true;
        for (const code of ds.items_to_disassemble) {
          const product = canvas.products[code];
          reachableProducts.set(code, product?.name || code);
        }
      }
      if (ds.disassembly_products && ds.disassembly_products.length > 0) {
        for (const code of ds.disassembly_products) {
          const product = canvas.products[code];
          reachableProducts.set(code, product?.name || code);
        }
      }
    }

    const upstreamConns = Object.values(canvas.connections).filter(c => c.to_device_id === deviceId);
    for (const conn of upstreamConns) {
      traceUpstreamProducts(conn.from_device_id, visited);
    }
  };

  const incomingConnections = Object.values(canvas.connections).filter(c => c.to_device_id === device.id);
  for (const conn of incomingConnections) {
    traceUpstreamProducts(conn.from_device_id, new Set());
  }

  if (!hasUpstreamProductConfig) {
    for (const [code, product] of Object.entries(canvas.products)) {
      if (!reachableProducts.has(code)) {
        reachableProducts.set(code, product.name || code);
      }
    }
  }

  const targetOutputs = device.target_outputs || {};

  const toggleProduct = (productCode: string, checked: boolean) => {
    const newTargets = { ...targetOutputs };
    if (checked) {
      if (!newTargets[productCode]) {
        newTargets[productCode] = 1;
      }
    } else {
      delete newTargets[productCode];
    }
    onChange('target_outputs', newTargets);
  };

  const updateTargetOutput = (productCode: string, value: number) => {
    const newTargets = { ...targetOutputs };
    if (value > 0) {
      newTargets[productCode] = value;
    } else {
      newTargets[productCode] = 1;
    }
    onChange('target_outputs', newTargets);
  };

  if (!isFixedOutputMode) {
    return (
      <div className="property-group">
        <div style={{ fontSize: '12px', color: '#94A3B8', padding: '8px 0' }}>
          仅在固定产量模式下可设置目标产量
        </div>
      </div>
    );
  }

  if (reachableProducts.size === 0) {
    return (
      <div className="property-group">
        <div style={{ fontSize: '12px', color: '#94A3B8', padding: '8px 0' }}>
          未检测到上游产品，请先连接上游设备
        </div>
      </div>
    );
  }

  return (
    <div className="property-group">
      <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
        勾选产品并设置目标产量，达标后自动停止对应起点的投料
      </div>
      {Array.from(reachableProducts.entries()).map(([code, name]) => {
        const isChecked = code in targetOutputs;
        return (
          <div key={code}>
            <div className="property-row" style={{ marginBottom: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => toggleProduct(code, e.target.checked)}
                />
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: canvas.products[code]?.color || '#94A3B8',
                }} />
                <span style={{ fontSize: '13px' }}>{name}</span>
              </label>
            </div>
            {isChecked && (
              <div className="property-row" style={{ paddingLeft: '28px', marginBottom: '6px' }}>
                <span className="property-label">目标产量</span>
                <input
                  type="number"
                  className="property-input"
                  value={targetOutputs[code] || ''}
                  onChange={(e) => updateTargetOutput(code, e.target.value ? parseInt(e.target.value) : 0)}
                  min="1"
                  step="1"
                />
                <span style={{ marginLeft: '4px', fontSize: '12px' }}>件</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AssemblySettingsTab({ device, onChange }: { device: AssemblyStation; onChange: (field: string, value: string | number | string[] | Record<string, Record<string, number>> | Record<string, ProductProcessTime> | Record<string, string[]> | null) => void }) {
  const canvas = useAppStore((state) => state.canvas);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleProductExpand = (code: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const updateProductProcessTime = (productCode: string, config: ProductProcessTime | null) => {
    const newTimes = { ...device.product_process_times };
    if (config === null) {
      delete newTimes[productCode];
    } else {
      newTimes[productCode] = config;
    }
    onChange('product_process_times', newTimes);
  };

  const updateProductTools = (productCode: string, tools: Record<string, number>) => {
    const newTools = { ...device.product_tools };
    if (Object.keys(tools).length === 0) {
      delete newTools[productCode];
    } else {
      newTools[productCode] = tools;
    }
    onChange('product_tools', newTools);
  };

  const toggleTool = (productCode: string, toolCode: string) => {
    const currentTools = device.product_tools?.[productCode] || {};
    const newTools = { ...currentTools };
    if (newTools[toolCode] !== undefined) {
      delete newTools[toolCode];
    } else {
      newTools[toolCode] = 10;
    }
    updateProductTools(productCode, newTools);
  };

  const updateToolInstallTime = (productCode: string, toolCode: string, installTime: number) => {
    const currentTools = device.product_tools?.[productCode] || {};
    const newTools = { ...currentTools, [toolCode]: installTime };
    updateProductTools(productCode, newTools);
  };

  const updateUpstreamRequirements = (productCode: string, requirements: Record<string, number>) => {
    const newRequirements = { ...device.product_upstream_requirements };
    if (Object.keys(requirements).length === 0) {
      delete newRequirements[productCode];
    } else {
      newRequirements[productCode] = requirements;
    }
    onChange('product_upstream_requirements', newRequirements);
  };

  const updateUpstreamRequirement = (productCode: string, componentCode: string, quantity: number) => {
    const currentReqs = device.product_upstream_requirements?.[productCode] || {};
    const newReqs = { ...currentReqs, [componentCode]: quantity };
    updateUpstreamRequirements(productCode, newReqs);
  };

  const removeUpstreamRequirement = (productCode: string, componentCode: string) => {
    const currentReqs = device.product_upstream_requirements?.[productCode] || {};
    const newReqs = { ...currentReqs };
    delete newReqs[componentCode];
    updateUpstreamRequirements(productCode, newReqs);
  };

  const getComponentProducts = () => {
    const componentCodes = device.components || [];
    return componentCodes.map(code => {
      const product = canvas.products[code];
      return {
        code,
        name: product?.name || code,
        color: product?.color || '#888',
      };
    });
  };

  const renderTimeInputs = (config: ProductProcessTime, productCode: string) => {
    const updateField = (field: keyof ProductProcessTime, value: number | null) => {
      const newConfig = { ...config, [field]: value };
      updateProductProcessTime(productCode, newConfig);
    };

    const updateDistType = (distType: string) => {
      const newConfig: ProductProcessTime = {
        dist_type: distType as ProductProcessTime['dist_type'],
        avg_time_s: null,
        stddev_s: null,
        min_time_s: null,
        max_time_s: null,
        mode_time_s: null,
        uniform_min_s: null,
        uniform_max_s: null,
        exp_mean_s: null,
      };
      updateProductProcessTime(productCode, newConfig);
    };

    return (
      <>
        <div className="property-row" style={{ paddingLeft: '16px' }}>
          <span className="property-label">分布类型</span>
          <select
            className="property-select"
            value={config.dist_type}
            onChange={(e) => updateDistType(e.target.value)}
          >
            <option value="normal">正态分布</option>
            <option value="triangular">三角分布</option>
            <option value="uniform">均匀分布</option>
            <option value="exponential">指数分布</option>
          </select>
        </div>
        {config.dist_type === 'normal' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">平均时间</span>
              <TimeInputHms value={config.avg_time_s} onChange={(v) => updateField('avg_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">标准差</span>
              <TimeInputHms value={config.stddev_s} onChange={(v) => updateField('stddev_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'triangular' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最小时间</span>
              <TimeInputHms value={config.min_time_s} onChange={(v) => updateField('min_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">众数时间</span>
              <TimeInputHms value={config.mode_time_s} onChange={(v) => updateField('mode_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最大时间</span>
              <TimeInputHms value={config.max_time_s} onChange={(v) => updateField('max_time_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'uniform' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最小时间</span>
              <TimeInputHms value={config.uniform_min_s} onChange={(v) => updateField('uniform_min_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最大时间</span>
              <TimeInputHms value={config.uniform_max_s} onChange={(v) => updateField('uniform_max_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'exponential' && (
          <div className="property-row" style={{ paddingLeft: '16px' }}>
            <span className="property-label">平均时间</span>
            <TimeInputHms value={config.exp_mean_s} onChange={(v) => updateField('exp_mean_s', v)} />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="property-group">
      <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '12px' }}>
        默认装配时间
      </div>
      <div className="property-row">
        <span className="property-label">分布类型</span>
        <select
          className="property-select"
          value={device.dist_type}
          onChange={(e) => onChange('dist_type', e.target.value)}
        >
          <option value="normal">正态分布</option>
          <option value="triangular">三角分布</option>
          <option value="uniform">均匀分布</option>
          <option value="exponential">指数分布</option>
        </select>
      </div>
      {device.dist_type === 'normal' && (
        <>
          <div className="property-row">
            <span className="property-label">平均时间</span>
            <TimeInputHms value={device.avg_time_s} onChange={(v) => onChange('avg_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">标准差</span>
            <TimeInputHms value={device.stddev_s} onChange={(v) => onChange('stddev_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'triangular' && (
        <>
          <div className="property-row">
            <span className="property-label">最小时间</span>
            <TimeInputHms value={device.min_time_s} onChange={(v) => onChange('min_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">众数时间</span>
            <TimeInputHms value={device.mode_time_s} onChange={(v) => onChange('mode_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">最大时间</span>
            <TimeInputHms value={device.max_time_s} onChange={(v) => onChange('max_time_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'uniform' && (
        <>
          <div className="property-row">
            <span className="property-label">最小时间</span>
            <TimeInputHms value={device.uniform_min_s} onChange={(v) => onChange('uniform_min_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">最大时间</span>
            <TimeInputHms value={device.uniform_max_s} onChange={(v) => onChange('uniform_max_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'exponential' && (
        <div className="property-row">
          <span className="property-label">平均时间</span>
          <TimeInputHms value={device.exp_mean_s} onChange={(v) => onChange('exp_mean_s', v || 0)} />
        </div>
      )}

      {device.assembly_products && device.assembly_products.length > 0 && (
        <>
          <div style={{ marginTop: '16px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '12px' }}>
            装配成品设置
          </div>
          {device.assembly_products.map(code => {
            const product = canvas.products[code];
            const productName = product?.name || code;
            const hasCustomConfig = device.product_process_times && device.product_process_times[code];
            const isExpanded = expandedProducts.has(code);
            const componentProducts = getComponentProducts();
            const currentReqs = device.product_upstream_requirements?.[code] || {};
            const validComponentCodes = new Set(componentProducts.map(c => c.code));
            const invalidComponentCodes = Object.keys(currentReqs).filter(c => !validComponentCodes.has(c));
            if (invalidComponentCodes.length > 0) {
              const cleanedReqs = { ...currentReqs };
              for (const c of invalidComponentCodes) {
                delete cleanedReqs[c];
              }
              updateUpstreamRequirements(code, cleanedReqs);
            }
            
            return (
              <div key={code} style={{ marginBottom: '8px', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px',
                  }}
                  onClick={() => toggleProductExpand(code)}
                >
                  <span style={{ marginRight: '8px', fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '2px', 
                    background: product?.color || '#888',
                    marginRight: '8px',
                    border: '1px solid rgba(0,0,0,0.2)'
                  }} />
                  <span style={{ flex: 1, fontSize: '12px' }}>{productName}</span>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px', 
                    borderRadius: '3px',
                    background: hasCustomConfig ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: hasCustomConfig ? 'white' : 'var(--text-muted)'
                  }}>
                    {hasCustomConfig ? '自定义' : '默认'}
                  </span>
                </div>
                
                {isExpanded && (
                  <div style={{ padding: '8px 0' }}>
                    <div className="property-row" style={{ paddingLeft: '16px' }}>
                      <span className="property-label">时间设置</span>
                      <select
                        className="property-select"
                        value={hasCustomConfig ? 'custom' : 'default'}
                        onChange={(e) => {
                          if (e.target.value === 'default') {
                            updateProductProcessTime(code, null);
                          } else {
                            updateProductProcessTime(code, {
                              dist_type: device.dist_type,
                              avg_time_s: device.avg_time_s,
                              stddev_s: device.stddev_s,
                              min_time_s: device.min_time_s,
                              max_time_s: device.max_time_s,
                              mode_time_s: device.mode_time_s,
                              uniform_min_s: device.uniform_min_s,
                              uniform_max_s: device.uniform_max_s,
                              exp_mean_s: device.exp_mean_s,
                            });
                          }
                        }}
                      >
                        <option value="default">使用默认设置</option>
                        <option value="custom">自定义设置</option>
                      </select>
                    </div>
                    
                    {hasCustomConfig && renderTimeInputs(device.product_process_times[code], code)}
                    
                    <div style={{ marginTop: '12px', paddingLeft: '16px', paddingRight: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        装配工具
                      </div>
                      {Object.keys(canvas.tools).length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          暂无工具，请在"设置"菜单中添加工具
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Object.values(canvas.tools).map(tool => {
                            const currentTools = device.product_tools?.[code] || {};
                            const isSelected = currentTools[tool.code] !== undefined;
                            const installTime = currentTools[tool.code] || 10;
                            return (
                              <div
                                key={tool.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                                  background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTool(code, tool.code)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ flex: 1, fontSize: '12px' }}>{tool.name} ({tool.code})</span>
                                {isSelected && (
                                  <>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>安装时间:</span>
                                    <input
                                      type="number"
                                      value={installTime}
                                      onChange={(e) => updateToolInstallTime(code, tool.code, parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="1"
                                      style={{
                                        width: '60px',
                                        padding: '2px 4px',
                                        fontSize: '11px',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '3px',
                                      }}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>秒</span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '12px', paddingLeft: '16px', paddingRight: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        组件需求
                      </div>
                      {componentProducts.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          暂无组件，请先在"产品设置"中添加组件
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {componentProducts.map(comp => {
                            const currentReqs = device.product_upstream_requirements?.[code] || {};
                            const quantity = currentReqs[comp.code] || 0;
                            return (
                              <div
                                key={comp.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-light)',
                                  background: 'var(--bg-secondary)',
                                }}
                              >
                                <span style={{ 
                                  width: '12px', 
                                  height: '12px', 
                                  borderRadius: '2px', 
                                  background: comp.color,
                                  border: '1px solid rgba(0,0,0,0.2)'
                                }} />
                                <span style={{ flex: 1, fontSize: '12px' }}>{comp.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>需求数量:</span>
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    if (val > 0) {
                                      updateUpstreamRequirement(code, comp.code, val);
                                    } else {
                                      removeUpstreamRequirement(code, comp.code);
                                    }
                                  }}
                                  min="0"
                                  step="1"
                                  style={{
                                    width: '60px',
                                    padding: '2px 4px',
                                    fontSize: '11px',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '3px',
                                  }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>件</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function DisassemblySettingsTab({ device, onChange }: { device: DisassemblyStation; onChange: (field: string, value: string | number | string[] | Record<string, Record<string, number>> | Record<string, ProductProcessTime> | Record<string, string[]> | null) => void }) {
  const canvas = useAppStore((state) => state.canvas);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItemExpand = (code: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const updateProductProcessTime = (productCode: string, config: ProductProcessTime | null) => {
    const newTimes = { ...device.product_process_times };
    if (config === null) {
      delete newTimes[productCode];
    } else {
      newTimes[productCode] = config;
    }
    onChange('product_process_times', newTimes);
  };

  const updateProductTools = (productCode: string, tools: Record<string, number>) => {
    const newTools = { ...device.product_tools };
    if (Object.keys(tools).length === 0) {
      delete newTools[productCode];
    } else {
      newTools[productCode] = tools;
    }
    onChange('product_tools', newTools);
  };

  const toggleTool = (productCode: string, toolCode: string) => {
    const currentTools = device.product_tools?.[productCode] || {};
    const newTools = { ...currentTools };
    if (newTools[toolCode] !== undefined) {
      delete newTools[toolCode];
    } else {
      newTools[toolCode] = 10;
    }
    updateProductTools(productCode, newTools);
  };

  const updateToolInstallTime = (productCode: string, toolCode: string, installTime: number) => {
    const currentTools = device.product_tools?.[productCode] || {};
    const newTools = { ...currentTools, [toolCode]: installTime };
    updateProductTools(productCode, newTools);
  };

  const updateDisassemblyRequirements = (itemCode: string, requirements: Record<string, number>) => {
    const newRequirements = { ...device.product_disassembly_requirements };
    if (Object.keys(requirements).length === 0) {
      delete newRequirements[itemCode];
    } else {
      newRequirements[itemCode] = requirements;
    }
    onChange('product_disassembly_requirements', newRequirements);
  };

  const updateDisassemblyRequirement = (itemCode: string, productCode: string, quantity: number) => {
    const currentReqs = device.product_disassembly_requirements?.[itemCode] || {};
    const newReqs = { ...currentReqs, [productCode]: quantity };
    updateDisassemblyRequirements(itemCode, newReqs);
  };

  const removeDisassemblyRequirement = (itemCode: string, productCode: string) => {
    const currentReqs = device.product_disassembly_requirements?.[itemCode] || {};
    const newReqs = { ...currentReqs };
    delete newReqs[productCode];
    updateDisassemblyRequirements(itemCode, newReqs);
  };

  const getDisassemblyProductList = () => {
    const productCodes = device.disassembly_products || [];
    return productCodes.map(code => {
      const product = canvas.products[code];
      return {
        code,
        name: product?.name || code,
        color: product?.color || '#888',
      };
    });
  };

  const renderTimeInputs = (config: ProductProcessTime, productCode: string) => {
    const updateField = (field: keyof ProductProcessTime, value: number | null) => {
      const newConfig = { ...config, [field]: value };
      updateProductProcessTime(productCode, newConfig);
    };

    const updateDistType = (distType: string) => {
      const newConfig: ProductProcessTime = {
        dist_type: distType as ProductProcessTime['dist_type'],
        avg_time_s: null,
        stddev_s: null,
        min_time_s: null,
        max_time_s: null,
        mode_time_s: null,
        uniform_min_s: null,
        uniform_max_s: null,
        exp_mean_s: null,
      };
      updateProductProcessTime(productCode, newConfig);
    };

    return (
      <>
        <div className="property-row" style={{ paddingLeft: '16px' }}>
          <span className="property-label">分布类型</span>
          <select
            className="property-select"
            value={config.dist_type}
            onChange={(e) => updateDistType(e.target.value)}
          >
            <option value="normal">正态分布</option>
            <option value="triangular">三角分布</option>
            <option value="uniform">均匀分布</option>
            <option value="exponential">指数分布</option>
          </select>
        </div>
        {config.dist_type === 'normal' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">平均时间</span>
              <TimeInputHms value={config.avg_time_s} onChange={(v) => updateField('avg_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">标准差</span>
              <TimeInputHms value={config.stddev_s} onChange={(v) => updateField('stddev_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'triangular' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最小时间</span>
              <TimeInputHms value={config.min_time_s} onChange={(v) => updateField('min_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">众数时间</span>
              <TimeInputHms value={config.mode_time_s} onChange={(v) => updateField('mode_time_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最大时间</span>
              <TimeInputHms value={config.max_time_s} onChange={(v) => updateField('max_time_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'uniform' && (
          <>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最小时间</span>
              <TimeInputHms value={config.uniform_min_s} onChange={(v) => updateField('uniform_min_s', v)} />
            </div>
            <div className="property-row" style={{ paddingLeft: '16px' }}>
              <span className="property-label">最大时间</span>
              <TimeInputHms value={config.uniform_max_s} onChange={(v) => updateField('uniform_max_s', v)} />
            </div>
          </>
        )}
        {config.dist_type === 'exponential' && (
          <div className="property-row" style={{ paddingLeft: '16px' }}>
            <span className="property-label">平均时间</span>
            <TimeInputHms value={config.exp_mean_s} onChange={(v) => updateField('exp_mean_s', v)} />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="property-group">
      <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '12px' }}>
        默认拆解时间
      </div>
      <div className="property-row">
        <span className="property-label">分布类型</span>
        <select
          className="property-select"
          value={device.dist_type}
          onChange={(e) => onChange('dist_type', e.target.value)}
        >
          <option value="normal">正态分布</option>
          <option value="triangular">三角分布</option>
          <option value="uniform">均匀分布</option>
          <option value="exponential">指数分布</option>
        </select>
      </div>
      {device.dist_type === 'normal' && (
        <>
          <div className="property-row">
            <span className="property-label">平均时间</span>
            <TimeInputHms value={device.avg_time_s} onChange={(v) => onChange('avg_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">标准差</span>
            <TimeInputHms value={device.stddev_s} onChange={(v) => onChange('stddev_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'triangular' && (
        <>
          <div className="property-row">
            <span className="property-label">最小时间</span>
            <TimeInputHms value={device.min_time_s} onChange={(v) => onChange('min_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">众数时间</span>
            <TimeInputHms value={device.mode_time_s} onChange={(v) => onChange('mode_time_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">最大时间</span>
            <TimeInputHms value={device.max_time_s} onChange={(v) => onChange('max_time_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'uniform' && (
        <>
          <div className="property-row">
            <span className="property-label">最小时间</span>
            <TimeInputHms value={device.uniform_min_s} onChange={(v) => onChange('uniform_min_s', v || 0)} />
          </div>
          <div className="property-row">
            <span className="property-label">最大时间</span>
            <TimeInputHms value={device.uniform_max_s} onChange={(v) => onChange('uniform_max_s', v || 0)} />
          </div>
        </>
      )}
      {device.dist_type === 'exponential' && (
        <div className="property-row">
          <span className="property-label">平均时间</span>
          <TimeInputHms value={device.exp_mean_s} onChange={(v) => onChange('exp_mean_s', v || 0)} />
        </div>
      )}

      {device.items_to_disassemble && device.items_to_disassemble.length > 0 && (
        <>
          <div style={{ marginTop: '16px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '12px' }}>
            待拆解品设置
          </div>
          {device.items_to_disassemble.map(code => {
            const product = canvas.products[code];
            const productName = product?.name || code;
            const hasCustomConfig = device.product_process_times && device.product_process_times[code];
            const isExpanded = expandedItems.has(code);
            const disassemblyProductList = getDisassemblyProductList();
            const currentReqs = device.product_disassembly_requirements?.[code] || {};
            const validProductCodes = new Set(disassemblyProductList.map(p => p.code));
            const invalidProductCodes = Object.keys(currentReqs).filter(c => !validProductCodes.has(c));
            if (invalidProductCodes.length > 0) {
              const cleanedReqs = { ...currentReqs };
              for (const c of invalidProductCodes) {
                delete cleanedReqs[c];
              }
              updateDisassemblyRequirements(code, cleanedReqs);
            }
            
            return (
              <div key={code} style={{ marginBottom: '8px', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px',
                  }}
                  onClick={() => toggleItemExpand(code)}
                >
                  <span style={{ marginRight: '8px', fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '2px', 
                    background: product?.color || '#888',
                    marginRight: '8px',
                    border: '1px solid rgba(0,0,0,0.2)'
                  }} />
                  <span style={{ flex: 1, fontSize: '12px' }}>{productName}</span>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px', 
                    borderRadius: '3px',
                    background: hasCustomConfig ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: hasCustomConfig ? 'white' : 'var(--text-muted)'
                  }}>
                    {hasCustomConfig ? '自定义' : '默认'}
                  </span>
                </div>
                
                {isExpanded && (
                  <div style={{ padding: '8px 0' }}>
                    <div className="property-row" style={{ paddingLeft: '16px' }}>
                      <span className="property-label">时间设置</span>
                      <select
                        className="property-select"
                        value={hasCustomConfig ? 'custom' : 'default'}
                        onChange={(e) => {
                          if (e.target.value === 'default') {
                            updateProductProcessTime(code, null);
                          } else {
                            updateProductProcessTime(code, {
                              dist_type: device.dist_type,
                              avg_time_s: device.avg_time_s,
                              stddev_s: device.stddev_s,
                              min_time_s: device.min_time_s,
                              max_time_s: device.max_time_s,
                              mode_time_s: device.mode_time_s,
                              uniform_min_s: device.uniform_min_s,
                              uniform_max_s: device.uniform_max_s,
                              exp_mean_s: device.exp_mean_s,
                            });
                          }
                        }}
                      >
                        <option value="default">使用默认设置</option>
                        <option value="custom">自定义设置</option>
                      </select>
                    </div>
                    
                    {hasCustomConfig && renderTimeInputs(device.product_process_times[code], code)}
                    
                    <div style={{ marginTop: '12px', paddingLeft: '16px', paddingRight: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        拆解工具
                      </div>
                      {Object.keys(canvas.tools).length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          暂无工具，请在"设置"菜单中添加工具
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Object.values(canvas.tools).map(tool => {
                            const currentTools = device.product_tools?.[code] || {};
                            const isSelected = currentTools[tool.code] !== undefined;
                            const installTime = currentTools[tool.code] || 10;
                            return (
                              <div
                                key={tool.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                                  background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTool(code, tool.code)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ flex: 1, fontSize: '12px' }}>{tool.name} ({tool.code})</span>
                                {isSelected && (
                                  <>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>安装时间:</span>
                                    <input
                                      type="number"
                                      value={installTime}
                                      onChange={(e) => updateToolInstallTime(code, tool.code, parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="1"
                                      style={{
                                        width: '60px',
                                        padding: '2px 4px',
                                        fontSize: '11px',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '3px',
                                      }}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>秒</span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '12px', paddingLeft: '16px', paddingRight: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        拆解产物数量
                      </div>
                      {disassemblyProductList.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          暂无拆解产物，请先在"产品设置"中添加拆解产物
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {disassemblyProductList.map(dp => {
                            const currentReqs = device.product_disassembly_requirements?.[code] || {};
                            const quantity = currentReqs[dp.code] || 0;
                            return (
                              <div
                                key={dp.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-light)',
                                  background: 'var(--bg-secondary)',
                                }}
                              >
                                <span style={{ 
                                  width: '12px', 
                                  height: '12px', 
                                  borderRadius: '2px', 
                                  background: dp.color,
                                  border: '1px solid rgba(0,0,0,0.2)'
                                }} />
                                <span style={{ flex: 1, fontSize: '12px' }}>{dp.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>产出数量:</span>
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    if (val > 0) {
                                      updateDisassemblyRequirement(code, dp.code, val);
                                    } else {
                                      removeDisassemblyRequirement(code, dp.code);
                                    }
                                  }}
                                  min="0"
                                  step="1"
                                  style={{
                                    width: '60px',
                                    padding: '2px 4px',
                                    fontSize: '11px',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '3px',
                                  }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>份</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
