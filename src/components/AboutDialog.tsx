import Modal from './Modal';
import { open } from '@tauri-apps/plugin-shell';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const handleOpenUrl = async () => {
    await open('https://www.enduslab.com');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="关于" width={400}>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#1E293B' }}>
          DysProSim
        </h2>
        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748B' }}>
          v1.3.0
        </p>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#475569' }}>
          离散生产与物流系统模拟工具
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <img 
            src="/qrcode.jpg" 
            alt="公众号二维码" 
            style={{ 
              width: '150px', 
              height: '150px', 
              border: '1px solid #E2E8F0',
              borderRadius: '4px'
            }} 
          />
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748B' }}>
            扫码关注公众号
          </p>
        </div>
        
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#F8FAFC', 
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569' }}>
            <strong>官网：</strong>
            <span
              onClick={handleOpenUrl}
              style={{ color: '#3B82F6', textDecoration: 'none', cursor: 'pointer' }}
            >
              www.enduslab.com
            </span>
          </p>
        </div>
        
        <p style={{ margin: '0', fontSize: '13px', color: '#64748B' }}>
          上海云图数镜软件技术有限公司
        </p>
      </div>
    </Modal>
  );
}
