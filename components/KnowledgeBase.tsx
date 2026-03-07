
import React, { useState } from 'react';
import { CustomKnowledge, InventoryItem, ProductBOM, ProductSpec, MachineMoldCapability } from '../types';
import { Search, Database, Disc, Settings, Weight, Package, Layers, Info, Box, BookOpen, Plus, Trash2 } from 'lucide-react';

interface KnowledgeBaseProps {
  customKnowledge: CustomKnowledge[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  productSpecs: ProductSpec[];
  machineCapabilities: MachineMoldCapability[];
  onSaveKnowledge: (knowledge: Omit<CustomKnowledge, 'id' | 'updatedAt'>, id?: string) => void;
  onDeleteKnowledge: (id: string) => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ customKnowledge, inventory, boms, productSpecs, machineCapabilities, onSaveKnowledge, onDeleteKnowledge }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'machines' | 'boms' | 'packaging' | 'custom'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');

  const filteredProducts = productSpecs.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMachines = machineCapabilities.filter(m =>
    m.machineGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.moldName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBoms = boms.filter(b => 
    b.productItem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustom = customKnowledge.filter(k => 
    k.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveCustom = () => {
    if (!newTopic.trim() || !newContent.trim()) return;
    onSaveKnowledge({ topic: newTopic, content: newContent });
    setNewTopic('');
    setNewContent('');
    setIsAddingKnowledge(false);
  };

  return (
    <div className="space-y-6 font-kanit">
      
      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'products' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Package size={18} />
            ข้อมูลสินค้า (Products)
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('packaging')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'packaging' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Box size={18} />
            มาตรฐานการบรรจุ (Packaging)
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('boms')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'boms' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Layers size={18} />
            สูตรการผลิต (BOM)
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('machines')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'machines' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Settings size={18} />
            เครื่องจักร & แม่พิมพ์
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('custom')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'custom' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={18} />
            ข้อมูลเพิ่มเติมสำหรับ AI
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-wrap gap-4">
           <div className="flex items-center gap-3">
              <Database size={20} className="text-brand-600"/>
              <h2 className="text-lg font-bold text-slate-800">
                {activeTab === 'products' ? 'ฐานข้อมูลสินค้า (Master Products)' : 
                 activeTab === 'boms' ? 'สูตรการผลิตมาตรฐาน (Master BOM)' : 
                 activeTab === 'packaging' ? 'มาตรฐานการบรรจุหีบห่อ (Packaging Standard)' :
                 activeTab === 'custom' ? 'ข้อมูลเพิ่มเติมสำหรับ AI (Custom Knowledge)' :
                 'ฐานข้อมูลเครื่องจักร (Machine Master)'}
              </h2>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              {activeTab === 'custom' && (
                <button 
                  onClick={() => setIsAddingKnowledge(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  เพิ่มข้อมูล
                </button>
              )}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาข้อมูล..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full"
                />
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'products' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">รหัสสินค้า</th>
                  <th className="px-6 py-4">ชื่อเรียก</th>
                  <th className="px-6 py-4">ประเภท</th>
                  <th className="px-6 py-4">วัสดุ</th>
                  <th className="px-6 py-4">น้ำหนัก</th>
                  <th className="px-6 py-4">ขนาด (กxส)</th>
                  <th className="px-6 py-4">ใช้กับ Preform</th>
                  <th className="px-6 py-4 text-right">บรรจุ (ชิ้น/ลัง)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-brand-700">{p.code}</td>
                    <td className="px-6 py-4">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        p.type === 'Preform' ? 'bg-orange-100 text-orange-700' :
                        p.type === 'Jar' ? 'bg-blue-100 text-blue-700' :
                        p.type === 'Cap' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{p.material}</td>
                    <td className="px-6 py-4">{p.weight}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                        {p.width ? `${p.width}mm` : '-'} x {p.height ? `${p.height}mm` : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{p.preformCode || '-'}</td>
                    <td className="px-6 py-4 text-right">{p.packSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'packaging' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-[25%]">สินค้า</th>
                  <th className="px-6 py-4 w-[15%]">วิธีการบรรจุ</th>
                  <th className="px-6 py-4 w-[20%]">ถุง (Bag Info)</th>
                  <th className="px-6 py-4 w-[20%]">กล่อง (Box Info)</th>
                  <th className="px-6 py-4 w-[20%]">การเรียง (Layer)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p, idx) => {
                    const pack = p.packagingDetail;
                    return (
                        <tr key={idx} className="hover:bg-slate-50 align-top">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{p.code}</div>
                                <div className="text-xs text-slate-500">{p.name}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    pack?.method === 'Box' ? 'bg-amber-100 text-amber-700' :
                                    pack?.method === 'Bag' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {pack?.method || '-'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {pack?.bagType ? (
                                    <div className="text-xs space-y-1">
                                        <div className="font-medium text-slate-700">{pack.bagType}</div>
                                        <div className="text-slate-500">ขนาด: {pack.bagSize}</div>
                                        <div className="font-mono text-indigo-600">{pack.qtyPerBag} ชิ้น/ถุง</div>
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4">
                                {pack?.boxType ? (
                                    <div className="text-xs space-y-1">
                                        <div className="font-medium text-slate-700">{pack.boxType}</div>
                                        <div className="text-slate-500">ขนาด: {pack.boxSize}</div>
                                        <div className="font-mono text-emerald-600 font-bold">{pack.qtyPerBox} ชิ้น/กล่อง</div>
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4">
                                {pack?.layerConfig ? (
                                    <div className="text-xs bg-slate-100 p-2 rounded text-slate-600 border border-slate-200">
                                        {pack.layerConfig}
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'boms' && (
            <div className="divide-y divide-slate-100">
               {filteredBoms.length > 0 ? filteredBoms.map((bom, idx) => (
                 <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <Layers size={18} className="text-indigo-500" />
                        <h3 className="font-bold text-slate-800 text-base">{bom.productItem}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bom.materials.map((mat, mIdx) => {
                            const item = inventory.find(i => i.id === mat.inventoryItemId);
                            return (
                                <div key={mIdx} className="bg-white border border-slate-200 p-2 rounded-lg flex justify-between items-center text-sm shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-700">{item?.code || 'Unknown'}</span>
                                        <span className="text-[10px] text-slate-500">{item?.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono font-bold text-indigo-600">{mat.qtyPerUnit}</span>
                                        <span className="text-xs text-slate-400 ml-1">{mat.unitType}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 </div>
               )) : (
                 <div className="p-12 text-center text-slate-400 italic flex flex-col items-center">
                    <Info size={32} className="mb-2 opacity-50" />
                    <p>ไม่พบสูตรการผลิตที่ค้นหา</p>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'machines' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">กลุ่มเครื่องจักร</th>
                  <th className="px-6 py-4">ชื่อแม่พิมพ์</th>
                  <th className="px-6 py-4 text-center">จำนวน Cavity</th>
                  <th className="px-6 py-4 text-center">Cycle Time (วินาที)</th>
                  <th className="px-6 py-4 text-right">กำลังผลิต (ชิ้น/ชม.)</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMachines.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-700">{m.machineGroup}</td>
                    <td className="px-6 py-4">{m.moldName}</td>
                    <td className="px-6 py-4 text-center">{m.cavity}</td>
                    <td className="px-6 py-4 text-center">{m.cycleTimeSec}s</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                        {m.theoreticalOutputHr?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                            m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {m.status}
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'custom' && (
            <div className="p-4">
              {filteredCustom.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCustom.map((k, idx) => (
                    <div key={k.id || `custom-${idx}`} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-800 text-lg">{k.topic}</h3>
                        <button 
                          onClick={() => {
                            if(window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
                              onDeleteKnowledge(k.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 flex-1 whitespace-pre-wrap">{k.content}</p>
                      <div className="mt-4 text-xs text-slate-400 text-right">
                        อัปเดต: {new Date(k.updatedAt).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 italic flex flex-col items-center">
                  <BookOpen size={48} className="mb-4 opacity-20" />
                  <p className="text-lg text-slate-500 mb-2">ยังไม่มีข้อมูลเพิ่มเติม</p>
                  <p className="text-sm">เพิ่มข้อมูลเพื่อให้ AI ช่วยเหลือคุณได้แม่นยำขึ้น เช่น กฎการทำงาน หรือข้อควรระวัง</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Knowledge Modal */}
      {isAddingKnowledge && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={24} className="text-brand-500" />
                เพิ่มข้อมูลความรู้ให้ AI
              </h2>
              <button 
                onClick={() => setIsAddingKnowledge(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อ (Topic)</label>
                <input 
                  type="text" 
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="เช่น กฎการเปลี่ยนแม่พิมพ์, ข้อควรระวังเครื่อง IP1"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด (Content)</label>
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="พิมพ์ข้อมูลที่คุณต้องการให้ AI จดจำ..."
                  rows={8}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddingKnowledge(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveCustom}
                disabled={!newTopic.trim() || !newContent.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
