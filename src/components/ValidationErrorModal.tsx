import { useEffect, useRef, useState } from 'react';

interface ValidationErrorModalProps {
  errors: string[];
  onClose: () => void;
}

export default function ValidationErrorModal({ errors, onClose }: ValidationErrorModalProps) {
  const [position, setPosition] = useState({ x: 0, y: -100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

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
          width: '500px',
          maxWidth: '90%',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transform: `translate(${position.x}px, ${position.y}px)`,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
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
            borderBottom: '1px solid #e5e7eb',
            padding: '12px 16px',
            background: '#fef2f2',
            borderRadius: '8px 8px 0 0',
          }}
          onMouseDown={handleMouseDown}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <polygon points="12,3 21,20 3,20" fill="#EF4444" stroke="white" strokeWidth="2" />
              <text x="12" y="17" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">!</text>
            </svg>
            <h3 style={{ margin: 0, color: '#EF4444', fontSize: '16px' }}>检查出错</h3>
          </div>
          <button 
            className="modal-close" 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >×</button>
        </div>
        
        <div 
          className="modal-body" 
          style={{ 
            flex: '1 1 auto', 
            overflow: 'auto', 
            padding: '16px', 
            minHeight: 0,
            background: '#ffffff',
          }}
        >
          <div style={{ 
            padding: '12px', 
            background: '#fef2f2', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '1px solid #fecaca'
          }}>
            <strong style={{ color: '#EF4444' }}>发现以下问题：</strong>
          </div>
          
          <ul style={{ 
            margin: 0, 
            padding: '0 0 0 20px', 
            color: '#1f2937',
          }}>
            {errors.map((error, idx) => (
              <li key={idx} style={{ marginBottom: '12px', lineHeight: '1.5', color: '#1f2937' }}>{error}</li>
            ))}
          </ul>
        </div>
        
        <div 
          className="modal-footer"
          style={{ 
            padding: '12px 16px', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
            background: '#f9fafb',
            borderRadius: '0 0 8px 8px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
