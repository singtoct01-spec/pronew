
import React, { useState } from 'react';
import { InventoryItem, MOCK_INVENTORY, MOCK_BOMS } from '../types';
import { Search, Package, AlertTriangle, Layers, Filter } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'bom'>('inventory');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredInventory = MOCK_INVENTORY.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Resin', 'Preform', 'Box', 'Bag', 'Pigment', 'Other', 'FG'];

  return (
    <div className="space-y-6 font-kanit">
      
      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'inventory' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Package size={18} />
            สต๊อคคงเหลือ (Inventory)
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

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <h2 className="text-lg font-bold text-slate-800">รายการสินค้าและวัตถุดิบ</h2>
             <div className="flex gap-2 w-full md:w-auto">
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
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                    type="text" 
                    placeholder="ค้นหารหัส หรือชื่อ..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full"
                    />
                </div>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">รหัส / ชื่อสินค้า</th>
                  <th className="px-6 py-4">หมวดหมู่</th>
                  <th className="px-6 py-4">การใช้งาน/กลุ่ม</th>
                  <th className="px-6 py-4 text-right">ยอดคงเหลือ</th>
                  <th className="px-6 py-4 text-right">Min Stock</th>
                  <th className="px-6 py-4 text-right">Max Stock</th>
                  <th className="px-6 py-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map(item => {
                  const isLowStock = item.currentStock <= item.minStock || (item.remarks && (item.remarks.includes('Low') || item.remarks.includes('PR')));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{item.code}</div>
                        <div className="text-xs text-slate-500">{item.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.category === 'Resin' ? 'bg-blue-100 text-blue-700' :
                          item.category === 'Preform' ? 'bg-orange-100 text-orange-700' :
                          item.category === 'Box' ? 'bg-amber-100 text-amber-700' :
                          item.category === 'Bag' ? 'bg-purple-100 text-purple-700' :
                          item.category === 'Pigment' ? 'bg-rose-100 text-rose-700' :
                          item.category === 'FG' ? 'bg-teal-100 text-teal-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.category === 'FG' ? 'Finished Goods' : item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{item.usage}</td>
                      <td className={`px-6 py-4 text-right font-mono font-bold ${isLowStock ? 'text-red-600' : 'text-emerald-600'}`}>
                        {item.currentStock.toLocaleString()} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">{item.minStock.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">{item.maxStock.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {isLowStock ? (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                            <AlertTriangle size={14} /> Low Stock
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-medium">Normal</span>
                        )}
                        {item.remarks && <div className="text-[10px] text-slate-500 mt-1 font-medium italic">{item.remarks}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {MOCK_BOMS.map((bom, idx) => (
             <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{bom.productItem}</h3>
                    <p className="text-xs text-slate-500">Bill of Materials (Standard Recipe)</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ส่วนประกอบต่อ 1 ชิ้นงาน</p>
                  {bom.materials.map((mat, mIdx) => {
                    const invItem = MOCK_INVENTORY.find(i => i.id === mat.inventoryItemId);
                    return (
                      <div key={mIdx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                         <div>
                            <p className="text-sm font-semibold text-slate-700">{invItem?.code || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{invItem?.name}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-sm font-mono font-bold text-slate-800">{mat.qtyPerUnit} {mat.unitType}</p>
                         </div>
                      </div>
                    );
                  })}
                </div>
             </div>
           ))}
        </div>
      )}

    </div>
  );
};
