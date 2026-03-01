


import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardStats } from './components/DashboardStats';
import { JobTable } from './components/JobTable';
import { TimelineView } from './components/TimelineView';
import { MachineGrid } from './components/MachineGrid';
import { ProductionPlan } from './components/ProductionPlan';
import { EditJobModal } from './components/EditJobModal';
import { SmartAssistant } from './components/SmartAssistant';
import { ProductionOrderView } from './components/ProductionOrderView';
import { DocumentHandoverView } from './components/DocumentHandoverView';
import { ProductTagView } from './components/ProductTagView';
import { InventoryView } from './components/InventoryView';
import { HistoryLog } from './components/HistoryLog';
import { KnowledgeBase } from './components/KnowledgeBase';
import { ProductionAnalysis } from './components/ProductionAnalysis';
import { MOCK_DATA, ProductionJob, MOCK_INVENTORY, MOCK_BOMS, PRODUCT_SPECS, MACHINE_MOLD_CAPABILITIES, AuditLog, AiMessage } from './types';
import { Menu, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for data management
  const [jobs, setJobs] = useState<ProductionJob[]>(MOCK_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ProductionJob | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  
  // Specific View States
  const [viewingOrderJob, setViewingOrderJob] = useState<ProductionJob | null>(null);
  const [handoverJobs, setHandoverJobs] = useState<ProductionJob[]>([]);
  const [tagJob, setTagJob] = useState<ProductionJob | null>(null);

  // New: Logs & AI History State
  const [logs, setLogs] = useState<AuditLog[]>([
    { id: 'l1', timestamp: new Date(Date.now() - 1000000).toISOString(), action: 'SYSTEM', user: 'System', details: 'Initialized Production Plan data' },
    { id: 'l2', timestamp: new Date(Date.now() - 800000).toISOString(), action: 'UPDATE', user: 'Manager', details: 'Updated Job JO-2026-002 status to Delayed', targetId: 'j2' }
  ]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { 
      role: 'model', 
      text: 'สวัสดีครับ ผมคือ ProPlanner Brain 🧠 ผู้ช่วยอัจฉริยะฝ่ายผลิต\n\nผมจดจำข้อมูล Master Data ทั้งหมดของโรงงานได้แล้ว (สเปคสินค้า, แม่พิมพ์, ความเร็วเครื่องจักร)\n\nมีอะไรให้ผมช่วยวิเคราะห์แผน หรือตรวจสอบสต็อก ถามได้เลยครับ!',
      timestamp: new Date().toISOString()
    }
  ]);

  const addLog = (action: AuditLog['action'], details: string, targetId?: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action,
      user: 'Manager', // Mock user
      details,
      targetId
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleEditJob = (job: ProductionJob) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const handleViewOrder = (job: ProductionJob) => {
    setViewingOrderJob(job);
    setCurrentView('order-detail');
  };

  const handlePrintHandover = (selectedJobs: ProductionJob[]) => {
    setHandoverJobs(selectedJobs);
    setCurrentView('handover');
  };

  const handlePrintTag = (job: ProductionJob) => {
    setTagJob(job);
    setCurrentView('tag-print');
  };

  const handleSaveJob = (updatedJob: ProductionJob) => {
    // Check if it's an update or create (id existence check in existing jobs)
    const exists = jobs.find(j => j.id === updatedJob.id);
    const updatedJobs = exists 
        ? jobs.map(j => j.id === updatedJob.id ? updatedJob : j)
        : [...jobs, updatedJob]; // Fallback if needed, though usually creating passes through handleCreateJob

    setJobs(updatedJobs);
    addLog('UPDATE', `แก้ไขงาน ${updatedJob.jobOrder} (${updatedJob.productItem}) - สถานะ: ${updatedJob.status}`, updatedJob.id);
  };

  const handleCreateJob = (newJob: ProductionJob) => {
    setJobs(prev => [...prev, newJob]);
    addLog('CREATE', `สร้างงานผลิตใหม่ ${newJob.jobOrder} เครื่อง ${newJob.machineId}`, newJob.id);
  };

  // If in "Print/Order" detail mode, render that separately for full screen
  if (currentView === 'order-detail' && viewingOrderJob) {
    return <ProductionOrderView job={viewingOrderJob} onBack={() => setCurrentView('plan')} />;
  }

  if (currentView === 'handover' && handoverJobs.length > 0) {
    return <DocumentHandoverView jobs={handoverJobs} onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'tag-print' && tagJob) {
    return <ProductTagView job={tagJob} onBack={() => setCurrentView('list')} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <DashboardStats data={jobs} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TimelineView jobs={jobs} />
                </div>
                <div className="lg:col-span-1">
                     <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 h-full">
                        <h3 className="font-bold text-slate-800 mb-4 font-kanit">แจ้งเตือนงานด่วน (Urgent)</h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {jobs.filter(j => j.status === 'Delayed').length > 0 ? (
                                jobs.filter(j => j.status === 'Delayed').map(job => (
                                    <div 
                                        key={job.id} 
                                        className="p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                                        onClick={() => handleViewOrder(job)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-red-700 text-sm">{job.machineId}</span>
                                            <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">ตกแผน</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700 mt-1">{job.productItem}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">คลิกเพื่อดูใบสั่งผลิต</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-sm italic">
                                    ไม่มีงานแจ้งเตือน ระบบปกติ
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            </div>
          </div>
        );
      case 'plan':
        return <ProductionPlan jobs={jobs} onEditJob={handleEditJob} onViewOrder={handleViewOrder} />;
      case 'analysis':
        return <ProductionAnalysis jobs={jobs} />;
      case 'schedule':
        return <TimelineView jobs={jobs} />;
      case 'list':
        return <JobTable jobs={jobs} onEditJob={handleEditJob} onPrintHandover={handlePrintHandover} onPrintTag={handlePrintTag} />;
      case 'machines':
        return <MachineGrid jobs={jobs} onEditJob={handleEditJob} />;
      case 'inventory':
        return <InventoryView />;
      case 'master-data':
        return <KnowledgeBase />;
      case 'history':
        return <HistoryLog logs={logs} aiMessages={aiMessages} />;
      default:
        return <ProductionPlan jobs={jobs} onEditJob={handleEditJob} onViewOrder={handleViewOrder} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-kanit">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-20 p-4 flex justify-between items-center shadow-md">
        <span className="font-bold text-lg">ProPlanner</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900 z-10 pt-20 px-4 md:hidden">
            <div className="flex flex-col space-y-4">
                 <button onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">ภาพรวม</button>
                 <button onClick={() => { setCurrentView('plan'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">แผนการผลิต</button>
                 <button onClick={() => { setCurrentView('analysis'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">วิเคราะห์การผลิต</button>
                 <button onClick={() => { setCurrentView('machines'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">สถานะเครื่องจักร</button>
                 <button onClick={() => { setCurrentView('schedule'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">ไทม์ไลน์</button>
                 <button onClick={() => { setCurrentView('inventory'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">คลังวัตถุดิบ & BOM</button>
                 <button onClick={() => { setCurrentView('master-data'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">ฐานข้อมูลหลัก</button>
                 <button onClick={() => { setCurrentView('list'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">รายการงานทั้งหมด</button>
                 <button onClick={() => { setCurrentView('history'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">ประวัติการทำงาน</button>
            </div>
        </div>
      )}

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen relative">
        <header className="mb-8 flex justify-between items-center print:hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    {currentView === 'dashboard' ? 'ภาพรวม (Overview)' : 
                     currentView === 'plan' ? 'แผนการผลิต (Production Plan)' :
                     currentView === 'analysis' ? 'วิเคราะห์การผลิต (Production Analysis)' :
                     currentView === 'schedule' ? 'ตารางไทม์ไลน์ (Timeline)' :
                     currentView === 'list' ? 'รายการงานทั้งหมด (Job List)' :
                     currentView === 'inventory' ? 'คลังวัตถุดิบ & สูตรผลิต (Inventory & BOM)' :
                     currentView === 'history' ? 'ประวัติการทำงาน (History Log)' :
                     currentView === 'tag-print' ? 'พิมพ์สติกเกอร์ (Print Tags)' :
                     currentView === 'master-data' ? 'ฐานข้อมูลหลัก (Master Data)' :
                     currentView === 'machines' ? 'สถานะเครื่องจักร' : 'ตั้งค่า'}
                </h1>
                <p className="text-slate-500 text-sm">ยินดีต้อนรับ ผู้จัดการฝ่ายวางแผนการผลิต</p>
            </div>
            <div className="hidden md:block">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                >
                    + เพิ่มรายการผลิตใหม่
                </button>
            </div>
        </header>

        {renderContent()}

        <button 
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-8 right-8 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-2xl z-40 transition-all hover:scale-105 group border-2 border-brand-500 print:hidden"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full animate-pulse border-2 border-slate-900"></div>
          <Sparkles size={28} />
        </button>
      </main>
      
      <SmartAssistant 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)}
        jobs={jobs}
        inventory={MOCK_INVENTORY}
        boms={MOCK_BOMS}
        specs={PRODUCT_SPECS}
        machineCapabilities={MACHINE_MOLD_CAPABILITIES}
        onUpdateJob={handleSaveJob}
        onCreateJob={handleCreateJob}
        messages={aiMessages}
        setMessages={setAiMessages}
      />

      <EditJobModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingJob(null); }} 
        job={editingJob} 
        onSave={handleSaveJob} 
      />
    </div>
  );
};


export default App;
