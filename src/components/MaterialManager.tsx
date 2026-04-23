import { useState } from 'react';
import Modal from './Modal';
import { useAppStore } from '../store';
import type { Material } from '../types';

interface MaterialManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MATERIAL_UNITS = [
  { value: '', label: '无' },
  { value: '件', label: '件' },
  { value: '千克', label: '千克' },
  { value: '克', label: '克' },
  { value: '米', label: '米' },
  { value: '厘米', label: '厘米' },
  { value: '毫米', label: '毫米' },
  { value: '平方米', label: '平方米' },
  { value: '平方厘米', label: '平方厘米' },
  { value: '毫升', label: '毫升' },
  { value: '升', label: '升' },
  { value: '立方米', label: '立方米' },
];

export default function MaterialManager({ isOpen, onClose }: MaterialManagerProps) {
  const { canvas, addMaterial, updateMaterial, deleteMaterial } = useAppStore();
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showForm, setShowForm] = useState(false);

  const materials = Object.values(canvas.materials);

  const handleCreate = () => {
    setEditingMaterial({
      code: '',
      name: '',
      unit: '',
    });
    setShowForm(true);
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial({ ...material });
    setShowForm(true);
  };

  const handleDelete = async (code: string) => {
    if (confirm(`确定要删除原料 "${code}" 吗？`)) {
      await deleteMaterial(code);
    }
  };

  const handleSave = async () => {
    if (!editingMaterial) return;
    
    if (!editingMaterial.code.trim()) {
      alert('原料编码不能为空');
      return;
    }

    if (canvas.materials[editingMaterial.code] && !showForm) {
      await updateMaterial(editingMaterial);
    } else {
      await addMaterial(editingMaterial);
    }
    
    setShowForm(false);
    setEditingMaterial(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMaterial(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="原料管理" width={500}>
      <div className="material-manager">
        {!showForm ? (
          <>
            <div style={{ marginBottom: '12px' }}>
              <button className="btn btn-primary" onClick={handleCreate}>
                + 新建原料
              </button>
            </div>

            {materials.length === 0 ? (
              <div className="empty-state">
                <p>暂无原料</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>编码</th>
                    <th>名称</th>
                    <th>计量单位</th>
                    <th style={{ width: '100px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material) => (
                    <tr key={material.code}>
                      <td>{material.code}</td>
                      <td>{material.name}</td>
                      <td>{material.unit || '-'}</td>
                      <td>
                        <button 
                          className="btn" 
                          style={{ padding: '4px 8px', marginRight: '4px' }}
                          onClick={() => handleEdit(material)}
                        >
                          编辑
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '4px 8px' }}
                          onClick={() => handleDelete(material.code)}
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
          <div className="material-form">
            <div className="property-row">
              <label className="property-label">原料编码</label>
              <input
                type="text"
                className="property-input"
                value={editingMaterial?.code || ''}
                onChange={(e) => setEditingMaterial(prev => prev ? { ...prev, code: e.target.value } : null)}
                placeholder="输入原料编码"
                disabled={!!canvas.materials[editingMaterial?.code || '']}
              />
            </div>

            <div className="property-row">
              <label className="property-label">原料名称</label>
              <input
                type="text"
                className="property-input"
                value={editingMaterial?.name || ''}
                onChange={(e) => setEditingMaterial(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="输入原料名称"
              />
            </div>

            <div className="property-row">
              <label className="property-label">计量单位</label>
              <select
                className="property-input"
                value={editingMaterial?.unit || ''}
                onChange={(e) => setEditingMaterial(prev => prev ? { ...prev, unit: e.target.value } : null)}
              >
                {MATERIAL_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
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
