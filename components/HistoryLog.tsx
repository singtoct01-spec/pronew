
import React, { useState } from 'react';
import { AuditLog, AiMessage } from '../types';
import { History, MessageSquare, Bot, User, Clock, FileText, RotateCcw } from 'lucide-react';

interface HistoryLogProps {
  logs: AuditLog[];
  aiMessages: AiMessage[];
  onRevert: (log: AuditLog) => void;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ logs, aiMessages, onRevert }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'ai'>('system');

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleString('th-TH');
  };

  const handleRevertClick = (log: AuditLog) => {
    const password = prompt("กรุณาใส่รหัสผ่านเพื่อย้อนกลับข้อมูล:");
    if (password === "kpbom-a0784") {
      onRevert(log);
    } else if (password !== null) {
      alert("รหัสผ่านไม่ถูกต้อง!");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-kanit">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="text-brand-600" />
            ประวัติการทำงาน & แชท AI
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('system')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'system' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                System Log
            </button>
            <button 
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <MessageSquare size={14} /> AI Chat
            </button>
        </div>
      </div>

      {activeTab === 'system' && (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">เวลา</th>
                        <th className="px-6 py-4">ผู้ใช้งาน</th>
                        <th className="px-6 py-4">การกระทำ</th>
                        <th className="px-6 py-4">รายละเอียด</th>
                        <th className="px-6 py-4 text-right">ย้อนกลับ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {logs.length > 0 ? logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                                {formatDate(log.timestamp)}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700">
                                {log.user}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                    log.action === 'REVERT' ? 'bg-purple-100 text-purple-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {log.action}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                                {log.details}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {log.snapshot && (
                                    <button 
                                        onClick={() => handleRevertClick(log)}
                                        className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                                        title="ย้อนกลับข้อมูลไปที่จุดนี้"
                                    >
                                        <RotateCcw size={14} /> ย้อนกลับ
                                    </button>
                                )}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                ยังไม่มีประวัติการเปลี่ยนแปลง
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="p-4 bg-slate-50 min-h-[400px] max-h-[600px] overflow-y-auto space-y-4">
            {aiMessages.length > 1 ? aiMessages.slice(1).map((msg, idx) => ( // Skip initial greeting
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 mt-1">
                            <Bot size={16} />
                        </div>
                    )}
                    
                    <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                        msg.role === 'user' 
                            ? 'bg-white text-slate-800 border border-slate-200 rounded-tr-none' 
                            : 'bg-white text-slate-800 border border-indigo-100 rounded-tl-none'
                    }`}>
                         {/* Header Info */}
                         <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px]">
                            {msg.role === 'user' ? 'คุณ' : 'ProPlanner Brain'} • {new Date(msg.timestamp).toLocaleTimeString('th-TH')}
                         </div>

                         {/* Image */}
                         {msg.image && (
                            <div className="mb-2 rounded overflow-hidden border border-slate-200">
                                <img src={msg.image} alt="Upload" className="max-h-40 w-auto object-cover" />
                            </div>
                         )}
                         
                         {/* Text */}
                         <div className="whitespace-pre-wrap text-sm">{msg.text}</div>

                         {/* Action Log */}
                         {msg.actionProposal && (
                             <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1">
                                <FileText size={12} />
                                <span>Action: {msg.actionProposal.type}</span>
                             </div>
                         )}
                    </div>

                    {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-1">
                            <User size={16} />
                        </div>
                    )}
                </div>
            )) : (
                <div className="text-center py-12 text-slate-400">
                    <Bot size={48} className="mx-auto mb-3 opacity-20" />
                    <p>ยังไม่มีประวัติการสนทนากับ AI</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
