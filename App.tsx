


import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, orderBy, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Sidebar } from './components/Sidebar';
import { DashboardStats } from './components/DashboardStats';
import { JobTable } from './components/JobTable';
import { TimelineView } from './components/TimelineView';
import { MachineGrid } from './components/MachineGrid';
import { ProductionPlan } from './components/ProductionPlan';
import { ProductionPlanPrint } from './components/ProductionPlanPrint';
import { EditJobModal } from './components/EditJobModal';
import { SmartAssistant } from './components/SmartAssistant';
import { ProductionOrderPrint } from './components/ProductionOrderPrint';
import { DocumentHandoverView } from './components/DocumentHandoverView';
import { ProductTagPrint } from './components/ProductTagPrint';
import { InventoryView } from './components/InventoryView';
import { HistoryLog } from './components/HistoryLog';
import { KnowledgeBase } from './components/KnowledgeBase';
import { ProductionAnalysis } from './components/ProductionAnalysis';
import { OEEDashboard } from './components/OEEDashboard';
import { CustomFormView } from './components/CustomFormView';
import { FormTemplatesView } from './components/FormTemplatesView';
import { DowntimeLogsView } from './components/DowntimeLogsView';
import { GoogleSheetsImportModal } from './components/GoogleSheetsImportModal';
import { MOCK_DATA, ProductionJob, MOCK_INVENTORY, MOCK_BOMS, PRODUCT_SPECS, MACHINE_MOLD_CAPABILITIES, AuditLog, AiMessage, FormTemplate, DowntimeLog, CustomKnowledge, InventoryItem, ProductBOM } from './types';
import { Menu, Sparkles, Bell, Plus, BarChart3, Calendar, Clock, FileText, Cpu, Package, Settings, History, X } from 'lucide-react';

