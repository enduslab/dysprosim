import type { Device, Workshop } from '../types';

export const DEFAULT_PX_PER_MM = 0.2;

export function deviceToPx(value: number, zoom: number, pxPerMm: number = DEFAULT_PX_PER_MM): number {
  return value * pxPerMm * zoom;
}

export function pxToMm(value: number, zoom: number, pxPerMm: number = DEFAULT_PX_PER_MM): number {
  return value / pxPerMm / zoom;
}

export function getDeviceSizePx(device: Device, zoom: number, pxPerMm: number): { w: number; h: number } {
  let w = 0, h = 0;
  switch (device.shape_type) {
    case 'rect':
      w = deviceToPx(device.params.width || 400, zoom, pxPerMm);
      h = deviceToPx(device.params.height || 300, zoom, pxPerMm);
      break;
    case 'circle':
      w = deviceToPx(device.params.diameter || 300, zoom, pxPerMm);
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
  if (device.type === 'Workshop') {
    const workshop = device as Workshop;
    w = deviceToPx(workshop.width_mm, zoom, pxPerMm);
    h = deviceToPx(workshop.height_mm, zoom, pxPerMm);
  }
  return { w, h };
}

export function getDeviceCenterPx(device: Device, zoom: number, pxPerMm: number, panOffsetX: number = 0, panOffsetY: number = 0): { x: number; y: number } {
  const { w, h } = getDeviceSizePx(device, zoom, pxPerMm);
  return {
    x: deviceToPx(device.x_mm, zoom, pxPerMm) + w / 2 + panOffsetX,
    y: deviceToPx(device.y_mm, zoom, pxPerMm) + h / 2 + panOffsetY,
  };
}

export function getDeviceAnchorPx(device: Device, anchorIndex: number, zoom: number, pxPerMm: number, panOffsetX: number = 0, panOffsetY: number = 0): { x: number; y: number } {
  const center = getDeviceCenterPx(device, zoom, pxPerMm, panOffsetX, panOffsetY);
  const { w, h } = getDeviceSizePx(device, zoom, pxPerMm);
  const anchors = [
    { x: center.x, y: center.y - h / 2 },
    { x: center.x + w / 2, y: center.y },
    { x: center.x, y: center.y + h / 2 },
    { x: center.x - w / 2, y: center.y },
    { x: center.x, y: center.y },
  ];
  return anchors[anchorIndex] || anchors[0];
}

export function calculateConnectionLengthMm(
  fromDevice: Device,
  toDevice: Device,
  fromAnchorIndex: number,
  toAnchorIndex: number,
  intermediatePoints: [number, number][],
  zoom: number,
  pxPerMm: number
): number {
  const fromAnchor = getDeviceAnchorPx(fromDevice, fromAnchorIndex, zoom, pxPerMm);
  const toAnchor = getDeviceAnchorPx(toDevice, toAnchorIndex, zoom, pxPerMm);

  let totalLengthPx = 0;
  let prevX = fromAnchor.x;
  let prevY = fromAnchor.y;

  for (const [px, py] of intermediatePoints) {
    const dx = px - prevX;
    const dy = py - prevY;
    totalLengthPx += Math.sqrt(dx * dx + dy * dy);
    prevX = px;
    prevY = py;
  }

  const dx = toAnchor.x - prevX;
  const dy = toAnchor.y - prevY;
  totalLengthPx += Math.sqrt(dx * dx + dy * dy);

  return pxToMm(totalLengthPx, zoom, pxPerMm);
}

export type AnchorDirection = 'top' | 'right' | 'bottom' | 'left' | 'center';

export function getAnchorDirection(anchorIndex: number): AnchorDirection {
  const dirs: AnchorDirection[] = ['top', 'right', 'bottom', 'left', 'center'];
  return dirs[anchorIndex] || 'center';
}

export function getDirectionVector(dir: AnchorDirection): { dx: number; dy: number } {
  switch (dir) {
    case 'top': return { dx: 0, dy: -1 };
    case 'right': return { dx: 1, dy: 0 };
    case 'bottom': return { dx: 0, dy: 1 };
    case 'left': return { dx: -1, dy: 0 };
    case 'center': return { dx: 0, dy: 0 };
  }
}

export function isHorizontalDir(dir: AnchorDirection): boolean {
  return dir === 'left' || dir === 'right';
}

export function isVerticalDir(dir: AnchorDirection): boolean {
  return dir === 'top' || dir === 'bottom';
}

export interface ElbowPathResult {
  points: { x: number; y: number }[];
  dragPointFrom: { x: number; y: number };
  dragPointTo: { x: number; y: number };
}

export function calculateElbowPath(
  fromAnchor: { x: number; y: number },
  toAnchor: { x: number; y: number },
  fromAnchorIndex: number,
  toAnchorIndex: number,
  elbowOffset: number | null
): ElbowPathResult {
  const fromDir = getAnchorDirection(fromAnchorIndex);
  const toDir = getAnchorDirection(toAnchorIndex);
  const fromVec = getDirectionVector(fromDir);
  const toVec = getDirectionVector(toDir);

  const defaultOffset = 30;

  if (fromDir === 'center' && toDir === 'center') {
    return {
      points: [fromAnchor, toAnchor],
      dragPointFrom: fromAnchor,
      dragPointTo: toAnchor,
    };
  }

  if (fromDir === 'center') {
    const offset = elbowOffset ?? defaultOffset;
    const toOff = toVec;
    const midX = toAnchor.x + toOff.dx * offset;
    const midY = toAnchor.y + toOff.dy * offset;
    return {
      points: [fromAnchor, { x: midX, y: midY }, toAnchor],
      dragPointFrom: fromAnchor,
      dragPointTo: { x: midX, y: midY },
    };
  }

  if (toDir === 'center') {
    const offset = elbowOffset ?? defaultOffset;
    const fromOff = fromVec;
    const midX = fromAnchor.x + fromOff.dx * offset;
    const midY = fromAnchor.y + fromOff.dy * offset;
    return {
      points: [fromAnchor, { x: midX, y: midY }, toAnchor],
      dragPointFrom: { x: midX, y: midY },
      dragPointTo: toAnchor,
    };
  }

  const offset = elbowOffset ?? defaultOffset;

  const fromExitX = fromAnchor.x + fromVec.dx * offset;
  const fromExitY = fromAnchor.y + fromVec.dy * offset;

  const toEntryX = toAnchor.x + toVec.dx * offset;
  const toEntryY = toAnchor.y + toVec.dy * offset;

  const fromIsH = isHorizontalDir(fromDir);
  const toIsH = isHorizontalDir(toDir);

  let points: { x: number; y: number }[];
  let dragPointFrom: { x: number; y: number };
  let dragPointTo: { x: number; y: number };

  if (fromIsH && toIsH) {
    if (Math.abs(fromExitY - toEntryY) < 1) {
      points = [
        fromAnchor,
        { x: fromExitX, y: fromExitY },
        { x: toEntryX, y: toEntryY },
        toAnchor,
      ];
    } else {
      const midX = (fromExitX + toEntryX) / 2;
      points = [
        fromAnchor,
        { x: fromExitX, y: fromExitY },
        { x: midX, y: fromExitY },
        { x: midX, y: toEntryY },
        { x: toEntryX, y: toEntryY },
        toAnchor,
      ];
    }
    dragPointFrom = { x: (fromAnchor.x + fromExitX) / 2, y: fromExitY };
    dragPointTo = { x: (toAnchor.x + toEntryX) / 2, y: toEntryY };
  } else if (!fromIsH && !toIsH) {
    if (Math.abs(fromExitX - toEntryX) < 1) {
      points = [
        fromAnchor,
        { x: fromExitX, y: fromExitY },
        { x: toEntryX, y: toEntryY },
        toAnchor,
      ];
    } else {
      const midY = (fromExitY + toEntryY) / 2;
      points = [
        fromAnchor,
        { x: fromExitX, y: fromExitY },
        { x: fromExitX, y: midY },
        { x: toEntryX, y: midY },
        { x: toEntryX, y: toEntryY },
        toAnchor,
      ];
    }
    dragPointFrom = { x: fromExitX, y: (fromAnchor.y + fromExitY) / 2 };
    dragPointTo = { x: toEntryX, y: (toAnchor.y + toEntryY) / 2 };
  } else {
    if (fromIsH) {
      points = [
        fromAnchor,
        { x: fromExitX, y: fromExitY },
        { x: fromExitX, y: toEntryY },
        { x: toEntryX, y: toEntryY },
        toAnchor,
      ];
      dragPointFrom = { x: (fromAnchor.x + fromExitX) / 2, y: fromExitY };
      dragPointTo = { x: toEntryX, y: (toAnchor.y + toEntryY) / 2 };
    } else {
      points = [
        fromAnchor,
        { x: fromExitX, y: fromExitY },
        { x: toEntryX, y: fromExitY },
        { x: toEntryX, y: toEntryY },
        toAnchor,
      ];
      dragPointFrom = { x: fromExitX, y: (fromAnchor.y + fromExitY) / 2 };
      dragPointTo = { x: toEntryX, y: (toAnchor.y + toEntryY) / 2 };
    }
  }

  return { points, dragPointFrom, dragPointTo };
}

export function calculateElbowOffsetFromDrag(
  fromAnchor: { x: number; y: number },
  toAnchor: { x: number; y: number },
  fromAnchorIndex: number,
  toAnchorIndex: number,
  dragPointSide: 'from' | 'to',
  mouseX: number,
  mouseY: number
): number {
  const fromDir = getAnchorDirection(fromAnchorIndex);
  const fromVec = getDirectionVector(fromDir);

  if (dragPointSide === 'from') {
    if (fromVec.dx !== 0) {
      return (mouseX - fromAnchor.x) / fromVec.dx;
    } else {
      return (mouseY - fromAnchor.y) / fromVec.dy;
    }
  } else {
    const toDir = getAnchorDirection(toAnchorIndex);
    const toVec = getDirectionVector(toDir);
    if (toVec.dx !== 0) {
      return (mouseX - toAnchor.x) / toVec.dx;
    } else {
      return (mouseY - toAnchor.y) / toVec.dy;
    }
  }
}

export function calculateElbowIntermediatePoints(
  fromAnchor: { x: number; y: number },
  toAnchor: { x: number; y: number },
  fromAnchorIndex: number,
  toAnchorIndex: number,
  elbowOffset: number | null
): [number, number][] {
  const result = calculateElbowPath(fromAnchor, toAnchor, fromAnchorIndex, toAnchorIndex, elbowOffset);
  return result.points.slice(1, -1).map(p => [p.x, p.y] as [number, number]);
}
