


import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
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
import { CustomFormView } from './components/CustomFormView';
import { FormTemplatesView } from './components/FormTemplatesView';
import { DowntimeLogsView } from './components/DowntimeLogsView';
import { MOCK_DATA, ProductionJob, MOCK_INVENTORY, MOCK_BOMS, PRODUCT_SPECS, MACHINE_MOLD_CAPABILITIES, AuditLog, AiMessage, FormTemplate } from './types';
import { Menu, Sparkles } from 'lucide-react';

export type ViewState = 'dashboard' | 'plan' | 'analysis' | 'schedule' | 'list' | 'machines' | 'inventory' | 'master-data' | 'history' | 'order-detail' | 'handover' | 'tag-print' | 'custom-form' | 'form-templates';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for data management
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ProductionJob | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  
  // Fetch jobs and logs from Firebase
  useEffect(() => {
    const unsubscribeJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      const jobsData: ProductionJob[] = [];
      snapshot.forEach((doc) => {
        jobsData.push(doc.data() as ProductionJob);
      });
      setJobs(jobsData);
    }, (error) => {
      console.error("Error fetching jobs from Firebase:", error);
    });

    const unsubscribeLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      const logsData: AuditLog[] = [];
      snapshot.forEach((doc) => {
        logsData.push(doc.data() as AuditLog);
      });
      // Sort logs by timestamp descending
      logsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(logsData);
    }, (error) => {
      console.error("Error fetching logs from Firebase:", error);
    });

    const unsubscribeForms = onSnapshot(collection(db, 'forms'), (snapshot) => {
      const formsData: FormTemplate[] = [];
      snapshot.forEach((doc) => {
        formsData.push(doc.data() as FormTemplate);
      });
      formsData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setFormTemplates(formsData);
    }, (error) => {
      console.error("Error fetching forms from Firebase:", error);
    });

    const unsubscribeDowntimeLogs = onSnapshot(collection(db, 'downtimeLogs'), (snapshot) => {
      const downtimeData: DowntimeLog[] = [];
      snapshot.forEach((doc) => {
        downtimeData.push(doc.data() as DowntimeLog);
      });
      downtimeData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDowntimeLogs(downtimeData);
    }, (error) => {
      console.error("Error fetching downtime logs from Firebase:", error);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeLogs();
      unsubscribeForms();
      unsubscribeDowntimeLogs();
    };
  }, []);
  
  // Specific View States
  const [viewingOrderJob, setViewingOrderJob] = useState<ProductionJob | null>(null);
  const [handoverJobs, setHandoverJobs] = useState<ProductionJob[]>([]);
  const [tagJob, setTagJob] = useState<ProductionJob | null>(null);
  const [customForm, setCustomForm] = useState<{ html: string, title: string, id?: string } | null>(null);

  // New: Logs & AI History State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [downtimeLogs, setDowntimeLogs] = useState<DowntimeLog[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { 
      role: 'model', 
      text: 'สวัสดีครับ ผมคือ ProPlanner Brain 🧠 ผู้ช่วยอัจฉริยะฝ่ายผลิต\n\nผมจดจำข้อมูล Master Data ทั้งหมดของโรงงานได้แล้ว (สเปคสินค้า, แม่พิมพ์, ความเร็วเครื่องจักร)\n\nมีอะไรให้ผมช่วยวิเคราะห์แผน หรือตรวจสอบสต็อก ถามได้เลยครับ!',
      timestamp: new Date().toISOString()
    }
  ]);

  const addLog = async (action: AuditLog['action'], details: string, targetId?: string, currentJobsSnapshot?: ProductionJob[]) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action,
      user: 'Manager', // Mock user
      details,
      targetId,
      snapshot: currentJobsSnapshot || jobs // Save the snapshot of jobs
    };
    try {
      await setDoc(doc(db, 'logs', newLog.id), newLog);
    } catch (error) {
      console.error("Error saving log to Firebase:", error);
    }
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

  const handleSaveJob = async (updatedJob: ProductionJob) => {
    try {
      await setDoc(doc(db, 'jobs', updatedJob.id), updatedJob);
      const newJobs = jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
      if (!jobs.find(j => j.id === updatedJob.id)) newJobs.push(updatedJob);
      addLog('UPDATE', `แก้ไขงาน ${updatedJob.jobOrder} (${updatedJob.productItem}) - สถานะ: ${updatedJob.status}`, updatedJob.id, newJobs);
    } catch (error) {
      console.error("Error saving job to Firebase:", error);
    }
  };

  const handleCreateJob = async (newJob: ProductionJob) => {
    try {
      await setDoc(doc(db, 'jobs', newJob.id), newJob);
      const newJobs = [...jobs, newJob];
      addLog('CREATE', `สร้างงานผลิตใหม่ ${newJob.jobOrder} เครื่อง ${newJob.machineId}`, newJob.id, newJobs);
    } catch (error) {
      console.error("Error creating job in Firebase:", error);
    }
  };

  const handleBatchUpsert = async (batchJobs: ProductionJob[]) => {
    try {
      let newJobs = [...jobs];
      for (const job of batchJobs) {
        await setDoc(doc(db, 'jobs', job.id), job);
        const existingIndex = newJobs.findIndex(j => j.id === job.id);
        if (existingIndex !== -1) {
          newJobs[existingIndex] = job;
        } else {
          newJobs.push(job);
        }
      }
      addLog('CREATE', `นำเข้าข้อมูล/อัปเดตงานผลิตจำนวน ${batchJobs.length} รายการ`, undefined, newJobs);
    } catch (error) {
      console.error("Error batch upserting jobs in Firebase:", error);
    }
  };

  const handleRevert = async (logToRevert: AuditLog) => {
    if (!logToRevert.snapshot) return;

    try {
      // 1. Delete all current jobs
      for (const job of jobs) {
        await deleteDoc(doc(db, 'jobs', job.id));
      }

      // 2. Insert all jobs from snapshot
      for (const job of logToRevert.snapshot) {
        await setDoc(doc(db, 'jobs', job.id), job);
      }

      // 3. Log the revert action
      addLog('REVERT', `ย้อนกลับข้อมูลไปยังเวลา ${new Date(logToRevert.timestamp).toLocaleString('th-TH')}`, undefined, logToRevert.snapshot);
      
      alert("ย้อนกลับข้อมูลสำเร็จ!");
    } catch (error) {
      console.error("Error reverting jobs:", error);
      alert("เกิดข้อผิดพลาดในการย้อนกลับข้อมูล");
    }
  };

  const handleGenerateForm = (html: string, title: string) => {
    setCustomForm({ html, title });
    setCurrentView('custom-form');
    setIsAssistantOpen(false); // Close assistant to see the form
  };

  const handleLogDowntime = async (data: any) => {
    try {
      const newLog: DowntimeLog = {
        id: `dt-${Date.now()}`,
        machineId: data.machineId || 'Unknown',
        date: data.date || new Date().toISOString(),
        durationMinutes: data.durationMinutes || 0,
        category: data.category || 'Other',
        reason: data.reason || 'ไม่ระบุสาเหตุ',
        reporter: data.reporter || 'AI Assistant',
        ...data
      };
      await setDoc(doc(db, 'downtimeLogs', newLog.id), newLog);
      addLog('CREATE', `บันทึกเครื่องจักรขัดข้อง: ${newLog.machineId} (${newLog.reason})`, newLog.id);
    } catch (error) {
      console.error("Error saving downtime log:", error);
    }
  };

  const handleSaveFormTemplate = async (html: string, title: string) => {
    try {
      const newForm: FormTemplate = {
        id: `form-${Date.now()}`,
        title,
        html,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'forms', newForm.id), newForm);
      setCustomForm(prev => prev ? { ...prev, id: newForm.id } : null);
      alert('บันทึกแบบฟอร์มสำเร็จ');
    } catch (error) {
      console.error("Error saving form template:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกแบบฟอร์ม');
    }
  };

  const handleDeleteFormTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'forms', id));
    } catch (error) {
      console.error("Error deleting form template:", error);
    }
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

  if (currentView === 'custom-form' && customForm) {
    return <CustomFormView 
      html={customForm.html} 
      title={customForm.title} 
      onBack={() => setCurrentView('form-templates')} 
      onSave={!customForm.id ? () => handleSaveFormTemplate(customForm.html, customForm.title) : undefined}
    />;
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
        return <HistoryLog logs={logs} aiMessages={aiMessages} onRevert={handleRevert} />;
      case 'downtime-logs':
        return <DowntimeLogsView logs={downtimeLogs} />;
      case 'form-templates':
        return <FormTemplatesView 
          forms={formTemplates} 
          onViewForm={(form) => {
            setCustomForm({ html: form.html, title: form.title, id: form.id });
            setCurrentView('custom-form');
          }}
          onDeleteForm={handleDeleteFormTemplate}
          onSaveForm={handleSaveFormTemplate}
        />;
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
                 <button onClick={() => { setCurrentView('form-templates'); setMobileMenuOpen(false); }} className="text-white text-lg py-2 border-b border-slate-700">แบบฟอร์มเอกสาร</button>
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
                     currentView === 'custom-form' ? customForm?.title || 'เอกสาร' :
                     currentView === 'form-templates' ? 'แบบฟอร์มเอกสาร (Form Templates)' :
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
        formTemplates={formTemplates}
        onUpdateJob={handleSaveJob}
        onCreateJob={handleCreateJob}
        onBatchUpsert={handleBatchUpsert}
        onGenerateForm={handleGenerateForm}
        onLogDowntime={handleLogDowntime}
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
