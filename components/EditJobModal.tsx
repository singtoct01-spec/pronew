import React, { useState, useEffect } from 'react';
import { ProductionJob, Status, RawMaterial, PRODUCT_SPECS, ProductBOM, InventoryItem } from '../types';
import { X, Save, AlertCircle, Calendar, Plus, Trash2, Wand2, Ruler, Flame, GitCommit, PauseCircle, CheckCircle2 } from 'lucide-react';

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ProductionJob | null;
  inventory: InventoryItem[];
  boms: ProductBOM[];
  onSave: (updatedJob: ProductionJob) => void;
}

export const EditJobModal: React.FC<EditJobModalProps> = ({ isOpen, onClose, job, inventory, boms, onSave }) => {
  const [formData, setFormData] = useState<Partial<ProductionJob>>({
    status: 'Running',
    productItem: '',
    productType: 'แก้วน้ำพลาสติก',
    color: '-',
    totalProduction: 0,
    priority: 'Normal',
    jobType: 'Planned',
    materials: []
  });

  const toInputString = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (job) {
      setFormData({ 
        ...job,
        priority: job.priority || 'Normal',
        jobType: job.jobType || 'Planned'
      });
    } else {
      setFormData({
        status: 'No Plan',
        productItem: '',
        productType: 'แก้วน้ำพลาสติก',
        color: '-',
        priority: 'Normal',
        jobType: 'Planned',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        materials: []
      });
    }
  }, [job, isOpen]);

  const addMaterial = () => {
    const newMaterial: RawMaterial = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      qtyPcs: 0,
      qtyKg: 0,
      unit: 'ชิ้น',
      lotNo: '',
      remarks: ''
    };
    setFormData(prev => ({ ...prev, materials: [...(prev.materials || []), newMaterial] }));
  };

  const updateMaterial = (id: string, field: keyof RawMaterial, value: any) => {
    setFormData(prev => ({
      ...prev,
      materials: (prev.materials || []).map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const removeMaterial = (id: string) => {
    setFormData(prev => ({
      ...prev,
      materials: (prev.materials || []).filter(m => m.id !== id)
    }));
  };

  const autoFillMaterialsFromBOM = () => {
    const product = formData.productItem || '';
    const color = formData.color && formData.color !== '-' ? formData.color : '';
    
    const searchTerms = [
        `${product} (${color})`.trim().toLowerCase(),
        `${product} ${color}`.trim().toLowerCase(),
        product.toLowerCase()
    ];

    let bom: ProductBOM | undefined;
    for (const term of searchTerms) {
        bom = boms.find(b => b.productItem.toLowerCase() === term); 
        if (bom) break;
    }
    
    if (!bom) {
         bom = boms.find(b => b.productItem.toLowerCase().includes(product.toLowerCase()));
    }

    if (!bom) {
      alert(`ไม่พบสูตรการผลิต (BOM) สำหรับสินค้า "${product}" ${color ? `สี ${color}` : ''}`);
      return;
    }

    if (!formData.totalProduction || formData.totalProduction <= 0) {
      alert('กรุณาระบุยอดผลิต (Target) ก่อนคำนวณวัตถุดิบ');
      return;
    }

    const newMaterials: RawMaterial[] = bom.materials.map(mat => {
      const inventoryItem = inventory.find(i => i.id === mat.inventoryItemId);
      const totalQty = mat.qtyPerUnit * (formData.totalProduction || 0);

      return {
        id: Math.random().toString(36).substr(2, 9),
        inventoryItemId: mat.inventoryItemId,
        name: inventoryItem ? `${inventoryItem.code} (${inventoryItem.name})` : 'Unknown Material',
        qtyPcs: mat.unitType === 'pcs' ? Math.ceil(totalQty) : 0,
        qtyKg: mat.unitType === 'kg' ? parseFloat(totalQty.toFixed(2)) : 0,
        unit: mat.unitType === 'pcs' ? 'ชิ้น' : 'กก.',
        lotNo: '',
        remarks: 'Auto-filled from BOM'
      };
    });

    setFormData(prev => ({ ...prev, materials: newMaterials }));
  };

  const autoFillSpecsFromMaster = () => {
    if (!formData.productItem) {
        alert('กรุณาระบุชื่อสินค้าก่อนดึงสเปค');
        return;
    }

    const sortedSpecs = [...PRODUCT_SPECS].sort((a, b) => b.code.length - a.code.length);
    const matchedSpec = sortedSpecs.find(spec => 
        formData.productItem?.toLowerCase().includes(spec.code.toLowerCase())
    );

    if (matchedSpec) {
        let weight = 0;
        if (matchedSpec.weight) {
            if (matchedSpec.weight.includes('-')) {
                const parts = matchedSpec.weight.split('-').map(s => parseFloat(s));
                weight = (parts[0] + parts[1]) / 2;
            } else {
                weight = parseFloat(matchedSpec.weight);
            }
        }

        setFormData(prev => ({
            ...prev,
            weightG: weight || prev.weightG,
            heightMm: matchedSpec.height || prev.heightMm,
            widthMm: matchedSpec.width || prev.widthMm, 
            productType: `${matchedSpec.type} (${matchedSpec.material})` || prev.productType
        }));
    } else {
        alert('ไม่พบข้อมูลสเปคสำหรับสินค้านี้ในฐานข้อมูล');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as ProductionJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col font-kanit">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <h3 className="font-bold text-xl text-slate-800">{job ? 'แก้ไขรายการผลิต' : 'เพิ่มรายการผลิตใหม่'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-2 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8">
          {/* Section 1: Basic Job Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-brand-600 uppercase tracking-widest border-l-4 border-brand-500 pl-2">ข้อมูลทั่วไป & สถานะงาน</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสเครื่องจักร</label>
                <input 
                  type="text" value={formData.machineId || ''} 
                  onChange={e => setFormData({ ...formData, machineId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" placeholder="เช่น IP1, B3" required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">เลขที่ใบสั่งผลิต (Job Order)</label>
                <input 
                  type="text" value={formData.jobOrder || ''} 
                  onChange={e => setFormData({ ...formData, jobOrder: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" placeholder="เช่น B6902-xxx" required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สถานะปัจจุบัน</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-bold ${
                    formData.status === 'Running' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                    formData.status === 'Delayed' ? 'bg-red-50 text-red-700 border-red-300' :
                    formData.status === 'Paused' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                    formData.status === 'Rescheduled' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                    'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="Running">🟢 กำลังผลิต (Running)</option>
                  <option value="Paused">⏸️ หยุดชั่วคราว (Paused)</option>
                  <option value="Stopped">⛔ หยุด (Stopped)</option>
                  <option value="Delayed">⚠️ ตกแผน/ล่าช้า (Delayed)</option>
                  <option value="Rescheduled">📅 เลื่อนแผน (Rescheduled)</option>
                  <option value="Maintenance">🔧 ซ่อมบำรุง</option>
                  <option value="Completed">✅ เสร็จสิ้น</option>
                  <option value="No Plan">⏳ รอดำเนินการ</option>
                </select>
              </div>
            </div>

            {/* Special Flags Row */}
            <div className="flex gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
               <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">ระดับความสำคัญ (Priority)</label>
                  <div className="flex gap-2">
                    <button type="button" 
                        onClick={() => setFormData({...formData, priority: 'Normal'})}
                        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold border transition-colors ${formData.priority === 'Normal' ? 'bg-white border-slate-400 text-slate-700 shadow-sm' : 'border-transparent text-slate-400 hover:bg-slate-200'}`}>
                        ปกติ
                    </button>
                    <button type="button" 
                        onClick={() => setFormData({...formData, priority: 'Urgent'})}
                        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${formData.priority === 'Urgent' ? 'bg-red-50 border-red-400 text-red-600 shadow-sm' : 'border-transparent text-slate-400 hover:bg-slate-200'}`}>
                        <Flame size={12} /> งานด่วน
                    </button>
                  </div>
               </div>
               <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">ประเภทงาน (Job Type)</label>
                  <select 
                    value={formData.jobType}
                    onChange={(e) => setFormData({...formData, jobType: e.target.value as any})}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
                  >
                    <option value="Planned">ตามแผนปกติ (Planned)</option>
                    <option value="Inserted">⚡ งานแทรก (Inserted)</option>
                    <option value="Rework">🛠️ งานแก้ (Rework)</option>
                  </select>
               </div>
            </div>
          </div>

          {/* Section 2: Product Specifications */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-brand-600 uppercase tracking-widest border-l-4 border-brand-500 pl-2">ข้อมูลผลิตภัณฑ์</h4>
                <button 
                  type="button" 
                  onClick={autoFillSpecsFromMaster}
                  className="text-xs flex items-center gap-1 text-slate-600 hover:text-brand-600 font-bold bg-slate-100 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                >
                  <Ruler size={14} /> ดึงสเปค (Auto Spec)
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อสินค้า (Product Item)</label>
                <input type="text" value={formData.productItem || ''} onChange={e => setFormData({ ...formData, productItem: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required placeholder="เช่น QE307-2, B01" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ประเภทสินค้า</label>
                <input type="text" value={formData.productType || ''} onChange={e => setFormData({ ...formData, productType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="เช่น แก้วพลาสติก" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สี (Color)</label>
                <input type="text" value={formData.color || ''} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสแม่พิมพ์ (Mold)</label>
                <input type="text" value={formData.moldCode || ''} onChange={e => setFormData({ ...formData, moldCode: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">น้ำหนัก (กรัม)</label>
                <input type="number" step="0.1" value={formData.weightG || ''} onChange={e => setFormData({ ...formData, weightG: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สูง (มม.)</label>
                <input type="number" value={formData.heightMm || ''} onChange={e => setFormData({ ...formData, heightMm: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">กว้าง (มม.)</label>
                <input type="number" value={formData.widthMm || ''} onChange={e => setFormData({ ...formData, widthMm: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">ยอดผลิตที่ต้องการ (Target)</label>
                <input type="number" value={formData.totalProduction || ''} onChange={e => setFormData({ ...formData, totalProduction: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-brand-700" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">วิธีบรรจุ</label>
                <input type="text" value={formData.packagingMethod || ''} onChange={e => setFormData({ ...formData, packagingMethod: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Section 3: Schedule */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-brand-600 uppercase tracking-widest border-l-4 border-brand-500 pl-2">กำหนดการ (Schedule)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เวลาเริ่มผลิต</label>
                  <input type="datetime-local" value={toInputString(formData.startDate)} onChange={e => setFormData({ ...formData, startDate: new Date(e.target.value).toISOString() })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เวลาสิ้นสุด</label>
                  <input type="datetime-local" value={toInputString(formData.endDate)} onChange={e => setFormData({ ...formData, endDate: new Date(e.target.value).toISOString() })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
               </div>
            </div>
          </div>

          {/* Section 4: Materials */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
              <h4 className="text-sm font-bold text-brand-600 uppercase tracking-widest pl-2">รายการเบิกวัตถุดิบ (BOM)</h4>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={autoFillMaterialsFromBOM}
                  className="text-xs flex items-center gap-1 text-white font-bold bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  <Wand2 size={14} /> ดึงสูตร BOM
                </button>
                <button 
                  type="button" onClick={addMaterial}
                  className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 font-bold bg-white border border-slate-300 px-3 py-1.5 rounded-lg"
                >
                  <Plus size={14} /> เพิ่มเอง
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {formData.materials?.map((m, idx) => {
                // Check Stock Status
                const inventoryItem = m.inventoryItemId ? inventory.find(i => i.id === m.inventoryItemId) : null;
                const requiredQty = m.qtyPcs > 0 ? m.qtyPcs : m.qtyKg;
                const currentStock = inventoryItem ? inventoryItem.currentStock : 0;
                const isShortage = inventoryItem && currentStock < requiredQty;

                return (
                <div key={m.id} className={`grid grid-cols-1 md:grid-cols-12 gap-2 p-2 rounded-lg border ${isShortage ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="md:col-span-1 flex items-center justify-center font-bold text-slate-400">{idx + 1}</div>
                  <div className="md:col-span-3">
                    <input type="text" placeholder="ชื่อวัตถุดิบ" value={m.name} onChange={e => updateMaterial(m.id, 'name', e.target.value)} className="w-full text-xs p-1.5 border border-slate-300 rounded" />
                    {isShortage && (
                        <div className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-1">
                            <AlertCircle size={10} /> ของขาด! มีแค่ {currentStock.toLocaleString()} {m.unit}
                        </div>
                    )}
                    {!isShortage && inventoryItem && (
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                            <CheckCircle2 size={10} /> พร้อมใช้ ({currentStock.toLocaleString()} {m.unit})
                        </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <input type="number" placeholder="กก." value={m.qtyKg > 0 ? m.qtyKg : m.qtyPcs} onChange={e => updateMaterial(m.id, m.qtyKg > 0 ? 'qtyKg' : 'qtyPcs', parseFloat(e.target.value))} className={`w-full text-xs p-1.5 border rounded font-bold ${isShortage ? 'text-red-700 border-red-300 bg-red-100' : 'border-slate-300'}`} />
                    <span className="text-[10px] text-slate-400 block text-right">{m.unit}</span>
                  </div>
                  <div className="md:col-span-2">
                    <input type="text" placeholder="LOT NO." value={m.lotNo} onChange={e => updateMaterial(m.id, 'lotNo', e.target.value)} className="w-full text-xs p-1.5 border border-slate-300 rounded" />
                  </div>
                  <div className="md:col-span-3">
                    <input type="text" placeholder="หมายเหตุ" value={m.remarks} onChange={e => updateMaterial(m.id, 'remarks', e.target.value)} className="w-full text-xs p-1.5 border border-slate-300 rounded" />
                  </div>
                  <div className="md:col-span-1 flex items-center justify-end">
                    <button type="button" onClick={() => removeMaterial(m.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                  </div>
                </div>
              )})}
              {(!formData.materials || formData.materials.length === 0) && (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  ยังไม่มีรายการเบิกวัตถุดิบ
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">หมายเหตุ / เหตุผลการหยุดงาน / สาเหตุงานด่วน</label>
            <textarea 
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-brand-500 resize-none text-sm ${formData.status === 'Paused' || formData.status === 'Stopped' ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
              placeholder={formData.status === 'Paused' ? "ระบุสาเหตุการหยุดชั่วคราว..." : "ระบุข้อกำหนดพิเศษ เช่น ห้ามมีเส้นผม, ป้องกันฝุ่น..."}
            />
          </div>

          <div className="pt-6 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-100 py-4 mt-8">
            <button 
              type="button" onClick={onClose}
              className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className="px-8 py-2.5 bg-brand-600 text-white font-bold hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-500/30 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Save size={18} /> บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};