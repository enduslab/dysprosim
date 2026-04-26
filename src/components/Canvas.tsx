import { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store';
import type { Device, Connection, LineStyle } from '../types';
import { deviceToPx, pxToMm, calculateConnectionLengthMm, DEFAULT_PX_PER_MM, calculateElbowPath, calculateElbowOffsetFromDrag, calculateElbowIntermediatePoints, getDeviceCenterPx, getDeviceSizePx } from '../utils/connectionUtils';

const GEAR_ROTATION_SPEED = 2;
const DOT_MOVE_SPEED = 0.015;

interface AnchorPoint {
  deviceId: string;
  x: number;
  y: number;
  anchorIndex: number;
  position: 'top' | 'right' | 'bottom' | 'left' | 'center';
}

export default function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const {
    canvas,
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    selectedDeviceId,
    selectedDeviceIds,
    selectDevice,
    toggleDeviceSelection,
    selectedConnectionId,
    selectConnection,
    toolMode,
    deviceTypeToAdd,
    connectionLineStyle,
    addDevice,
    addConnection,
    updateDevice,
    updateConnection,
    deleteDevice,
    deleteConnection,
    simulation,
  } = useAppStore();

  const pxPerMm = canvas.settings.px_per_mm || DEFAULT_PX_PER_MM;

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ w: 0, h: 0 });
  const [connectionStartAnchor, setConnectionStartAnchor] = useState<AnchorPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDraggingDevice, setIsDraggingDevice] = useState(false);
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);
  const [dragDeviceOffset, setDragDeviceOffset] = useState({ x: 0, y: 0 });
  const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);
  const [intermediatePoints, setIntermediatePoints] = useState<[number, number][]>([]);
  const [isDraggingConnectionEnd, setIsDraggingConnectionEnd] = useState(false);
  const [draggingConnectionEnd, setDraggingConnectionEnd] = useState<'from' | 'to' | null>(null);
  const [draggingConnectionId, setDraggingConnectionId] = useState<string | null>(null);
  const [isDraggingControlPoint, setIsDraggingControlPoint] = useState(false);
  const [draggingControlPointConnId, setDraggingControlPointConnId] = useState<string | null>(null);
  const [draggingControlPointType, setDraggingControlPointType] = useState<'curve' | 'intermediate' | 'elbow-from' | 'elbow-to' | null>(null);
  const [draggingControlPointIndex, setDraggingControlPointIndex] = useState<number>(0);
  
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<{ x: number; y: number } | null>(null);
  const [multiDragStartPositions, setMultiDragStartPositions] = useState<Record<string, { x: number; y: number }>>({});
  
  const [animationFrame, setAnimationFrame] = useState(0);
  const [connectionDotPositions, setConnectionDotPositions] = useState<Record<string, number>>({});
  const [feedAnimationActive, setFeedAnimationActive] = useState<Record<string, boolean>>({});
  const [completeAnimationActive, setCompleteAnimationActive] = useState<Record<string, boolean>>({});

  const canvasWidthPx = deviceToPx(canvas.width_mm, zoom, pxPerMm);
  const canvasHeightPx = deviceToPx(canvas.height_mm, zoom, pxPerMm);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(zoom + delta);
  }, [zoom, setZoom]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (canvasEl) {
      canvasEl.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvasEl.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    if (simulation.state !== 'running') return;
    
    const animationLoop = setInterval(() => {
      setAnimationFrame(prev => prev + 1);
      
      setConnectionDotPositions(prev => {
        const newPositions: Record<string, number> = { ...prev };
        Object.keys(canvas.connections).forEach(connId => {
          const conn = canvas.connections[connId];
          const fromDevice = canvas.devices[conn.from_device_id];
          const toDevice = canvas.devices[conn.to_device_id];
          
          if (fromDevice?.type === 'StartNode') {
            if (feedAnimationActive[connId]) {
              const currentPos = prev[connId] || 0;
              const newPos = currentPos + DOT_MOVE_SPEED;
              if (newPos >= 1) {
                newPositions[connId] = 0;
              } else {
                newPositions[connId] = newPos;
              }
            } else {
              newPositions[connId] = prev[connId] || 0;
            }
          } else if (toDevice?.type === 'EndNode') {
            if (completeAnimationActive[connId]) {
              const currentPos = prev[connId] || 0;
              const newPos = currentPos + DOT_MOVE_SPEED;
              if (newPos >= 1) {
                newPositions[connId] = 0;
              } else {
                newPositions[connId] = newPos;
              }
            } else {
              newPositions[connId] = prev[connId] || 0;
            }
          } else {
            const currentPos = prev[connId] || 0;
            const isContinuous = conn.transport_mode === 'continuous';
            
            if (isContinuous) {
              const newPos = currentPos + DOT_MOVE_SPEED;
              newPositions[connId] = newPos >= 1 ? 0 : newPos;
            } else {
              const speed = DOT_MOVE_SPEED;
              const cycle = currentPos + speed;
              if (cycle >= 2) {
                newPositions[connId] = 0;
              } else {
                newPositions[connId] = cycle;
              }
            }
          }
        });
        return newPositions;
      });
    }, 50);
    
    return () => clearInterval(animationLoop);
  }, [simulation.state, canvas.connections, canvas.devices, feedAnimationActive, completeAnimationActive]);

  const prevCompletedRef = useRef(simulation.completed_products);
  useEffect(() => {
    if (simulation.state !== 'running') return;
    
    if (simulation.completed_products > prevCompletedRef.current) {
      Object.keys(canvas.connections).forEach(connId => {
        const conn = canvas.connections[connId];
        const toDevice = canvas.devices[conn.to_device_id];
        if (toDevice?.type === 'EndNode') {
          setCompleteAnimationActive(prev => ({ ...prev, [connId]: true }));
          setTimeout(() => {
            setCompleteAnimationActive(prev => ({ ...prev, [connId]: false }));
          }, 3000);
        }
      });
    }
    prevCompletedRef.current = simulation.completed_products;
  }, [simulation.completed_products, simulation.state, canvas.connections, canvas.devices]);

  useEffect(() => {
    if (simulation.state !== 'running') return;
    
    const checkFeedAnimation = () => {
      Object.keys(canvas.connections).forEach(connId => {
        const conn = canvas.connections[connId];
        const fromDevice = canvas.devices[conn.from_device_id];
        const connState = simulation.connections[connId];
        
        if (fromDevice?.type === 'StartNode' && connState) {
          if (connState.inflight > 0 || connState.queue > 0) {
            setFeedAnimationActive(prev => {
              if (prev[connId]) return prev;
              return { ...prev, [connId]: true };
            });
          }
        }
      });
    };
    
    checkFeedAnimation();
  }, [simulation.connections, simulation.state, canvas.connections, canvas.devices]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      console.log('键盘删除触发, selectedDeviceId:', selectedDeviceId, 'selectedConnectionId:', selectedConnectionId);
      if (selectedDeviceId) {
        console.log('调用 deleteDevice');
        deleteDevice(selectedDeviceId);
        selectDevice(null);
      } else if (selectedConnectionId) {
        console.log('调用 deleteConnection');
        deleteConnection(selectedConnectionId);
        selectConnection(null);
      }
    }
  }, [selectedDeviceId, selectedConnectionId, deleteDevice, deleteConnection, selectDevice, selectConnection]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getDeviceCenter = (device: Device): { x: number; y: number } => {
    return getDeviceCenterPx(device, zoom, pxPerMm, panOffset.x, panOffset.y);
  };

  const getDeviceAnchors = (device: Device): AnchorPoint[] => {
    const center = getDeviceCenter(device);
    const { w, h } = getDeviceSizePx(device, zoom, pxPerMm);

    return [
      { deviceId: device.id, x: center.x, y: center.y - h / 2, anchorIndex: 0, position: 'top' },
      { deviceId: device.id, x: center.x + w / 2, y: center.y, anchorIndex: 1, position: 'right' },
      { deviceId: device.id, x: center.x, y: center.y + h / 2, anchorIndex: 2, position: 'bottom' },
      { deviceId: device.id, x: center.x - w / 2, y: center.y, anchorIndex: 3, position: 'left' },
      { deviceId: device.id, x: center.x, y: center.y, anchorIndex: 4, position: 'center' },
    ];
  };

  const findNearestAnchor = (mouseX: number, mouseY: number, threshold: number = 20): AnchorPoint | null => {
    let nearest: AnchorPoint | null = null;
    let minDist = threshold;

    for (const device of Object.values(canvas.devices)) {
      const anchors = getDeviceAnchors(device as Device);
      for (const anchor of anchors) {
        const dist = Math.sqrt(Math.pow(anchor.x - mouseX, 2) + Math.pow(anchor.y - mouseY, 2));
        if (dist < minDist) {
          minDist = dist;
          nearest = anchor;
        }
      }
    }

    return nearest;
  };

  const getDeviceBbox = (device: Device): { x: number; y: number; w: number; h: number } => {
    let w = 0, h = 0;
    switch (device.shape_type) {
      case 'rect':
        w = device.params.width || 400;
        h = device.params.height || 300;
        break;
      case 'circle':
        const d = device.params.diameter || 300;
        w = d;
        h = d;
        break;
      case 'diamond':
        const side = device.params.side || 150;
        w = side;
        h = side;
        break;
      case 'tri':
        w = device.params.base || 400;
        h = device.params.height || 300;
        break;
      case 'trap':
        if (device.type === 'AssemblyStation') {
          w = device.params.height || 200;
          h = device.params.bottom_width || 500;
        } else {
          w = device.params.bottom || 300;
          h = device.params.height || 300;
        }
        break;
      case 'inverted_trap':
        if (device.type === 'DisassemblyStation') {
          w = device.params.height || 200;
          h = device.params.bottom_width || 500;
        } else {
          w = device.params.bottom || 300;
          h = device.params.height || 300;
        }
        break;
    }
    if (device.type === 'Workshop') {
      const workshop = device as import('../types').Workshop;
      w = workshop.width_mm;
      h = workshop.height_mm;
    }
    return { x: device.x_mm, y: device.y_mm, w, h };
  };

  const findWorkshopAtPosition = (x: number, y: number, deviceW: number, deviceH: number, excludeId?: string): string | null => {
    for (const device of Object.values(canvas.devices)) {
      if (device.type !== 'Workshop') continue;
      if (excludeId && device.id === excludeId) continue;
      
      const workshop = device as import('../types').Workshop;
      const workshopLeft = device.x_mm;
      const workshopTop = device.y_mm;
      const workshopRight = device.x_mm + workshop.width_mm;
      const workshopBottom = device.y_mm + workshop.height_mm;
      
      const deviceLeft = x;
      const deviceTop = y;
      const deviceRight = x + deviceW;
      const deviceBottom = y + deviceH;
      
      if (deviceLeft >= workshopLeft && deviceTop >= workshopTop && 
          deviceRight <= workshopRight && deviceBottom <= workshopBottom) {
        return device.id;
      }
    }
    return null;
  };

  const calculateWorkshopDistances = (
    deviceX: number, deviceY: number, deviceW: number, deviceH: number,
    workshopX: number, workshopY: number,
    workshopW: number, workshopH: number
  ): { top: number; bottom: number; left: number; right: number } => {
    return {
      top: deviceY - workshopY,
      bottom: (workshopY + workshopH) - (deviceY + deviceH),
      left: deviceX - workshopX,
      right: (workshopX + workshopW) - (deviceX + deviceW),
    };
  };

  const constrainToWorkshop = (
    newX: number, newY: number, deviceW: number, deviceH: number,
    workshopId: string
  ): { x: number; y: number } => {
    const workshop = canvas.devices[workshopId];
    if (!workshop || workshop.type !== 'Workshop') {
      return { x: newX, y: newY };
    }
    
    const ws = workshop as import('../types').Workshop;
    const minX = workshop.x_mm;
    const minY = workshop.y_mm;
    const maxX = workshop.x_mm + ws.width_mm - deviceW;
    const maxY = workshop.y_mm + ws.height_mm - deviceH;
    
    return {
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    };
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string, device: Device) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({ x: e.clientX, y: e.clientY });
    
    let w = 0, h = 0;
    if (device.type === 'Workshop') {
      const workshop = device as import('../types').Workshop;
      w = deviceToPx(workshop.width_mm, zoom, pxPerMm);
      h = deviceToPx(workshop.height_mm, zoom, pxPerMm);
    } else {
      switch (device.shape_type) {
        case 'rect':
          w = deviceToPx(device.params.width || 400, zoom, pxPerMm);
          h = deviceToPx(device.params.height || 300, zoom, pxPerMm);
          break;
        case 'circle':
          w = deviceToPx(device.params.diameter || 200, zoom, pxPerMm);
          h = w;
          break;
        case 'diamond':
          w = deviceToPx(device.params.side || 150, zoom, pxPerMm);
          h = w;
          break;
        case 'tri':
          w = deviceToPx(device.params.base || 400, zoom, pxPerMm);
          h = deviceToPx(device.params.height || 300, zoom, pxPerMm);
          break;
        case 'trap':
          if (device.type === 'AssemblyStation') {
            w = deviceToPx(device.params.height || 200, zoom, pxPerMm);
            h = deviceToPx(device.params.bottom_width || 500, zoom, pxPerMm);
          } else {
            w = deviceToPx(device.params.bottom || 210, zoom, pxPerMm);
            h = deviceToPx(device.params.height || 252, zoom, pxPerMm);
          }
          break;
        case 'inverted_trap':
          if (device.type === 'DisassemblyStation') {
            w = deviceToPx(device.params.height || 200, zoom, pxPerMm);
            h = deviceToPx(device.params.bottom_width || 500, zoom, pxPerMm);
          } else {
            w = deviceToPx(device.params.bottom || 210, zoom, pxPerMm);
            h = deviceToPx(device.params.height || 252, zoom, pxPerMm);
          }
          break;
      }
    }
    setResizeStartSize({ w, h });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const mouseX = e.clientX - (rect?.left || 0);
    const mouseY = e.clientY - (rect?.top || 0);
    
    if (e.button === 1 || (e.button === 0 && toolMode === 'pan')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (e.button === 0 && toolMode === 'device' && deviceTypeToAdd) {
      const target = e.target as SVGElement;
      const deviceElement = target.closest('[data-device-id]');
      if (deviceElement) {
        const deviceId = deviceElement.getAttribute('data-device-id');
        if (deviceId) {
          selectDevice(deviceId);
        }
      } else if (rect) {
        const x_mm = pxToMm(e.clientX - rect.left - panOffset.x, zoom, pxPerMm);
        const y_mm = pxToMm(e.clientY - rect.top - panOffset.y, zoom, pxPerMm);
        createDevice(deviceTypeToAdd, x_mm, y_mm);
      }
    } else if (e.button === 0 && toolMode === 'connection' && connectionLineStyle) {
      const nearestAnchor = findNearestAnchor(mouseX, mouseY);
      
      if (connectionLineStyle === 'free_polyline') {
        if (nearestAnchor) {
          if (!connectionStart) {
            setConnectionStart(nearestAnchor.deviceId);
            setConnectionStartAnchor(nearestAnchor);
            setIntermediatePoints([]);
          } else if (nearestAnchor.deviceId !== connectionStart) {
            createConnection(connectionStart, nearestAnchor.deviceId, connectionStartAnchor?.anchorIndex || 0, nearestAnchor.anchorIndex, intermediatePoints);
            setConnectionStart(null);
            setConnectionStartAnchor(null);
            setIntermediatePoints([]);
          }
        } else if (connectionStart) {
          setIntermediatePoints([...intermediatePoints, [mouseX, mouseY]]);
        } else {
          const target = e.target as SVGElement;
          const deviceElement = target.closest('[data-device-id]');
          if (deviceElement) {
            const deviceId = deviceElement.getAttribute('data-device-id');
            if (deviceId) {
              selectDevice(deviceId);
            }
          }
        }
      } else {
        if (nearestAnchor) {
          if (!connectionStart) {
            setConnectionStart(nearestAnchor.deviceId);
            setConnectionStartAnchor(nearestAnchor);
          } else if (nearestAnchor.deviceId !== connectionStart) {
            createConnection(connectionStart, nearestAnchor.deviceId, connectionStartAnchor?.anchorIndex || 0, nearestAnchor.anchorIndex);
            setConnectionStart(null);
            setConnectionStartAnchor(null);
          }
        } else {
          const target = e.target as SVGElement;
          const deviceElement = target.closest('[data-device-id]');
          if (deviceElement) {
            const deviceId = deviceElement.getAttribute('data-device-id');
            if (deviceId) {
              selectDevice(deviceId);
            }
          }
        }
      }
    } else if (e.button === 0) {
      const target = e.target as SVGElement;
      const deviceElement = target.closest('[data-device-id]');
      const connElement = target.closest('[data-connection-id]');
      const endpointElement = target.closest('.connection-endpoint');
      const controlPointElement = target.closest('.control-point');
      const deviceId = deviceElement?.getAttribute('data-device-id');
      const connId = connElement?.getAttribute('data-connection-id');
      const endpoint = endpointElement?.getAttribute('data-endpoint');
      const endpointConnId = endpointElement?.getAttribute('data-connection-id');
      const controlType = controlPointElement?.getAttribute('data-control-type');
      const controlConnId = controlPointElement?.getAttribute('data-connection-id');
      const controlIndex = controlPointElement?.getAttribute('data-control-index');
      
      if (controlType && controlConnId) {
        setIsDraggingControlPoint(true);
        setDraggingControlPointConnId(controlConnId);
        setDraggingControlPointType(controlType as 'curve' | 'intermediate' | 'elbow-from' | 'elbow-to');
        setDraggingControlPointIndex(controlIndex ? parseInt(controlIndex) : 0);
        selectConnection(controlConnId);
      } else if (endpoint && endpointConnId) {
        setIsDraggingConnectionEnd(true);
        setDraggingConnectionEnd(endpoint as 'from' | 'to');
        setDraggingConnectionId(endpointConnId);
        selectConnection(endpointConnId);
      } else if (deviceId) {
        if (e.ctrlKey || e.metaKey) {
          toggleDeviceSelection(deviceId);
        } else {
          if (!selectedDeviceIds.includes(deviceId)) {
            selectDevice(deviceId);
          }
        }
        const device = canvas.devices[deviceId];
        if (device) {
          setIsDraggingDevice(true);
          setDraggingDeviceId(deviceId);
          const deviceX = deviceToPx(device.x_mm, zoom, pxPerMm) + panOffset.x;
          const deviceY = deviceToPx(device.y_mm, zoom, pxPerMm) + panOffset.y;
          setDragDeviceOffset({ x: mouseX - deviceX, y: mouseY - deviceY });
          
          const currentSelectedIds = selectedDeviceIds.includes(deviceId) ? selectedDeviceIds : [deviceId];
          const startPositions: Record<string, { x: number; y: number }> = {};
          currentSelectedIds.forEach(id => {
            const d = canvas.devices[id];
            if (d) {
              startPositions[id] = { x: d.x_mm, y: d.y_mm };
            }
          });
          setMultiDragStartPositions(startPositions);
        }
      } else if (connId) {
        selectConnection(connId);
      } else {
        if (!e.ctrlKey && !e.metaKey) {
          selectDevice(null);
          selectConnection(null);
        }
        if (toolMode === 'select') {
          setIsSelecting(true);
          setSelectionBoxStart({ x: mouseX, y: mouseY });
          setSelectionBoxEnd({ x: mouseX, y: mouseY });
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const mouseX = e.clientX - (rect?.left || 0);
    const mouseY = e.clientY - (rect?.top || 0);
    setMousePos({ x: mouseX, y: mouseY });

    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (isResizing && resizeHandle && selectedDeviceId) {
      const device = canvas.devices[selectedDeviceId];
      if (device) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        
        let newW = resizeStartSize.w;
        let newH = resizeStartSize.h;
        
        switch (resizeHandle) {
          case 'nw':
            newW = Math.max(20, resizeStartSize.w - dx);
            newH = Math.max(20, resizeStartSize.h - dy);
            break;
          case 'n':
            newH = Math.max(20, resizeStartSize.h - dy);
            break;
          case 'ne':
            newW = Math.max(20, resizeStartSize.w + dx);
            newH = Math.max(20, resizeStartSize.h - dy);
            break;
          case 'e':
            newW = Math.max(20, resizeStartSize.w + dx);
            break;
          case 'se':
            newW = Math.max(20, resizeStartSize.w + dx);
            newH = Math.max(20, resizeStartSize.h + dy);
            break;
          case 's':
            newH = Math.max(20, resizeStartSize.h + dy);
            break;
          case 'sw':
            newW = Math.max(20, resizeStartSize.w - dx);
            newH = Math.max(20, resizeStartSize.h + dy);
            break;
          case 'w':
            newW = Math.max(20, resizeStartSize.w - dx);
            break;
        }
        
        const newW_mm = pxToMm(newW, zoom, pxPerMm);
        const newH_mm = pxToMm(newH, zoom, pxPerMm);
        
        if (device.type === 'Workshop') {
          updateDevice({
            ...device,
            width_mm: newW_mm,
            height_mm: newH_mm,
            params: { ...device.params, width: newW_mm, height: newH_mm },
          } as Device);
        } else {
          let updatedParams = { ...device.params };
          switch (device.shape_type) {
            case 'rect':
              updatedParams = { ...updatedParams, width: newW_mm, height: newH_mm };
              break;
            case 'circle':
              updatedParams = { ...updatedParams, diameter: newW_mm };
              break;
            case 'diamond':
              updatedParams = { ...updatedParams, side: newW_mm };
              break;
            case 'tri':
              updatedParams = { ...updatedParams, base: newW_mm, height: newH_mm };
              break;
            case 'trap':
              if (device.type === 'AssemblyStation') {
                const topWidth = device.params.top_width || 300;
                const bottomWidth = device.params.bottom_width || 500;
                const ratio = topWidth / bottomWidth;
                updatedParams = { 
                  ...updatedParams, 
                  height: newW_mm, 
                  bottom_width: newH_mm,
                  top_width: newH_mm * ratio,
                };
              } else {
                updatedParams = { ...updatedParams, bottom: newW_mm, height: newH_mm };
              }
              break;
            case 'inverted_trap':
              if (device.type === 'DisassemblyStation') {
                const topWidth = device.params.top_width || 300;
                const bottomWidth = device.params.bottom_width || 500;
                const ratio = topWidth / bottomWidth;
                updatedParams = { 
                  ...updatedParams, 
                  height: newW_mm, 
                  bottom_width: newH_mm,
                  top_width: newH_mm * ratio,
                };
              } else {
                updatedParams = { ...updatedParams, bottom: newW_mm, height: newH_mm };
              }
              break;
          }
          
          updateDevice({
            ...device,
            params: updatedParams,
          } as Device);
        }
      }
    } else if (isDraggingDevice && draggingDeviceId) {
      const newX_mm = pxToMm(mouseX - dragDeviceOffset.x - panOffset.x, zoom, pxPerMm);
      const newY_mm = pxToMm(mouseY - dragDeviceOffset.y - panOffset.y, zoom, pxPerMm);
      const device = canvas.devices[draggingDeviceId];
      if (device) {
        const dx_mm = newX_mm - multiDragStartPositions[draggingDeviceId]?.x;
        const dy_mm = newY_mm - multiDragStartPositions[draggingDeviceId]?.y;
        
        const idsToMove = selectedDeviceIds.length > 0 && selectedDeviceIds.includes(draggingDeviceId) 
          ? selectedDeviceIds 
          : [draggingDeviceId];
        
        idsToMove.forEach(id => {
          const d = canvas.devices[id];
          if (d && multiDragStartPositions[id]) {
            let finalX = multiDragStartPositions[id].x + dx_mm;
            let finalY = multiDragStartPositions[id].y + dy_mm;
            
            finalX = Math.max(0, Math.min(canvas.width_mm, finalX));
            finalY = Math.max(0, Math.min(canvas.height_mm, finalY));
            
            if (d.type !== 'StartNode' && d.type !== 'EndNode' && d.type !== 'Workshop') {
              const bbox = getDeviceBbox(d);
              
              if (d.workshop_id) {
                const constrained = constrainToWorkshop(finalX, finalY, bbox.w, bbox.h, d.workshop_id);
                finalX = constrained.x;
                finalY = constrained.y;
              }
            }
            
            updateDevice({
              ...d,
              x_mm: finalX,
              y_mm: finalY,
            });
          }
        });
      }
    } else if (isSelecting && selectionBoxStart) {
      setSelectionBoxEnd({ x: mouseX, y: mouseY });
    } else if (isDraggingConnectionEnd && draggingConnectionId) {
      const conn = canvas.connections[draggingConnectionId];
      if (conn) {
        const nearestAnchor = findNearestAnchor(mouseX, mouseY);
        if (nearestAnchor) {
          let updatedConn: Connection;
          if (draggingConnectionEnd === 'from') {
            updatedConn = {
              ...conn,
              from_device_id: nearestAnchor.deviceId,
              from_anchor_index: nearestAnchor.anchorIndex,
            };
          } else {
            updatedConn = {
              ...conn,
              to_device_id: nearestAnchor.deviceId,
              to_anchor_index: nearestAnchor.anchorIndex,
            };
          }
          const fromDevice = canvas.devices[updatedConn.from_device_id];
          const toDevice = canvas.devices[updatedConn.to_device_id];
          if (fromDevice && toDevice) {
            let intermediatePts = updatedConn.intermediate_points || [];
            if (updatedConn.line_style === 'elbow') {
              const fromAnchors = getDeviceAnchors(fromDevice as Device);
              const toAnchors = getDeviceAnchors(toDevice as Device);
              const fromAnchorPt = fromAnchors[updatedConn.from_anchor_index] || fromAnchors[0];
              const toAnchorPt = toAnchors[updatedConn.to_anchor_index] || toAnchors[0];
              intermediatePts = calculateElbowIntermediatePoints(
                fromAnchorPt, toAnchorPt,
                updatedConn.from_anchor_index, updatedConn.to_anchor_index,
                updatedConn.elbow_offset
              );
            }
            updatedConn.length_mm = calculateConnectionLengthMm(
              fromDevice as Device,
              toDevice as Device,
              updatedConn.from_anchor_index,
              updatedConn.to_anchor_index,
              intermediatePts,
              zoom,
              pxPerMm
            );
          }
          updateConnection(updatedConn);
        }
      }
    } else if (isDraggingControlPoint && draggingControlPointConnId) {
      const conn = canvas.connections[draggingControlPointConnId];
      if (conn) {
        if (draggingControlPointType === 'curve') {
          updateConnection({
            ...conn,
            curve_control_x: mouseX,
            curve_control_y: mouseY,
          });
        } else if (draggingControlPointType === 'intermediate') {
          if (conn.line_style === 'free_polyline') {
            const newPoints = [...(conn.intermediate_points || [])];
            newPoints[draggingControlPointIndex] = [mouseX, mouseY];
            const fromDevice = canvas.devices[conn.from_device_id];
            const toDevice = canvas.devices[conn.to_device_id];
            let lengthMm = conn.length_mm;
            if (fromDevice && toDevice) {
              lengthMm = calculateConnectionLengthMm(
                fromDevice as Device,
                toDevice as Device,
                conn.from_anchor_index,
                conn.to_anchor_index,
                newPoints,
                zoom,
                pxPerMm
              );
            }
            updateConnection({
              ...conn,
              intermediate_points: newPoints,
              length_mm: lengthMm,
            });
          }
        } else if (draggingControlPointType === 'elbow-from' || draggingControlPointType === 'elbow-to') {
          const fromDevice = canvas.devices[conn.from_device_id];
          const toDevice = canvas.devices[conn.to_device_id];
          if (fromDevice && toDevice) {
            const fromAnchors = getDeviceAnchors(fromDevice as Device);
            const toAnchors = getDeviceAnchors(toDevice as Device);
            const fromAnchor = fromAnchors[conn.from_anchor_index] || fromAnchors[0];
            const toAnchor = toAnchors[conn.to_anchor_index] || toAnchors[0];
            
            const newOffset = calculateElbowOffsetFromDrag(
              fromAnchor, toAnchor,
              conn.from_anchor_index, conn.to_anchor_index,
              draggingControlPointType === 'elbow-from' ? 'from' : 'to',
              mouseX, mouseY
            );
            
            const clampedOffset = Math.max(10, newOffset);
            
            const intermediatePoints = calculateElbowIntermediatePoints(
              fromAnchor, toAnchor,
              conn.from_anchor_index, conn.to_anchor_index,
              clampedOffset
            );
            
            const lengthMm = calculateConnectionLengthMm(
              fromDevice as Device,
              toDevice as Device,
              conn.from_anchor_index,
              conn.to_anchor_index,
              intermediatePoints,
              zoom,
              pxPerMm
            );
            
            updateConnection({
              ...conn,
              elbow_offset: clampedOffset,
              length_mm: lengthMm,
            });
          }
        }
      }
    } else if (toolMode === 'connection') {
      const nearestAnchor = findNearestAnchor(mouseX, mouseY);
      setHoveredDeviceId(nearestAnchor?.deviceId || null);
    } else if (toolMode === 'device') {
      const target = e.target as SVGElement;
      const deviceElement = target.closest('[data-device-id]');
      setHoveredDeviceId(deviceElement?.getAttribute('data-device-id') || null);
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionBoxStart && selectionBoxEnd) {
      const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
      const maxX = Math.max(selectionBoxStart.x, selectionBoxEnd.x);
      const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
      const maxY = Math.max(selectionBoxStart.y, selectionBoxEnd.y);
      
      const selectedIds: string[] = [];
      
      Object.values(canvas.devices).forEach(device => {
        const x = deviceToPx(device.x_mm, zoom, pxPerMm) + panOffset.x;
        const y = deviceToPx(device.y_mm, zoom, pxPerMm) + panOffset.y;
        const bbox = getDeviceBbox(device);
        const w = deviceToPx(bbox.w, zoom, pxPerMm);
        const h = deviceToPx(bbox.h, zoom, pxPerMm);
        
        if (x >= minX && x + w <= maxX && y >= minY && y + h <= maxY) {
          selectedIds.push(device.id);
        }
      });
      
      if (selectedIds.length > 0) {
        useAppStore.getState().setMultiSelectedDevices(selectedIds);
      }
    }
    
    if (isDraggingDevice && draggingDeviceId) {
      const idsToProcess = selectedDeviceIds.length > 0 && selectedDeviceIds.includes(draggingDeviceId) 
        ? selectedDeviceIds 
        : [draggingDeviceId];
      
      idsToProcess.forEach(id => {
        const device = canvas.devices[id];
        if (device) {
          if (device.type === 'Workshop') {
            const startPos = multiDragStartPositions[id];
            if (startPos) {
              const dx = device.x_mm - startPos.x;
              const dy = device.y_mm - startPos.y;
              
              Object.values(canvas.devices).forEach(d => {
                if (d.workshop_id === device.id) {
                  const bbox = getDeviceBbox(d);
                  const newX = d.x_mm + dx;
                  const newY = d.y_mm + dy;
                  const ws = device as import('../types').Workshop;
                  const distances = calculateWorkshopDistances(
                    newX, newY, bbox.w, bbox.h,
                    device.x_mm, device.y_mm,
                    ws.width_mm, ws.height_mm
                  );
                  updateDevice({
                    ...d,
                    x_mm: newX,
                    y_mm: newY,
                    workshop_top: distances.top,
                    workshop_bottom: distances.bottom,
                    workshop_left: distances.left,
                    workshop_right: distances.right,
                  });
                }
              });
            }
          } else if (device.type !== 'StartNode' && device.type !== 'EndNode') {
            const bbox = getDeviceBbox(device);
            const workshopId = findWorkshopAtPosition(device.x_mm, device.y_mm, bbox.w, bbox.h, device.id);
            
            if (workshopId) {
              const workshop = canvas.devices[workshopId];
              if (workshop) {
                const ws = workshop as import('../types').Workshop;
                const distances = calculateWorkshopDistances(
                  device.x_mm, device.y_mm, bbox.w, bbox.h,
                  workshop.x_mm, workshop.y_mm,
                  ws.width_mm, ws.height_mm
                );
                updateDevice({
                  ...device,
                  workshop_id: workshopId,
                  workshop_top: distances.top,
                  workshop_bottom: distances.bottom,
                  workshop_left: distances.left,
                  workshop_right: distances.right,
                });
              }
            } else if (device.workshop_id) {
              updateDevice({
                ...device,
                workshop_id: undefined,
                workshop_top: undefined,
                workshop_bottom: undefined,
                workshop_left: undefined,
                workshop_right: undefined,
              });
            }
          }
        }
      });
    }
    
    if (isDraggingDevice && draggingDeviceId) {
      const idsToProcess = selectedDeviceIds.length > 0 && selectedDeviceIds.includes(draggingDeviceId) 
        ? selectedDeviceIds 
        : [draggingDeviceId];
      
      for (const id of idsToProcess) {
        const relatedConns = Object.values(canvas.connections).filter(
          c => c.from_device_id === id || c.to_device_id === id
        );
        for (const conn of relatedConns) {
          const fromDevice = canvas.devices[conn.from_device_id];
          const toDevice = canvas.devices[conn.to_device_id];
          if (fromDevice && toDevice) {
            let intermediatePts = conn.intermediate_points || [];
            if (conn.line_style === 'elbow') {
              const fromAnchors = getDeviceAnchors(fromDevice as Device);
              const toAnchors = getDeviceAnchors(toDevice as Device);
              const fromAnchorPt = fromAnchors[conn.from_anchor_index] || fromAnchors[0];
              const toAnchorPt = toAnchors[conn.to_anchor_index] || toAnchors[0];
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
              updateConnection({
                ...conn,
                length_mm: newLengthMm,
              });
            }
          }
        }
      }
    }
    
    setIsPanning(false);
    setIsDraggingDevice(false);
    setDraggingDeviceId(null);
    setIsResizing(false);
    setResizeHandle(null);
    setIsDraggingConnectionEnd(false);
    setDraggingConnectionEnd(null);
    setDraggingConnectionId(null);
    setIsDraggingControlPoint(false);
    setDraggingControlPointConnId(null);
    setDraggingControlPointType(null);
    setIsSelecting(false);
    setSelectionBoxStart(null);
    setSelectionBoxEnd(null);
    setMultiDragStartPositions({});
  };

  const createDevice = async (type: string, x_mm: number, y_mm: number) => {
    let device: Device;
    const id = crypto.randomUUID();

    switch (type) {
      case 'start':
        device = {
          id,
          type: 'StartNode',
          shape_type: 'circle',
          x_mm,
          y_mm,
          params: { diameter: 255, rotation_deg: 0 },
          fill: '#E8F5E9',
          outline: '#66BB6A',
          equip_id: '',
          name: `起点`,
          desc: '',
          tag: '',
          product_code: '',
          product_name: '',
          product_color: '',
          feed_mode: 'idle',
          feed_interval_s: 1,
          feed_status: '投料中',
        };
        break;
      case 'end':
        device = {
          id,
          type: 'EndNode',
          shape_type: 'diamond',
          x_mm,
          y_mm,
          params: { side: 320, rotation_deg: 0 },
          fill: '#F3E5F5',
          outline: '#AB47BC',
          equip_id: '',
          name: `终点`,
          desc: '',
          tag: '',
        };
        break;
      case 'rect':
        device = {
          id,
          type: 'Station',
          shape_type: 'rect',
          x_mm,
          y_mm,
          params: { width: 400, height: 300, rotation_deg: 0 },
          fill: '#FFFFFF',
          outline: '#D1D9E0',
          equip_id: '',
          name: `设备`,
          desc: '',
          tag: '',
          product_code: '',
          product_name: '',
          product_color: '',
          processable_products: [],
          incoming_rule: 'immediate',
          dist_type: 'normal',
          avg_time_s: 1,
          stddev_s: null,
          min_time_s: null,
          max_time_s: null,
          mode_time_s: null,
          uniform_min_s: null,
          uniform_max_s: null,
          exp_mean_s: null,
          required_materials: {},
          product_materials: {},
          product_process_times: {},
          product_tools: {},
        };
        break;
      case 'circle':
        device = {
          id,
          type: 'Station',
          shape_type: 'circle',
          x_mm,
          y_mm,
          params: { diameter: 300, rotation_deg: 0 },
          fill: '#FFFFFF',
          outline: '#D1D9E0',
          equip_id: '',
          name: `设备`,
          desc: '',
          tag: '',
          product_code: '',
          product_name: '',
          product_color: '',
          processable_products: [],
          incoming_rule: 'immediate',
          dist_type: 'normal',
          avg_time_s: 1,
          stddev_s: null,
          min_time_s: null,
          max_time_s: null,
          mode_time_s: null,
          uniform_min_s: null,
          uniform_max_s: null,
          exp_mean_s: null,
          required_materials: {},
          product_materials: {},
          product_process_times: {},
          product_tools: {},
        };
        break;
      case 'warehouse':
        device = {
          id,
          type: 'Warehouse',
          shape_type: 'trap',
          x_mm,
          y_mm,
          params: { top: 168, bottom: 210, height: 252, rotation_deg: 0 },
          fill: '#FFFFFF',
          outline: '#D1D9E0',
          equip_id: '',
          name: `仓库`,
          desc: '',
          tag: '',
          product_code: '',
          product_name: '',
          product_color: '',
          wh_capacity: 0,
        };
        break;
      case 'temp_store':
        device = {
          id,
          type: 'TempStore',
          shape_type: 'tri',
          x_mm,
          y_mm,
          params: { base: 400, height: 300, rotation_deg: 0 },
          fill: '#FFFFFF',
          outline: '#D1D9E0',
          equip_id: '',
          name: `临时堆场`,
          desc: '',
          tag: '',
          product_code: '',
          product_name: '',
          product_color: '',
        };
        break;
      case 'buffer':
        device = {
          id,
          type: 'Buffer',
          shape_type: 'rect',
          x_mm,
          y_mm,
          params: { width: 400, height: 200, rotation_deg: 0 },
          fill: '#FFFFFF',
          outline: '#D1D9E0',
          equip_id: '',
          name: `缓冲区`,
          desc: '',
          tag: '',
          product_code: '',
          product_name: '',
          product_color: '',
          capacity_mode: 'fixed',
          max_capacity: null,
          buffer_duration_s: null,
          current_stock: 0,
          start_node_ids: '',
        };
        break;
      case 'workshop':
        device = {
          id,
          type: 'Workshop',
          shape_type: 'rect',
          x_mm,
          y_mm,
          params: { width: 2000, height: 1500, rotation_deg: 0 },
          fill: '#F8FAFC',
          outline: '#64748B',
          equip_id: '',
          name: `厂房`,
          desc: '',
          tag: '',
          width_mm: 2000,
          height_mm: 1500,
        };
        break;
      case 'assembly_station':
        device = {
          id,
          type: 'AssemblyStation',
          shape_type: 'trap',
          x_mm,
          y_mm,
          params: { top_width: 150, bottom_width: 210, height: 350, rotation_deg: 0 },
          fill: '#E8F5E9',
          outline: '#66BB6A',
          equip_id: '',
          name: `装配站`,
          desc: '',
          tag: '',
          processable_products: [],
          dist_type: 'normal',
          avg_time_s: 1,
          stddev_s: null,
          min_time_s: null,
          max_time_s: null,
          mode_time_s: null,
          uniform_min_s: null,
          uniform_max_s: null,
          exp_mean_s: null,
          product_process_times: {},
          product_tools: {},
          product_upstream_requirements: {},
        };
        break;
      case 'disassembly_station':
        device = {
          id,
          type: 'DisassemblyStation',
          shape_type: 'inverted_trap',
          x_mm,
          y_mm,
          params: { top_width: 150, bottom_width: 210, height: 350, rotation_deg: 0 },
          fill: '#FFF3E0',
          outline: '#FF9800',
          equip_id: '',
          name: `拆解站`,
          desc: '',
          tag: '',
          items_to_disassemble: [],
          disassembly_products: [],
          dist_type: 'normal',
          avg_time_s: 1,
          stddev_s: null,
          min_time_s: null,
          max_time_s: null,
          mode_time_s: null,
          uniform_min_s: null,
          uniform_max_s: null,
          exp_mean_s: null,
          product_process_times: {},
          product_tools: {},
          product_disassembly_requirements: {},
        };
        break;
      default:
        return;
    }

    try {
      await addDevice(device);
    } catch (err) {
      console.error('addDevice error:', err);
    }
  };

  const createConnection = async (fromId: string, toId: string, fromAnchor: number, toAnchor: number, intermediatePts?: [number, number][]) => {
    const fromDevice = canvas.devices[fromId];
    const toDevice = canvas.devices[toId];
    
    let lengthMm: number | null = null;
    if (fromDevice && toDevice) {
      lengthMm = calculateConnectionLengthMm(
        fromDevice as Device,
        toDevice as Device,
        fromAnchor,
        toAnchor,
        intermediatePts || [],
        zoom,
        pxPerMm
      );
    }

    const connection: Connection = {
      id: crypto.randomUUID(),
      from_device_id: fromId,
      from_anchor_index: fromAnchor,
      to_device_id: toId,
      to_anchor_index: toAnchor,
      name: '',
      length_mm: lengthMm,
      auto_chain: false,
      continuous_transport: true,
      is_end_link: false,
      transport_speed_mps: 1,
      transport_mode: 'continuous',
      max_transport_count: 1,
      unlimited_transport: true,
      cart_count: 1,
      cart_capacity: 1,
      line_style: (connectionLineStyle || 'straight') as LineStyle,
      curve_control_x: null,
      curve_control_y: null,
      intermediate_points: intermediatePts || [],
      elbow_offset: null,
    };

    await addConnection(connection);
  };

  const renderDevice = (device: Device) => {
    const x = deviceToPx(device.x_mm, zoom, pxPerMm) + panOffset.x;
    const y = deviceToPx(device.y_mm, zoom, pxPerMm) + panOffset.y;
    const isSelected = selectedDeviceId === device.id || selectedDeviceIds.includes(device.id);
    const showAnchors = toolMode === 'connection' && (hoveredDeviceId === device.id || connectionStart === device.id);

    let element: JSX.Element;
    let w = 0, h = 0;

    if (device.type === 'Workshop') {
      const workshop = device as import('../types').Workshop;
      w = deviceToPx(workshop.width_mm, zoom, pxPerMm);
      h = deviceToPx(workshop.height_mm, zoom, pxPerMm);
      const stripeWidth = 8;
      const stripeGap = 6;
      
      element = (
        <g data-device-id={device.id}>
          <rect
            width={w}
            height={h}
            fill={device.fill || '#FFFFFF'}
            style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
          />
          <line
            x1={0}
            y1={stripeWidth / 2}
            x2={w}
            y2={stripeWidth / 2}
            stroke={device.outline}
            strokeWidth={stripeWidth}
            strokeDasharray={`${stripeWidth} ${stripeGap}`}
            strokeLinecap="butt"
          />
          <line
            x1={w - stripeWidth / 2}
            y1={0}
            x2={w - stripeWidth / 2}
            y2={h}
            stroke={device.outline}
            strokeWidth={stripeWidth}
            strokeDasharray={`${stripeWidth} ${stripeGap}`}
            strokeLinecap="butt"
          />
          <line
            x1={0}
            y1={h - stripeWidth / 2}
            x2={w}
            y2={h - stripeWidth / 2}
            stroke={device.outline}
            strokeWidth={stripeWidth}
            strokeDasharray={`${stripeWidth} ${stripeGap}`}
            strokeLinecap="butt"
          />
          <line
            x1={stripeWidth / 2}
            y1={0}
            x2={stripeWidth / 2}
            y2={h}
            stroke={device.outline}
            strokeWidth={stripeWidth}
            strokeDasharray={`${stripeWidth} ${stripeGap}`}
            strokeLinecap="butt"
          />
          {isSelected && (
            <rect
              width={w}
              height={h}
              fill="none"
              stroke="#5B8DEF"
              strokeWidth={2.5}
            />
          )}
          {isSelected && toolMode === 'select' && !isResizing && (
            <>
              <rect
                x={-4}
                y={-4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke="#5B8DEF"
                strokeWidth={1.5}
                style={{ cursor: 'nwse-resize' }}
                onMouseDown={(e) => handleResizeStart(e, 'nw', device)}
              />
              <rect
                x={w / 2 - 4}
                y={-4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke="#5B8DEF"
                strokeWidth={1.5}
                style={{ cursor: 'ns-resize' }}
                onMouseDown={(e) => handleResizeStart(e, 'n', device)}
              />
              <rect
                x={w - 4}
                y={-4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke="#5B8DEF"
                strokeWidth={1.5}
                style={{ cursor: 'nesw-resize' }}
                onMouseDown={(e) => handleResizeStart(e, 'ne', device)}
              />
              <rect
                x={w - 4}
                y={h / 2 - 4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke="#5B8DEF"
                strokeWidth={1.5}
                style={{ cursor: 'ew-resize' }}
                onMouseDown={(e) => handleResizeStart(e, 'e', device)}
              />
              <rect
                x={w - 4}
                y={h - 4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke="#5B8DEF"
                strokeWidth={1.5}
                style={{ cursor: 'nwse-resize' }}
                onMouseDown={(e) => handleResizeStart(e, 'se', device)}
              />
              <rect
                x={w / 2 - 4}
                y={h - 4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke="#5B8DEF"
                strokeWidth={1.5}
                style={{ cursor: 'ns-resize' }}
                onMouseDown={(e) => handleResizeStart(e, 's', device)}
              />
              <rect
                x={-4}
                y={h - 4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke="#5B8DEF"
                strokeWidth={1.5}
                style={{ cursor: 'nesw-resize' }}
                onMouseDown={(e) => handleResizeStart(e, 'sw', device)}
              />
              <rect
                x={-4}
                y={h / 2 - 4}
                width={8}
                height={8}
                fill="#FFFFFF"
                stroke="#5B8DEF"
                strokeWidth={1.5}
                style={{ cursor: 'ew-resize' }}
                onMouseDown={(e) => handleResizeStart(e, 'w', device)}
              />
            </>
          )}
        </g>
      );
    } else {
    switch (device.shape_type) {
      case 'rect': {
        w = deviceToPx(device.params.width || 280, zoom, pxPerMm);
        h = deviceToPx(device.params.height || 210, zoom, pxPerMm);
        element = (
          <rect
            data-device-id={device.id}
            width={w}
            height={h}
            rx={12}
            fill={device.fill}
            stroke={isSelected ? '#5B8DEF' : device.outline}
            strokeWidth={isSelected ? 2.5 : 1.5}
            style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
            filter="url(#dropShadow)"
          />
        );
        break;
      }
      case 'circle': {
        const d = deviceToPx(device.params.diameter || 210, zoom, pxPerMm);
        const r = d / 2;
        w = d;
        h = d;
        
        if (device.type === 'StartNode') {
          const triangleSize = r * 0.6;
          element = (
            <g data-device-id={device.id} filter="url(#dropShadow)">
              <circle
                cx={r}
                cy={r}
                r={r}
                fill={device.fill}
                stroke={isSelected ? '#5B8DEF' : device.outline}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
              />
              <polygon
                points={`${r - triangleSize * 0.4},${r - triangleSize * 0.5} ${r - triangleSize * 0.4},${r + triangleSize * 0.5} ${r + triangleSize * 0.6},${r}`}
                fill={device.outline}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        } else {
          element = (
            <circle
              data-device-id={device.id}
              cx={r}
              cy={r}
              r={r}
              fill={device.fill}
              stroke={isSelected ? '#5B8DEF' : device.outline}
              strokeWidth={isSelected ? 2.5 : 1.5}
              style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
              filter="url(#dropShadow)"
            />
          );
        }
        break;
      }
      case 'diamond': {
        const side = deviceToPx(device.params.side || 105, zoom, pxPerMm);
        const half = side / 2;
        w = side;
        h = side;
        element = (
          <polygon
            data-device-id={device.id}
            points={`${half},0 ${side},${half} ${half},${side} 0,${half}`}
            fill={device.fill}
            stroke={isSelected ? '#5B8DEF' : device.outline}
            strokeWidth={isSelected ? 2.5 : 1.5}
            style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
            filter="url(#dropShadow)"
          />
        );
        break;
      }
      case 'tri': {
        const base = deviceToPx(device.params.base || 280, zoom, pxPerMm);
        h = deviceToPx(device.params.height || 210, zoom, pxPerMm);
        w = base;
        element = (
          <polygon
            data-device-id={device.id}
            points={`${base / 2},0 ${base},${h} 0,${h}`}
            fill={device.fill}
            stroke={isSelected ? '#5B8DEF' : device.outline}
            strokeWidth={isSelected ? 2.5 : 1.5}
            style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
            filter="url(#dropShadow)"
          />
        );
        break;
      }
      case 'trap': {
        if (device.type === 'AssemblyStation') {
          const leftWidth = deviceToPx(device.params.bottom_width || 500, zoom, pxPerMm);
          const rightWidth = deviceToPx(device.params.top_width || 300, zoom, pxPerMm);
          const trapHeight = deviceToPx(device.params.height || 200, zoom, pxPerMm);
          w = trapHeight;
          h = leftWidth;
          
          const topLeft = 0;
          const bottomLeft = leftWidth;
          const topRight = (leftWidth - rightWidth) / 2;
          const bottomRight = topRight + rightWidth;
          
          element = (
            <g data-device-id={device.id} filter="url(#dropShadow)">
              <polygon
                points={`${topLeft},0 ${trapHeight},${topRight} ${trapHeight},${bottomRight} ${topLeft},${bottomLeft}`}
                fill={device.fill}
                stroke={isSelected ? '#5B8DEF' : device.outline}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
              />
            </g>
          );
        } else {
          const baseWidth = deviceToPx(device.params.bottom || 210, zoom, pxPerMm);
          const totalHeight = deviceToPx(device.params.height || 252, zoom, pxPerMm);
          const roofHeight = totalHeight * 0.3;
          w = baseWidth;
          h = totalHeight;
          
          const leftX = 0;
          const rightX = baseWidth;
          const topY = 0;
          const roofBaseY = roofHeight;
          const bottomY = totalHeight;
          const centerX = baseWidth / 2;
          
          element = (
            <g data-device-id={device.id} filter="url(#dropShadow)">
              <polygon
                points={`${centerX},${topY} ${rightX},${roofBaseY} ${rightX},${bottomY} ${leftX},${bottomY} ${leftX},${roofBaseY}`}
                fill="#FFF7ED"
                stroke={isSelected ? '#5B8DEF' : device.outline}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
              />
            </g>
          );
        }
        break;
      }
      case 'inverted_trap': {
        if (device.type === 'DisassemblyStation') {
          const leftWidth = deviceToPx(device.params.bottom_width || 500, zoom, pxPerMm);
          const rightWidth = deviceToPx(device.params.top_width || 300, zoom, pxPerMm);
          const trapHeight = deviceToPx(device.params.height || 200, zoom, pxPerMm);
          w = trapHeight;
          h = leftWidth;
          
          const topLeft = 0;
          const bottomLeft = leftWidth;
          const topRight = (leftWidth - rightWidth) / 2;
          const bottomRight = topRight + rightWidth;
          
          element = (
            <g data-device-id={device.id} filter="url(#dropShadow)">
              <polygon
                points={`${trapHeight},${topLeft} ${topLeft},${topRight} ${topLeft},${bottomRight} ${trapHeight},${bottomLeft}`}
                fill={device.fill}
                stroke={isSelected ? '#5B8DEF' : device.outline}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
              />
            </g>
          );
        } else {
          const baseWidth = deviceToPx(device.params.bottom || 210, zoom, pxPerMm);
          const totalHeight = deviceToPx(device.params.height || 252, zoom, pxPerMm);
          const roofHeight = totalHeight * 0.3;
          w = baseWidth;
          h = totalHeight;
          
          const leftX = 0;
          const rightX = baseWidth;
          const topY = 0;
          const roofBaseY = roofHeight;
          const bottomY = totalHeight;
          const centerX = baseWidth / 2;
          
          element = (
            <g data-device-id={device.id} filter="url(#dropShadow)">
              <polygon
                points={`${centerX},${bottomY} ${leftX},${roofBaseY} ${leftX},${topY} ${rightX},${topY} ${rightX},${roofBaseY}`}
                fill="#FFF7ED"
                stroke={isSelected ? '#5B8DEF' : device.outline}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ cursor: toolMode === 'select' ? 'move' : 'pointer' }}
              />
            </g>
          );
        }
        break;
      }
      default:
        return null;
    }
    }

    const anchors = getDeviceAnchors(device);

    const simDeviceState = simulation.devices[device.id];
    const isSimRunning = simulation.state === 'running' || simulation.state === 'paused';
    
    const getProductColor = (productCode: string | null): string => {
      if (!productCode) return '#94A3B8';
      const product = canvas.products[productCode];
      return product?.color || '#94A3B8';
    };

    const renderWipIndicators = (
      count: number,
      startX: number,
      startY: number,
      color: string,
      maxVisible: number = 12
    ) => {
      if (count <= 0) return null;
      
      const blockSize = 6;
      const gap = 2;
      const perRow = 6;
      
      const visibleCount = Math.min(count, maxVisible);
      
      const elements: JSX.Element[] = [];
      
      for (let i = 0; i < visibleCount; i++) {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const x = startX + col * (blockSize + gap);
        const y = startY + row * (blockSize + gap);
        
        elements.push(
          <rect
            key={i}
            x={x}
            y={y}
            width={blockSize}
            height={blockSize}
            fill={color}
            stroke="#333333"
            strokeWidth={0.5}
            rx={1}
          />
        );
      }
      
      if (count > maxVisible) {
        const overflow = count - maxVisible;
        const lastRow = Math.floor((visibleCount - 1) / perRow);
        const textX = startX + perRow * (blockSize + gap) + 2;
        const textY = startY + lastRow * (blockSize + gap) + blockSize / 2;
        
        elements.push(
          <text
            key="overflow"
            x={textX}
            y={textY}
            fontSize="8"
            fontFamily="Microsoft YaHei, PingFang SC, sans-serif"
            fontWeight="600"
            fill="#333333"
            dominantBaseline="middle"
          >
            +{overflow}
          </text>
        );
      }
      
      return elements;
    };

    const statusIconGap = 4;

    return (
      <g key={device.id} transform={`translate(${x}, ${y})`}>
        {element}
        <text
          x={w / 2}
          y={h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontFamily="Microsoft YaHei, PingFang SC, sans-serif"
          fontWeight="500"
          fill="#333333"
          pointerEvents="none"
        >
          {device.name}
        </text>
        
        {isSimRunning && simDeviceState && (
          <>
            {simDeviceState.busy && simDeviceState.processing_product && (
              <g>
                {renderWipIndicators(
                  1,
                  statusIconGap,
                  statusIconGap,
                  getProductColor(simDeviceState.processing_product)
                )}
              </g>
            )}
            {simDeviceState.wip > 0 && (
              <g>
                {renderWipIndicators(
                  simDeviceState.wip,
                  statusIconGap,
                  h - statusIconGap - 6 - Math.ceil(Math.min(simDeviceState.wip, 12) / 6) * 8,
                  getProductColor(simDeviceState.processing_product)
                )}
              </g>
            )}
            {simDeviceState.wait_transport > 0 && (
              <g>
                {renderWipIndicators(
                  simDeviceState.wait_transport,
                  w - statusIconGap - Math.min(simDeviceState.wait_transport, 6) * 8 + 2,
                  h - statusIconGap - 6 - Math.ceil(Math.min(simDeviceState.wait_transport, 12) / 6) * 8,
                  getProductColor(simDeviceState.processing_product)
                )}
              </g>
            )}
            {(() => {
              const elapsed = simulation.elapsed_s;
              if (elapsed <= 0) return null;
              
              let utilization: number;
              let strokeColor: string;
              let fillColor: string;
              
              if (device.type === 'Warehouse' || device.type === 'Buffer') {
                const simStorageState = simulation.storage[device.id];
                if (!simStorageState || simStorageState.capacity <= 0) return null;
                utilization = (simStorageState.stock / simStorageState.capacity * 100);
                strokeColor = '#F59E0B';
                fillColor = '#F59E0B';
              } else if (device.type === 'TempStore') {
                return null;
              } else {
                utilization = (simDeviceState.total_proc_time_s / elapsed * 100);
                strokeColor = '#3B82F6';
                fillColor = '#3B82F6';
              }
              
              const displayUtil = Math.min(100, Math.max(0, utilization)).toFixed(0);
              const circleR = 14;
              const circleX = w - circleR - 4;
              const circleY = -circleR + 4;
              return (
                <g transform={`translate(${circleX}, ${circleY})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={circleR}
                    fill="#FFFFFF"
                    stroke={strokeColor}
                    strokeWidth={2}
                    opacity={0.95}
                  />
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="9"
                    fontFamily="Microsoft YaHei, PingFang SC, sans-serif"
                    fontWeight="600"
                    fill={fillColor}
                    pointerEvents="none"
                  >
                    {displayUtil}%
                  </text>
                </g>
              );
            })()}
          </>
        )}
        
        {isSimRunning && simDeviceState?.busy && (device.type === 'Station' || device.type === 'Warehouse') && (
          <g transform={`translate(${w - 20}, ${h - 20})`}>
            <g transform={`rotate(${animationFrame * GEAR_ROTATION_SPEED})`}>
              <circle cx="0" cy="0" r="8" fill="none" stroke="#64748B" strokeWidth="1.5" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <rect
                  key={angle}
                  x="-2"
                  y="-10"
                  width="4"
                  height="5"
                  fill="#64748B"
                  transform={`rotate(${angle})`}
                  rx="1"
                />
              ))}
              <circle cx="0" cy="0" r="3" fill="#94A3B8" />
            </g>
          </g>
        )}
        
        {isSimRunning && (device.type === 'Warehouse' || device.type === 'TempStore' || device.type === 'Buffer') && (() => {
          const simStorageState = simulation.storage[device.id];
          if (!simStorageState || simStorageState.stock === 0) return null;
          
          const storedProducts = simStorageState.stored_products || [];
          const maxDisplayBlocks = 12;
          const displayProducts = storedProducts.slice(-maxDisplayBlocks);
          const overflow = storedProducts.length > maxDisplayBlocks ? storedProducts.length - maxDisplayBlocks : 0;
          
          const blockSize = 10;
          const blockGap = 2;
          const blocksPerRow = 4;
          const startX = 10;
          const startY = 20;
          
          return (
            <g>
              {displayProducts.map((productCode, idx) => {
                const row = Math.floor(idx / blocksPerRow);
                const col = idx % blocksPerRow;
                const bx = startX + col * (blockSize + blockGap);
                const by = startY + row * (blockSize + blockGap);
                return (
                  <rect
                    key={idx}
                    x={bx}
                    y={by}
                    width={blockSize}
                    height={blockSize}
                    fill={getProductColor(productCode)}
                    stroke="#333333"
                    strokeWidth={0.5}
                    rx={1}
                  />
                );
              })}
              {overflow > 0 && (
                <text
                  x={startX + blocksPerRow * (blockSize + blockGap) + 2}
                  y={startY + Math.ceil(maxDisplayBlocks / blocksPerRow) * (blockSize + blockGap) - 4}
                  fontSize="10"
                  fontFamily="Microsoft YaHei, PingFang SC, sans-serif"
                  fill="#333333"
                  pointerEvents="none"
                >
                  +{overflow}
                </text>
              )}
            </g>
          );
        })()}
        
        {showAnchors && anchors.map((anchor, idx) => (
          <circle
            key={idx}
            cx={anchor.x - x}
            cy={anchor.y - y}
            r={6}
            fill={connectionStartAnchor?.deviceId === anchor.deviceId && connectionStartAnchor?.anchorIndex === anchor.anchorIndex ? '#3B82F6' : '#FFFFFF'}
            stroke="#3B82F6"
            strokeWidth={2}
            style={{ cursor: 'crosshair' }}
          />
        ))}
        
        {isSelected && toolMode === 'select' && !isResizing && (
          <>
            <rect
              x={-4}
              y={-4}
              width={8}
              height={8}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={1.5}
              style={{ cursor: 'nwse-resize' }}
              onMouseDown={(e) => handleResizeStart(e, 'nw', device)}
            />
            <rect
              x={w / 2 - 4}
              y={-4}
              width={8}
              height={8}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={1.5}
              style={{ cursor: 'ns-resize' }}
              onMouseDown={(e) => handleResizeStart(e, 'n', device)}
            />
            <rect
              x={w - 4}
              y={-4}
              width={8}
              height={8}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={1.5}
              style={{ cursor: 'nesw-resize' }}
              onMouseDown={(e) => handleResizeStart(e, 'ne', device)}
            />
            <rect
              x={w - 4}
              y={h / 2 - 4}
              width={8}
              height={8}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={1.5}
              style={{ cursor: 'ew-resize' }}
              onMouseDown={(e) => handleResizeStart(e, 'e', device)}
            />
            <rect
              x={w - 4}
              y={h - 4}
              width={8}
              height={8}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={1.5}
              style={{ cursor: 'nwse-resize' }}
              onMouseDown={(e) => handleResizeStart(e, 'se', device)}
            />
            <rect
              x={w / 2 - 4}
              y={h - 4}
              width={8}
              height={8}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={1.5}
              style={{ cursor: 'ns-resize' }}
              onMouseDown={(e) => handleResizeStart(e, 's', device)}
            />
            <rect
              x={-4}
              y={h - 4}
              width={8}
              height={8}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={1.5}
              style={{ cursor: 'nesw-resize' }}
              onMouseDown={(e) => handleResizeStart(e, 'sw', device)}
            />
            <rect
              x={-4}
              y={h / 2 - 4}
              width={8}
              height={8}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={1.5}
              style={{ cursor: 'ew-resize' }}
              onMouseDown={(e) => handleResizeStart(e, 'w', device)}
            />
          </>
        )}
      </g>
    );
  };

  const renderConnection = (conn: Connection) => {
    const fromDevice = canvas.devices[conn.from_device_id];
    const toDevice = canvas.devices[conn.to_device_id];
    if (!fromDevice || !toDevice) return null;

    const fromAnchors = getDeviceAnchors(fromDevice);
    const toAnchors = getDeviceAnchors(toDevice);
    
    const fromAnchor = fromAnchors[conn.from_anchor_index] || fromAnchors[0];
    const toAnchor = toAnchors[conn.to_anchor_index] || toAnchors[0];

    const isSelected = selectedConnectionId === conn.id;

    const renderLine = () => {
      const stroke = isSelected ? '#5B8DEF' : '#B0B8C4';
      const strokeWidth = isSelected ? 2.5 : 2;

      switch (conn.line_style) {
        case 'curve': {
          const cx = conn.curve_control_x !== null 
            ? conn.curve_control_x 
            : (fromAnchor.x + toAnchor.x) / 2;
          const cy = conn.curve_control_y !== null 
            ? conn.curve_control_y 
            : (fromAnchor.y + toAnchor.y) / 2 - 50;
          return (
            <path
              data-connection-id={conn.id}
              d={`M ${fromAnchor.x} ${fromAnchor.y} Q ${cx} ${cy} ${toAnchor.x} ${toAnchor.y}`}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
              style={{ cursor: 'pointer' }}
            />
          );
        }
        case 'elbow': {
          const elbowResult = calculateElbowPath(
            fromAnchor, toAnchor,
            conn.from_anchor_index, conn.to_anchor_index,
            conn.elbow_offset
          );
          const pathD = elbowResult.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          return (
            <path
              data-connection-id={conn.id}
              d={pathD}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#arrowhead)"
              style={{ cursor: 'pointer' }}
            />
          );
        }
        case 'free_polyline': {
          if (conn.intermediate_points && conn.intermediate_points.length > 0) {
            const points = [fromAnchor];
            conn.intermediate_points.forEach(([px, py]) => {
              points.push({ x: px, y: py } as AnchorPoint);
            });
            points.push(toAnchor);
            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            return (
              <path
                data-connection-id={conn.id}
                d={pathD}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd="url(#arrowhead)"
                style={{ cursor: 'pointer' }}
              />
            );
          }
          return (
            <line
              data-connection-id={conn.id}
              x1={fromAnchor.x}
              y1={fromAnchor.y}
              x2={toAnchor.x}
              y2={toAnchor.y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
              style={{ cursor: 'pointer' }}
            />
          );
        }
        default:
          return (
            <line
              data-connection-id={conn.id}
              x1={fromAnchor.x}
              y1={fromAnchor.y}
              x2={toAnchor.x}
              y2={toAnchor.y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
              style={{ cursor: 'pointer' }}
            />
          );
      }
    };

    const renderControlPoints = () => {
      if (!isSelected) return null;
      
      const points: JSX.Element[] = [];
      
      if (conn.line_style === 'curve') {
        const cx = conn.curve_control_x !== null 
          ? conn.curve_control_x 
          : (fromAnchor.x + toAnchor.x) / 2;
        const cy = conn.curve_control_y !== null 
          ? conn.curve_control_y 
          : (fromAnchor.y + toAnchor.y) / 2 - 50;
        points.push(
          <circle
            key="curve-control"
            cx={cx}
            cy={cy}
            r={6}
            fill="#FFFFFF"
            stroke="#5B8DEF"
            strokeWidth={2}
            style={{ cursor: 'move', pointerEvents: 'all' }}
            className="control-point"
            data-control-type="curve"
            data-connection-id={conn.id}
          />
        );
      }
      
      if (conn.line_style === 'free_polyline') {
        const intermediatePoints = (conn.intermediate_points || []).map(([x, y]) => ({ x, y }));
        
        intermediatePoints.forEach((pt, idx) => {
          points.push(
            <circle
              key={`point-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={5}
              fill="#FFFFFF"
              stroke="#5B8DEF"
              strokeWidth={2}
              style={{ cursor: 'move', pointerEvents: 'all' }}
              className="control-point"
              data-control-type="intermediate"
              data-control-index={idx}
              data-connection-id={conn.id}
            />
          );
        });
      }
      
      if (conn.line_style === 'elbow') {
        const elbowResult = calculateElbowPath(
          fromAnchor, toAnchor,
          conn.from_anchor_index, conn.to_anchor_index,
          conn.elbow_offset
        );
        
        points.push(
          <circle
            key="elbow-from"
            cx={elbowResult.dragPointFrom.x}
            cy={elbowResult.dragPointFrom.y}
            r={5}
            fill="#FFFFFF"
            stroke="#5B8DEF"
            strokeWidth={2}
            style={{ cursor: 'move', pointerEvents: 'all' }}
            className="control-point"
            data-control-type="elbow-from"
            data-connection-id={conn.id}
          />
        );
        points.push(
          <circle
            key="elbow-to"
            cx={elbowResult.dragPointTo.x}
            cy={elbowResult.dragPointTo.y}
            r={5}
            fill="#FFFFFF"
            stroke="#5B8DEF"
            strokeWidth={2}
            style={{ cursor: 'move', pointerEvents: 'all' }}
            className="control-point"
            data-control-type="elbow-to"
            data-connection-id={conn.id}
          />
        );
      }
      
      points.push(
        <circle
          key="start-anchor"
          cx={fromAnchor.x}
          cy={fromAnchor.y}
          r={7}
          fill="#FFFFFF"
          stroke="#5B8DEF"
          strokeWidth={2}
          style={{ cursor: 'crosshair', pointerEvents: 'all' }}
          className="connection-endpoint"
          data-endpoint="from"
          data-connection-id={conn.id}
        />
      );
      points.push(
        <circle
          key="end-anchor"
          cx={toAnchor.x}
          cy={toAnchor.y}
          r={7}
          fill="#FFFFFF"
          stroke="#5B8DEF"
          strokeWidth={2}
          style={{ cursor: 'crosshair', pointerEvents: 'all' }}
          className="connection-endpoint"
          data-endpoint="to"
          data-connection-id={conn.id}
        />
      );
      
      return points;
    };

    const isSimRunning = simulation.state === 'running' || simulation.state === 'paused';
    const dotPosition = connectionDotPositions[conn.id] || 0;
    const isDiscrete = conn.transport_mode === 'discrete';
    
    const renderAnimatedDot = () => {
      if (!isSimRunning) return null;
      
      let actualPosition = dotPosition;
      if (isDiscrete && fromDevice?.type !== 'StartNode' && toDevice?.type !== 'EndNode') {
        actualPosition = dotPosition <= 1 ? dotPosition : 2 - dotPosition;
      }
      
      let dotX: number, dotY: number;
      
      switch (conn.line_style) {
        case 'curve': {
          const cx = conn.curve_control_x !== null 
            ? conn.curve_control_x 
            : (fromAnchor.x + toAnchor.x) / 2;
          const cy = conn.curve_control_y !== null 
            ? conn.curve_control_y 
            : (fromAnchor.y + toAnchor.y) / 2 - 50;
          const t = actualPosition;
          dotX = (1 - t) * (1 - t) * fromAnchor.x + 2 * (1 - t) * t * cx + t * t * toAnchor.x;
          dotY = (1 - t) * (1 - t) * fromAnchor.y + 2 * (1 - t) * t * cy + t * t * toAnchor.y;
          break;
        }
        case 'free_polyline':
        case 'elbow': {
          let intermediatePoints: { x: number; y: number }[];
          if (conn.line_style === 'elbow') {
            const elbowResult = calculateElbowPath(
              fromAnchor, toAnchor,
              conn.from_anchor_index, conn.to_anchor_index,
              conn.elbow_offset
            );
            intermediatePoints = elbowResult.points.slice(1, -1);
          } else {
            intermediatePoints = (conn.intermediate_points || []).map(([x, y]) => ({ x, y }));
          }
          
          const allPoints = [fromAnchor, ...intermediatePoints, toAnchor];
          const totalSegments = allPoints.length - 1;
          const segmentLength = 1 / totalSegments;
          const currentSegment = Math.min(Math.floor(actualPosition / segmentLength), totalSegments - 1);
          const segmentProgress = (actualPosition - currentSegment * segmentLength) / segmentLength;
          
          const startPoint = allPoints[currentSegment];
          const endPoint = allPoints[currentSegment + 1];
          
          dotX = startPoint.x + (endPoint.x - startPoint.x) * segmentProgress;
          dotY = startPoint.y + (endPoint.y - startPoint.y) * segmentProgress;
          break;
        }
        default: {
          dotX = fromAnchor.x + (toAnchor.x - fromAnchor.x) * actualPosition;
          dotY = fromAnchor.y + (toAnchor.y - fromAnchor.y) * actualPosition;
        }
      }
      
      const shouldShowDot = fromDevice?.type === 'StartNode' || toDevice?.type === 'EndNode'
        ? dotPosition > 0
        : true;
      
      if (!shouldShowDot) return null;
      
      return (
        <circle
          cx={dotX}
          cy={dotY}
          r={5}
          fill="#3B82F6"
          stroke="#FFFFFF"
          strokeWidth={1.5}
          style={{ pointerEvents: 'none' }}
        />
      );
    };

    const renderUtilizationBadge = () => {
      if (!isSimRunning) return null;
      
      const fromDevice = canvas.devices[conn.from_device_id];
      const toDevice = canvas.devices[conn.to_device_id];
      
      if (fromDevice?.type === 'StartNode' || toDevice?.type === 'EndNode') {
        return null;
      }
      
      const simConnState = simulation.connections[conn.id];
      if (!simConnState) return null;
      
      const elapsed = simulation.elapsed_s;
      if (elapsed <= 0) return null;
      
      const utilization = (simConnState.total_time_s / elapsed * 100);
      const displayUtil = Math.min(100, Math.max(0, utilization)).toFixed(0);
      
      let midX: number, midY: number;
      
      switch (conn.line_style) {
        case 'curve': {
          const cx = conn.curve_control_x !== null 
            ? conn.curve_control_x 
            : (fromAnchor.x + toAnchor.x) / 2;
          const cy = conn.curve_control_y !== null 
            ? conn.curve_control_y 
            : (fromAnchor.y + toAnchor.y) / 2 - 50;
          midX = (fromAnchor.x + 2 * cx + toAnchor.x) / 4;
          midY = (fromAnchor.y + 2 * cy + toAnchor.y) / 4;
          break;
        }
        case 'free_polyline':
        case 'elbow': {
          let intermediatePoints: { x: number; y: number }[];
          if (conn.line_style === 'elbow') {
            const elbowResult = calculateElbowPath(
              fromAnchor, toAnchor,
              conn.from_anchor_index, conn.to_anchor_index,
              conn.elbow_offset
            );
            intermediatePoints = elbowResult.points.slice(1, -1);
          } else {
            intermediatePoints = (conn.intermediate_points || []).map(([x, y]) => ({ x, y }));
          }
          
          const allPoints = [fromAnchor, ...intermediatePoints, toAnchor];
          const midIndex = Math.floor(allPoints.length / 2);
          midX = (allPoints[midIndex - 1].x + allPoints[midIndex].x) / 2;
          midY = (allPoints[midIndex - 1].y + allPoints[midIndex].y) / 2;
          break;
        }
        default: {
          midX = (fromAnchor.x + toAnchor.x) / 2;
          midY = (fromAnchor.y + toAnchor.y) / 2;
        }
      }
      
      const circleR = 12;
      const offsetY = -20;
      
      return (
        <g transform={`translate(${midX}, ${midY + offsetY})`}>
          <circle
            cx={0}
            cy={0}
            r={circleR}
            fill="#FFFFFF"
            stroke="#10B981"
            strokeWidth={2}
            opacity={0.95}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fontFamily="Microsoft YaHei, PingFang SC, sans-serif"
            fontWeight="600"
            fill="#10B981"
            pointerEvents="none"
          >
            {displayUtil}%
          </text>
        </g>
      );
    };

    return (
      <g key={conn.id}>
        {renderLine()}
        {renderAnimatedDot()}
        {renderControlPoints()}
        {renderUtilizationBadge()}
      </g>
    );
  };

  const renderGrid = () => {
    if (!canvas.settings.show_grid) return null;
    
    const step = deviceToPx(canvas.settings.grid_step_mm, zoom, pxPerMm);
    const lines: JSX.Element[] = [];
    
    for (let x = 0; x <= canvasWidthPx; x += step) {
      const isMajor = Math.round(x / step) % 5 === 0;
      lines.push(
        <line
          key={`v-${x}`}
          x1={x + panOffset.x}
          y1={panOffset.y}
          x2={x + panOffset.x}
          y2={canvasHeightPx + panOffset.y}
          stroke={isMajor ? '#CBD5E1' : '#E5E7EB'}
          strokeWidth={isMajor ? 1 : 0.5}
        />
      );
    }
    
    for (let y = 0; y <= canvasHeightPx; y += step) {
      const isMajor = Math.round(y / step) % 5 === 0;
      lines.push(
        <line
          key={`h-${y}`}
          x1={panOffset.x}
          y1={y + panOffset.y}
          x2={canvasWidthPx + panOffset.x}
          y2={y + panOffset.y}
          stroke={isMajor ? '#CBD5E1' : '#E5E7EB'}
          strokeWidth={isMajor ? 1 : 0.5}
        />
      );
    }
    
    return <g className="grid">{lines}</g>;
  };

  const renderConnectionPreview = () => {
    if (!connectionStartAnchor) return null;
    
    const mouseX = mousePos.x;
    const mouseY = mousePos.y;

    return (
      <line
        x1={connectionStartAnchor.x}
        y1={connectionStartAnchor.y}
        x2={mouseX}
        y2={mouseY}
        stroke="#3B82F6"
        strokeWidth={1}
        strokeDasharray="4,2"
        pointerEvents="none"
      />
    );
  };

  const renderSelectionBox = () => {
    if (!isSelecting || !selectionBoxStart || !selectionBoxEnd) return null;
    
    const x = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
    const y = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
    const width = Math.abs(selectionBoxEnd.x - selectionBoxStart.x);
    const height = Math.abs(selectionBoxEnd.y - selectionBoxStart.y);
    
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3B82F6"
        strokeWidth={1}
        strokeDasharray="4,2"
        pointerEvents="none"
      />
    );
  };

  return (
    <div 
      className="canvas-container" 
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ cursor: toolMode === 'pan' ? 'grab' : isPanning ? 'grabbing' : isDraggingDevice ? 'move' : toolMode === 'device' ? (hoveredDeviceId ? 'pointer' : 'crosshair') : toolMode === 'connection' ? (hoveredDeviceId ? 'pointer' : 'default') : 'default' }}
      >
        <defs>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.08" />
          </filter>
          <marker
            id="arrowhead"
            markerWidth="5"
            markerHeight="3.5"
            refX="4.5"
            refY="1.75"
            orient="auto"
          >
            <polygon points="0 0, 5 1.75, 0 3.5" fill="#B0B8C4" />
          </marker>
        </defs>
        
        <rect
          x={panOffset.x}
          y={panOffset.y}
          width={canvasWidthPx}
          height={canvasHeightPx}
          fill="#FAFBFC"
          stroke="#E8ECF0"
        />
        
        {renderGrid()}
        
        {Object.values(canvas.devices).filter(d => d.type === 'Workshop').map((device) => renderDevice(device as Device))}
        {Object.values(canvas.connections).map((conn) => renderConnection(conn as Connection))}
        {Object.values(canvas.devices).filter(d => d.type !== 'Workshop').map((device) => renderDevice(device as Device))}
        
        {renderConnectionPreview()}
        {renderSelectionBox()}
      </svg>
      
      <div className="zoom-control">
        <span style={{ fontSize: '12px', color: '#64748B' }}>缩放:</span>
        <input
          type="range"
          className="zoom-slider"
          min="25"
          max="300"
          value={zoom * 100}
          onChange={(e) => setZoom(parseInt(e.target.value) / 100)}
        />
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
