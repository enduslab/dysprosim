import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { save } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import SettingsDialog from './SettingsDialog';
import ProductManager from './ProductManager';
import MaterialManager from './MaterialManager';
import ToolManager from './ToolManager';
import SimControlDialog from './SimControlDialog';
import AboutDialog from './AboutDialog';

interface MenuDropdownProps {
  title: string;
  items: { label: string; shortcut?: string; onClick?: () => void; divider?: boolean }[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function MenuDropdown({ title, items, isOpen, onToggle, onClose }: MenuDropdownProps) {
  return (
    <div className={`menu-item ${isOpen ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
      {title}
      {isOpen && (
        <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
          {items.filter(item => !item.divider).map((item, index) => (
            <div 
              key={index} 
              className="menu-dropdown-item" 
              onClick={() => {
                console.log(`Menu clicked: ${item.label}`);
                item.onClick?.();
                onClose();
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MenuBar() {
  const { 
    saveLayout, 
    canvas,
    selectedDeviceId,
    selectedDeviceIds,
    deleteDevice,
    updateDevice,
    selectedConnectionId,
    deleteConnection,
    showSimControlPanel,
    setShowSimControlPanel,
    currentFilePath,
    undo,
    redo,
    selectAllDevices,
    deselectAll,
    handleNewCanvas,
    handleOpenLayout,
    handleSaveLayout,
    openRecordsModal,
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showSimControl, setShowSimControl] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleSaveAs = async () => {
    try {
      const path = await save({
        defaultPath: currentFilePath || 'layout.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (path) {
        await saveLayout(path);
        console.log('Layout saved to:', path);
      }
    } catch (error) {
      console.error('Save as failed:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDeviceId) {
      await deleteDevice(selectedDeviceId);
    } else if (selectedConnectionId) {
      await deleteConnection(selectedConnectionId);
    }
  };

  const getSelectedDevices = () => {
    const devices: typeof canvas.devices[string][] = [];
    if (selectedDeviceIds.length > 1) {
      selectedDeviceIds.forEach(id => {
        if (canvas.devices[id]) {
          devices.push(canvas.devices[id]);
        }
      });
    } else if (selectedDeviceId && canvas.devices[selectedDeviceId]) {
      devices.push(canvas.devices[selectedDeviceId]);
    }
    return devices;
  };

  const handleAlignLeft = async () => {
    const devices = getSelectedDevices();
    if (devices.length < 2) {
      alert('请选择至少两个设备进行对齐');
      return;
    }
    const minX = Math.min(...devices.map(d => d.x_mm));
    for (const device of devices) {
      await updateDevice({ ...device, x_mm: minX });
    }
  };

  const handleAlignCenterH = async () => {
    const devices = getSelectedDevices();
    if (devices.length < 2) {
      alert('请选择至少两个设备进行对齐');
      return;
    }
    const centerX = devices.reduce((sum, d) => sum + d.x_mm, 0) / devices.length;
    for (const device of devices) {
      await updateDevice({ ...device, x_mm: centerX });
    }
  };

  const handleAlignRight = async () => {
    const devices = getSelectedDevices();
    if (devices.length < 2) {
      alert('请选择至少两个设备进行对齐');
      return;
    }
    const maxX = Math.max(...devices.map(d => d.x_mm));
    for (const device of devices) {
      await updateDevice({ ...device, x_mm: maxX });
    }
  };

  const handleAlignTop = async () => {
    const devices = getSelectedDevices();
    if (devices.length < 2) {
      alert('请选择至少两个设备进行对齐');
      return;
    }
    const minY = Math.min(...devices.map(d => d.y_mm));
    for (const device of devices) {
      await updateDevice({ ...device, y_mm: minY });
    }
  };

  const handleAlignCenterV = async () => {
    const devices = getSelectedDevices();
    if (devices.length < 2) {
      alert('请选择至少两个设备进行对齐');
      return;
    }
    const centerY = devices.reduce((sum, d) => sum + d.y_mm, 0) / devices.length;
    for (const device of devices) {
      await updateDevice({ ...device, y_mm: centerY });
    }
  };

  const handleAlignBottom = async () => {
    const devices = getSelectedDevices();
    if (devices.length < 2) {
      alert('请选择至少两个设备进行对齐');
      return;
    }
    const maxY = Math.max(...devices.map(d => d.y_mm));
    for (const device of devices) {
      await updateDevice({ ...device, y_mm: maxY });
    }
  };

  const handleShowAbout = () => {
    setShowAbout(true);
  };

  const handleOpenUserManual = async () => {
    try {
      await invoke('open_user_manual');
    } catch (error) {
      console.error('Failed to open user manual:', error);
    }
  };

  const handleToggleSimControlPanel = () => {
    setShowSimControlPanel(!showSimControlPanel);
  };

  const handleMenuToggle = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleMenuClose = () => {
    setOpenMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const appWindow = getCurrentWindow();
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();

    const unlisten = getCurrentWindow().onResized(async () => {
      const appWindow = getCurrentWindow();
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleMinimize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  };

  const handleClose = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  return (
    <>
      <div className="menu-bar" data-tauri-drag-region>
        <div className="menu-bar-brand" data-tauri-drag-region>
          <img 
            src="/icon.png" 
            alt="DysProSim" 
            className="menu-bar-logo"
          />
          <span className="menu-bar-title" data-tauri-drag-region>DysProSim</span>
        </div>
        <MenuDropdown
          title="文件"
          isOpen={openMenu === 'file'}
          onToggle={() => handleMenuToggle('file')}
          onClose={handleMenuClose}
          items={[
            { label: '新建布局', shortcut: 'Ctrl+N', onClick: handleNewCanvas },
            { label: '修改画布尺寸', onClick: handleNewCanvas },
            { label: '保存布局', shortcut: 'Ctrl+S', onClick: handleSaveLayout },
            { label: '另存为...', onClick: handleSaveAs },
            { label: '加载布局', shortcut: 'Ctrl+O', onClick: handleOpenLayout },
            { label: '退出', onClick: handleClose },
          ]}
        />
        <MenuDropdown
          title="编辑"
          isOpen={openMenu === 'edit'}
          onToggle={() => handleMenuToggle('edit')}
          onClose={handleMenuClose}
          items={[
            { label: '撤销', shortcut: 'Ctrl+Z', onClick: undo },
            { label: '重做', shortcut: 'Ctrl+Y', onClick: redo },
            { label: '全选', shortcut: 'Ctrl+A', onClick: selectAllDevices },
            { label: '取消选择', shortcut: 'Esc', onClick: deselectAll },
            { label: '左对齐', onClick: handleAlignLeft },
            { label: '水平居中', onClick: handleAlignCenterH },
            { label: '右对齐', onClick: handleAlignRight },
            { label: '顶对齐', onClick: handleAlignTop },
            { label: '垂直居中', onClick: handleAlignCenterV },
            { label: '底对齐', onClick: handleAlignBottom },
            { label: '删除选中', shortcut: 'Delete', onClick: handleDeleteSelected },
          ]}
        />
        <MenuDropdown
          title="设置"
          isOpen={openMenu === 'settings'}
          onToggle={() => handleMenuToggle('settings')}
          onClose={handleMenuClose}
          items={[
            { label: '设置...', onClick: () => setShowSettings(true) },
          ]}
        />
        <MenuDropdown
          title="产品"
          isOpen={openMenu === 'product'}
          onToggle={() => handleMenuToggle('product')}
          onClose={handleMenuClose}
          items={[
            { label: '产品管理...', onClick: () => setShowProducts(true) },
            { label: '原料管理...', onClick: () => setShowMaterials(true) },
            { label: '工具管理...', onClick: () => setShowTools(true) },
          ]}
        />
        <MenuDropdown
          title="模拟"
          isOpen={openMenu === 'simulation'}
          onToggle={() => handleMenuToggle('simulation')}
          onClose={handleMenuClose}
          items={[
            { label: showSimControlPanel ? '隐藏控制面板' : '显示控制面板', onClick: handleToggleSimControlPanel },
            { label: '模拟设置...', onClick: () => setShowSimControl(true) },
            { label: '模拟统计...', onClick: () => openRecordsModal() },
          ]}
        />
        <MenuDropdown
          title="帮助"
          isOpen={openMenu === 'help'}
          onToggle={() => handleMenuToggle('help')}
          onClose={handleMenuClose}
          items={[
            { label: '操作手册', onClick: handleOpenUserManual },
            { label: '关于', onClick: handleShowAbout },
          ]}
        />
        <div className="menu-bar-filepath" data-tauri-drag-region>
          {currentFilePath || '未打开文件'}
        </div>
        <div className="menu-bar-canvas-size" data-tauri-drag-region>
          画布: {canvas.width_mm} x {canvas.height_mm} mm
        </div>
        <div className="window-controls">
          <button className="window-control-btn minimize" onClick={handleMinimize} title="最小化">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="5.5" width="10" height="1" fill="currentColor"/>
            </svg>
          </button>
          <button className="window-control-btn maximize" onClick={handleMaximize} title={isMaximized ? '还原' : '最大化'}>
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="2" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1" fill="none"/>
                <polyline points="4,4 4,2 10,2 10,8 8,8" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
            )}
          </button>
          <button className="window-control-btn close" onClick={handleClose} title="关闭">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <ProductManager isOpen={showProducts} onClose={() => setShowProducts(false)} />
      <MaterialManager isOpen={showMaterials} onClose={() => setShowMaterials(false)} />
      <ToolManager isOpen={showTools} onClose={() => setShowTools(false)} />
      <SimControlDialog isOpen={showSimControl} onClose={() => setShowSimControl(false)} />
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
}
