import { useState } from 'react';
import Modal from './Modal';
import { useAppStore } from '../store';
import type { Product } from '../types';

interface ProductManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductManager({ isOpen, onClose }: ProductManagerProps) {
  const { canvas, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const products = Object.values(canvas.products);

  const handleCreate = () => {
    setEditingProduct({
      code: '',
      name: '',
      color: '#3B82F6',
      bom: {},
    });
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setShowForm(true);
  };

  const handleDelete = async (code: string) => {
    if (confirm(`确定要删除产品 "${code}" 吗？`)) {
      await deleteProduct(code);
    }
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    
    if (!editingProduct.code.trim()) {
      alert('产品编码不能为空');
      return;
    }

    if (canvas.products[editingProduct.code] && !showForm) {
      await updateProduct(editingProduct);
    } else {
      await addProduct(editingProduct);
    }
    
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="产品管理" width={500}>
      <div className="product-manager">
        {!showForm ? (
          <>
            <div style={{ marginBottom: '12px' }}>
              <button className="btn btn-primary" onClick={handleCreate}>
                + 新建产品
              </button>
            </div>

            {products.length === 0 ? (
              <div className="empty-state">
                <p>暂无产品</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>编码</th>
                    <th>名称</th>
                    <th>颜色</th>
                    <th>优先级</th>
                    <th style={{ width: '100px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.code}>
                      <td>{product.code}</td>
                      <td>{product.name}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div 
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              backgroundColor: product.color,
                              border: '1px solid #CBD5E1',
                              borderRadius: '4px'
                            }} 
                          />
                          {product.color}
                        </div>
                      </td>
                      <td>{product.priority ?? '-'}</td>
                      <td>
                        <button 
                          className="btn" 
                          style={{ padding: '4px 8px', marginRight: '4px' }}
                          onClick={() => handleEdit(product)}
                        >
                          编辑
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '4px 8px' }}
                          onClick={() => handleDelete(product.code)}
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
          <div className="product-form">
            <div className="property-row">
              <label className="property-label">产品编码</label>
              <input
                type="text"
                className="property-input"
                value={editingProduct?.code || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, code: e.target.value } : null)}
                placeholder="输入产品编码"
                disabled={!!canvas.products[editingProduct?.code || '']}
              />
            </div>

            <div className="property-row">
              <label className="property-label">产品名称</label>
              <input
                type="text"
                className="property-input"
                value={editingProduct?.name || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="输入产品名称"
              />
            </div>

            <div className="property-row">
              <label className="property-label">产品颜色</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <input
                  type="color"
                  value={editingProduct?.color || '#3B82F6'}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, color: e.target.value } : null)}
                  style={{ width: '40px', height: '32px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  className="property-input"
                  value={editingProduct?.color || '#3B82F6'}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, color: e.target.value } : null)}
                />
              </div>
            </div>

            <div className="property-row">
              <label className="property-label">优先级</label>
              <select
                className="property-input"
                value={editingProduct?.priority ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingProduct(prev => prev ? { ...prev, priority: val === '' ? null : Number(val) } : null);
                }}
              >
                <option value="">未设置</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
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
