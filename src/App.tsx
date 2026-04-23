import { useEffect, useCallback } from 'react';
import { useAppStore } from './store';
import MenuBar from './components/MenuBar';
import Toolbox from './components/Toolbox';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import StatusBar from './components/StatusBar';
import SimControlPanel from './components/SimControlPanel';
import SimulationRecordsModal from './components/SimulationRecordsModal';

function App() {
  const loadCanvasState = useAppStore((state) => state.loadCanvasState);
  const showSimControlPanel = useAppStore((state) => state.showSimControlPanel);
  const showRecordsModal = useAppStore((state) => state.showRecordsModal);
  const recordsModalDeviceId = useAppStore((state) => state.recordsModalDeviceId);
  const recordsModalConnectionId = useAppStore((state) => state.recordsModalConnectionId);
  const closeRecordsModal = useAppStore((state) => state.closeRecordsModal);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const selectAllDevices = useAppStore((state) => state.selectAllDevices);
  const deselectAll = useAppStore((state) => state.deselectAll);
  const canUndo = useAppStore((state) => state.canUndo);
  const canRedo = useAppStore((state) => state.canRedo);
  const handleNewCanvas = useAppStore((state) => state.handleNewCanvas);
  const handleOpenLayout = useAppStore((state) => state.handleOpenLayout);
  const handleSaveLayout = useAppStore((state) => state.handleSaveLayout);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        selectAllDevices();
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleOpenLayout();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNewCanvas();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSaveLayout();
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      deselectAll();
    }
  }, [undo, redo, selectAllDevices, deselectAll, canUndo, canRedo, handleNewCanvas, handleOpenLayout, handleSaveLayout]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    loadCanvasState();
  }, [loadCanvasState]);

  return (
    <div className="app-container">
      <MenuBar />
      <div className="main-content">
        <Toolbox />
        <Canvas />
        <PropertiesPanel />
      </div>
      {showSimControlPanel && <SimControlPanel />}
      <StatusBar />
      {showRecordsModal && (
        <SimulationRecordsModal
          onClose={closeRecordsModal}
          deviceId={recordsModalDeviceId || undefined}
          connectionId={recordsModalConnectionId || undefined}
        />
      )}
    </div>
  );
}

export default App;
