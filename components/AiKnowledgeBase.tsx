import React, { useState } from 'react';
import { CustomKnowledge } from '../types';
import { Search, BookOpen, Plus, Trash2, Edit2, BrainCircuit } from 'lucide-react';

interface AiKnowledgeBaseProps {
  customKnowledge: CustomKnowledge[];
  onSaveKnowledge: (knowledge: Omit<CustomKnowledge, 'id' | 'updatedAt'>, id?: string) => void;
  onDeleteKnowledge: (id: string) => void;
}

export const AiKnowledgeBase: React.FC<AiKnowledgeBaseProps> = ({ 
  customKnowledge, 
  onSaveKnowledge, 
  onDeleteKnowledge 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');

  const filteredKnowledge = customKnowledge.filter(k => 
    k.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewTopic('');
    setNewContent('');
    setIsAddingKnowledge(true);
  };

  const handleOpenEdit = (k: CustomKnowledge) => {
    setEditingId(k.id);
    setNewTopic(k.topic);
    setNewContent(k.content);
    setIsAddingKnowledge(true);
  };

  const handleSave = () => {
    if (!newTopic.trim() || !newContent.trim()) return;
    
    // Check if topic already exists (when adding new)
    if (!editingId) {
      const existing = customKnowledge.find(k => k.topic.toLowerCase() === newTopic.toLowerCase());
      if (existing) {
        // Append to existing
        onSaveKnowledge({
          topic: existing.topic,
          content: existing.content + '\n\n' + newContent
        }, existing.id);
      } else {
        // Create new
        onSaveKnowledge({ topic: newTopic, content: newContent });
      }
    } else {
      // Update existing
      onSaveKnowledge({ topic: newTopic, content: newContent }, editingId);
    }

    setNewTopic('');
    setNewContent('');
    setIsAddingKnowledge(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) {
      onDeleteKnowledge(id);
    }
  };

  return (
    <div className="space-y-6 font-kanit">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-wrap gap-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <BrainCircuit size={24}/>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">คลังความรู้ AI (AI Knowledge Base)</h2>
                <p className="text-sm text-slate-500">ข้อมูลและกฎเกณฑ์ที่ AI เรียนรู้จากผู้ใช้งาน</p>
              </div>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={handleOpenAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                เพิ่มข้อมูลให้ AI
              </button>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาหัวข้อ หรือเนื้อหา..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
           </div>
        </div>

        <div className="p-5 bg-slate-50/50 min-h-[400px]">
          {filteredKnowledge.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKnowledge.map((k) => (
                <div key={k.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow relative group flex flex-col h-full">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => handleOpenEdit(k)} className="text-slate-400 hover:text-indigo-600 p-1 bg-white rounded-md shadow-sm border border-slate-100">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(k.id)} className="text-slate-400 hover:text-red-600 p-1 bg-white rounded-md shadow-sm border border-slate-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 pr-16 flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-500" />
                    {k.topic}
                  </h3>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 overflow-y-auto max-h-48">
                    {k.content}
                  </div>
                  <div className="mt-4 text-[10px] text-slate-400 flex justify-between items-center pt-3 border-t border-slate-100">
                    <span>อัปเดตล่าสุด: {new Date(k.updatedAt).toLocaleString('th-TH')}</span>
                    {k.createdBy && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{k.createdBy}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 italic flex flex-col items-center justify-center h-full">
              <BrainCircuit size={48} className="mb-4 opacity-20" />
              <p className="text-lg text-slate-500 mb-2">ยังไม่มีข้อมูลความรู้ในระบบ</p>
              <p className="text-sm">เพิ่มข้อมูลเพื่อให้ AI ช่วยเหลือคุณได้แม่นยำขึ้น เช่น กฎการทำงาน หรือข้อควรระวัง</p>
              <button 
                onClick={handleOpenAdd}
                className="mt-6 text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1"
              >
                <Plus size={16} /> เริ่มเพิ่มข้อมูลแรกของคุณ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Knowledge Modal */}
      {isAddingKnowledge && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BrainCircuit size={24} className="text-indigo-600" />
                {editingId ? 'แก้ไขข้อมูลความรู้' : 'เพิ่มข้อมูลความรู้ให้ AI'}
              </h2>
              <button 
                onClick={() => setIsAddingKnowledge(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {!editingId && (
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-start gap-2 border border-blue-100">
                  <BookOpen size={16} className="mt-0.5 shrink-0" />
                  <p>หากคุณเพิ่มข้อมูลใน <strong>หัวข้อ (Topic)</strong> ที่มีอยู่แล้ว ระบบจะนำเนื้อหาใหม่ไป <strong>ต่อท้าย</strong> ข้อมูลเดิมโดยอัตโนมัติ</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อ (Topic)</label>
                <input 
                  type="text" 
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="เช่น กฎการเปลี่ยนแม่พิมพ์, ข้อควรระวังเครื่อง IP1"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด (Content)</label>
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="พิมพ์ข้อมูลที่คุณต้องการให้ AI จดจำ..."
                  rows={8}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
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
                onClick={handleSave}
                disabled={!newTopic.trim() || !newContent.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
