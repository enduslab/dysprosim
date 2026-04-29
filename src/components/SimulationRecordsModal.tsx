import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import type { SimulationRecord, SimulationResults, UtilizationRecord, StockHistoryRecord } from '../types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import * as XLSX from 'xlsx';

interface SimulationRecordsModalProps {
  onClose: () => void;
  deviceId?: string;
  connectionId?: string;
}

function BarChart({ 
  data, 
  title, 
  colors,
  width = 600,
  height = 200,
  valueSuffix = ''
}: { 
  data: { label: string; value: number; color?: string }[]; 
  title: string;
  colors?: string[];
  width?: number;
  height?: number;
  valueSuffix?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        borderRadius: '8px'
      }}>
        暂无数据
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(40, (chartWidth / data.length) * 0.7);
  const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const getColorByPercentage = (value: number, index: number): string => {
    if (valueSuffix === '%') {
      if (value >= 90) return '#EF4444';
      if (value >= 70) return '#F59E0B';
      if (value >= 50) return '#3B82F6';
      return '#10B981';
    }
    return defaultColors[index % defaultColors.length];
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <h6 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>{title}</h6>
      <svg width={width} height={height} style={{ background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        {[0, 25, 50, 75, 100].map(tick => {
          const y = padding.top + chartHeight - (tick / 100) * chartHeight;
          return (
            <g key={`y-${tick}`}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-light)" strokeDasharray="2,2" />
              <text x={padding.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--text-muted)">
                {Math.round(maxValue * tick / 100)}{valueSuffix}
              </text>
            </g>
          );
        })}
        
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = padding.left + barGap + i * (barWidth + barGap);
          const y = padding.top + chartHeight - barHeight;
          const color = d.color || colors?.[i] || getColorByPercentage(d.value, i);
          
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx="2" />
              <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
                {d.value.toFixed(d.value % 1 === 0 ? 0 : 1)}
              </text>
              <text 
                x={x + barWidth / 2} 
                y={height - padding.bottom + 15} 
                textAnchor="middle" 
                fontSize="9" 
                fill="var(--text-muted)"
                transform={`rotate(-30, ${x + barWidth / 2}, ${height - padding.bottom + 15})`}
              >
                {d.label.length > 8 ? d.label.substring(0, 8) + '...' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GroupedBarChart({ 
  data, 
  title, 
  productColors,
  width = 600,
  height = 250
}: { 
  data: { deviceName: string; products: { code: string; count: number }[] }[]; 
  title: string;
  productColors: Record<string, string>;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        borderRadius: '8px'
      }}>
        暂无数据
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 80, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allProducts = [...new Set(data.flatMap(d => d.products.map(p => p.code)))];
  const maxValue = Math.max(...data.flatMap(d => d.products.map(p => p.count)), 1);
  
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(20, (groupWidth * 0.8) / allProducts.length);
  const barGap = 2;

  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  return (
    <div style={{ marginBottom: '16px' }}>
      <h6 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>{title}</h6>
      <svg width={width} height={height} style={{ background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        {[0, 25, 50, 75, 100].map(tick => {
          const y = padding.top + chartHeight - (tick / 100) * chartHeight;
          return (
            <g key={`y-${tick}`}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-light)" strokeDasharray="2,2" />
              <text x={padding.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--text-muted)">
                {Math.round(maxValue * tick / 100)}
              </text>
            </g>
          );
        })}
        
        {data.map((device, deviceIdx) => {
          const groupX = padding.left + deviceIdx * groupWidth;
          
          return device.products.map((product, productIdx) => {
            const barHeight = (product.count / maxValue) * chartHeight;
            const x = groupX + (groupWidth - allProducts.length * (barWidth + barGap)) / 2 + productIdx * (barWidth + barGap);
            const y = padding.top + chartHeight - barHeight;
            const color = productColors[product.code] || defaultColors[allProducts.indexOf(product.code) % defaultColors.length];
            
            return (
              <g key={`${deviceIdx}-${productIdx}`}>
                <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx="2" />
                {product.count > 0 && (
                  <text x={x + barWidth / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
                    {product.count}
                  </text>
                )}
              </g>
            );
          });
        })}
        
        {data.map((device, deviceIdx) => {
          const x = padding.left + deviceIdx * groupWidth + groupWidth / 2;
          return (
            <text 
              key={`label-${deviceIdx}`}
              x={x} 
              y={height - padding.bottom + 15} 
              textAnchor="middle" 
              fontSize="9" 
              fill="var(--text-muted)"
              transform={`rotate(-30, ${x}, ${height - padding.bottom + 15})`}
            >
              {device.deviceName.length > 8 ? device.deviceName.substring(0, 8) + '...' : device.deviceName}
            </text>
          );
        })}
      </svg>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', padding: '0 12px' }}>
        {allProducts.map((code, i) => (
          <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
            <div style={{ width: '10px', height: '10px', backgroundColor: productColors[code] || defaultColors[i % defaultColors.length], borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-muted)' }}>{code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DualBarChart({ 
  data, 
  title,
  label1,
  label2,
  color1 = '#3B82F6',
  color2 = '#EF4444',
  width = 600,
  height = 250
}: { 
  data: { label: string; value1: number; value2: number }[]; 
  title: string;
  label1: string;
  label2: string;
  color1?: string;
  color2?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        borderRadius: '8px'
      }}>
        暂无数据
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 80, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.flatMap(d => [d.value1, d.value2]), 1);
  
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(25, (groupWidth * 0.7) / 2);
  const barGap = 2;

  return (
    <div style={{ marginBottom: '16px' }}>
      <h6 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>{title}</h6>
      <svg width={width} height={height} style={{ background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        {[0, 25, 50, 75, 100].map(tick => {
          const y = padding.top + chartHeight - (tick / 100) * chartHeight;
          return (
            <g key={`y-${tick}`}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-light)" strokeDasharray="2,2" />
              <text x={padding.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--text-muted)">
                {Math.round(maxValue * tick / 100)}
              </text>
            </g>
          );
        })}
        
        {data.map((d, i) => {
          const groupX = padding.left + i * groupWidth;
          const offsetX = (groupWidth - 2 * barWidth - barGap) / 2;
          
          const bar1Height = (d.value1 / maxValue) * chartHeight;
          const x1 = groupX + offsetX;
          const y1 = padding.top + chartHeight - bar1Height;
          
          const bar2Height = (d.value2 / maxValue) * chartHeight;
          const x2 = groupX + offsetX + barWidth + barGap;
          const y2 = padding.top + chartHeight - bar2Height;
          
          return (
            <g key={i}>
              <rect x={x1} y={y1} width={barWidth} height={bar1Height} fill={color1} rx="2" />
              <text x={x1 + barWidth / 2} y={y1 - 3} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
                {d.value1}
              </text>
              <rect x={x2} y={y2} width={barWidth} height={bar2Height} fill={color2} rx="2" />
              <text x={x2 + barWidth / 2} y={y2 - 3} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
                {d.value2}
              </text>
              <text 
                x={groupX + groupWidth / 2} 
                y={height - padding.bottom + 15} 
                textAnchor="middle" 
                fontSize="9" 
                fill="var(--text-muted)"
                transform={`rotate(-30, ${groupX + groupWidth / 2}, ${height - padding.bottom + 15})`}
              >
                {d.label.length > 8 ? d.label.substring(0, 8) + '...' : d.label}
              </text>
            </g>
          );
        })}
        
        <g transform={`translate(${width - padding.right - 130}, ${padding.top + 5})`}>
          <rect x="0" y="0" width="12" height="10" fill={color1} rx="2" />
          <text x="16" y="9" fontSize="10" fill="var(--text-secondary)">{label1}</text>
          <rect x="70" y="0" width="12" height="10" fill={color2} rx="2" />
          <text x="86" y="9" fontSize="10" fill="var(--text-secondary)">{label2}</text>
        </g>
      </svg>
    </div>
  );
}

function UtilizationChart({ 
  data, 
  title, 
  color = '#3B82F6',
  width = 600,
  height = 200 
}: { 
  data: UtilizationRecord[]; 
  title: string;
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        borderRadius: '8px'
      }}>
        暂无利用率数据
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTime = Math.max(...data.map(d => d.time_s));
  const minTime = Math.min(...data.map(d => d.time_s));
  const timeRange = maxTime - minTime || 1;

  const xScale = (time: number) => padding.left + ((time - minTime) / timeRange) * chartWidth;
  const yScale = (util: number) => padding.top + chartHeight - (util / 100) * chartHeight;

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.time_s)} ${yScale(d.utilization_percent)}`)
    .join(' ');

  const areaD = `${pathD} L ${xScale(data[data.length - 1].time_s)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const formatChartTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m${s}s` : `${s}s`;
  };

  const yTicks = [0, 25, 50, 75, 100];
  const xTickCount = 5;
  const xTickInterval = timeRange / (xTickCount - 1);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => minTime + i * xTickInterval);

  return (
    <div style={{ marginBottom: '16px' }}>
      <h6 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>{title}</h6>
      <svg width={width} height={height} style={{ background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        <defs>
          <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {yTicks.map(tick => (
          <g key={`y-${tick}`}>
            <line
              x1={padding.left}
              y1={yScale(tick)}
              x2={width - padding.right}
              y2={yScale(tick)}
              stroke="var(--border-light)"
              strokeDasharray="2,2"
            />
            <text
              x={padding.left - 8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {tick}%
            </text>
          </g>
        ))}
        
        {xTicks.map(tick => (
          <g key={`x-${tick}`}>
            <line
              x1={xScale(tick)}
              y1={padding.top}
              x2={xScale(tick)}
              y2={height - padding.bottom}
              stroke="var(--border-light)"
              strokeDasharray="2,2"
            />
            <text
              x={xScale(tick)}
              y={height - padding.bottom + 15}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {formatChartTime(tick)}
            </text>
          </g>
        ))}
        
        <path d={areaD} fill={`url(#gradient-${title.replace(/\s/g, '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {data.filter((_, i) => i % Math.ceil(data.length / 10) === 0 || i === data.length - 1).map((d, i) => (
          <circle
            key={i}
            cx={xScale(d.time_s)}
            cy={yScale(d.utilization_percent)}
            r="3"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}

function StockHistoryChart({ 
  data, 
  title,
  width = 600,
  height = 200 
}: { 
  data: StockHistoryRecord[]; 
  title: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        borderRadius: '8px'
      }}>
        暂无库存变化数据
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTime = Math.max(...data.map(d => d.time_s));
  const minTime = Math.min(...data.map(d => d.time_s));
  const timeRange = maxTime - minTime || 1;
  const maxValue = Math.max(...data.map(d => Math.max(d.stock, d.waiting_entry)), 1);

  const xScale = (time: number) => padding.left + ((time - minTime) / timeRange) * chartWidth;
  const yScale = (val: number) => padding.top + chartHeight - (val / maxValue) * chartHeight;

  const stockPathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.time_s)} ${yScale(d.stock)}`)
    .join(' ');

  const waitingPathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.time_s)} ${yScale(d.waiting_entry)}`)
    .join(' ');

  const formatChartTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m${s}s` : `${s}s`;
  };

  const yTickCount = 5;
  const yTickInterval = maxValue / (yTickCount - 1);
  const yTicks = Array.from({ length: yTickCount }, (_, i) => Math.round(i * yTickInterval));

  const xTickCount = 5;
  const xTickInterval = timeRange / (xTickCount - 1);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => minTime + i * xTickInterval);

  return (
    <div style={{ marginBottom: '16px' }}>
      <h6 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>{title}</h6>
      <svg width={width} height={height} style={{ background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        {yTicks.map(tick => (
          <g key={`y-${tick}`}>
            <line
              x1={padding.left}
              y1={yScale(tick)}
              x2={width - padding.right}
              y2={yScale(tick)}
              stroke="var(--border-light)"
              strokeDasharray="2,2"
            />
            <text
              x={padding.left - 8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {tick}
            </text>
          </g>
        ))}
        
        {xTicks.map(tick => (
          <g key={`x-${tick}`}>
            <line
              x1={xScale(tick)}
              y1={padding.top}
              x2={xScale(tick)}
              y2={height - padding.bottom}
              stroke="var(--border-light)"
              strokeDasharray="2,2"
            />
            <text
              x={xScale(tick)}
              y={height - padding.bottom + 15}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {formatChartTime(tick)}
            </text>
          </g>
        ))}
        
        <path d={stockPathD} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={waitingPathD} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        <g transform={`translate(${width - padding.right - 120}, ${padding.top + 5})`}>
          <rect x="0" y="0" width="12" height="3" fill="#3B82F6" />
          <text x="16" y="4" fontSize="10" fill="var(--text-secondary)">库存量</text>
          <rect x="70" y="0" width="12" height="3" fill="#EF4444" />
          <text x="86" y="4" fontSize="10" fill="var(--text-secondary)">等待入库量</text>
        </g>
      </svg>
    </div>
  );
}

interface GanttBar {
  deviceName: string;
  productCode: string;
  productName: string;
  startTime: number;
  endTime: number;
  count: number;
  color: string;
  taskType?: string;
}

function GanttChart({ 
  data, 
  productColors,
  durationS,
  width = 900,
  height = 400
}: { 
  data: GanttBar[];
  productColors: Record<string, string>;
  durationS: number;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        borderRadius: '8px'
      }}>
        暂无数据
      </div>
    );
  }

  const padding = { top: 30, right: 120, bottom: 40, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const devices = [...new Set(data.map(d => d.deviceName))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const allProducts = [...new Set(data.map(d => d.productCode))];
  
  const maxTime = durationS || Math.max(...data.map(d => d.endTime), 1);
  const timeStep = 300;
  const numTimeSteps = Math.ceil(maxTime / timeStep);
  
  const rowHeight = chartHeight / devices.length;
  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6'];

  const formatTimeLabel = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}`;
  };

  const getProductColor = (productCode: string): string => {
    return productColors[productCode] || defaultColors[allProducts.indexOf(productCode) % defaultColors.length];
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <h6 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>甘特图（设备加工时间线）</h6>
      <svg width={width} height={height} style={{ background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        <defs>
          {devices.map((_, i) => (
            <pattern 
              key={`pattern-${i}`}
              id={`grid-${i}`} 
              patternUnits="userSpaceOnUse" 
              width={chartWidth / numTimeSteps}
              height={rowHeight}
            >
              <rect 
                width={chartWidth / numTimeSteps} 
                height={rowHeight} 
                fill={i % 2 === 0 ? 'rgba(128,128,128,0.05)' : 'rgba(128,128,128,0.02)'}
              />
            </pattern>
          ))}
        </defs>

        {Array.from({ length: numTimeSteps + 1 }).map((_, i) => {
          const x = padding.left + (i * timeStep / maxTime) * chartWidth;
          const tickValue = i * timeStep;
          return (
            <g key={`vline-${i}`}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke="#666666"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - padding.bottom + 18}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-muted)"
              >
                {formatTimeLabel(tickValue)}
              </text>
            </g>
          );
        })}

        {devices.map((device, i) => {
          const y = padding.top + i * rowHeight;
          return (
            <g key={`device-${i}`}>
              <rect
                x={padding.left}
                y={y}
                width={chartWidth}
                height={rowHeight}
                fill={`url(#grid-${i})`}
              />
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#999999"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + rowHeight / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--text-secondary)"
                fontWeight="500"
              >
                {device.length > 12 ? device.substring(0, 12) + '...' : device}
              </text>
              
              {data
                .filter(d => d.deviceName === device)
                .map((bar, j) => {
                  const x = padding.left + (bar.startTime / maxTime) * chartWidth;
                  const barWidth = ((bar.endTime - bar.startTime) / maxTime) * chartWidth;
                  const isToolSwitch = bar.taskType === '工具切换';
                  const color = isToolSwitch ? '#F97316' : (bar.color || getProductColor(bar.productCode));
                  
                  if (barWidth < 2) return null;
                  
                  return (
                    <g key={`bar-${j}`}>
                      <rect
                        x={x}
                        y={y + 3}
                        width={Math.max(barWidth, 1)}
                        height={rowHeight - 6}
                        fill={color}
                        stroke="#000000"
                        strokeWidth="1"
                      />
                      {barWidth > 25 && (
                        <text
                          x={x + barWidth / 2}
                          y={y + rowHeight / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="10"
                          fill="white"
                          fontWeight="bold"
                          style={{
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                          }}
                        >
                          {bar.count}
                        </text>
                      )}
                    </g>
                  );
                })}
            </g>
          );
        })}

        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="none"
          stroke="#000000"
          strokeWidth="2"
        />

        <text
          x={padding.left + chartWidth / 2}
          y={height - 5}
          textAnchor="middle"
          fontSize="11"
          fill="var(--text-muted)"
        >
          时间 (分钟)
        </text>
      </svg>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>图例：</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px' }}>
          <div style={{ 
            width: '14px', 
            height: '14px', 
            backgroundColor: '#F97316', 
            border: '1px solid #000000'
          }} />
          <span style={{ color: 'var(--text-muted)' }}>工具切换</span>
        </div>
        {allProducts.map(code => {
          const productData = data.find(d => d.productCode === code && d.taskType !== '工具切换');
          if (!productData) return null;
          return (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px' }}>
              <div style={{ 
                width: '14px', 
                height: '14px', 
                backgroundColor: getProductColor(code), 
                border: '1px solid #000000'
              }} />
              <span style={{ color: 'var(--text-muted)' }}>{productData?.productName || code}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function computeProductMaterialConsumption(
  results: SimulationResults,
  products: Record<string, { name: string; color: string }>,
  materials: Record<string, { name: string; unit: string }>,
  filterDeviceId?: string
): { productCode: string; productName: string; productColor: string; materials: { code: string; name: string; quantity: number; unit: string }[] }[] {
  const productMaterialMap: Record<string, Record<string, { quantity: number; unit: string }>> = {};

  const recordEntries = filterDeviceId
    ? { [filterDeviceId]: results.processing_records[filterDeviceId] || [] }
    : results.processing_records;

  Object.values(recordEntries).forEach(records => {
    records.forEach(record => {
      if (record.task_type === '工具切换') return;
      const productCode = record.product_code;
      if (!productMaterialMap[productCode]) {
        productMaterialMap[productCode] = {};
      }
      Object.entries(record.materials_used).forEach(([materialCode, qty]) => {
        if (!productMaterialMap[productCode][materialCode]) {
          const material = materials[materialCode];
          productMaterialMap[productCode][materialCode] = {
            quantity: 0,
            unit: material?.unit || ''
          };
        }
        productMaterialMap[productCode][materialCode].quantity += qty;
      });
    });
  });

  return Object.entries(productMaterialMap).map(([productCode, mats]) => {
    const product = products[productCode];
    return {
      productCode,
      productName: product?.name || productCode,
      productColor: product?.color || '#3B82F6',
      materials: Object.entries(mats).map(([code, data]) => ({
        code,
        name: materials[code]?.name || code,
        quantity: data.quantity,
        unit: data.unit
      })).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    };
  }).sort((a, b) => a.productName.localeCompare(b.productName, 'zh-CN'));
}

function generateSvgBarChart(
  data: { label: string; value: number; color?: string }[],
  title: string,
  width = 700,
  height = 220,
  valueSuffix = ''
): string {
  if (!data || data.length === 0) return '';
  const padding = { top: 30, right: 20, bottom: 60, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(40, (chartWidth / data.length) * 0.7);
  const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);
  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  let svg = `<svg width="${width}" height="${height}" style="background:#f8f9fa;border-radius:8px;margin:8px 0;">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-size="12" fill="#555" font-weight="500">${title}</text>`;

  [0, 25, 50, 75, 100].forEach(tick => {
    const y = padding.top + chartHeight - (tick / 100) * chartHeight;
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-dasharray="2,2"/>`;
    svg += `<text x="${padding.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="#888">${Math.round(maxValue * tick / 100)}${valueSuffix}</text>`;
  });

  data.forEach((d, i) => {
    const barHeight = (d.value / maxValue) * chartHeight;
    const x = padding.left + barGap + i * (barWidth + barGap);
    const y = padding.top + chartHeight - barHeight;
    const color = d.color || defaultColors[i % defaultColors.length];
    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2"/>`;
    svg += `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="10" fill="#333">${d.value.toFixed(d.value % 1 === 0 ? 0 : 1)}</text>`;
    const label = d.label.length > 8 ? d.label.substring(0, 8) + '...' : d.label;
    svg += `<text x="${x + barWidth / 2}" y="${height - padding.bottom + 15}" text-anchor="middle" font-size="9" fill="#888" transform="rotate(-30, ${x + barWidth / 2}, ${height - padding.bottom + 15})">${label}</text>`;
  });

  svg += `</svg>`;
  return svg;
}

function generateSvgGroupedBarChart(
  data: { deviceName: string; products: { code: string; count: number }[] }[],
  title: string,
  productColorMap: Record<string, string>,
  width = 700,
  height = 260
): string {
  if (!data || data.length === 0) return '';
  const padding = { top: 30, right: 20, bottom: 80, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const allProducts = [...new Set(data.flatMap(d => d.products.map(p => p.code)))];
  const maxValue = Math.max(...data.flatMap(d => d.products.map(p => p.count)), 1);
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(20, (groupWidth * 0.8) / allProducts.length);
  const barGap = 2;
  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  let svg = `<svg width="${width}" height="${height}" style="background:#f8f9fa;border-radius:8px;margin:8px 0;">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-size="12" fill="#555" font-weight="500">${title}</text>`;

  [0, 25, 50, 75, 100].forEach(tick => {
    const y = padding.top + chartHeight - (tick / 100) * chartHeight;
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-dasharray="2,2"/>`;
    svg += `<text x="${padding.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="#888">${Math.round(maxValue * tick / 100)}</text>`;
  });

  data.forEach((device, deviceIdx) => {
    const groupX = padding.left + deviceIdx * groupWidth;
    device.products.forEach((product, productIdx) => {
      const barHeight = (product.count / maxValue) * chartHeight;
      const x = groupX + (groupWidth - allProducts.length * (barWidth + barGap)) / 2 + productIdx * (barWidth + barGap);
      const y = padding.top + chartHeight - barHeight;
      const color = productColorMap[product.code] || defaultColors[allProducts.indexOf(product.code) % defaultColors.length];
      svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2"/>`;
      if (product.count > 0) {
        svg += `<text x="${x + barWidth / 2}" y="${y - 3}" text-anchor="middle" font-size="9" fill="#333">${product.count}</text>`;
      }
    });
    const x = padding.left + deviceIdx * groupWidth + groupWidth / 2;
    const label = device.deviceName.length > 8 ? device.deviceName.substring(0, 8) + '...' : device.deviceName;
    svg += `<text x="${x}" y="${height - padding.bottom + 15}" text-anchor="middle" font-size="9" fill="#888" transform="rotate(-30, ${x}, ${height - padding.bottom + 15})">${label}</text>`;
  });

  svg += `</svg>`;
  return svg;
}

function generateSvgDualBarChart(
  data: { label: string; value1: number; value2: number }[],
  title: string,
  label1: string,
  label2: string,
  color1 = '#3B82F6',
  color2 = '#EF4444',
  width = 700,
  height = 260
): string {
  if (!data || data.length === 0) return '';
  const padding = { top: 30, right: 20, bottom: 80, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.flatMap(d => [d.value1, d.value2]), 1);
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(25, (groupWidth * 0.7) / 2);
  const barGap = 2;

  let svg = `<svg width="${width}" height="${height}" style="background:#f8f9fa;border-radius:8px;margin:8px 0;">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-size="12" fill="#555" font-weight="500">${title}</text>`;

  [0, 25, 50, 75, 100].forEach(tick => {
    const y = padding.top + chartHeight - (tick / 100) * chartHeight;
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-dasharray="2,2"/>`;
    svg += `<text x="${padding.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="#888">${Math.round(maxValue * tick / 100)}</text>`;
  });

  data.forEach((d, i) => {
    const groupX = padding.left + i * groupWidth;
    const offsetX = (groupWidth - 2 * barWidth - barGap) / 2;

    const bar1Height = (d.value1 / maxValue) * chartHeight;
    const x1 = groupX + offsetX;
    const y1 = padding.top + chartHeight - bar1Height;
    svg += `<rect x="${x1}" y="${y1}" width="${barWidth}" height="${bar1Height}" fill="${color1}" rx="2"/>`;
    svg += `<text x="${x1 + barWidth / 2}" y="${y1 - 3}" text-anchor="middle" font-size="9" fill="#333">${d.value1}</text>`;

    const bar2Height = (d.value2 / maxValue) * chartHeight;
    const x2 = groupX + offsetX + barWidth + barGap;
    const y2 = padding.top + chartHeight - bar2Height;
    svg += `<rect x="${x2}" y="${y2}" width="${barWidth}" height="${bar2Height}" fill="${color2}" rx="2"/>`;
    svg += `<text x="${x2 + barWidth / 2}" y="${y2 - 3}" text-anchor="middle" font-size="9" fill="#333">${d.value2}</text>`;

    const labelText = d.label.length > 8 ? d.label.substring(0, 8) + '...' : d.label;
    svg += `<text x="${groupX + groupWidth / 2}" y="${height - padding.bottom + 15}" text-anchor="middle" font-size="9" fill="#888" transform="rotate(-30, ${groupX + groupWidth / 2}, ${height - padding.bottom + 15})">${labelText}</text>`;
  });

  const legendX = width - padding.right - 130;
  const legendY = padding.top + 5;
  svg += `<rect x="${legendX}" y="${legendY}" width="12" height="10" fill="${color1}" rx="2"/>`;
  svg += `<text x="${legendX + 16}" y="${legendY + 9}" font-size="10" fill="#555">${label1}</text>`;
  svg += `<rect x="${legendX + 70}" y="${legendY}" width="12" height="10" fill="${color2}" rx="2"/>`;
  svg += `<text x="${legendX + 86}" y="${legendY + 9}" font-size="10" fill="#555">${label2}</text>`;

  svg += `</svg>`;
  return svg;
}

function generateSvgUtilizationChart(
  data: UtilizationRecord[],
  title: string,
  color = '#3B82F6',
  width = 700,
  height = 220
): string {
  if (!data || data.length === 0) return '';
  const padding = { top: 30, right: 20, bottom: 40, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxTime = Math.max(...data.map(d => d.time_s));
  const minTime = Math.min(...data.map(d => d.time_s));
  const timeRange = maxTime - minTime || 1;
  const xScale = (time: number) => padding.left + ((time - minTime) / timeRange) * chartWidth;
  const yScale = (util: number) => padding.top + chartHeight - (util / 100) * chartHeight;
  const formatChartTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m${s}s` : `${s}s`;
  };

  let svg = `<svg width="${width}" height="${height}" style="background:#f8f9fa;border-radius:8px;margin:8px 0;">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-size="12" fill="#555" font-weight="500">${title}</text>`;

  const gradId = `grad-${title.replace(/\s/g, '')}`;
  svg += `<defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0.05"/></linearGradient></defs>`;

  [0, 25, 50, 75, 100].forEach(tick => {
    const y = yScale(tick);
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-dasharray="2,2"/>`;
    svg += `<text x="${padding.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="#888">${tick}%</text>`;
  });

  const xTickCount = 5;
  const xTickInterval = timeRange / (xTickCount - 1);
  Array.from({ length: xTickCount }, (_, i) => minTime + i * xTickInterval).forEach(tick => {
    svg += `<line x1="${xScale(tick)}" y1="${padding.top}" x2="${xScale(tick)}" y2="${height - padding.bottom}" stroke="#e0e0e0" stroke-dasharray="2,2"/>`;
    svg += `<text x="${xScale(tick)}" y="${height - padding.bottom + 15}" text-anchor="middle" font-size="10" fill="#888">${formatChartTime(tick)}</text>`;
  });

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.time_s)} ${yScale(d.utilization_percent)}`).join(' ');
  const areaD = `${pathD} L ${xScale(data[data.length - 1].time_s)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;
  svg += `<path d="${areaD}" fill="url(#${gradId})"/>`;
  svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  data.filter((_, i) => i % Math.ceil(data.length / 10) === 0 || i === data.length - 1).forEach(d => {
    svg += `<circle cx="${xScale(d.time_s)}" cy="${yScale(d.utilization_percent)}" r="3" fill="${color}" stroke="white" stroke-width="1"/>`;
  });

  svg += `</svg>`;
  return svg;
}

function generateSvgStockHistoryChart(
  data: StockHistoryRecord[],
  title: string,
  width = 700,
  height = 220
): string {
  if (!data || data.length === 0) return '';
  const padding = { top: 30, right: 20, bottom: 40, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxTime = Math.max(...data.map(d => d.time_s));
  const minTime = Math.min(...data.map(d => d.time_s));
  const timeRange = maxTime - minTime || 1;
  const maxValue = Math.max(...data.map(d => Math.max(d.stock, d.waiting_entry)), 1);
  const xScale = (time: number) => padding.left + ((time - minTime) / timeRange) * chartWidth;
  const yScale = (val: number) => padding.top + chartHeight - (val / maxValue) * chartHeight;
  const formatChartTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m${s}s` : `${s}s`;
  };

  let svg = `<svg width="${width}" height="${height}" style="background:#f8f9fa;border-radius:8px;margin:8px 0;">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-size="12" fill="#555" font-weight="500">${title}</text>`;

  const yTickCount = 5;
  const yTickInterval = maxValue / (yTickCount - 1);
  Array.from({ length: yTickCount }, (_, i) => Math.round(i * yTickInterval)).forEach(tick => {
    const y = yScale(tick);
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-dasharray="2,2"/>`;
    svg += `<text x="${padding.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="#888">${tick}</text>`;
  });

  const xTickCount = 5;
  const xTickInterval = timeRange / (xTickCount - 1);
  Array.from({ length: xTickCount }, (_, i) => minTime + i * xTickInterval).forEach(tick => {
    svg += `<line x1="${xScale(tick)}" y1="${padding.top}" x2="${xScale(tick)}" y2="${height - padding.bottom}" stroke="#e0e0e0" stroke-dasharray="2,2"/>`;
    svg += `<text x="${xScale(tick)}" y="${height - padding.bottom + 15}" text-anchor="middle" font-size="10" fill="#888">${formatChartTime(tick)}</text>`;
  });

  const stockPathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.time_s)} ${yScale(d.stock)}`).join(' ');
  svg += `<path d="${stockPathD}" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  const waitingPathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.time_s)} ${yScale(d.waiting_entry)}`).join(' ');
  svg += `<path d="${waitingPathD}" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  const legendX = width - padding.right - 130;
  const legendY = padding.top + 5;
  svg += `<rect x="${legendX}" y="${legendY}" width="12" height="3" fill="#3B82F6"/>`;
  svg += `<text x="${legendX + 16}" y="${legendY + 4}" font-size="10" fill="#555">库存量</text>`;
  svg += `<rect x="${legendX + 70}" y="${legendY}" width="12" height="3" fill="#EF4444"/>`;
  svg += `<text x="${legendX + 86}" y="${legendY + 4}" font-size="10" fill="#555">等待入库量</text>`;

  svg += `</svg>`;
  return svg;
}

export default function SimulationRecordsModal({ onClose, deviceId, connectionId }: SimulationRecordsModalProps) {
  const getSimulationRecords = useAppStore((state) => state.getSimulationRecords);
  const getSimulationRecord = useAppStore((state) => state.getSimulationRecord);
  const deleteSimulationRecord = useAppStore((state) => state.deleteSimulationRecord);
  const canvas = useAppStore((state) => state.canvas);
  
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SimulationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const getNodeName = () => {
    if (deviceId) {
      const device = canvas.devices[deviceId];
      return device?.name || deviceId;
    }
    if (connectionId) {
      const conn = canvas.connections[connectionId];
      return conn?.name || connectionId;
    }
    return null;
  };

  const getModalTitle = () => {
    const nodeName = getNodeName();
    if (nodeName) {
      return `${nodeName} 模拟详细记录`;
    }
    return '模拟运行统计数据';
  };

  const handleExport = async () => {
    if (!selectedRecord) return;
    
    const nodeName = getNodeName();
    const defaultName = nodeName 
      ? `${nodeName}_模拟记录_${selectedRecord.timestamp.replace(/[:\s]/g, '-')}.json`
      : `模拟记录_${selectedRecord.timestamp.replace(/[:\s]/g, '-')}.json`;
    
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (path) {
      try {
        const exportData: Record<string, unknown> = {
          exportTime: new Date().toISOString(),
          record: {
            id: selectedRecord.id,
            timestamp: selectedRecord.timestamp,
            duration_s: selectedRecord.duration_s,
            completed_products: selectedRecord.completed_products,
          },
          results: selectedRecord.results,
        };

        if (deviceId && selectedRecord.results.processing_records[deviceId]) {
          exportData.deviceProcessingRecords = selectedRecord.results.processing_records[deviceId];
        }
        
        if (connectionId && selectedRecord.results.transport_records[connectionId]) {
          exportData.connectionTransportRecords = selectedRecord.results.transport_records[connectionId];
        }

        await writeTextFile(path, JSON.stringify(exportData, null, 2));
        alert('导出成功');
      } catch (error) {
        console.error('Export failed:', error);
        alert('导出失败: ' + error);
      }
    }
  };

  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingMd, setExportingMd] = useState(false);

  const handleExportPdf = async () => {
    if (!selectedRecord) return;
    setExportingPdf(true);

    try {
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;background:#fff;padding:30px;font-family:system-ui,-apple-system,sans-serif;color:#333;font-size:13px;line-height:1.5;';

      const formatTimePdf = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      const results = selectedRecord.results;

      let html = `<div data-pdf-section style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:20px;margin:0 0 8px 0;">模拟运行统计报告</h1>
        <p style="font-size:12px;color:#666;margin:0;">记录时间: ${new Date(selectedRecord.timestamp).toLocaleString()} | 模拟时长: ${formatTimePdf(results.duration_s)} | 完成产品: ${results.completed_products}件</p>
      </div>`;

      html += `<div data-pdf-section style="margin-bottom:20px;">
        <h2 style="font-size:16px;border-bottom:2px solid #3B82F6;padding-bottom:6px;margin:0 0 12px 0;">总体统计</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;width:33%;">模拟时长</td>
            <td style="padding:6px 12px;border:1px solid #ddd;width:67%;">${formatTimePdf(results.duration_s)}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">完成产品</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${results.completed_products} 件</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">整体最大在制品数</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${results.max_total_wip} 件</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">模拟模式</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${results.simulation_mode === 'fixed_output' ? '固定产量' : '固定时长'}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">资源选择规则</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${results.resource_selection_rule === 'min_wip_dynamic' ? '动态平衡(在制品)' : results.resource_selection_rule === 'min_utilrate_dynamic' ? '动态平衡(利用率)' : '基础规则'}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">多仓库选择优先级</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${(results.warehouse_selection_priorities || []).map((p: string, i: number) => {
              const labels: Record<string, string> = {
                nearest_distance: '距离最近',
                farthest_distance: '距离最远',
                lowest_utilization: '利用率最低',
                highest_utilization: '利用率最高',
                product_concentrated: '按产品集中',
                product_dispersed: '按产品分散',
                least_waiting_entry: '等待入库最少',
              };
              return `${i + 1}:${labels[p] || p}`;
            }).join(' → ')}</td>
          </tr>
        </table>
      </div>`;

      const productCounts = results.completed_products_by_code || {};
      if (Object.keys(productCounts).length > 0) {
        html += `<div data-pdf-section style="margin-bottom:20px;">
        <h3 style="font-size:14px;margin:12px 0 8px 0;">完成产品数（按产品种类）</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">数量</th></tr>
          ${Object.entries(productCounts).map(([code, count]) => {
            const product = canvas.products?.[code];
            return `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${product?.name || code}</td><td style="padding:6px 12px;border:1px solid #ddd;">${count}</td></tr>`;
          }).join('')}
        </table>
        </div>`;
      }

      if (results.product_avg_process_times && results.product_avg_process_times.length > 0) {
        html += `<div data-pdf-section style="margin-bottom:20px;">
        <h3 style="font-size:14px;margin:12px 0 8px 0;">产品平均处理时长</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">加工次数</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">平均处理时长(秒)</th></tr>
          ${results.product_avg_process_times.map(stat => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${stat.product_name || stat.product_code}</td><td style="padding:6px 12px;border:1px solid #ddd;">${stat.count}</td><td style="padding:6px 12px;border:1px solid #ddd;">${stat.avg_process_time_s.toFixed(2)}</td></tr>`).join('')}
        </table>
        </div>`;
      }

      if (results.material_consumption && Object.keys(results.material_consumption).length > 0) {
        html += `<div data-pdf-section style="margin-bottom:20px;">
        <h3 style="font-size:14px;margin:12px 0 8px 0;">原料消耗量</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">原料</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">消耗量</th></tr>
          ${Object.entries(results.material_consumption).map(([code, qty]) => {
            const material = canvas.materials?.[code];
            const unit = material?.unit || '';
            return `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${material?.name || code}</td><td style="padding:6px 12px;border:1px solid #ddd;">${qty}${unit}</td></tr>`;
          }).join('')}
        </table>
        </div>`;
      }

      const productMaterialData = computeProductMaterialConsumption(results, canvas.products || {}, canvas.materials || {});
      if (productMaterialData.length > 0) {
        const allMats = [...new Set(productMaterialData.flatMap(p => p.materials.map(m => m.code)))];
        if (allMats.length > 0) {
          html += `<div data-pdf-section style="margin-bottom:20px;">
          <h3 style="font-size:14px;margin:12px 0 8px 0;">按产品各类原料总消耗量</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">原料</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">计量单位</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">消耗数量</th></tr>
            ${productMaterialData.map(p => 
              p.materials.map((m, mIdx) => 
                `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${mIdx === 0 ? p.productName : ''}</td><td style="padding:6px 12px;border:1px solid #ddd;">${m.name}</td><td style="padding:6px 12px;border:1px solid #ddd;">${m.unit || '-'}</td><td style="padding:6px 12px;border:1px solid #ddd;">${m.quantity.toFixed(2)}${m.unit || ''}</td></tr>`
              ).join('')
            ).join('')}
          </table>
          </div>`;
        }
      }

      html += `<div data-pdf-section style="margin-bottom:20px;">`;
      html += `<h2 style="font-size:16px;border-bottom:2px solid #3B82F6;padding-bottom:6px;margin:0 0 12px 0;">统计图表</h2>`;
      html += `</div>`;

      const productCountsChart = results.completed_products_by_code || {};
      if (Object.keys(productCountsChart).length > 0) {
        html += `<div data-pdf-section style="margin-bottom:20px;">`;
        html += generateSvgBarChart(
          Object.entries(productCountsChart).map(([code, count]) => ({
            label: canvas.products?.[code]?.name || code,
            value: count,
            color: canvas.products?.[code]?.color
          })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
          '完成产品数（按产品种类）'
        );
        html += `</div>`;
      }

      if (results.product_avg_process_times && results.product_avg_process_times.length > 0) {
        html += `<div data-pdf-section style="margin-bottom:20px;">`;
        html += generateSvgBarChart(
          results.product_avg_process_times.map(stat => ({
            label: stat.product_name || stat.product_code,
            value: stat.avg_process_time_s,
            color: stat.product_color
          })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
          '产品平均处理时长（秒）'
        );
        html += `</div>`;
      }

      if (results.material_consumption && Object.keys(results.material_consumption).length > 0) {
        const matByUnit: Record<string, { label: string; value: number }[]> = {};
        Object.entries(results.material_consumption).forEach(([code, quantity]) => {
          const material = canvas.materials?.[code];
          const unit = material?.unit || '';
          const unitKey = unit || '无单位';
          if (!matByUnit[unitKey]) matByUnit[unitKey] = [];
          matByUnit[unitKey].push({ label: material?.name || code, value: quantity });
        });
        Object.keys(matByUnit).forEach(unitKey => {
          matByUnit[unitKey].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
        });
        Object.entries(matByUnit).sort(([a], [b]) => a.localeCompare(b)).forEach(([unitKey, chartData]) => {
          html += `<div data-pdf-section style="margin-bottom:20px;">`;
          html += generateSvgBarChart(
            chartData,
            `原料消耗量${unitKey === '无单位' ? '' : `（单位：${unitKey}）`}`,
            700, 220, unitKey === '无单位' ? '' : unitKey
          );
          html += `</div>`;
        });
      }

      if (productMaterialData.length > 0) {
        const allMats = [...new Set(productMaterialData.flatMap(p => p.materials.map(m => m.code)))];
        if (allMats.length > 0) {
          const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
          const byUnitGroups: Record<string, typeof productMaterialData> = {};
          productMaterialData.forEach(p => {
            const units = [...new Set(p.materials.map(m => m.unit || '无单位'))];
            units.forEach(u => {
              if (!byUnitGroups[u]) byUnitGroups[u] = [];
              const filteredMaterials = p.materials.filter(m => (m.unit || '无单位') === u);
              if (filteredMaterials.length > 0) {
                const existing = byUnitGroups[u].find(e => e.productCode === p.productCode);
                if (existing) {
                  existing.materials = [...existing.materials, ...filteredMaterials];
                } else {
                  byUnitGroups[u].push({ ...p, materials: filteredMaterials });
                }
              }
            });
          });
          Object.entries(byUnitGroups).sort(([a], [b]) => a.localeCompare(b)).forEach(([unit, data]) => {
            html += `<div data-pdf-section style="margin-bottom:20px;">`;
            html += generateSvgGroupedBarChart(
              data.map(p => ({
                deviceName: p.productName,
                products: p.materials.map(m => ({ code: m.name, count: m.quantity }))
              })),
              `按产品各类原料总消耗量${unit === '无单位' ? '' : `（单位：${unit}）`}`,
              Object.fromEntries(allMats.map((code, i) => [code, defaultColors[i % defaultColors.length]]))
            );
            html += `</div>`;
          });
        }
      }

      html += `<div data-pdf-section style="margin-bottom:20px;">`;
      html += generateSvgBarChart(
        results.device_stats.map(stat => ({
          label: stat.device_name,
          value: stat.utilization
        })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
        '设备利用率（按设备）', 700, 220, '%'
      );
      html += `</div>`;

      if (results.connection_stats && results.connection_stats.length > 0) {
        html += `<div data-pdf-section style="margin-bottom:20px;">`;
        html += generateSvgBarChart(
          results.connection_stats.map(stat => ({
            label: stat.connection_name,
            value: stat.utilization
          })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
          '运输线路利用率（按运输线路）', 700, 220, '%'
        );
        html += `</div>`;
      }

      html += `<div data-pdf-section style="margin-bottom:20px;">`;
      html += generateSvgGroupedBarChart(
        results.device_stats.map(stat => ({
          deviceName: stat.device_name,
          products: Object.entries(stat.by_product || {}).map(([code, data]) => ({
            code,
            count: data.count
          }))
        })).sort((a, b) => a.deviceName.localeCompare(b.deviceName, 'zh-CN')),
        '设备加工产品数量（按设备分组）',
        Object.fromEntries(Object.entries(canvas.products || {}).map(([code, p]) => [code, p.color]))
      );
      html += `</div>`;

      html += `<div data-pdf-section style="margin-bottom:20px;">`;
      html += generateSvgBarChart(
        results.device_stats.map(stat => ({
          label: stat.device_name,
          value: stat.max_wip
        })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
        '设备最大在制品数（按设备）'
      );
      html += `</div>`;

      if (results.storage_stats && results.storage_stats.length > 0) {
        html += `<div data-pdf-section style="margin-bottom:20px;">`;
        html += generateSvgBarChart(
          results.storage_stats.filter(stat => stat.capacity > 0).map(stat => ({
            label: stat.device_name,
            value: stat.capacity > 0 ? ((stat.max_stock ?? stat.stock) / stat.capacity) * 100 : 0
          })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
          '仓库最大利用率', 700, 220, '%'
        );
        html += `</div>`;
        
        html += `<div data-pdf-section style="margin-bottom:20px;">`;
        html += generateSvgDualBarChart(
          results.storage_stats.map(stat => ({
            label: stat.device_name,
            value1: stat.max_stock ?? stat.stock,
            value2: stat.max_waiting_entry ?? 0
          })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
          '仓库最大等待入库量和库存量', '库存量', '等待入库量'
        );
        html += `</div>`;
      }

      html += `<div data-pdf-section style="margin-bottom:20px;">
        <h2 style="font-size:16px;border-bottom:2px solid #10B981;padding-bottom:6px;margin:0 0 12px 0;">设备统计</h2>
      </div>`;

      results.device_stats.forEach(stat => {
        const device = canvas.devices[stat.device_id];
        const deviceType = device?.type || '';
        html += `<div data-pdf-section style="margin-bottom:20px;">`;
        html += `<h3 style="font-size:14px;margin:12px 0 8px 0;">设备: ${stat.device_name} (${deviceType})</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">完成加工数</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${stat.completed} 件</td>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">利用率</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${stat.utilization.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">最大在制品数</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${stat.max_wip} 件</td>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">平均加工时长</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${stat.avg_proc_time_s.toFixed(2)}s</td>
          </tr>
        </table>`;

        if (stat.by_product && Object.keys(stat.by_product).length > 0) {
          html += `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
            <tr><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">加工数</th><th style="padding:6px 12px;border:1px solid #ddd;background:#f0f4ff;">平均时长(秒)</th></tr>
            ${Object.entries(stat.by_product).map(([code, data]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${data.product_name || code}</td><td style="padding:6px 12px;border:1px solid #ddd;">${data.count}</td><td style="padding:6px 12px;border:1px solid #ddd;">${data.avg_time_s.toFixed(2)}</td></tr>`).join('')}
          </table>`;
        }

        const devProductMaterials = computeProductMaterialConsumption(results, canvas.products || {}, canvas.materials || {}, stat.device_id);
        if (devProductMaterials.length > 0 && devProductMaterials.some(p => p.materials.length > 0)) {
          html += `<h4 style="font-size:13px;margin:8px 0 6px 0;">按产品各类原料消耗量</h4>
          <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;">
            <tr><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">原料</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">计量单位</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">消耗数量</th></tr>
            ${devProductMaterials.map(p => 
              p.materials.map((m, mIdx) => 
                `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${mIdx === 0 ? p.productName : ''}</td><td style="padding:4px 8px;border:1px solid #ddd;">${m.name}</td><td style="padding:4px 8px;border:1px solid #ddd;">${m.unit || '-'}</td><td style="padding:4px 8px;border:1px solid #ddd;">${m.quantity.toFixed(2)}${m.unit || ''}</td></tr>`
              ).join('')
            ).join('')}
          </table>`;
        }

        if (results.device_utilization_history && results.device_utilization_history[stat.device_id]) {
          html += generateSvgUtilizationChart(
            results.device_utilization_history[stat.device_id],
            `设备 ${stat.device_name} 实时利用率变化`,
            '#3B82F6'
          );
        }

        const processingRecords = results.processing_records[stat.device_id];
        if (processingRecords && processingRecords.length > 0) {
          html += `<h4 style="font-size:13px;margin:8px 0 6px 0;">加工记录详情</h4>
          <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;">
            <tr><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">过程产品ID</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">序号</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">任务类型</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">到达时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">开始时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">结束时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">用时</th></tr>
            ${processingRecords.map(record => {
              const taskType = record.task_type || '加工任务';
              const ppIdDisplay = record.task_type === '拆解任务' && record.disassembly_product_ids && record.disassembly_product_ids.length > 0 ? record.disassembly_product_ids.join(', ') : record.process_product_id;
              return `<tr><td style="padding:4px 8px;border:1px solid #ddd;word-break:break-all;max-width:100px;">${ppIdDisplay}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.product_code}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.sequence_number}</td><td style="padding:4px 8px;border:1px solid #ddd;${taskType === '工具切换' ? 'color:#F97316;font-weight:500;' : ''}">${taskType}</td><td style="padding:4px 8px;border:1px solid #ddd;">${formatTimePdf(record.arrive_time_s)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${formatTimePdf(record.start_time_s)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${formatTimePdf(record.end_time_s)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.duration_s.toFixed(2)}s</td></tr>`;
            }).join('')}
          </table>`;
        }

        const feedRecords = results.feed_records[stat.device_id];
        if (feedRecords && feedRecords.length > 0) {
          html += `<h4 style="font-size:13px;margin:8px 0 6px 0;">投料记录详情</h4>
          <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;">
            <tr><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">事件</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">状态</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">过程产品ID</th></tr>
            ${feedRecords.map(record => `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${formatTimePdf(record.time_s)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.event_type}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.feed_status}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.product_code}</td><td style="padding:4px 8px;border:1px solid #ddd;word-break:break-all;max-width:100px;">${record.process_product_id}</td></tr>`).join('')}
          </table>`;
        }

        const arrivalRecords = results.end_node_arrival_records?.[stat.device_id];
        if (arrivalRecords && arrivalRecords.length > 0) {
          html += `<h4 style="font-size:13px;margin:8px 0 6px 0;">到达记录详情</h4>
          <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;">
            <tr><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">过程产品ID</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">到达时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">经过节点</th></tr>
            ${arrivalRecords.map(record => {
              const visits = (record.node_visits || []).map(v => `${v.node_name}(${formatTimePdf(v.arrive_time_s)})`).join(' → ');
              return `<tr><td style="padding:4px 8px;border:1px solid #ddd;word-break:break-all;max-width:100px;">${record.process_product_id}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.product_name || record.product_code}</td><td style="padding:4px 8px;border:1px solid #ddd;">${formatTimePdf(record.arrive_time_s)}</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;">${visits}</td></tr>`;
            }).join('')}
          </table>`;
        }
        html += `</div>`;
      });

      html += `<div data-pdf-section style="margin-bottom:20px;">
        <h2 style="font-size:16px;border-bottom:2px solid #F59E0B;padding-bottom:6px;margin:0 0 12px 0;">运输线路统计</h2>
      </div>`;

      results.connection_stats.forEach(stat => {
        html += `<div data-pdf-section style="margin-bottom:20px;">`;
        html += `<h3 style="font-size:14px;margin:12px 0 8px 0;">运输线路: ${stat.connection_name} (${stat.from_device} → ${stat.to_device})</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">运输加工品数</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${stat.transport_count} 件</td>
            <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">利用率</td>
            <td style="padding:6px 12px;border:1px solid #ddd;">${stat.utilization.toFixed(1)}%</td>
          </tr>
        </table>`;

        const transportRecords = results.transport_records[stat.connection_id];
        if (transportRecords && transportRecords.length > 0) {
          html += `<h4 style="font-size:13px;margin:8px 0 6px 0;">运输记录详情</h4>
          <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;">
            <tr><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">运输批次</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">产品</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">运送序号</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">开始时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">完成时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">用时</th></tr>
            ${transportRecords.map(record => `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${record.transport_batch}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.product_code}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.sequence_number}</td><td style="padding:4px 8px;border:1px solid #ddd;">${formatTimePdf(record.start_time_s)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${formatTimePdf(record.end_time_s)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.duration_s.toFixed(2)}s</td></tr>`).join('')}
          </table>`;
        }

        if (results.connection_utilization_history && results.connection_utilization_history[stat.connection_id]) {
          html += generateSvgUtilizationChart(
            results.connection_utilization_history[stat.connection_id],
            `运输线路 ${stat.connection_name} 实时利用率变化`,
            '#10B981'
          );
        }
        html += `</div>`;
      });

      if (results.storage_stats && results.storage_stats.length > 0) {
        html += `<div data-pdf-section style="margin-bottom:20px;">
          <h2 style="font-size:16px;border-bottom:2px solid #8B5CF6;padding-bottom:6px;margin:0 0 12px 0;">存储统计</h2>
        </div>`;

        results.storage_stats.forEach(stat => {
          html += `<div data-pdf-section style="margin-bottom:20px;">`;
          html += `<h3 style="font-size:14px;margin:12px 0 8px 0;">存储: ${stat.device_name}</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
            <tr>
              <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">最大容量</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${stat.capacity}</td>
              <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">最终暂存量</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${stat.stock}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">最大暂存量</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${stat.max_stock ?? stat.stock}</td>
              <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">最大等待入库数</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${stat.max_waiting_entry ?? 0}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">最大利用率</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${stat.capacity > 0 ? ((stat.max_stock ?? stat.stock) / stat.capacity * 100).toFixed(1) + '%' : '-'}</td>
              <td style="padding:6px 12px;border:1px solid #ddd;background:#f8f9fa;font-weight:500;">变化记录数</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${stat.change_records}</td>
            </tr>
          </table>`;

          const changeRecords = results.storage_change_records[stat.device_id];
          if (changeRecords && changeRecords.length > 0) {
            html += `<h4 style="font-size:13px;margin:8px 0 6px 0;">变化记录详情</h4>
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;">
              <tr><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">类型</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">当前暂存量</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">最大容量</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">过程产品ID</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">到达时间</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f0f4ff;">入库时间</th></tr>
              ${changeRecords.map(record => `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${formatTimePdf(record.time_s)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.change_type}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.current_stock}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.capacity}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.process_product_id || '-'}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.arrival_time_s != null ? formatTimePdf(record.arrival_time_s) : '-'}</td><td style="padding:4px 8px;border:1px solid #ddd;">${record.change_type === '入库' ? formatTimePdf(record.time_s) : '-'}</td></tr>`).join('')}
            </table>`;
          }

          if (results.storage_utilization_history && results.storage_utilization_history[stat.device_id]) {
            html += generateSvgUtilizationChart(
              results.storage_utilization_history[stat.device_id],
              `存储 ${stat.device_name} 实时利用率变化`,
              '#8B5CF6'
            );
          }

          if (results.storage_stock_history && results.storage_stock_history[stat.device_id]) {
            html += generateSvgStockHistoryChart(
              results.storage_stock_history[stat.device_id],
              `存储 ${stat.device_name} 库存量与等待入库量变化`
            );
          }
          html += `</div>`;
        });
      }

      container.innerHTML = html;
      document.body.appendChild(container);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const marginLeft = 12.7;
      const marginRight = 12.7;
      const marginTop = 10;
      const marginBottom = 15;
      const contentWidth = pageWidth - marginLeft - marginRight;
      const usableHeight = pageHeight - marginTop - marginBottom;
      let currentY = marginTop;

      const sections = container.querySelectorAll<HTMLElement>('[data-pdf-section]');
      
      for (let i = 0; i < sections.length; i++) {
        const sectionEl = sections[i];
        const sectionCanvas = await html2canvas(sectionEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        
        let sectionImgWidth = contentWidth;
        let sectionImgHeight = (sectionCanvas.height * sectionImgWidth) / sectionCanvas.width;

        if (sectionImgHeight > usableHeight) {
          sectionImgHeight = usableHeight;
          sectionImgWidth = (sectionCanvas.width * sectionImgHeight) / sectionCanvas.height;
        }

        if (currentY + sectionImgHeight > pageHeight - marginBottom) {
          pdf.addPage();
          currentY = marginTop;
        }

        const imgData = sectionCanvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', marginLeft, currentY, sectionImgWidth, sectionImgHeight);
        currentY += sectionImgHeight;
      }

      document.body.removeChild(container);

      const pdfPath = await save({
        defaultPath: `模拟记录_${selectedRecord.timestamp.replace(/[:\s]/g, '-')}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (pdfPath) {
        const pdfBlob = pdf.output('arraybuffer');
        await writeFile(pdfPath, new Uint8Array(pdfBlob));
        alert('PDF导出成功');
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF导出失败: ' + error);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedRecord) return;
    setExportingExcel(true);
    try {
      const results = selectedRecord.results;
      const wb = XLSX.utils.book_new();

      const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
      };

      const overviewData: (string | number)[][] = [
        ['总体模拟统计'],
        ['指标', '数值'],
        ['模拟时长', formatTime(results.duration_s)],
        ['完成产品', results.completed_products],
      ];

      const productCounts = results.completed_products_by_code || {};
      if (Object.keys(productCounts).length > 0) {
        overviewData.push(['按产品完成数量']);
        overviewData.push(['产品名称', '完成数量']);
        for (const [code, count] of Object.entries(productCounts)) {
          const name = canvas.products?.[code]?.name || code;
          overviewData.push([name, count]);
        }
      }

      const materialConsumption = results.material_consumption || {};
      if (Object.keys(materialConsumption).length > 0) {
        overviewData.push([]);
        overviewData.push(['原材料总消耗']);
        overviewData.push(['原材料名称', '消耗量']);
        for (const [code, amount] of Object.entries(materialConsumption)) {
          const name = canvas.materials?.[code]?.name || code;
          overviewData.push([name, amount]);
        }
      }

      const productMaterials = results.material_usage || {};
      if (Object.keys(productMaterials).length > 0) {
        overviewData.push([]);
        overviewData.push(['按产品原材料消耗']);
        const allMaterialCodes = new Set<string>();
        for (const materials of Object.values(productMaterials)) {
          for (const mCode of Object.keys(materials)) {
            allMaterialCodes.add(mCode);
          }
        }
        const mCodes = Array.from(allMaterialCodes).sort();
        const header = ['产品名称', ...mCodes.map(c => canvas.materials?.[c]?.name || c)];
        overviewData.push(header);
        for (const [pCode, materials] of Object.entries(productMaterials)) {
          const row: (string | number)[] = [canvas.products?.[pCode]?.name || pCode];
          for (const mCode of mCodes) {
            row.push(materials[mCode] || 0);
          }
          overviewData.push(row);
        }
      }

      if (results.product_avg_process_times && results.product_avg_process_times.length > 0) {
        overviewData.push([]);
        overviewData.push(['产品平均加工时间']);
        overviewData.push(['产品名称', '完成数量', '平均加工时间']);
        for (const pt of results.product_avg_process_times) {
          overviewData.push([pt.product_name, pt.count, formatTime(pt.avg_process_time_s)]);
        }
      }

      overviewData.push([]);
      overviewData.push(['最大在制品数', results.max_total_wip || 0]);

      const priorityLabels: Record<string, string> = {
        nearest_distance: '距离最近',
        farthest_distance: '距离最远',
        lowest_utilization: '利用率最低',
        highest_utilization: '利用率最高',
        product_concentrated: '按产品集中',
        product_dispersed: '按产品分散',
        least_waiting_entry: '等待入库最少',
      };
      overviewData.push([]);
      overviewData.push(['模拟选项']);
      overviewData.push(['选项', '设置值']);
      overviewData.push(['模拟模式', results.simulation_mode === 'fixed_output' ? '固定产量' : '固定时长']);
      overviewData.push(['资源选择规则', results.resource_selection_rule === 'min_wip_dynamic' ? '动态平衡(在制品)' : results.resource_selection_rule === 'min_utilrate_dynamic' ? '动态平衡(利用率)' : '基础规则']);
      overviewData.push(['多仓库选择优先级', (results.warehouse_selection_priorities || []).map((p: string, i: number) => `${i + 1}:${priorityLabels[p] || p}`).join(' → ')]);

      const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
      ws1['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws1, '总体统计');

      if (results.device_stats && results.device_stats.length > 0) {
        for (const devStat of results.device_stats) {
          const sheetName = devStat.device_name.substring(0, 31);
          const devData: (string | number)[][] = [
            [devStat.device_name + ' 统计'],
            ['指标', '数值'],
            ['完成数量', devStat.completed],
            ['最大在制品', devStat.max_wip],
            ['最大等待运输时间', formatTime(devStat.max_wait_transport)],
            ['平均加工时间', formatTime(devStat.avg_proc_time_s)],
            ['总加工时间', formatTime(devStat.total_proc_time_s)],
            ['利用率', (devStat.utilization * 100).toFixed(1) + '%'],
          ];

          if (devStat.by_product && Object.keys(devStat.by_product).length > 0) {
            devData.push([]);
            devData.push(['按产品统计']);
            devData.push(['产品名称', '完成数量', '平均加工时间']);
            for (const [, pStat] of Object.entries(devStat.by_product)) {
              devData.push([pStat.product_name, pStat.count, formatTime(pStat.avg_time_s)]);
            }
          }

          const devMatConsumption = results.device_material_consumption?.[devStat.device_id] || {};
          if (Object.keys(devMatConsumption).length > 0) {
            devData.push([]);
            devData.push(['原材料消耗']);
            devData.push(['原材料名称', '消耗量']);
            for (const [mCode, amount] of Object.entries(devMatConsumption)) {
              const name = canvas.materials?.[mCode]?.name || mCode;
              devData.push([name, amount]);
            }
          }

          const processingRecords = results.processing_records?.[devStat.device_id] || [];
          if (processingRecords.length > 0) {
            devData.push([]);
            devData.push(['加工记录']);
            devData.push(['序号', '产品名称', '开始时间', '结束时间', '加工时长', '开始时等待加工数', '开始时等待运输数']);
            for (const rec of processingRecords) {
              const pName = canvas.products?.[rec.product_code]?.name || rec.product_code;
              devData.push([
                rec.sequence_number,
                pName,
                formatTime(rec.start_time_s),
                formatTime(rec.end_time_s),
                formatTime(rec.duration_s),
                rec.start_wip,
                rec.start_wait_transport,
              ]);
            }
          }

          const ws = XLSX.utils.aoa_to_sheet(devData);
          ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      }

      if (results.connection_stats && results.connection_stats.length > 0) {
        const connData: (string | number)[][] = [
          ['运输路径统计'],
          ['路径名称', '起始设备', '目标设备', '运输次数', '利用率'],
        ];
        for (const connStat of results.connection_stats) {
          connData.push([
            connStat.connection_name,
            connStat.from_device,
            connStat.to_device,
            connStat.transport_count,
            (connStat.utilization * 100).toFixed(1) + '%',
          ]);
        }

        for (const connStat of results.connection_stats) {
          const transportRecords = results.transport_records?.[connStat.connection_id] || [];
          if (transportRecords.length > 0) {
            connData.push([]);
            connData.push([connStat.connection_name + ' 运输记录']);
            connData.push(['序号', '产品名称', '运输批次', '开始时间', '结束时间', '运输时长']);
            for (const rec of transportRecords) {
              const pName = canvas.products?.[rec.product_code]?.name || rec.product_code;
              connData.push([
                rec.sequence_number,
                pName,
                rec.transport_batch,
                formatTime(rec.start_time_s),
                formatTime(rec.end_time_s),
                formatTime(rec.duration_s),
              ]);
            }
          }
        }

        const wsConn = XLSX.utils.aoa_to_sheet(connData);
        wsConn['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsConn, '运输路径');
      }

      if (results.storage_stats && results.storage_stats.length > 0) {
        const storageData: (string | number)[][] = [
          ['存储统计'],
          ['存储名称', '当前库存', '容量', '利用率'],
        ];
        for (const sStat of results.storage_stats) {
          const util = sStat.capacity > 0 ? ((sStat.stock / sStat.capacity) * 100).toFixed(1) + '%' : '0%';
          storageData.push([sStat.device_name, sStat.stock, sStat.capacity, util]);

          if (sStat.by_product && Object.keys(sStat.by_product).length > 0) {
            storageData.push(['  产品名称', '  数量']);
            for (const [pCode, count] of Object.entries(sStat.by_product)) {
              const pName = canvas.products?.[pCode]?.name || pCode;
              storageData.push(['  ' + pName, count]);
            }
          }
        }

        const wsStorage = XLSX.utils.aoa_to_sheet(storageData);
        wsStorage['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsStorage, '存储统计');
      }

      const excelPath = await save({
        defaultPath: `模拟记录_${selectedRecord.timestamp.replace(/[:\s]/g, '-')}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });

      if (excelPath) {
        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        await writeFile(excelPath, new Uint8Array(wbOut));
        alert('Excel导出成功');
      }
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Excel导出失败: ' + error);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportMd = async () => {
    if (!selectedRecord) return;
    setExportingMd(true);
    try {
      const results = selectedRecord.results;

      const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

      let md = '# 模拟运行统计报告\n\n';
      md += `> 记录时间: ${new Date(selectedRecord.timestamp).toLocaleString()}\n\n`;

      md += '## 总体统计\n\n';
      md += '| 指标 | 数值 |\n';
      md += '|------|------|\n';
      md += `| 模拟时长 | ${formatTime(results.duration_s)} |\n`;
      md += `| 完成产品 | ${results.completed_products} 件 |\n`;
      md += `| 整体最大在制品数 | ${results.max_total_wip || 0} 件 |\n`;
      md += `| 模拟模式 | ${results.simulation_mode === 'fixed_output' ? '固定产量' : '固定时长'} |\n`;
      md += `| 资源选择规则 | ${results.resource_selection_rule === 'min_wip_dynamic' ? '动态平衡(在制品)' : results.resource_selection_rule === 'min_utilrate_dynamic' ? '动态平衡(利用率)' : '基础规则'} |\n`;
      md += `| 多仓库选择优先级 | ${(results.warehouse_selection_priorities || []).map((p: string, i: number) => `${i + 1}:${priorityLabels[p] || p}`).join(' → ')} |\n`;
      md += '\n';

      const productCounts = results.completed_products_by_code || {};
      if (Object.keys(productCounts).length > 0) {
        md += '### 完成产品数（按产品种类）\n\n';
        md += '| 产品 | 数量 |\n';
        md += '|------|------|\n';
        for (const [code, count] of Object.entries(productCounts)) {
          const name = canvas.products?.[code]?.name || code;
          md += `| ${name} | ${count} |\n`;
        }
        md += '\n';
      }

      if (results.product_avg_process_times && results.product_avg_process_times.length > 0) {
        md += '### 产品平均处理时长\n\n';
        md += '| 产品 | 加工次数 | 平均处理时长(秒) |\n';
        md += '|------|----------|------------------|\n';
        for (const stat of results.product_avg_process_times) {
          md += `| ${stat.product_name || stat.product_code} | ${stat.count} | ${stat.avg_process_time_s.toFixed(2)} |\n`;
        }
        md += '\n';
      }

      if (results.material_consumption && Object.keys(results.material_consumption).length > 0) {
        md += '### 原料消耗量\n\n';
        md += '| 原料 | 消耗量 |\n';
        md += '|------|--------|\n';
        for (const [code, qty] of Object.entries(results.material_consumption)) {
          const material = canvas.materials?.[code];
          const unit = material?.unit || '';
          md += `| ${material?.name || code} | ${qty.toFixed(2)}${unit} |\n`;
        }
        md += '\n';
      }

      const productMaterialData = computeProductMaterialConsumption(results, canvas.products || {}, canvas.materials || {});
      if (productMaterialData.length > 0) {
        const allMats = [...new Set(productMaterialData.flatMap(p => p.materials.map(m => m.code)))];
        if (allMats.length > 0) {
          md += '### 按产品各类原料总消耗量\n\n';
          md += '| 产品 | 原料 | 计量单位 | 消耗数量 |\n';
          md += '|------|------|----------|----------|\n';
          for (const p of productMaterialData) {
            for (let mIdx = 0; mIdx < p.materials.length; mIdx++) {
              const m = p.materials[mIdx];
              md += `| ${mIdx === 0 ? p.productName : ''} | ${m.name} | ${m.unit || '-'} | ${m.quantity.toFixed(2)}${m.unit || ''} |\n`;
            }
          }
          md += '\n';
        }
      }

      md += '## 设备统计\n\n';
      for (const stat of results.device_stats) {
        const device = canvas.devices[stat.device_id];
        const deviceType = device?.type || '';
        md += `### ${stat.device_name} (${deviceType})\n\n`;
        md += '| 指标 | 数值 |\n';
        md += '|------|------|\n';
        md += `| 完成加工数 | ${stat.completed} 件 |\n`;
        md += `| 利用率 | ${stat.utilization.toFixed(1)}% |\n`;
        md += `| 最大在制品数 | ${stat.max_wip} 件 |\n`;
        md += `| 平均加工时长 | ${stat.avg_proc_time_s.toFixed(2)}s |\n`;
        md += '\n';

        if (stat.by_product && Object.keys(stat.by_product).length > 0) {
          md += '| 产品 | 加工数 | 平均时长(秒) |\n';
          md += '|------|--------|---------------|\n';
          for (const [code, data] of Object.entries(stat.by_product)) {
            md += `| ${data.product_name || code} | ${data.count} | ${data.avg_time_s.toFixed(2)} |\n`;
          }
          md += '\n';
        }

        const devMatConsumption = results.device_material_consumption?.[stat.device_id] || {};
        if (Object.keys(devMatConsumption).length > 0) {
          md += '**原材料消耗:**\n\n';
          md += '| 原材料 | 消耗量 |\n';
          md += '|--------|--------|\n';
          for (const [mCode, amount] of Object.entries(devMatConsumption)) {
            const name = canvas.materials?.[mCode]?.name || mCode;
            md += `| ${name} | ${amount.toFixed(2)} |\n`;
          }
          md += '\n';
        }
      }

      if (results.connection_stats && results.connection_stats.length > 0) {
        md += '## 运输线路统计\n\n';
        md += '| 线路 | 起始设备 | 目标设备 | 运输次数 | 利用率 |\n';
        md += '|------|----------|----------|----------|--------|\n';
        for (const stat of results.connection_stats) {
          md += `| ${stat.connection_name} | ${stat.from_device} | ${stat.to_device} | ${stat.transport_count} | ${stat.utilization.toFixed(1)}% |\n`;
        }
        md += '\n';
      }

      if (results.storage_stats && results.storage_stats.length > 0) {
        md += '## 存储统计\n\n';
        for (const stat of results.storage_stats) {
          md += `### ${stat.device_name}\n\n`;
          md += '| 指标 | 数值 |\n';
          md += '|------|------|\n';
          md += `| 最大容量 | ${stat.capacity} |\n`;
          md += `| 最终暂存量 | ${stat.stock} |\n`;
          md += `| 最大暂存量 | ${stat.max_stock ?? stat.stock} |\n`;
          md += `| 最大等待入库数 | ${stat.max_waiting_entry ?? 0} |\n`;
          md += `| 最大利用率 | ${stat.capacity > 0 ? ((stat.max_stock ?? stat.stock) / stat.capacity * 100).toFixed(1) + '%' : '-'} |\n`;
          md += '\n';

          if (stat.by_product && Object.keys(stat.by_product).length > 0) {
            md += '| 产品 | 数量 |\n';
            md += '|------|------|\n';
            for (const [pCode, count] of Object.entries(stat.by_product)) {
              const pName = canvas.products?.[pCode]?.name || pCode;
              md += `| ${pName} | ${count} |\n`;
            }
            md += '\n';
          }
        }
      }

      {
        const ganttSegments: {
          deviceName: string;
          productCode: string;
          productName: string;
          startTime: number;
          endTime: number;
          count: number;
          taskType: string;
        }[] = [];

        Object.entries(results.processing_records).forEach(([deviceId, records]) => {
          const device = canvas.devices[deviceId];
          if (!device) return;
          const deviceType = device.type;
          const isProcessingDevice = !['StartNode', 'EndNode', 'Warehouse', 'Buffer', 'TempStore'].includes(deviceType);
          if (!isProcessingDevice || records.length === 0) return;

          const sortedRecords = [...records]
            .filter(r => r.end_time_s > 0)
            .sort((a, b) => a.start_time_s - b.start_time_s);
          if (sortedRecords.length === 0) return;

          interface Segment {
            productCode: string;
            productName: string;
            startTime: number;
            endTime: number;
            count: number;
            taskType: string;
          }

          const segments: Segment[] = [];

          sortedRecords.forEach(record => {
            const code = record.product_code;
            const product = canvas.products?.[code];
            const productName = product?.name || code;
            const isToolSwitch = record.task_type === '工具切换';

            if (isToolSwitch) {
              segments.push({
                productCode: code,
                productName: `${productName} (工具切换)`,
                startTime: record.start_time_s,
                endTime: record.end_time_s,
                count: 1,
                taskType: '工具切换'
              });
            } else {
              const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
              if (lastSegment === null) {
                segments.push({
                  productCode: code,
                  productName,
                  startTime: record.start_time_s,
                  endTime: record.end_time_s,
                  count: 1,
                  taskType: '加工任务'
                });
              } else if (lastSegment.productCode !== code || lastSegment.taskType === '工具切换') {
                segments.push({
                  productCode: code,
                  productName,
                  startTime: record.start_time_s,
                  endTime: record.end_time_s,
                  count: 1,
                  taskType: '加工任务'
                });
              } else {
                const gap = record.start_time_s - lastSegment.endTime;
                if (gap < 1) {
                  lastSegment.endTime = record.end_time_s;
                  lastSegment.count += 1;
                } else {
                  segments.push({
                    productCode: code,
                    productName,
                    startTime: record.start_time_s,
                    endTime: record.end_time_s,
                    count: 1,
                    taskType: '加工任务'
                  });
                }
              }
            }
          });

          segments.forEach(segment => {
            ganttSegments.push({
              deviceName: device.name || deviceId,
              productCode: segment.productCode,
              productName: segment.productName,
              startTime: segment.startTime,
              endTime: segment.endTime,
              count: segment.count,
              taskType: segment.taskType
            });
          });
        });

        ganttSegments.sort((a, b) => {
          const nameCmp = a.deviceName.localeCompare(b.deviceName, 'zh-CN');
          if (nameCmp !== 0) return nameCmp;
          return a.startTime - b.startTime;
        });

        if (ganttSegments.length > 0) {
          md += '## 甘特图数据（设备加工时间线）\n\n';
          md += '| 节点名称 | 产品 | 任务类型 | 开始时间 | 结束时间 | 完成产品个数 |\n';
          md += '|----------|------|----------|----------|----------|---------------|\n';
          for (const seg of ganttSegments) {
            md += `| ${seg.deviceName} | ${seg.productName} | ${seg.taskType} | ${formatTime(seg.startTime)} | ${formatTime(seg.endTime)} | ${seg.count} |\n`;
          }
          md += '\n';
        }
      }

      const mdPath = await save({
        defaultPath: `模拟统计_${selectedRecord.timestamp.replace(/[:\s]/g, '-')}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });

      if (mdPath) {
        await writeTextFile(mdPath, md, { append: false });
        alert('MD导出成功');
      }
    } catch (error) {
      console.error('MD export failed:', error);
      alert('MD导出失败: ' + error);
    } finally {
      setExportingMd(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecordId) return;
    
    if (!confirm('确定要删除这条模拟记录吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      await deleteSimulationRecord(selectedRecordId);
      setSelectedRecordId(null);
      setSelectedRecord(null);
      await loadRecords();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('删除失败: ' + error);
    }
  };

  const handleDeleteAll = async () => {
    if (records.length === 0) return;
    
    if (!confirm(`确定要删除全部 ${records.length} 条模拟记录吗？此操作不可撤销。`)) {
      return;
    }
    
    try {
      for (const record of records) {
        await deleteSimulationRecord(record.id);
      }
      setSelectedRecordId(null);
      setSelectedRecord(null);
      await loadRecords();
    } catch (error) {
      console.error('Delete all failed:', error);
      alert('删除失败: ' + error);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (selectedRecordId) {
      loadRecordDetails(selectedRecordId);
    }
  }, [selectedRecordId]);
  
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
    if ((e.target as HTMLElement).closest('.modal-close')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const loadRecords = async () => {
    setLoading(true);
    const data = await getSimulationRecords();
    setRecords(data.reverse());
    if (data.length > 0) {
      setSelectedRecordId(data[0].id);
    }
    setLoading(false);
  };

  const loadRecordDetails = async (recordId: string) => {
    const record = await getSimulationRecord(recordId);
    setSelectedRecord(record);
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getDeviceStats = (results: SimulationResults) => {
    if (!deviceId) return null;
    return results.device_stats.find(s => s.device_id === deviceId);
  };

  const getConnectionStats = (results: SimulationResults) => {
    if (!connectionId) return null;
    return results.connection_stats.find(s => s.connection_id === connectionId);
  };

  const getStorageStats = (results: SimulationResults) => {
    if (!deviceId) return null;
    return results.storage_stats.find(s => s.device_id === deviceId);
  };

  const getFeedRecords = (results: SimulationResults) => {
    if (!deviceId) return null;
    return results.feed_records[deviceId];
  };

  const isStartNode = () => {
    if (!deviceId) return false;
    const device = canvas.devices[deviceId];
    return device?.type === 'StartNode';
  };

  const isEndNode = () => {
    if (!deviceId) return false;
    const device = canvas.devices[deviceId];
    return device?.type === 'EndNode';
  };

  const getEndNodeArrivalRecords = (results: SimulationResults) => {
    if (!deviceId) return null;
    return results.end_node_arrival_records?.[deviceId] || null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        ref={modalRef}
        className="modal-content simulation-records-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        <div className="modal-header" onMouseDown={handleMouseDown} style={{ cursor: 'move' }}>
          <h3>{getModalTitle()}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="export-btn"
              onClick={handleExport}
              disabled={!selectedRecord}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                background: selectedRecord ? 'var(--accent-primary)' : 'var(--border-light)',
                color: selectedRecord ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRecord ? 'pointer' : 'not-allowed',
              }}
            >
              导出记录JSON
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!selectedRecord || exportingPdf}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                background: selectedRecord && !exportingPdf ? '#EF4444' : 'var(--border-light)',
                color: selectedRecord && !exportingPdf ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRecord && !exportingPdf ? 'pointer' : 'not-allowed',
              }}
            >
              {exportingPdf ? '导出中...' : '导出PDF'}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!selectedRecord || exportingExcel}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                background: selectedRecord && !exportingExcel ? '#10B981' : 'var(--border-light)',
                color: selectedRecord && !exportingExcel ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRecord && !exportingExcel ? 'pointer' : 'not-allowed',
              }}
            >
              {exportingExcel ? '导出中...' : '导出Excel'}
            </button>
            <button
              onClick={handleExportMd}
              disabled={!selectedRecord || exportingMd}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                background: selectedRecord && !exportingMd ? '#6366F1' : 'var(--border-light)',
                color: selectedRecord && !exportingMd ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRecord && !exportingMd ? 'pointer' : 'not-allowed',
              }}
            >
              {exportingMd ? '导出中...' : '导出MD'}
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-body" style={{ flexDirection: 'column' }}>
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>选择模拟记录:</span>
            {loading ? (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>加载中...</span>
            ) : records.length === 0 ? (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>暂无模拟记录</span>
            ) : (
              <>
                <select
                  className="property-select"
                  value={selectedRecordId || ''}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  style={{ minWidth: '300px' }}
                >
                  {records.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.timestamp} - 时长: {formatTime(record.duration_s)} | 完成: {record.completed_products}件
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-danger"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                  onClick={handleDelete}
                  disabled={!selectedRecordId}
                >
                  删除选中
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                  onClick={handleDeleteAll}
                >
                  删除全部
                </button>
              </>
            )}
          </div>
          
          <div className="records-detail" style={{ flex: 1, overflow: 'auto' }}>
            {selectedRecord ? (
              <>
                {deviceId && isStartNode() && getFeedRecords(selectedRecord.results) && getFeedRecords(selectedRecord.results)!.length > 0 && (
                  <div className="stats-section">
                    <h5>投料记录</h5>
                    <div className="detail-records">
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>时间(秒)</th>
                            <th>事件类型</th>
                            <th>投料状态</th>
                            <th>产品编码</th>
                            <th>过程产品ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFeedRecords(selectedRecord.results)!.map((record, idx) => (
                            <tr key={idx}>
                              <td>{record.time_s.toFixed(2)}</td>
                              <td>{record.event_type}</td>
                              <td>{record.feed_status}</td>
                              <td>{record.product_code}</td>
                              <td>{record.process_product_id || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {deviceId && isEndNode() && getEndNodeArrivalRecords(selectedRecord.results) && getEndNodeArrivalRecords(selectedRecord.results)!.length > 0 && (
                  <div className="stats-section">
                    <h5>到达产品记录</h5>
                    <div className="detail-records">
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>序号</th>
                            <th>产品编码</th>
                            <th>产品名称</th>
                            <th>到达时间(秒)</th>
                            <th>经过节点</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getEndNodeArrivalRecords(selectedRecord.results)!.map((record, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: record.product_color || '#94A3B8',
                                  }} />
                                  {record.product_code}
                                </span>
                              </td>
                              <td>{record.product_name}</td>
                              <td>{record.arrive_time_s.toFixed(2)}</td>
                              <td style={{ fontSize: '11px', maxWidth: '300px', whiteSpace: 'pre-wrap' }}>
                                {record.node_visits.map((v, i) => `${v.node_name}${i < record.node_visits.length - 1 ? ' → ' : ''}`).join('')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {deviceId && getDeviceStats(selectedRecord.results) && (() => {
                  const device = canvas.devices[deviceId];
                  const isStorage = device?.type === 'Warehouse' || device?.type === 'Buffer' || device?.type === 'TempStore';
                  return !isStorage;
                })() && (
                  <div className="stats-section">
                    <h5>设备统计</h5>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">完成加工品</span>
                        <span className="stat-value">{getDeviceStats(selectedRecord.results)!.completed} 件</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">最大等待加工数</span>
                        <span className="stat-value">{getDeviceStats(selectedRecord.results)!.max_wip}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">最大等待运输数</span>
                        <span className="stat-value">{getDeviceStats(selectedRecord.results)!.max_wait_transport}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">平均加工时间</span>
                        <span className="stat-value">{getDeviceStats(selectedRecord.results)!.avg_proc_time_s.toFixed(2)} 秒</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">生产总用时</span>
                        <span className="stat-value">{formatTime(getDeviceStats(selectedRecord.results)!.total_proc_time_s)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">平均利用率</span>
                        <span className="stat-value">{getDeviceStats(selectedRecord.results)!.utilization.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    {selectedRecord.results.device_utilization_history && selectedRecord.results.device_utilization_history[deviceId] && (
                      <div style={{ marginTop: '12px' }}>
                        <UtilizationChart 
                          data={selectedRecord.results.device_utilization_history[deviceId]}
                          title="实时利用率变化"
                          color="#3B82F6"
                        />
                      </div>
                    )}
                    
                    {selectedRecord.results.device_material_consumption && selectedRecord.results.device_material_consumption[deviceId] && Object.keys(selectedRecord.results.device_material_consumption[deviceId]).length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <h6 style={{ fontSize: '12px', marginBottom: '8px' }}>设备原料消耗统计</h6>
                        <table className="stats-table" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th>原料名称</th>
                              <th>计量单位</th>
                              <th>消耗数量</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedRecord.results.device_material_consumption[deviceId]).map(([code, quantity]) => {
                              const material = canvas.materials?.[code];
                              return (
                                <tr key={code}>
                                  <td>{material?.name || code}</td>
                                  <td>{material?.unit || '-'}</td>
                                  <td>{quantity.toFixed(2)} {material?.unit || ''}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {(() => {
                      const deviceProductMaterials = computeProductMaterialConsumption(
                        selectedRecord.results,
                        canvas.products || {},
                        canvas.materials || {},
                        deviceId
                      );
                      if (deviceProductMaterials.length === 0) return null;
                      const allMats = [...new Set(deviceProductMaterials.flatMap(p => p.materials.map(m => m.code)))];
                      if (allMats.length === 0) return null;
                      return (
                        <div style={{ marginTop: '12px' }}>
                          <h6 style={{ fontSize: '12px', marginBottom: '8px' }}>按产品各类原料消耗量</h6>
                          <table className="stats-table" style={{ fontSize: '12px' }}>
                            <thead>
                              <tr>
                                <th>产品</th>
                                <th>原料</th>
                                <th>计量单位</th>
                                <th>消耗数量</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deviceProductMaterials.map(p => 
                                p.materials.map((m, mIdx) => (
                                  <tr key={`${p.productCode}-${m.code}`}>
                                    <td>{mIdx === 0 ? p.productName : ''}</td>
                                    <td>{m.name}</td>
                                    <td>{m.unit || '-'}</td>
                                    <td>{m.quantity.toFixed(2)} {m.unit || ''}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                    
                    {selectedRecord.results.processing_records[deviceId] && selectedRecord.results.processing_records[deviceId].length > 0 && (
                      <div className="detail-records">
                        <h6>加工记录详情</h6>
                        <table className="stats-table">
                          <thead>
                            <tr>
                              <th>过程产品ID</th>
                              <th>产品编码</th>
                              <th>加工品序号</th>
                              <th>任务类型</th>
                              <th>到达时间</th>
                              <th>开始时间</th>
                              <th>完成时间</th>
                              <th>运出时间</th>
                              <th>加工时长</th>
                              <th>开始时等待加工数</th>
                              <th>开始时等待运输数</th>
                              <th>使用原料</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRecord.results.processing_records[deviceId].map((record, idx) => (
                              <tr key={idx}>
                                <td style={{ fontSize: '11px' }}>
                                  {record.task_type === '拆解任务' && record.disassembly_product_ids && record.disassembly_product_ids.length > 0
                                    ? record.disassembly_product_ids.join(', ')
                                    : record.process_product_id}
                                </td>
                                <td>{record.product_code}</td>
                                <td>{record.sequence_number}</td>
                                <td style={{ 
                                  color: record.task_type === '工具切换' ? '#F97316' : 'inherit',
                                  fontWeight: record.task_type === '工具切换' ? '500' : 'normal'
                                }}>
                                  {record.task_type || '加工任务'}
                                </td>
                                <td>{formatTime(record.arrive_time_s)}</td>
                                <td>{formatTime(record.start_time_s)}</td>
                                <td>{formatTime(record.end_time_s)}</td>
                                <td>{record.leave_time_s ? formatTime(record.leave_time_s) : '-'}</td>
                                <td>{record.duration_s.toFixed(2)}s</td>
                                <td>{record.start_wip}</td>
                                <td>{record.start_wait_transport}</td>
                                <td>
                                  {Object.entries(record.materials_used).length > 0 
                                    ? Object.entries(record.materials_used).map(([code, qty]) => {
                                        const device = canvas.devices[deviceId];
                                        if (device?.type === 'AssemblyStation') {
                                          const upstreamDevice = canvas.devices[code];
                                          return `${upstreamDevice?.name || code}: ${qty}件`;
                                        } else {
                                          const material = canvas.materials?.[code];
                                          const unit = material?.unit || '';
                                          return `${material?.name || code}: ${qty}${unit}`;
                                        }
                                      }).join(', ')
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {connectionId && getConnectionStats(selectedRecord.results) && (
                  <div className="stats-section">
                    <h5>运输统计</h5>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">运输加工品数</span>
                        <span className="stat-value">{getConnectionStats(selectedRecord.results)!.transport_count} 件</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">利用率</span>
                        <span className="stat-value">{getConnectionStats(selectedRecord.results)!.utilization.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    {selectedRecord.results.connection_utilization_history && selectedRecord.results.connection_utilization_history[connectionId] && (
                      <div style={{ marginTop: '12px' }}>
                        <UtilizationChart 
                          data={selectedRecord.results.connection_utilization_history[connectionId]}
                          title="实时利用率变化"
                          color="#10B981"
                        />
                      </div>
                    )}
                    
                    {selectedRecord.results.transport_records[connectionId] && selectedRecord.results.transport_records[connectionId].length > 0 && (
                      <div className="detail-records">
                        <h6>运输记录详情</h6>
                        <table className="stats-table">
                          <thead>
                            <tr>
                              <th>运输批次</th>
                              <th>过程产品ID</th>
                              <th>产品编码</th>
                              <th>运送序号</th>
                              <th>开始时间</th>
                              <th>完成时间</th>
                              <th>用时</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRecord.results.transport_records[connectionId].map((record, idx) => (
                              <tr key={idx}>
                                <td>{record.transport_batch}</td>
                                <td style={{ fontSize: '11px', maxWidth: '150px', wordBreak: 'break-all' }}>
                                  {record.process_product_ids?.join(', ') || '-'}
                                </td>
                                <td>{record.product_code}</td>
                                <td>{record.sequence_number}</td>
                                <td>{formatTime(record.start_time_s)}</td>
                                <td>{formatTime(record.end_time_s)}</td>
                                <td>{record.duration_s.toFixed(2)}s</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {deviceId && getStorageStats(selectedRecord.results) && (
                  <div className="stats-section">
                    <h5>存储统计</h5>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">最大容量</span>
                        <span className="stat-value">{getStorageStats(selectedRecord.results)!.capacity}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">最终暂存量</span>
                        <span className="stat-value">{getStorageStats(selectedRecord.results)!.stock}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">最大暂存量</span>
                        <span className="stat-value">{getStorageStats(selectedRecord.results)!.max_stock ?? getStorageStats(selectedRecord.results)!.stock}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">最大等待入库数</span>
                        <span className="stat-value">{getStorageStats(selectedRecord.results)!.max_waiting_entry ?? 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">最大利用率</span>
                        <span className="stat-value">{getStorageStats(selectedRecord.results)!.capacity > 0 
                          ? ((getStorageStats(selectedRecord.results)!.max_stock ?? getStorageStats(selectedRecord.results)!.stock) / getStorageStats(selectedRecord.results)!.capacity * 100).toFixed(1) + '%' 
                          : '-'}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">变化记录数</span>
                        <span className="stat-value">{getStorageStats(selectedRecord.results)!.change_records}</span>
                      </div>
                    </div>
                    
                    {selectedRecord.results.storage_utilization_history && selectedRecord.results.storage_utilization_history[deviceId] && (
                      <div style={{ marginTop: '12px' }}>
                        <UtilizationChart 
                          data={selectedRecord.results.storage_utilization_history[deviceId]}
                          title="库存利用率变化"
                          color="#F59E0B"
                        />
                      </div>
                    )}
                    
                    {selectedRecord.results.storage_stock_history && selectedRecord.results.storage_stock_history[deviceId] && (
                      <div style={{ marginTop: '12px' }}>
                        <StockHistoryChart 
                          data={selectedRecord.results.storage_stock_history[deviceId]}
                          title="库存量与等待入库量变化"
                        />
                      </div>
                    )}
                    
                    {selectedRecord.results.storage_change_records[deviceId] && selectedRecord.results.storage_change_records[deviceId].length > 0 && (
                      <div className="detail-records">
                        <h6>变化记录详情</h6>
                        <table className="stats-table">
                          <thead>
                            <tr>
                              <th>时间</th>
                              <th>类型</th>
                              <th>当前暂存量</th>
                              <th>最大容量</th>
                              <th>过程产品ID</th>
                              <th>到达时间</th>
                              <th>入库时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRecord.results.storage_change_records[deviceId].map((record, idx) => (
                              <tr key={idx}>
                                <td>{formatTime(record.time_s)}</td>
                                <td>{record.change_type}</td>
                                <td>{record.current_stock}</td>
                                <td>{record.capacity}</td>
                                <td>{record.process_product_id || '-'}</td>
                                <td>{record.arrival_time_s != null ? formatTime(record.arrival_time_s) : '-'}</td>
                                <td>{record.change_type === '入库' ? formatTime(record.time_s) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {!deviceId && !connectionId && (
                  <>
                    <div className="stats-section">
                      <h5>总体统计</h5>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-label">模拟时长</span>
                          <span className="stat-value">{formatTime(selectedRecord.results.duration_s)}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">完成产品</span>
                          <span className="stat-value">{selectedRecord.results.completed_products} 件</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">整体最大在制品数</span>
                          <span className="stat-value">{selectedRecord.results.max_total_wip} 件</span>
                        </div>
                      </div>
                    </div>

                    <div className="stats-section">
                      <h5>模拟选项</h5>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-label">模拟模式</span>
                          <span className="stat-value">
                            {selectedRecord.results.simulation_mode === 'fixed_output' ? '固定产量' : '固定时长'}
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">资源选择规则</span>
                          <span className="stat-value">
                            {selectedRecord.results.resource_selection_rule === 'min_wip_dynamic' ? '动态平衡(在制品)' : selectedRecord.results.resource_selection_rule === 'min_utilrate_dynamic' ? '动态平衡(利用率)' : '基础规则'}
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">多仓库选择优先级</span>
                          <span className="stat-value">
                            {(selectedRecord.results.warehouse_selection_priorities || []).map((p, i) => {
                              const labels: Record<string, string> = {
                                nearest_distance: '距离最近',
                                farthest_distance: '距离最远',
                                lowest_utilization: '利用率最低',
                                highest_utilization: '利用率最高',
                                product_concentrated: '按产品集中',
                                product_dispersed: '按产品分散',
                                least_waiting_entry: '等待入库最少',
                              };
                              return `${i + 1}:${labels[p] || p}`;
                            }).join(' → ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="stats-section">
                      <h5>统计图表</h5>
                      
                      <BarChart
                        title="完成产品数（按产品种类）"
                        data={(() => {
                          const productCounts = selectedRecord.results.completed_products_by_code || {};
                          return Object.entries(productCounts).map(([code, count]) => ({
                            label: canvas.products?.[code]?.name || code,
                            value: count,
                            color: canvas.products?.[code]?.color
                          })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
                        })()}
                      />
                      
                      {selectedRecord.results.product_avg_process_times && selectedRecord.results.product_avg_process_times.length > 0 && (
                        <BarChart
                          title="产品平均处理时长（秒）"
                          data={selectedRecord.results.product_avg_process_times.map(stat => ({
                            label: stat.product_name || stat.product_code,
                            value: stat.avg_process_time_s,
                            color: stat.product_color
                          })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))}
                        />
                      )}
                      
                      {selectedRecord.results.material_consumption && Object.keys(selectedRecord.results.material_consumption).length > 0 && (
                        (() => {
                          const materialConsumption = selectedRecord.results.material_consumption;
                          const byUnit: Record<string, { label: string; value: number }[]> = {};
                          
                          Object.entries(materialConsumption).forEach(([code, quantity]) => {
                            const material = canvas.materials?.[code];
                            const unit = material?.unit || '';
                            const unitKey = unit || '无单位';
                            
                            if (!byUnit[unitKey]) {
                              byUnit[unitKey] = [];
                            }
                            byUnit[unitKey].push({
                              label: material?.name || code,
                              value: quantity
                            });
                          });
                          
                          Object.keys(byUnit).forEach(unitKey => {
                            byUnit[unitKey].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
                          });
                          
                          const sortedUnits = Object.keys(byUnit).sort((a, b) => a.localeCompare(b, 'zh-CN'));
                          
                          return sortedUnits.map(unitKey => (
                            <BarChart
                              key={unitKey}
                              title={`原料消耗量${unitKey === '无单位' ? '' : `（单位：${unitKey}）`}`}
                              data={byUnit[unitKey]}
                              valueSuffix={unitKey === '无单位' ? '' : unitKey}
                            />
                          ));
                        })()
                      )}
                      
                      {(() => {
                        const productMaterialData = computeProductMaterialConsumption(
                          selectedRecord.results,
                          canvas.products || {},
                          canvas.materials || {}
                        );
                        if (productMaterialData.length === 0) return null;
                        const allMaterials = [...new Set(productMaterialData.flatMap(p => p.materials.map(m => m.code)))];
                        if (allMaterials.length === 0) return null;
                        const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
                        const byUnitGroups: Record<string, typeof productMaterialData> = {};
                        productMaterialData.forEach(p => {
                          const units = [...new Set(p.materials.map(m => m.unit || '无单位'))];
                          units.forEach(u => {
                            if (!byUnitGroups[u]) byUnitGroups[u] = [];
                            const filteredMaterials = p.materials.filter(m => (m.unit || '无单位') === u);
                            if (filteredMaterials.length > 0) {
                              const existing = byUnitGroups[u].find(e => e.productCode === p.productCode);
                              if (existing) {
                                existing.materials = [...existing.materials, ...filteredMaterials];
                              } else {
                                byUnitGroups[u].push({ ...p, materials: filteredMaterials });
                              }
                            }
                          });
                        });
                        return Object.entries(byUnitGroups).sort(([a], [b]) => a.localeCompare(b)).map(([unit, data]) => (
                          <GroupedBarChart
                            key={unit}
                            title={`按产品各类原料总消耗量${unit === '无单位' ? '' : `（单位：${unit}）`}`}
                            data={data.map(p => ({
                              deviceName: p.productName,
                              products: p.materials.map(m => ({
                                code: m.name,
                                count: m.quantity
                              }))
                            }))}
                            productColors={Object.fromEntries(
                              allMaterials.map((code, i) => [code, defaultColors[i % defaultColors.length]])
                            )}
                          />
                        ));
                      })()}
                      
                      <BarChart
                        title="设备利用率（按设备）"
                        data={selectedRecord.results.device_stats.map(stat => ({
                          label: stat.device_name,
                          value: stat.utilization
                        })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))}
                        valueSuffix="%"
                      />
                      
                      {selectedRecord.results.connection_stats && selectedRecord.results.connection_stats.length > 0 && (
                        <BarChart
                          title="运输线路利用率（按运输线路）"
                          data={selectedRecord.results.connection_stats.map(stat => ({
                            label: stat.connection_name,
                            value: stat.utilization
                          })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))}
                          valueSuffix="%"
                        />
                      )}
                      
                      <GroupedBarChart
                        title="设备加工产品数量（按设备分组）"
                        data={selectedRecord.results.device_stats.map(stat => ({
                          deviceName: stat.device_name,
                          products: Object.entries(stat.by_product || {}).map(([code, data]) => ({
                            code,
                            count: data.count
                          }))
                        })).sort((a, b) => a.deviceName.localeCompare(b.deviceName, 'zh-CN'))}
                        productColors={Object.fromEntries(
                          Object.entries(canvas.products || {}).map(([code, p]) => [code, p.color])
                        )}
                      />
                      
                      <BarChart
                        title="设备最大在制品数（按设备）"
                        data={selectedRecord.results.device_stats.map(stat => ({
                          label: stat.device_name,
                          value: stat.max_wip
                        })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))}
                      />
                      
                      <GanttChart
                        data={(() => {
                          const ganttData: GanttBar[] = [];
                          const productColorMap: Record<string, string> = {};
                          
                          Object.entries(canvas.products || {}).forEach(([code, p]) => {
                            productColorMap[code] = p.color;
                          });
                          
                          Object.entries(selectedRecord.results.processing_records).forEach(([deviceId, records]) => {
                            const device = canvas.devices[deviceId];
                            if (!device) return;
                            
                            const deviceType = device.type;
                            const isProcessingDevice = !['StartNode', 'EndNode', 'Warehouse', 'Buffer', 'TempStore'].includes(deviceType);
                            
                            if (!isProcessingDevice || records.length === 0) return;
                            
                            const sortedRecords = [...records]
                              .filter(r => r.end_time_s > 0)
                              .sort((a, b) => a.start_time_s - b.start_time_s);
                            
                            if (sortedRecords.length === 0) return;
                            
                            interface Segment {
                              productCode: string;
                              productName: string;
                              startTime: number;
                              endTime: number;
                              count: number;
                              taskType?: string;
                            }
                            
                            const segments: Segment[] = [];
                            
                            sortedRecords.forEach(record => {
                              const code = record.product_code;
                              const product = canvas.products?.[code];
                              const productName = product?.name || code;
                              const isToolSwitch = record.task_type === '工具切换';
                              
                              if (isToolSwitch) {
                                segments.push({
                                  productCode: code,
                                  productName: `${productName} (工具切换)`,
                                  startTime: record.start_time_s,
                                  endTime: record.end_time_s,
                                  count: 1,
                                  taskType: '工具切换'
                                });
                              } else {
                                const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
                                
                                if (lastSegment === null) {
                                  segments.push({
                                    productCode: code,
                                    productName,
                                    startTime: record.start_time_s,
                                    endTime: record.end_time_s,
                                    count: 1,
                                    taskType: '加工任务'
                                  });
                                } else if (lastSegment.productCode !== code || lastSegment.taskType === '工具切换') {
                                  segments.push({
                                    productCode: code,
                                    productName,
                                    startTime: record.start_time_s,
                                    endTime: record.end_time_s,
                                    count: 1,
                                    taskType: '加工任务'
                                  });
                                } else {
                                  const gap = record.start_time_s - lastSegment.endTime;
                                  if (gap < 1) {
                                    lastSegment.endTime = record.end_time_s;
                                    lastSegment.count += 1;
                                  } else {
                                    segments.push({
                                      productCode: code,
                                      productName,
                                      startTime: record.start_time_s,
                                      endTime: record.end_time_s,
                                      count: 1,
                                      taskType: '加工任务'
                                    });
                                  }
                                }
                              }
                            });
                            
                            segments.forEach(segment => {
                              const isToolSwitch = segment.taskType === '工具切换';
                              ganttData.push({
                                deviceName: device.name || deviceId,
                                productCode: segment.productCode,
                                productName: segment.productName,
                                startTime: segment.startTime,
                                endTime: segment.endTime,
                                count: segment.count,
                                color: isToolSwitch ? '#F97316' : (productColorMap[segment.productCode] || '#3B82F6'),
                                taskType: segment.taskType
                              });
                            });
                          });
                          
                          return ganttData.sort((a, b) => a.deviceName.localeCompare(b.deviceName, 'zh-CN'));
                        })()}
                        productColors={Object.fromEntries(
                          Object.entries(canvas.products || {}).map(([code, p]) => [code, p.color])
                        )}
                        durationS={selectedRecord.duration_s}
                      />
                      
                      {selectedRecord.results.storage_stats && selectedRecord.results.storage_stats.length > 0 && (
                        <BarChart
                          title="仓库最大利用率"
                          data={selectedRecord.results.storage_stats
                            .filter(stat => stat.capacity > 0)
                            .map(stat => ({
                              label: stat.device_name,
                              value: stat.capacity > 0 ? ((stat.max_stock ?? stat.stock) / stat.capacity) * 100 : 0
                            }))
                            .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))}
                          valueSuffix="%"
                        />
                      )}
                      
                      {selectedRecord.results.storage_stats && selectedRecord.results.storage_stats.length > 0 && (
                        <DualBarChart
                          title="仓库最大等待入库量和库存量"
                          label1="库存量"
                          label2="等待入库量"
                          data={selectedRecord.results.storage_stats
                            .map(stat => ({
                              label: stat.device_name,
                              value1: stat.max_stock ?? stat.stock,
                              value2: stat.max_waiting_entry ?? 0
                            }))
                            .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))}
                        />
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="no-selection">请选择一条记录查看详情</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
