import React, { useState, useEffect } from 'react';
import { ProductBOM, InventoryItem } from '../types';
import { X, Save, Plus, Trash2 } from 'lucide-react';

interface BomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bom: Omit<ProductBOM, 'id'> | ProductBOM) => void;
  initialData?: ProductBOM | null;
  inventory: InventoryItem[];
}

export const BomModal: React.FC<BomModalProps> = ({ isOpen, onClose, onSave, initialData, inventory }) => {
  const [productItem, setProductItem] = useState('');
  const [materials, setMaterials] = useState<{ inventoryItemId: string; qtyPerUnit: number; unitType: string }[]>([]);

  useEffect(() => {
    if (initialData) {
      setProductItem(initialData.productItem);
      setMaterials(initialData.materials || []);
    } else {
      setProductItem('');
      setMaterials([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddMaterial = () => {
    setMaterials([...materials, { inventoryItemId: '', qtyPerUnit: 0, unitType: 'pcs' }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: string | number) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    
    // Auto-fill unit based on selected inventory item
    if (field === 'inventoryItemId') {
      const selectedItem = inventory.find(i => i.id === value);
      if (selectedItem) {
        newMaterials[index].unitType = selectedItem.unit;
      }
    }
    
    setMaterials(newMaterials);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productItem.trim()) {
      alert('กรุณาระบุชื่อสินค้า');
      return;
    }
    
    if (materials.length === 0) {
      alert('กรุณาเพิ่มส่วนประกอบอย่างน้อย 1 รายการ');
      return;
    }
    
    const hasEmptyMaterial = materials.some(m => !m.inventoryItemId || m.qtyPerUnit <= 0);
    if (hasEmptyMaterial) {
      alert('กรุณาระบุวัตถุดิบและปริมาณให้ครบถ้วนและถูกต้อง');
      return;
    }

    const bomData: Omit<ProductBOM, 'id'> | ProductBOM = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      productItem,
      materials
    };

    onSave(bomData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-kanit">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'แก้ไขสูตรการผลิต' : 'สร้างสูตรการผลิตใหม่'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="bom-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อสินค้า (Product Name) *</label>
              <input
                type="text"
                required
                value={productItem}
                onChange={(e) => setProductItem(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="เช่น ขวด PET 500ml ลายริ้ว"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-slate-700">ส่วนประกอบ (Materials) *</label>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> เพิ่มวัตถุดิบ
                </button>
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-slate-200 border-dashed rounded-lg text-slate-500 text-sm">
                  ยังไม่มีส่วนประกอบ กรุณากดปุ่ม "เพิ่มวัตถุดิบ"
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map((mat, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex-1 w-full">
                        <select
                          required
                          value={mat.inventoryItemId}
                          onChange={(e) => handleMaterialChange(index, 'inventoryItemId', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-sm"
                        >
                          <option value="">-- เลือกวัตถุดิบ --</option>
                          {inventory.map(item => (
                            <option key={item.id} value={item.id}>
                              [{item.code}] {item.name} ({item.currentStock} {item.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-32">
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.0001"
                          value={mat.qtyPerUnit || ''}
                          onChange={(e) => handleMaterialChange(index, 'qtyPerUnit', Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                          placeholder="ปริมาณ"
                        />
                      </div>
                      <div className="w-full sm:w-24">
                        <input
                          type="text"
                          required
                          value={mat.unitType}
                          onChange={(e) => handleMaterialChange(index, 'unitType', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-slate-100"
                          placeholder="หน่วย"
                          readOnly
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-end sm:self-auto"
                        title="ลบรายการ"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="bom-form"
            className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            บันทึกสูตรการผลิต
          </button>
        </div>
      </div>
    </div>
  );
};
