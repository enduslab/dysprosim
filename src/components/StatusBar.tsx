import { useAppStore } from '../store';

export default function StatusBar() {
  const { canvas, zoom, simulation, selectedDeviceId, selectedConnectionId } = useAppStore();

  const selectedDevice = selectedDeviceId ? canvas.devices[selectedDeviceId] : null;
  const selectedConnection = selectedConnectionId ? canvas.connections[selectedConnectionId] : null;

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  return (
    <div className="status-bar">
      <span className="status-item">
        设备: {Object.keys(canvas.devices).length}
      </span>
      <span className="status-item">
        连接: {Object.keys(canvas.connections).length}
      </span>
      <span className="status-item">
        缩放: {Math.round(zoom * 100)}%
      </span>
      {selectedDevice && (
        <span className="status-item">
          选中: {selectedDevice.name || selectedDevice.id.substring(0, 8)}
        </span>
      )}
      {selectedConnection && (
        <span className="status-item">
          选中连接: {selectedConnection.name || `${selectedConnection.from_device_id.substring(0, 4)}→${selectedConnection.to_device_id.substring(0, 4)}`}
        </span>
      )}
      <span className="status-item right">
        {simulation.state === 'running' && (
          <>模拟中: {formatTime(simulation.elapsed_s)} | 完成: {simulation.completed_products}件</>
        )}
        {simulation.state === 'paused' && (
          <>已暂停: {formatTime(simulation.elapsed_s)}</>
        )}
        {simulation.state === 'completed' && (
          <>已完成: {formatTime(simulation.elapsed_s)} | 完成: {simulation.completed_products}件</>
        )}
        {simulation.state === 'idle' && (
          <>就绪</>
        )}
      </span>
    </div>
  );
}
