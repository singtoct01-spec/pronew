import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { X, Save } from 'lucide-react';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id'> | InventoryItem) => void;
  initialData?: InventoryItem | null;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    code: '',
    name: '',
    category: 'Other',
    usage: '',
    currentStock: 0,
    unit: 'pcs',
    minStock: 0,
    maxStock: 0,
    location: '',
    group: '',
    remarks: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        code: '',
        name: '',
        category: 'Other',
        usage: '',
        currentStock: 0,
        unit: 'pcs',
        minStock: 0,
        maxStock: 0,
        location: '',
        group: '',
        remarks: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['currentStock', 'minStock', 'maxStock'].includes(name) ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as InventoryItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-kanit">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'แก้ไขรายการสินค้า' : 'เพิ่มรายการสินค้าใหม่'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสสินค้า *</label>
                <input
                  type="text"
                  name="code"
                  required
                  value={formData.code || ''}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="เช่น RM-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อสินค้า *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="เช่น เม็ดพลาสติก PET ใส"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หมวดหมู่ *</label>
                <select
                  name="category"
                  required
                  value={formData.category || 'Other'}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                >
                  <option value="Resin">เม็ดพลาสติก (Resin)</option>
                  <option value="Preform">พรีฟอร์ม (Preform)</option>
                  <option value="Box">กล่อง (Box)</option>
                  <option value="Bag">ถุง (Bag)</option>
                  <option value="Pigment">สี (Pigment)</option>
                  <option value="FG">สินค้าสำเร็จรูป (FG)</option>
                  <option value="Other">อื่นๆ (Other)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">การใช้งาน/กลุ่ม</label>
                <input
                  type="text"
                  name="usage"
                  value={formData.usage || ''}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="เช่น ผลิตขวดน้ำดื่ม"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ยอดคงเหลือ *</label>
                <input
                  type="number"
                  name="currentStock"
                  required
                  min="0"
                  value={formData.currentStock || 0}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หน่วย *</label>
                <input
                  type="text"
                  name="unit"
                  required
                  value={formData.unit || ''}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="เช่น kg, pcs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock *</label>
                <input
                  type="number"
                  name="minStock"
                  required
                  min="0"
                  value={formData.minStock || 0}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Stock *</label>
                <input
                  type="number"
                  name="maxStock"
                  required
                  min="0"
                  value={formData.maxStock || 0}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่เก็บ (Location)</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="เช่น WH-A1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">กลุ่ม (Group)</label>
                <input
                  type="text"
                  name="group"
                  value={formData.group || ''}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="เช่น PET"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                <textarea
                  name="remarks"
                  value={formData.remarks || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="ข้อมูลเพิ่มเติม..."
                />
              </div>
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
            form="inventory-form"
            className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
};
