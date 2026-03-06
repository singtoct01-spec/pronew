import React, { useState, useRef } from 'react';
import { InventoryItem, ProductBOM, MOCK_INVENTORY, MOCK_BOMS } from '../types';
import { Search, Package, AlertTriangle, Layers, Filter, Upload, FileDown, Plus, Edit2, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryItemModal } from './InventoryItemModal';
import { BomModal } from './BomModal';

interface InventoryViewProps {
  inventory: InventoryItem[];
  boms: ProductBOM[];
  onImportInventory?: (items: any[]) => void;
  onAddInventory?: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateInventory?: (item: InventoryItem) => void;
  onDeleteInventory?: (id: string) => void;
  onAddBom?: (bom: Omit<ProductBOM, 'id'>) => void;
  onUpdateBom?: (bom: ProductBOM) => void;
  onDeleteBom?: (id: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ 
  inventory, 
  boms,
  onImportInventory,
  onAddInventory,
  onUpdateInventory,
  onDeleteInventory,
  onAddBom,
  onUpdateBom,
  onDeleteBom
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'bom'>('inventory');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // BOM Search
  const [bomSearchTerm, setBomSearchTerm] = useState('');

  // Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (item: Omit<InventoryItem, 'id'> | InventoryItem) => {
    if ('id' in item && item.id) {
      onUpdateInventory?.(item as InventoryItem);
    } else {
      onAddInventory?.(item);
    }
  };

