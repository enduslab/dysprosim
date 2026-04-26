import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import type { ProductRoute, CanvasState } from '../types';

interface ProductRoutesModalProps {
  onClose: () => void;
}

function RouteDiagram({ route, productColor, expandedMaterials, canvas }: { 
  route: ProductRoute; 
  productColor: string;
  expandedMaterials: boolean;
  canvas: CanvasState;
}) {
  const nodeCount = route.path.length;
  const minNodeWidth = 100;
  const materialLineHeight = 14;
  
  const getStepMaterials = (nodeIndex: number): Record<string, number> | null => {
    const nodeId = route.path[nodeIndex];
    const device = canvas.devices[nodeId];
    if (device && device.type === 'Station') {
      const station = device as { product_materials?: Record<string, Record<string, number>> };
      return station.product_materials?.[route.product_code] || null;
    }
    return null;
  };
  
  const maxMaterialCount = expandedMaterials 
    ? Math.max(1, ...route.path.map((_, i) => {
        const materials = getStepMaterials(i);
        return materials ? Object.keys(materials).length : 0;
      }))
    : 0;
  
  const svgWidth = Math.max(300, nodeCount * minNodeWidth);
  const svgHeight = 80 + maxMaterialCount * materialLineHeight + 10;
  const mainPathY = svgHeight / 2;
  const startX = 50;
  const nodeSpacing = (svgWidth - 100) / Math.max(1, nodeCount - 1);

  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < nodeCount; i++) {
    positions.push({ x: startX + i * nodeSpacing, y: mainPathY });
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', borderRadius: '8px' }}>
      <svg width={svgWidth} height={svgHeight} style={{ background: 'var(--bg-secondary)', display: 'block', minWidth: '100%' }}>
        {positions.slice(0, -1).map((pos, i) => (
          <line
            key={`line-${i}`}
            x1={pos.x}
            y1={pos.y}
            x2={positions[i + 1].x}
            y2={positions[i + 1].y}
            stroke={productColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        
        {positions.map((pos, i) => {
          const isStart = i === 0;
          const isEnd = i === nodeCount - 1 && route.is_complete;
          const nodeName = route.path_names[i] || route.path[i];
          const hasMaterials = getStepMaterials(i) !== null;
          const materials = expandedMaterials ? getStepMaterials(i) : null;
          const materialEntries = materials ? Object.entries(materials) : [];
          
          return (
            <g key={`node-${i}`}>
              {isStart && (
                <circle cx={pos.x} cy={pos.y} r="16" fill={productColor} stroke="white" strokeWidth="2" />
              )}
              {isEnd && (
                <g transform={`translate(${pos.x}, ${pos.y}) rotate(45)`}>
                  <rect x="-10" y="-10" width="20" height="20" fill={productColor} stroke="white" strokeWidth="2" />
                </g>
              )}
              {!isStart && !isEnd && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={hasMaterials ? 8 : 6}
                  fill={productColor}
                  stroke={hasMaterials ? '#F59E0B' : 'white'}
                  strokeWidth="2"
                />
              )}
              
              <text
                x={pos.x}
                y={pos.y - (isStart || isEnd ? 26 : 18)}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-primary)"
                fontWeight="500"
              >
                {nodeName}
              </text>
              
              {materialEntries.length > 0 && materialEntries.map(([code, qty], idx) => {
                const material = canvas.materials?.[code];
                return (
                  <text
                    key={code}
                    x={pos.x}
                    y={pos.y + 28 + idx * materialLineHeight}
                    textAnchor="middle"
                    fontSize="9"
                    fill="var(--text-muted)"
                  >
                    {material?.name || code}: {qty}{material?.unit || ''}
                  </text>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ProductRoutesModal({ onClose }: ProductRoutesModalProps) {
  const productRoutes = useAppStore((state) => state.productRoutes);
  const canvas = useAppStore((state) => state.canvas);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());

  if (!productRoutes) return null;

  const getProductColor = (productCode: string) => {
    const product = canvas.products[productCode];
    return product?.color || '#6B7280';
  };

  const routesByProduct: Record<string, ProductRoute[]> = {};
  productRoutes.routes.forEach(route => {
    if (!routesByProduct[route.product_code]) {
      routesByProduct[route.product_code] = [];
    }
    routesByProduct[route.product_code].push(route);
  });
  
  const toggleRouteExpand = (routeKey: string) => {
    setExpandedRoutes(prev => {
      const next = new Set(prev);
      if (next.has(routeKey)) {
        next.delete(routeKey);
      } else {
        next.add(routeKey);
      }
      return next;
    });
  };
  
  const hasAnyMaterials = (route: ProductRoute): boolean => {
    if (!route.step_materials) return false;
    return route.step_materials.some(m => Object.keys(m).length > 0);
  };

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

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div 
        ref={modalRef}
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '900px',
          maxHeight: '70vh',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transform: `translate(${position.x}px, ${position.y}px)`,
          background: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div 
          className="modal-header" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexShrink: 0,
            cursor: 'move',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
        >
          <h3>产品工艺路线</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div 
          className="modal-body" 
          style={{ 
            flex: '1 1 auto', 
            overflow: 'auto', 
            padding: '16px', 
            minHeight: 0,
          }}
        >
          {!productRoutes.all_start_nodes_have_product && (
            <div style={{ 
              padding: '12px', 
              background: 'var(--warning-bg)', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid var(--warning-border)'
            }}>
              <strong style={{ color: 'var(--warning-text)' }}>警告：</strong>
              <span style={{ color: 'var(--warning-text)' }}>以下起点未选择产品：</span>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--warning-text)' }}>
                {productRoutes.start_nodes_without_product.map(node => (
                  <li key={node.id}>{node.name} (ID: {node.id})</li>
                ))}
              </ul>
            </div>
          )}

          {productRoutes.incomplete_route_start_nodes.length > 0 && (
            <div style={{ 
              padding: '12px', 
              background: 'var(--warning-bg)', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid var(--warning-border)'
            }}>
              <strong style={{ color: 'var(--warning-text)' }}>警告：</strong>
              <span style={{ color: 'var(--warning-text)' }}>以下起点的产品没有完整工艺路线（未到达终点）：</span>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--warning-text)' }}>
                {productRoutes.incomplete_route_start_nodes.map(node => (
                  <li key={node.id}>
                    {node.name} (产品: {node.product_name || node.product_code || '未知'})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {productRoutes.assembly_station_errors && productRoutes.assembly_station_errors.length > 0 && (
            <div style={{ 
              padding: '12px', 
              background: '#FEF2F2', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid #FECACA'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                  <polygon points="10,2 18,17 2,17" fill="#EF4444" stroke="white" strokeWidth="2" />
                  <text x="10" y="14" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">!</text>
                </svg>
                <strong style={{ color: '#DC2626' }}>错误：</strong>
                <span style={{ color: '#DC2626' }}>装配站配置问题</span>
              </div>
              <ul style={{ margin: '0 0 0 28px', paddingLeft: '0', color: '#DC2626' }}>
                {productRoutes.assembly_station_errors.map((error, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    {error.error_type === 'NoProductSelected' ? (
                      <><strong>{error.name}</strong> 未选择任何产品</>
                    ) : (
                      <>
                        <strong>{error.name}</strong> 的产品 <strong>{error.product_name || error.product_code}</strong> 
                        {' '}上游节点 <strong>{error.upstream_node_name || error.upstream_node_id}</strong> 的来料用量为 0
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {productRoutes.disassembly_station_errors && productRoutes.disassembly_station_errors.length > 0 && (
            <div style={{ 
              padding: '12px', 
              background: '#FEF2F2', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid #FECACA'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                  <polygon points="10,2 18,17 2,17" fill="#EF4444" stroke="white" strokeWidth="2" />
                  <text x="10" y="14" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">!</text>
                </svg>
                <strong style={{ color: '#DC2626' }}>错误：</strong>
                <span style={{ color: '#DC2626' }}>拆解站配置问题</span>
              </div>
              <ul style={{ margin: '0 0 0 28px', paddingLeft: '0', color: '#DC2626' }}>
                {productRoutes.disassembly_station_errors.map((error, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    {error.error_type === 'NoItemToDisassemble' ? (
                      <><strong>{error.name}</strong> 未选择任何待拆解品</>
                    ) : error.error_type === 'NoDisassemblyProduct' ? (
                      <><strong>{error.name}</strong> 未选择任何拆解产物</>
                    ) : error.error_type === 'NoProductForItem' ? (
                      <><strong>{error.name}</strong> 的待拆解品 <strong>{error.product_name || error.product_code}</strong> 未设置拆解产物数量</>
                    ) : error.error_type === 'DisassemblyProductQuantityZero' ? (
                      <><strong>{error.name}</strong> 的待拆解品 <strong>{error.product_name || error.product_code}</strong> 的拆解产物 <strong>{error.disassembly_product_name || error.disassembly_product_code}</strong> 产出数量为 0</>
                    ) : error.error_type === 'ItemUnreachable' ? (
                      <><strong>{error.name}</strong> 的待拆解品 <strong>{error.product_name || error.product_code}</strong> 无法从起点或上游拆解站获取</>
                    ) : error.error_type === 'AssemblyProductAsItem' ? (
                      <><strong>{error.name}</strong> 的待拆解品 <strong>{error.product_name || error.product_code}</strong> 是装配成品，不能作为待拆解品</>
                    ) : (
                      <><strong>{error.name}</strong> 存在配置问题</>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Object.keys(routesByProduct).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              暂无工艺路线数据，请确保起点已选择产品并连接到下游设备
            </div>
          ) : (
            Object.entries(routesByProduct).map(([productCode, routes]) => {
              const product = canvas.products[productCode];
              const productColor = getProductColor(productCode);
              
              return (
                <div key={productCode} style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                  }}>
                    <div 
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '4px', 
                        background: productColor,
                        border: '1px solid rgba(255,255,255,0.2)'
                      }} 
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {product?.name || productCode}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      ({routes.length} 条路线)
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {routes.map((route, index) => {
                      const routeKey = `${route.start_node_id}-${index}`;
                      const isExpanded = expandedRoutes.has(routeKey);
                      const hasMaterials = hasAnyMaterials(route);
                      
                      return (
                        <div 
                          key={routeKey}
                          style={{ 
                            padding: '12px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              路线 {index + 1}
                              {route.route_type === 'ComponentToAssembly' && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'var(--info-bg)', color: 'var(--info-text)' }}>组件→装配站</span>
                              )}
                              {route.route_type === 'AssemblyToEnd' && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'var(--info-bg)', color: 'var(--info-text)' }}>装配站→终点</span>
                              )}
                              {route.route_type === 'InputToDisassembly' && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: '#FFF3E0', color: '#E65100' }}>待拆解品→拆解站</span>
                              )}
                              {route.route_type === 'DisassemblyOutput' && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: '#FFF3E0', color: '#E65100' }}>拆解站→下游</span>
                              )}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {hasMaterials && (
                                <button
                                  onClick={() => toggleRouteExpand(routeKey)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                  }}
                                  title="展开/收起原料信息"
                                >
                                  <span style={{ 
                                    transition: 'transform 0.2s',
                                    display: 'inline-block',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                  }}>
                                    ▼
                                  </span>
                                  原料
                                </button>
                              )}
                              <span 
                                style={{ 
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: route.is_complete ? 'var(--success-bg)' : 'var(--warning-bg)',
                                  color: route.is_complete ? 'var(--success-text)' : 'var(--warning-text)',
                                }}
                              >
                                {route.is_complete ? '完整' : '不完整'}
                              </span>
                            </div>
                          </div>
                          <RouteDiagram 
                            route={route} 
                            productColor={productColor} 
                            expandedMaterials={isExpanded}
                            canvas={canvas}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
