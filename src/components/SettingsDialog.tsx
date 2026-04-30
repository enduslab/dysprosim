import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAppStore } from '../store';
import type { Settings, AiApiConfig } from '../types';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { canvas, updateSettings, aiApiConfig, loadAiApiConfig, saveAiApiConfig, testAiConnection } = useAppStore();
  const [settings, setSettingsState] = useState<Settings>(canvas.settings);
  const [aiConfig, setAiConfig] = useState<AiApiConfig>(aiApiConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setSettingsState(canvas.settings);
  }, [canvas.settings, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadAiApiConfig();
    }
  }, [isOpen]);

  useEffect(() => {
    setAiConfig(aiApiConfig);
  }, [aiApiConfig]);

  const handleChange = (key: keyof Settings, value: number | boolean) => {
    setSettingsState(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await updateSettings(settings);
    await saveAiApiConfig(aiConfig);
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await saveAiApiConfig(aiConfig);
      const result = await testAiConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="设置" width={500}>
      <div className="settings-form">
        <div className="property-group">
          <div className="property-group-title">网格设置</div>
          
          <div className="property-row">
            <label className="property-label">网格间距</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <input
                type="number"
                className="property-input"
                value={settings.grid_step_mm}
                onChange={(e) => handleChange('grid_step_mm', parseFloat(e.target.value) || 100)}
                min={10}
                max={1000}
              />
              <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">显示网格</label>
            <input
              type="checkbox"
              checked={settings.show_grid}
              onChange={(e) => handleChange('show_grid', e.target.checked)}
            />
          </div>

          <div className="property-row">
            <label className="property-label">显示标尺</label>
            <input
              type="checkbox"
              checked={settings.show_rulers}
              onChange={(e) => handleChange('show_rulers', e.target.checked)}
            />
          </div>

          <div className="property-row">
            <label className="property-label">吸附阈值</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <input
                type="number"
                className="property-input"
                value={settings.snap_threshold_mm}
                onChange={(e) => handleChange('snap_threshold_mm', parseFloat(e.target.value) || 20)}
                min={0}
                max={100}
              />
              <span style={{ marginLeft: '4px', fontSize: '12px' }}>mm</span>
            </div>
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">显示设置</div>
          
          <div className="property-row">
            <label className="property-label">比例尺</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <input
                type="number"
                className="property-input"
                value={settings.px_per_mm}
                onChange={(e) => handleChange('px_per_mm', parseFloat(e.target.value) || 0.2)}
                min={0.01}
                max={10}
                step={0.01}
              />
              <span style={{ marginLeft: '4px', fontSize: '12px' }}>px/mm</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            比例尺表示每毫米对应的像素数，值越大显示越大。默认值：0.2
          </div>
        </div>

        <div className="property-group">
          <div className="property-group-title">AI 分析设置</div>
          
          <div className="property-row">
            <label className="property-label">使用自定义API</label>
            <input
              type="checkbox"
              checked={aiConfig.use_custom_api}
              onChange={(e) => setAiConfig(prev => ({ ...prev, use_custom_api: e.target.checked }))}
            />
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', marginBottom: '8px' }}>
            默认使用内置AI服务。如需使用自己的大模型API（兼容OpenAI格式），请勾选并填写以下配置。
          </div>

          {aiConfig.use_custom_api && (
            <>
              <div className="property-row">
                <label className="property-label">API 地址</label>
                <input
                  type="text"
                  className="property-input"
                  value={aiConfig.custom_base_url || ''}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, custom_base_url: e.target.value }))}
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div className="property-row">
                <label className="property-label">API Key</label>
                <input
                  type="password"
                  className="property-input"
                  value={aiConfig.custom_api_key || ''}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, custom_api_key: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>

              <div className="property-row">
                <label className="property-label">模型名称</label>
                <input
                  type="text"
                  className="property-input"
                  value={aiConfig.custom_model || ''}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, custom_model: e.target.value }))}
                  placeholder="gpt-4o / deepseek-chat / ..."
                />
              </div>

              <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                <button
                  className="btn"
                  onClick={handleTestConnection}
                  disabled={testing}
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                >
                  {testing ? '测试中...' : '测试连接'}
                </button>
                {testResult && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: testResult.startsWith('连接失败') ? '#EF4444' : '#10B981',
                  }}>
                    {testResult}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