  const handleDeleteItemClick = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการสินค้านี้?')) {
      onDeleteInventory?.(id);
    }
  };

  // BOM Modal State
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<ProductBOM | null>(null);

  const handleOpenAddBom = () => {
    setEditingBom(null);
    setIsBomModalOpen(true);
  };

  const handleOpenEditBom = (bom: ProductBOM) => {
    setEditingBom(bom);
    setIsBomModalOpen(true);
  };

  const handleSaveBom = (bom: Omit<ProductBOM, 'id'> | ProductBOM) => {
    if ('id' in bom && bom.id) {
      onUpdateBom?.(bom as ProductBOM);
    } else {
      onAddBom?.(bom);
    }
  };

  const handleDeleteBomClick = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสูตรการผลิตนี้?')) {
      onDeleteBom?.(id);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const filteredBoms = boms.filter(bom => 
    bom.productItem.toLowerCase().includes(bomSearchTerm.toLowerCase())
  );

  const lowStockCount = inventory.filter(item => item.currentStock <= item.minStock).length;
  const totalItems = inventory.length;
  const totalBoms = boms.length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const importedItems = data.map((row: any) => {
          return {
            id: row['รหัสสินค้า'] || row['code'] || `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            code: row['รหัสสินค้า'] || row['code'] || '',
            name: row['ชื่อสินค้า'] || row['name'] || '',
            category: row['หมวดหมู่'] || row['category'] || 'Other',
            unit: row['หน่วย'] || row['unit'] || 'pcs',
            currentStock: Number(row['ยอดคงเหลือ'] || row['currentStock'] || 0),
            minStock: Number(row['Min Stock'] || row['minStock'] || 0),
            maxStock: Number(row['Max Stock'] || row['maxStock'] || 0),
            location: row['สถานที่เก็บ'] || row['location'] || '',
            lastUpdated: new Date().toISOString(),
            group: row['กลุ่ม'] || row['group'] || '',
            remarks: row['หมายเหตุ'] || row['remarks'] || '',
            usage: row['การใช้งาน'] || row['usage'] || ''
          };
        });

        if (onImportInventory && importedItems.length > 0) {
          onImportInventory(importedItems);
        }
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์");
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'รหัสสินค้า': 'RM-001',
        'ชื่อสินค้า': 'เม็ดพลาสติก PET ใส',
        'หมวดหมู่': 'Resin',
        'หน่วย': 'kg',
        'ยอดคงเหลือ': 5000,
        'Min Stock': 1000,
        'Max Stock': 10000,
        'สถานที่เก็บ': 'WH-A1',
        'กลุ่ม': 'PET',
        'การใช้งาน': 'ผลิตขวดน้ำดื่ม',
        'หมายเหตุ': 'ตัวอย่างวัตถุดิบ'
      },
      {
        'รหัสสินค้า': 'FG-001',
        'ชื่อสินค้า': 'ขวดน้ำดื่ม 600ml',
        'หมวดหมู่': 'FG',
        'หน่วย': 'pcs',
        'ยอดคงเหลือ': 12000,
        'Min Stock': 5000,
        'Max Stock': 50000,
        'สถานที่เก็บ': 'WH-FG1',
        'กลุ่ม': 'Bottle',
        'การใช้งาน': 'ขายส่ง',
        'หมายเหตุ': 'ตัวอย่างสินค้าสำเร็จรูป'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Inventory_Import_Template.xlsx");
  };

  return (
    <div className="space-y-6 font-kanit">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">รายการสินค้าทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-800">{totalItems} <span className="text-sm font-normal text-slate-500">รายการ</span></p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">สินค้าต่ำกว่าเกณฑ์ (Low Stock)</p>
            <p className="text-2xl font-bold text-red-600">{lowStockCount} <span className="text-sm font-normal text-slate-500">รายการ</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">สูตรการผลิต (Master BOM)</p>
            <p className="text-2xl font-bold text-slate-800">{totalBoms} <span className="text-sm font-normal text-slate-500">สูตร</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'inventory' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Package size={18} />
            สต๊อคคงเหลือ (FG & วัตถุดิบ)
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('bom')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'bom' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Layers size={18} />
            สูตรการผลิต (Master BOM)
          </div>
        </button>
      </div>

      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
             <h2 className="text-lg font-bold text-slate-800">รายการสินค้าสำเร็จรูป (FG) และวัตถุดิบ</h2>
             <div className="flex gap-2 w-full lg:w-auto flex-wrap justify-end">
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white min-w-[150px]"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="All">หมวดหมู่ทั้งหมด</option>
                        <option value="Preform">พรีฟอร์ม (Preform)</option>
                        <option value="Resin">เม็ดพลาสติก (Resin)</option>
                        <option value="FG">สินค้าสำเร็จรูป (FG)</option>
                        <option value="Box">กล่อง (Box)</option>
                        <option value="Bag">ถุง (Bag)</option>
                        <option value="Pigment">สี (Pigment)</option>
                        <option value="Other">อื่นๆ (Other)</option>
                    </select>
                </div>
                <div className="relative flex-1 min-w-[200px] lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="ค้นหารหัส หรือชื่อ..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full"
                    />
                </div>
                <button 
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                  <FileDown size={16} />
                  <span className="hidden sm:inline">โหลดเทมเพลต</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors"
                  title="นำเข้าข้อมูลสินค้าสำเร็จรูป (FG) และวัตถุดิบผ่านไฟล์ Excel"
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">นำเข้า Excel</span>
                </button>
                <button 
                  className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors"
                  onClick={handleOpenAddItem}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">เพิ่มรายการ</span>
                </button>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">รหัส / ชื่อสินค้า</th>
                  <th className="px-6 py-4">หมวดหมู่</th>
                  <th className="px-6 py-4">การใช้งาน/กลุ่ม</th>
                  <th className="px-6 py-4">ระดับสต๊อค (Stock Level)</th>
                  <th className="px-6 py-4 text-right">ยอดคงเหลือ</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.length > 0 ? filteredInventory.map(item => {
                  const isLowStock = item.currentStock <= item.minStock || (item.remarks && (item.remarks.includes('Low') || item.remarks.includes('PR')));
                  const stockPercentage = Math.min(100, Math.max(0, (item.currentStock / (item.maxStock || 1)) * 100));
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{item.code}</div>
                        <div className="text-xs text-slate-500">{item.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          item.category === 'Resin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.category === 'Preform' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          item.category === 'Box' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          item.category === 'Bag' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          item.category === 'Pigment' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          item.category === 'FG' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {item.category === 'FG' ? 'Finished Goods' : item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">{item.usage || '-'}</div>
                        {item.location && <div className="text-xs text-slate-400 mt-0.5">คลัง: {item.location}</div>}
                      </td>
                      <td className="px-6 py-4 min-w-[150px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">Min: {item.minStock.toLocaleString()}</span>
                          <span className="text-slate-500">Max: {item.maxStock.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full ${isLowStock ? 'bg-red-500' : stockPercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${stockPercentage}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold ${isLowStock ? 'text-red-600' : 'text-slate-800'}`}>
                        {item.currentStock.toLocaleString()} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                            <AlertTriangle size={14} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                            <CheckCircle2 size={14} /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" 
                            title="แก้ไข"
                            onClick={() => handleOpenEditItem(item)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                            title="ลบ"
                            onClick={() => handleDeleteItemClick(item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      ไม่พบข้อมูลสินค้าที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOM Tab Content */}
      {activeTab === 'bom' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="ค้นหาสูตรการผลิต (ชื่อสินค้า)..." 
                value={bomSearchTerm}
                onChange={e => setBomSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full bg-white shadow-sm"
              />
            </div>
            <button 
              className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors"
              onClick={handleOpenAddBom}
            >
              <Plus size={16} />
              สร้างสูตรการผลิตใหม่
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {filteredBoms.length > 0 ? filteredBoms.map((bom, idx) => (
               <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Layers size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{bom.productItem}</h3>
                        <p className="text-sm text-slate-500">สูตรมาตรฐาน (Standard BOM)</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        onClick={() => handleOpenEditBom(bom)}
                        title="แก้ไขสูตร"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => bom.id && handleDeleteBomClick(bom.id)}
                        title="ลบสูตร"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ส่วนประกอบต่อ 1 ชิ้นงาน</p>
                      <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{bom.materials.length} รายการ</span>
                    </div>
                    
                    <div className="space-y-2">
                      {bom.materials.map((mat, mIdx) => {
                        const invItem = inventory.find(i => i.id === mat.inventoryItemId) || MOCK_INVENTORY.find(i => i.id === mat.inventoryItemId);
                        return (
                          <div key={mIdx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${invItem ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{invItem?.code || mat.inventoryItemId}</p>
                                  <p className="text-xs text-slate-500">{invItem?.name || 'Unknown Item'}</p>
                                </div>
                             </div>
                             <div className="text-right flex items-center gap-3">
                                <div className="text-sm font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                  {mat.qtyPerUnit} <span className="text-xs text-slate-500 font-sans">{mat.unitType}</span>
                                </div>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
                    <button className="text-sm text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1">
                      ดูรายละเอียดเพิ่มเติม <ArrowRight size={16} />
                    </button>
                  </div>
               </div>
             )) : (
               <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                 <Layers size={48} className="mx-auto text-slate-300 mb-4" />
                 <h3 className="text-lg font-medium text-slate-700 mb-1">ไม่พบสูตรการผลิต</h3>
                 <p className="text-slate-500">ลองค้นหาด้วยคำอื่น หรือสร้างสูตรการผลิตใหม่</p>
               </div>
             )}
          </div>
        </div>
      )}

      <InventoryItemModal 
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
      />

      <BomModal 
        isOpen={isBomModalOpen}
        onClose={() => setIsBomModalOpen(false)}
        onSave={handleSaveBom}
        initialData={editingBom}
        inventory={inventory}
      />

    </div>
  );
};