export type ViewState = 'dashboard' | 'plan' | 'analysis' | 'schedule' | 'list' | 'machines' | 'inventory' | 'master-data' | 'history' | 'order-detail' | 'handover' | 'tag-print' | 'custom-form' | 'form-templates' | 'plan-print';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for data management
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [boms, setBoms] = useState(MOCK_BOMS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportPlanModalOpen, setIsImportPlanModalOpen] = useState(false);
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

    const unsubscribeCustomKnowledge = onSnapshot(collection(db, 'customKnowledge'), (snapshot) => {
      const knowledgeData: CustomKnowledge[] = [];
      snapshot.forEach((doc) => {
        knowledgeData.push(doc.data() as CustomKnowledge);
      });
      knowledgeData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setCustomKnowledge(knowledgeData);
    }, (error) => {
      console.error("Error fetching custom knowledge from Firebase:", error);
    });

    const unsubscribeInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      if (!snapshot.empty) {
        const inventoryData: any[] = [];
        snapshot.forEach((doc) => {
          inventoryData.push(doc.data());
        });
        setInventory(inventoryData as any);
      }
    }, (error) => {
      console.error("Error fetching inventory from Firebase:", error);
    });

    const unsubscribeBoms = onSnapshot(collection(db, 'boms'), (snapshot) => {
      if (!snapshot.empty) {
        const bomsData: any[] = [];
        snapshot.forEach((doc) => {
          bomsData.push(doc.data());
        });
        setBoms(bomsData as any);
      }
    }, (error) => {
      console.error("Error fetching boms from Firebase:", error);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeLogs();
      unsubscribeForms();
      unsubscribeDowntimeLogs();
      unsubscribeCustomKnowledge();
      unsubscribeInventory();
      unsubscribeBoms();
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
  const [customKnowledge, setCustomKnowledge] = useState<CustomKnowledge[]>([]);
  
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { 
      role: 'model', 
      text: 'สวัสดีครับ ผมคือ ProPlanner Brain 🧠 ผู้ช่วยอัจฉริยะฝ่ายผลิต\n\nผมจดจำข้อมูล Master Data ทั้งหมดของโรงงานได้แล้ว (สเปคสินค้า, แม่พิมพ์, ความเร็วเครื่องจักร)\n\nมีอะไรให้ผมช่วยวิเคราะห์แผน หรือตรวจสอบสต็อก ถามได้เลยครับ!',
      timestamp: new Date().toISOString()
    }
  ]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const savedCountRef = useRef(1); // Start at 1 because of the initial message

  // Load Chat History (Last 14 Days)
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        
        const q = query(
          collection(db, 'chat_history'),
          where('timestamp', '>=', fourteenDaysAgo.toISOString()),
          orderBy('timestamp', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const historyMessages: AiMessage[] = [];
        
        querySnapshot.forEach((doc) => {
          historyMessages.push(doc.data() as AiMessage);
        });

        if (historyMessages.length > 0) {
          setAiMessages(historyMessages);
          savedCountRef.current = historyMessages.length;
        } else {
          // Keep default message, but mark it as unsaved if we want to save it? 
          // Actually, let's just leave the default message and let the save effect handle it if we want.
          // But to avoid duplicating the default message every time, we might want to check.
          // For simplicity, if history is empty, we start fresh with the default message.
          savedCountRef.current = 1; 
        }
        setHistoryLoaded(true);
      } catch (error) {
        console.error("Error loading chat history:", error);
        setHistoryLoaded(true); // Proceed anyway
      }
    };

    loadChatHistory();
  }, []);

  // Save New Chat Messages
  useEffect(() => {
    if (!historyLoaded) return;

    const saveNewMessages = async () => {
      if (aiMessages.length > savedCountRef.current) {
        const newMessages = aiMessages.slice(savedCountRef.current);
        
        for (const msg of newMessages) {
          try {
            await addDoc(collection(db, 'chat_history'), msg);
          } catch (error) {
            console.error("Error saving chat message:", error);
          }
        }
        
        savedCountRef.current = aiMessages.length;
      }
    };

    saveNewMessages();
  }, [aiMessages, historyLoaded]);

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

  const [alerts, setAlerts] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Real-time Notification System
  useEffect(() => {
    const generatedAlerts: any[] = [];
    const now = new Date();

    // 1. Check Machine Downtime (Simulate "stopped for > 15 mins")
    downtimeLogs.forEach(log => {
      const logDate = new Date(log.date);
      const diffMinutes = (now.getTime() - logDate.getTime()) / (1000 * 60);
      if (diffMinutes >= 15 && diffMinutes <= 24 * 60) {
         generatedAlerts.push({
           id: `dt-${log.id}`,
           type: 'error',
           message: `🚨 เครื่อง ${log.machineId} หยุดทำงานเกิน 15 นาทีแล้ว (${log.reason})`,
           time: logDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
           timestamp: log.date,
           read: false
         });
      }
    });

    // 2. Check Material Shortage (Simulate "running out in 2 hours")
    MOCK_INVENTORY.forEach(item => {
      if (item.currentStock <= item.minStock) {
        generatedAlerts.push({
           id: `inv-${item.id}`,
           type: 'warning',
           message: `⚠️ วัตถุดิบ ${item.code} (${item.name}) ใกล้จะหมดสต็อก!`,
           time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
           timestamp: now.toISOString(),
           read: false
        });
      }
    });

    // 3. Check Delayed Jobs
    jobs.filter(j => j.status === 'Delayed').forEach(job => {
       generatedAlerts.push({
           id: `delay-${job.id}`,
           type: 'warning',
           message: `⚠️ งาน ${job.jobOrder} (เครื่อง ${job.machineId}) ล่าช้ากว่าแผนการผลิต`,
           time: new Date(job.startDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
           timestamp: job.startDate,
           read: false
       });
    });

    setAlerts(prev => {
      const newAlertList = [...prev];
      generatedAlerts.forEach(ga => {
        if (!newAlertList.find(a => a.id === ga.id)) {
          newAlertList.push(ga);
        }
      });
      return newAlertList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });
  }, [jobs, downtimeLogs]);

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  const markAllAlertsAsRead = () => {
    setAlerts(alerts.map(a => ({ ...a, read: true })));
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

  const handleSaveKnowledge = async (knowledge: Omit<CustomKnowledge, 'id' | 'updatedAt'>, id?: string) => {
    try {
      const newKnowledge: CustomKnowledge = {
        id: id || `know-${Date.now()}`,
        topic: knowledge.topic,
        content: knowledge.content,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'customKnowledge', newKnowledge.id), newKnowledge);
      alert('บันทึกข้อมูลความรู้สำเร็จ');
    } catch (error) {
      console.error("Error saving custom knowledge:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customKnowledge', id));
    } catch (error) {
      console.error("Error deleting custom knowledge:", error);
    }
  };

  // If in "Print/Order" detail mode, render that separately for full screen
  if (currentView === 'order-detail' && viewingOrderJob) {
    return <ProductionOrderPrint job={viewingOrderJob} onBack={() => setCurrentView('plan')} />;
  }

  if (currentView === 'plan-print') {
    return <ProductionPlanPrint jobs={jobs} onBack={() => setCurrentView('plan')} />;
  }

  if (currentView === 'handover' && handoverJobs.length > 0) {
    return <DocumentHandoverView jobs={handoverJobs} onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'tag-print' && tagJob) {
    return <ProductTagPrint job={tagJob} onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'custom-form' && customForm) {
    return <CustomFormView 
      html={customForm.html} 
      title={customForm.title} 
      onBack={() => setCurrentView('form-templates')} 
      onSave={!customForm.id ? () => handleSaveFormTemplate(customForm.html, customForm.title) : undefined}
    />;
  }

  const handleImportJobs = (importedJobs: Partial<ProductionJob>[]) => {
    const newJobs = importedJobs.map(job => ({
      ...job,
      id: job.id || `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: job.status || 'Planned',
      startDate: job.startDate || new Date().toISOString(),
      endDate: job.endDate || new Date(Date.now() + 86400000).toISOString(),
      actualProduction: 0,
    })) as ProductionJob[];
    
    setJobs([...jobs, ...newJobs]);
  };

  const handleImportInventory = async (importedItems: any[]) => {
    try {
      // Create a batch to write all imported items to Firebase
      for (const item of importedItems) {
        const itemRef = doc(db, 'inventory', item.id);
        await setDoc(itemRef, item);
      }
      
      // Also log the action
      const logRef = collection(db, 'logs');
      await addDoc(logRef, {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'นำเข้าข้อมูลสินค้าคงคลัง',
        details: `นำเข้าข้อมูลจำนวน ${importedItems.length} รายการผ่าน Excel`,
        user: 'System Admin'
      });
      
      alert(`นำเข้าข้อมูลสำเร็จ ${importedItems.length} รายการ`);
    } catch (error) {
      console.error("Error importing inventory:", error);
      alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    }
  };

  const handleAddInventory = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      const newItemRef = doc(collection(db, 'inventory'));
      const newItem = { ...item, id: newItemRef.id };
      await setDoc(newItemRef, newItem);
      
      await addDoc(collection(db, 'logs'), {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'เพิ่มรายการสินค้า',
        details: `เพิ่มรหัส ${item.code} - ${item.name}`,
        user: 'System Admin'
      });
    } catch (error) {
      console.error("Error adding inventory:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มข้อมูล");
    }
  };

  const handleUpdateInventory = async (item: InventoryItem) => {
    try {
      const itemRef = doc(db, 'inventory', item.id);
      await setDoc(itemRef, item, { merge: true });
      
      await addDoc(collection(db, 'logs'), {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'แก้ไขรายการสินค้า',
        details: `แก้ไขรหัส ${item.code}`,
        user: 'System Admin'
      });
    } catch (error) {
      console.error("Error updating inventory:", error);
      alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    }
  };

  const handleDeleteInventory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', id));
      
      await addDoc(collection(db, 'logs'), {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ลบรายการสินค้า',
        details: `ลบรายการ ID: ${id}`,
        user: 'System Admin'
      });
    } catch (error) {
      console.error("Error deleting inventory:", error);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  const handleAddBom = async (bom: Omit<ProductBOM, 'id'>) => {
    try {
      const newBomRef = doc(collection(db, 'boms'));
      const newBom = { ...bom, id: newBomRef.id };
      await setDoc(newBomRef, newBom);
      
      await addDoc(collection(db, 'logs'), {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'เพิ่มสูตรการผลิต',
        details: `เพิ่มสูตรสำหรับ ${bom.productItem}`,
        user: 'System Admin'
      });
    } catch (error) {
      console.error("Error adding BOM:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มสูตรการผลิต");
    }
  };

  const handleUpdateBom = async (bom: ProductBOM) => {
    if (!bom.id) return;
    try {
      const bomRef = doc(db, 'boms', bom.id);
      await setDoc(bomRef, bom, { merge: true });
      
      await addDoc(collection(db, 'logs'), {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'แก้ไขสูตรการผลิต',
        details: `แก้ไขสูตรสำหรับ ${bom.productItem}`,
        user: 'System Admin'
      });
    } catch (error) {
      console.error("Error updating BOM:", error);
      alert("เกิดข้อผิดพลาดในการแก้ไขสูตรการผลิต");
    }
  };

  const handleDeleteBom = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'boms', id));
      
      await addDoc(collection(db, 'logs'), {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ลบสูตรการผลิต',
        details: `ลบสูตร ID: ${id}`,
        user: 'System Admin'
      });
    } catch (error) {
      console.error("Error deleting BOM:", error);
      alert("เกิดข้อผิดพลาดในการลบสูตรการผลิต");
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <DashboardStats data={jobs} downtimeLogs={downtimeLogs} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TimelineView jobs={jobs} onUpdateJob={handleSaveJob} />
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
        return <ProductionPlan jobs={jobs} onEditJob={handleEditJob} onViewOrder={handleViewOrder} onImportJobs={handleImportJobs} onPrintPlan={() => setCurrentView('plan-print')} />;
      case 'analysis':
        return <ProductionAnalysis jobs={jobs} />;
      case 'oee':
        return <OEEDashboard jobs={jobs} downtimeLogs={downtimeLogs} machineCapabilities={MACHINE_MOLD_CAPABILITIES} />;
      case 'schedule':
        return <TimelineView jobs={jobs} onUpdateJob={handleSaveJob} />;
      case 'list':
        return <JobTable jobs={jobs} onEditJob={handleEditJob} onPrintHandover={handlePrintHandover} onPrintTag={handlePrintTag} />;
      case 'machines':
        return <MachineGrid jobs={jobs} onEditJob={handleEditJob} />;
      case 'inventory':
        return <InventoryView 
          inventory={inventory} 
          boms={boms}
          onImportInventory={handleImportInventory} 
          onAddInventory={handleAddInventory}
          onUpdateInventory={handleUpdateInventory}
          onDeleteInventory={handleDeleteInventory}
          onAddBom={handleAddBom}
          onUpdateBom={handleUpdateBom}
          onDeleteBom={handleDeleteBom}
        />;
      case 'master-data':
        return <KnowledgeBase customKnowledge={customKnowledge} onSaveKnowledge={handleSaveKnowledge} onDeleteKnowledge={handleDeleteKnowledge} />;
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
      case 'order-detail':
        return viewingOrderJob ? <ProductionOrderPrint job={viewingOrderJob} onBack={() => setCurrentView('plan')} /> : null;
      case 'handover':
        return <DocumentHandoverView jobs={handoverJobs} onBack={() => setCurrentView('list')} />;
      case 'tag-print':
        return tagJob ? <ProductTagPrint job={tagJob} onBack={() => setCurrentView('list')} /> : null;
      default:
        return <ProductionPlan jobs={jobs} onEditJob={handleEditJob} onViewOrder={handleViewOrder} onImportJobs={handleImportJobs} />;
    }
  };

  const handleViewChange = (view: string) => {
    if (view === 'import-plan') {
      setIsImportPlanModalOpen(true);
      if (currentView !== 'plan') {
        setCurrentView('plan');
      }
    } else {
      setCurrentView(view);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-kanit">
      <Sidebar currentView={currentView} onChangeView={handleViewChange} />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-40 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-1 -ml-1 hover:bg-slate-800 rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            <span className="font-bold text-lg tracking-tight">ProPlanner</span>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <Bell size={20} />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
              )}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white p-1.5 rounded-lg transition-all shadow-sm"
            >
                <Plus size={20} />
            </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
            ></div>
            
            {/* Drawer */}
            <div className="relative w-4/5 max-w-sm bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-left">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center font-bold text-white">P</div>
                        <span className="font-bold text-xl text-white tracking-tight">ProPlanner</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {[
                        { id: 'dashboard', label: 'ภาพรวม', icon: <BarChart3 size={20} /> },
                        { id: 'plan', label: 'แผนการผลิต', icon: <Calendar size={20} /> },
                        { id: 'import-plan', label: 'นำเข้าแผนผลิต (Excel)', icon: <FileText size={20} /> },
                        { id: 'schedule', label: 'ไทม์ไลน์', icon: <Clock size={20} /> },
                        { id: 'list', label: 'รายการงานทั้งหมด', icon: <FileText size={20} /> },
                        { id: 'machines', label: 'สถานะเครื่องจักร', icon: <Cpu size={20} /> },
                        { id: 'inventory', label: 'คลังวัตถุดิบ & BOM', icon: <Package size={20} /> },
                        { id: 'master-data', label: 'ฐานข้อมูลหลัก', icon: <Settings size={20} /> },
                        { id: 'form-templates', label: 'แบบฟอร์มเอกสาร', icon: <FileText size={20} /> },
                        { id: 'history', label: 'ประวัติการทำงาน', icon: <History size={20} /> },
                    ].map(item => (
                        <button 
                            key={item.id}
                            onClick={() => { handleViewChange(item.id); setMobileMenuOpen(false); }} 
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === item.id ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Notifications Dropdown (Shared for Mobile & Desktop) */}
      {showNotifications && (
        <>
            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowNotifications(false)}></div>
            <div className="absolute top-16 right-4 md:top-20 md:right-8 w-[calc(100vw-2rem)] md:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-700 text-sm">การแจ้งเตือน</h3>
                {unreadAlertsCount > 0 && (
                    <button onClick={markAllAlertsAsRead} className="text-xs text-brand-600 hover:text-brand-800 font-medium">อ่านทั้งหมด</button>
                )}
            </div>
            <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                    <div className="p-6 text-center flex flex-col items-center justify-center text-slate-400">
                        <Bell size={32} className="mb-2 opacity-20" />
                        <span className="text-sm">ไม่มีการแจ้งเตือนใหม่</span>
                    </div>
                ) : (
                    alerts.map(alert => (
                    <div key={alert.id} className={`p-3 border-b border-slate-50 text-sm transition-colors ${alert.read ? 'opacity-60 hover:bg-slate-50' : 'bg-brand-50/50 hover:bg-brand-50'}`}>
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-slate-800 leading-tight">{alert.message}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                            <Clock size={10} /> {alert.time}
                        </div>
                    </div>
                    ))
                )}
            </div>
            </div>
        </>
      )}

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen relative">
        <header className="mb-6 md:mb-8 flex justify-between items-center print:hidden">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
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
                <p className="text-slate-500 text-sm hidden md:block">ยินดีต้อนรับ ผู้จัดการฝ่ายวางแผนการผลิต</p>
            </div>
            <div className="hidden md:flex items-center gap-4 relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <Bell size={24} />
                  {unreadAlertsCount > 0 && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 active:scale-95 flex items-center gap-2"
                >
                    <Plus size={18} /> เพิ่มรายการผลิตใหม่
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
        customKnowledge={customKnowledge}
        downtimeLogs={downtimeLogs}
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

      <GoogleSheetsImportModal 
        isOpen={isImportPlanModalOpen} 
        onClose={() => setIsImportPlanModalOpen(false)} 
        onImport={(importedJobs) => {
          handleImportJobs(importedJobs);
        }}
      />
    </div>
  );
};


export default App;
