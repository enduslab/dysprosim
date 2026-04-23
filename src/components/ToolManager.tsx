import { useState } from 'react';
import Modal from './Modal';
import { useAppStore } from '../store';
import type { Tool } from '../types';

interface ToolManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ToolManager({ isOpen, onClose }: ToolManagerProps) {
  const { canvas, addTool, updateTool, deleteTool } = useAppStore();
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [showForm, setShowForm] = useState(false);

  const tools = Object.values(canvas.tools);

  const handleCreate = () => {
    setEditingTool({
      code: '',
      name: '',
    });
    setShowForm(true);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool({ ...tool });
    setShowForm(true);
  };

  const handleDelete = async (code: string) => {
    if (confirm(`确定要删除工具 "${code}" 吗？`)) {
      await deleteTool(code);
    }
  };

  const handleSave = async () => {
    if (!editingTool) return;
    
    if (!editingTool.code.trim()) {
      alert('工具编码不能为空');
      return;
    }

    if (!editingTool.name.trim()) {
      alert('工具名称不能为空');
      return;
    }

    if (canvas.tools[editingTool.code] && !showForm) {
      await updateTool(editingTool);
    } else {
      await addTool(editingTool);
    }
    
    setShowForm(false);
    setEditingTool(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTool(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="工具管理" width={500}>
      <div className="tool-manager">
        {!showForm ? (
          <>
            <div style={{ marginBottom: '12px' }}>
              <button className="btn btn-primary" onClick={handleCreate}>
                + 新建工具
              </button>
            </div>

            {tools.length === 0 ? (
              <div className="empty-state">
                <p>暂无工具</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>编码</th>
                    <th>名称</th>
                    <th style={{ width: '100px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((tool) => (
                    <tr key={tool.code}>
                      <td>{tool.code}</td>
                      <td>{tool.name}</td>
                      <td>
                        <button 
                          className="btn" 
                          style={{ padding: '4px 8px', marginRight: '4px' }}
                          onClick={() => handleEdit(tool)}
                        >
                          编辑
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '4px 8px' }}
                          onClick={() => handleDelete(tool.code)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <div className="tool-form">
            <div className="property-row">
              <label className="property-label">工具编码</label>
              <input
                type="text"
                className="property-input"
                value={editingTool?.code || ''}
                onChange={(e) => setEditingTool(prev => prev ? { ...prev, code: e.target.value } : null)}
                placeholder="输入工具编码"
                disabled={!!canvas.tools[editingTool?.code || '']}
              />
            </div>

            <div className="property-row">
              <label className="property-label">工具名称</label>
              <input
                type="text"
                className="property-input"
                value={editingTool?.name || ''}
                onChange={(e) => setEditingTool(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="输入工具名称"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn" onClick={handleCancel}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
