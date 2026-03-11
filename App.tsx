


import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, orderBy, getDocs, addDoc, Timestamp, writeBatch, updateDoc } from 'firebase/firestore';
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
import { ProductTagView } from './components/ProductTagView';
import { InventoryView } from './components/InventoryView';
import { HistoryLog } from './components/HistoryLog';
import { KnowledgeBase } from './components/KnowledgeBase';
import { ProductionAnalysis } from './components/ProductionAnalysis';
import { OEEDashboard } from './components/OEEDashboard';
import { CustomFormView } from './components/CustomFormView';
import { FormTemplatesView } from './components/FormTemplatesView';
import { DowntimeLogsView } from './components/DowntimeLogsView';
import { GoogleSheetsImportModal } from './components/GoogleSheetsImportModal';
import { PlanVsActualDashboard } from './components/PlanVsActualDashboard';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { ProductionJob, MOCK_INVENTORY, MOCK_BOMS, PRODUCT_SPECS, MACHINE_MOLD_CAPABILITIES, AuditLog, AiMessage, FormTemplate, DowntimeLog, CustomKnowledge, InventoryItem, ProductBOM, AppUser } from './types';
import { Menu, Sparkles, Bell, Plus, BarChart3, Calendar, Clock, FileText, Cpu, Package, Settings, History, X, LogOut, Users, BrainCircuit } from 'lucide-react';

import { AiKnowledgeBase } from './components/AiKnowledgeBase';

export type ViewState = 'dashboard' | 'plan' | 'analysis' | 'schedule' | 'list' | 'machines' | 'inventory' | 'master-data' | 'ai-knowledge' | 'history' | 'order-detail' | 'handover' | 'tag-print' | 'custom-form' | 'form-templates' | 'plan-print' | 'plan-vs-actual' | 'users';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentView = location.pathname.substring(1) || 'dashboard';
  // const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // State for data management
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [boms, setBoms] = useState(MOCK_BOMS);
  const [productSpecs, setProductSpecs] = useState(PRODUCT_SPECS);
  const [machineCapabilities, setMachineCapabilities] = useState(MACHINE_MOLD_CAPABILITIES);
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
        knowledgeData.push({ id: doc.id, ...doc.data() } as CustomKnowledge);
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
      if (snapshot.empty) {
        if (!localStorage.getItem('hasSeededBoms')) {
          // Seed MOCK_BOMS to Firebase only once
          MOCK_BOMS.forEach(async (bom) => {
            try {
              const bomRef = doc(db, 'boms', bom.id || `bom-${Date.now()}`);
              await setDoc(bomRef, { ...bom, id: bomRef.id });
            } catch (e) {
              console.error("Error seeding BOM:", e);
            }
          });
          localStorage.setItem('hasSeededBoms', 'true');
        } else {
          setBoms([]);
        }
      } else {
        const bomsData: any[] = [];
        snapshot.forEach((doc) => {
          bomsData.push({ id: doc.id, ...doc.data() });
        });
        setBoms(bomsData as any);
      }
    }, (error) => {
      console.error("Error fetching boms from Firebase:", error);
    });

    const unsubscribeProductSpecs = onSnapshot(collection(db, 'productSpecs'), (snapshot) => {
      if (!snapshot.empty) {
        const specsData: any[] = [];
        snapshot.forEach((doc) => {
          specsData.push(doc.data());
        });
        setProductSpecs(specsData as any);
      }
    }, (error) => {
      console.error("Error fetching product specs from Firebase:", error);
    });

    const unsubscribeMachineCapabilities = onSnapshot(collection(db, 'machineCapabilities'), (snapshot) => {
      if (!snapshot.empty) {
        const capabilitiesData: any[] = [];
        snapshot.forEach((doc) => {
          capabilitiesData.push(doc.data());
        });
        setMachineCapabilities(capabilitiesData as any);
      }
    }, (error) => {
      console.error("Error fetching machine capabilities from Firebase:", error);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeLogs();
      unsubscribeForms();
      unsubscribeDowntimeLogs();
      unsubscribeCustomKnowledge();
      unsubscribeInventory();
      unsubscribeBoms();
      unsubscribeProductSpecs();
      unsubscribeMachineCapabilities();
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
            // Sanitize message to remove undefined values
            const sanitizedMsg = { ...msg };
            if (sanitizedMsg.image === undefined) delete sanitizedMsg.image;
            if (sanitizedMsg.actionProposal === undefined) delete sanitizedMsg.actionProposal;
            if (sanitizedMsg.pendingFunctionCalls === undefined) delete sanitizedMsg.pendingFunctionCalls;
            if (sanitizedMsg.verifiedAction === undefined) delete sanitizedMsg.verifiedAction;
            
            await addDoc(collection(db, 'chat_history'), sanitizedMsg);
          } catch (error) {
            console.error("Error saving chat message:", error);
          }
        }
        
        savedCountRef.current = aiMessages.length;
      }
    };

    saveNewMessages();
  }, [aiMessages, historyLoaded]);

  const handleAddCustomKnowledge = async (topic: string, content: string) => {
    try {
      // Check if topic already exists
      const existing = customKnowledge.find(k => k.topic.toLowerCase() === topic.toLowerCase());
      
      if (existing) {
        // Append content to existing topic
        await updateDoc(doc(db, 'customKnowledge', existing.id), {
          content: existing.content + '\n\n' + content,
          updatedAt: new Date().toISOString(),
          createdBy: 'AI Assistant'
        });
      } else {
        // Create new topic
        await addDoc(collection(db, 'customKnowledge'), {
          topic,
          content,
          updatedAt: new Date().toISOString(),
          createdBy: 'AI Assistant'
        });
      }
    } catch (error) {
      console.error("Error adding custom knowledge:", error);
    }
  };

  const addLog = async (action: AuditLog['action'], details: string, targetId?: string, currentJobsSnapshot?: ProductionJob[]) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action,
      user: currentUser ? currentUser.name : 'System',
      details,
      targetId,
      snapshot: currentJobsSnapshot || jobs // Save the snapshot of jobs
    };

    // Sanitize to remove undefined values
    const sanitizedLog = { ...newLog };
    if (sanitizedLog.targetId === undefined) delete sanitizedLog.targetId;
    if (sanitizedLog.snapshot === undefined) delete sanitizedLog.snapshot;

    try {
      await setDoc(doc(db, 'logs', newLog.id), sanitizedLog);
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
    inventory.forEach(item => {
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
    navigate('/order-detail');
  };

  const handlePrintHandover = (selectedJobs: ProductionJob[]) => {
    setHandoverJobs(selectedJobs);
    navigate('/handover');
  };

  const handlePrintTag = (job: ProductionJob) => {
    setTagJob(job);
    navigate('/tag-print');
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

  const handleUpdateActuals = async (jobId: string, actuals: number, reason?: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const updatedJob = {
      ...job,
      actualProduction: (job.actualProduction || 0) + actuals,
      remarks: reason ? `${job.remarks ? job.remarks + ' | ' : ''}${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}: ${reason}` : job.remarks
    };

    try {
      await setDoc(doc(db, 'jobs', updatedJob.id), updatedJob);
      const newJobs = jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
      
      // Update inventory (Deduct RM, Add FG)
      const bom = boms.find(b => b.productItem === job.productItem);
      let updatedInventory = [...inventory];
      const inventoryUpdates: Promise<void>[] = [];

      if (bom) {
        // Deduct raw materials
        bom.materials.forEach(material => {
          const invItemIndex = updatedInventory.findIndex(i => i.id === material.inventoryItemId);
          if (invItemIndex !== -1) {
            const invItem = updatedInventory[invItemIndex];
            const deduction = actuals * material.qtyPerUnit;
            const newStock = Math.max(0, invItem.currentStock - deduction);
            const updatedInvItem = { ...invItem, currentStock: newStock };
            updatedInventory[invItemIndex] = updatedInvItem;
            inventoryUpdates.push(setDoc(doc(db, 'inventory', updatedInvItem.id), updatedInvItem));
          }
        });
      }

      // Add finished goods
      const fgItemIndex = updatedInventory.findIndex(i => i.code === job.productItem || i.name === job.productItem);
      if (fgItemIndex !== -1) {
         const fgItem = updatedInventory[fgItemIndex];
         const updatedFgItem = { ...fgItem, currentStock: fgItem.currentStock + actuals };
         updatedInventory[fgItemIndex] = updatedFgItem;
         inventoryUpdates.push(setDoc(doc(db, 'inventory', updatedFgItem.id), updatedFgItem));
      }

      if (inventoryUpdates.length > 0) {
        await Promise.all(inventoryUpdates);
        setInventory(updatedInventory);
      }

      addLog('UPDATE', `อัปเดตยอดผลิตงาน ${updatedJob.jobOrder} เพิ่ม ${actuals} ชิ้น${reason ? ` (${reason})` : ''} (ตัดสต็อกอัตโนมัติ)`, updatedJob.id, newJobs);
    } catch (error) {
      console.error("Error updating actuals in Firebase:", error);
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

  const handleDeleteJob = async (jobId: string) => {
    try {
      const jobToDelete = jobs.find(j => j.id === jobId);
      if (!jobToDelete) return;
      
      await deleteDoc(doc(db, 'jobs', jobId));
      const newJobs = jobs.filter(j => j.id !== jobId);
      addLog('DELETE', `ลบงานผลิต ${jobToDelete.jobOrder}`, jobId, newJobs);
    } catch (error) {
      console.error("Error deleting job in Firebase:", error);
    }
  };

  const handleBatchUpsert = async (batchJobs: ProductionJob[]) => {
    try {
      let newJobs = [...jobs];
      
      // Use Firestore batch to handle multiple operations efficiently and reliably
      const batch = writeBatch(db);
      let successCount = 0;

      batchJobs.forEach((job) => {
        // Deeply sanitize job object to remove undefined values before saving to Firebase
        const sanitizedJob = JSON.parse(JSON.stringify(job));
        
        // Ensure ID is valid and doesn't contain slashes
        if (!sanitizedJob.id) {
          sanitizedJob.id = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        } else {
          sanitizedJob.id = String(sanitizedJob.id).replace(/\//g, '-');
        }

        const jobRef = doc(db, 'jobs', sanitizedJob.id);
        batch.set(jobRef, sanitizedJob);
        successCount++;
        
        const existingIndex = newJobs.findIndex(j => j.id === sanitizedJob.id);
        if (existingIndex !== -1) {
          newJobs[existingIndex] = sanitizedJob;
        } else {
          newJobs.push(sanitizedJob);
        }
      });

      await batch.commit();

      if (successCount > 0) {
        addLog('CREATE', `นำเข้าข้อมูล/อัปเดตงานผลิตจำนวน ${successCount} รายการ`, undefined, newJobs);
      }
      return true;
    } catch (error) {
      console.error("Error batch upserting jobs in Firebase:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลแบบ Batch: " + (error as Error).message);
      return false;
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
    navigate('/custom-form');
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
      const existing = id ? customKnowledge.find(k => k.id === id) : null;
      const newKnowledge: CustomKnowledge = {
        id: id || `know-${Date.now()}`,
        topic: knowledge.topic,
        content: knowledge.content,
        updatedAt: new Date().toISOString(),
        createdBy: existing?.createdBy || currentUser?.name || 'User',
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

  // Full screen views are handled by Routes

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
      const batch = writeBatch(db);
      for (const item of importedItems) {
        const itemRef = doc(db, 'inventory', item.id);
        batch.set(itemRef, item);
      }
      await batch.commit();
      
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
      alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + (error as Error).message);
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



  const handleViewChange = (view: string) => {
    if (view === 'import-plan') {
      setIsImportPlanModalOpen(true);
      if (currentView !== 'plan') {
        navigate('/plan');
      }
    } else {
      navigate('/' + view);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-kanit">
      <Sidebar currentView={currentView} onChangeView={handleViewChange} currentUser={currentUser} />

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
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="ออกจากระบบ"
            >
                <LogOut size={20} />
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
                        { id: 'inventory', label: 'สินค้าคงเหลือ (FG) & วัตถุดิบ', icon: <Package size={20} /> },
                        { id: 'master-data', label: 'ฐานข้อมูลหลัก', icon: <Settings size={20} /> },
                        { id: 'ai-knowledge', label: 'คลังความรู้ AI', icon: <BrainCircuit size={20} /> },
                        { id: 'form-templates', label: 'แบบฟอร์มเอกสาร', icon: <FileText size={20} /> },
                        { id: 'history', label: 'ประวัติการทำงาน', icon: <History size={20} /> },
                    ]
                    .concat(currentUser.role === 'admin' ? [{ id: 'users', label: 'จัดการผู้ใช้งาน', icon: <Users size={20} /> }] as any[] : [])
                    .map(item => (
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
                     currentView === 'inventory' ? 'สินค้าคงเหลือ (FG) & วัตถุดิบ' :
                     currentView === 'history' ? 'ประวัติการทำงาน (History Log)' :
                     currentView === 'tag-print' ? 'พิมพ์สติกเกอร์ (Print Tags)' :
                     currentView === 'custom-form' ? customForm?.title || 'เอกสาร' :
                     currentView === 'form-templates' ? 'แบบฟอร์มเอกสาร (Form Templates)' :
                     currentView === 'master-data' ? 'ฐานข้อมูลหลัก (Master Data)' :
                     currentView === 'ai-knowledge' ? 'คลังความรู้ AI (AI Knowledge Base)' :
                     currentView === 'machines' ? 'สถานะเครื่องจักร' : 
                     currentView === 'users' ? 'จัดการผู้ใช้งาน' : 'ตั้งค่า'}
                </h1>
                <p className="text-slate-500 text-sm hidden md:block">ยินดีต้อนรับ {currentUser.name} ({currentUser.role})</p>
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

                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="ออกจากระบบ"
                >
                  <LogOut size={24} />
                </button>
            </div>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
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
          } />
          <Route path="/plan" element={<ProductionPlan jobs={jobs} inventory={inventory} boms={boms} onEditJob={handleEditJob} onViewOrder={handleViewOrder} onPrintTag={handlePrintTag} onPrintHandover={handlePrintHandover} onImportJobs={handleImportJobs} onPrintPlan={() => navigate('/plan-print')} onOpenImportModal={() => setIsImportPlanModalOpen(true)} onUpdateJob={handleSaveJob} />} />
          <Route path="/plan-vs-actual" element={<PlanVsActualDashboard jobs={jobs} onUpdateActuals={handleUpdateActuals} />} />
          <Route path="/analysis" element={<ProductionAnalysis jobs={jobs} />} />
          <Route path="/oee" element={<OEEDashboard jobs={jobs} downtimeLogs={downtimeLogs} machineCapabilities={machineCapabilities} />} />
          <Route path="/schedule" element={<TimelineView jobs={jobs} onUpdateJob={handleSaveJob} />} />
          <Route path="/list" element={<JobTable jobs={jobs} inventory={inventory} boms={boms} onEditJob={handleEditJob} onPrintHandover={handlePrintHandover} onPrintTag={handlePrintTag} onViewOrder={handleViewOrder} />} />
          <Route path="/machines" element={<MachineGrid jobs={jobs} onEditJob={handleEditJob} />} />
          <Route path="/inventory" element={
            <InventoryView 
              inventory={inventory} 
              boms={boms}
              productSpecs={productSpecs}
              onImportInventory={handleImportInventory} 
              onAddInventory={handleAddInventory}
              onUpdateInventory={handleUpdateInventory}
              onDeleteInventory={handleDeleteInventory}
              onAddBom={handleAddBom}
              onUpdateBom={handleUpdateBom}
              onDeleteBom={handleDeleteBom}
            />
          } />
          <Route path="/master-data" element={<KnowledgeBase customKnowledge={customKnowledge} inventory={inventory} boms={boms} productSpecs={productSpecs} machineCapabilities={machineCapabilities} onSaveKnowledge={handleSaveKnowledge} onDeleteKnowledge={handleDeleteKnowledge} onAddBom={handleAddBom} onUpdateBom={handleUpdateBom} onDeleteBom={handleDeleteBom} />} />
          <Route path="/ai-knowledge" element={<AiKnowledgeBase customKnowledge={customKnowledge} onSaveKnowledge={handleSaveKnowledge} onDeleteKnowledge={handleDeleteKnowledge} />} />
          <Route path="/history" element={<HistoryLog logs={logs} aiMessages={aiMessages} onRevert={handleRevert} jobs={jobs} />} />
          <Route path="/downtime-logs" element={<DowntimeLogsView logs={downtimeLogs} />} />
          <Route path="/form-templates" element={
            <FormTemplatesView 
              forms={formTemplates} 
              onViewForm={(form) => {
                setCustomForm({ html: form.html, title: form.title, id: form.id });
                navigate('/custom-form');
              }}
              onDeleteForm={handleDeleteFormTemplate}
              onSaveForm={handleSaveFormTemplate}
            />
          } />
          <Route path="/order-detail" element={viewingOrderJob ? <ProductionOrderPrint job={viewingOrderJob} onBack={() => navigate('/plan')} /> : <Navigate to="/plan" />} />
          <Route path="/plan-print" element={<ProductionPlanPrint jobs={jobs} onBack={() => navigate('/plan')} />} />
          <Route path="/handover" element={handoverJobs.length > 0 ? <DocumentHandoverView jobs={handoverJobs} onBack={() => navigate('/list')} /> : <Navigate to="/list" />} />
          <Route path="/tag-print" element={tagJob ? <ProductTagView job={tagJob} productSpecs={productSpecs} onBack={() => navigate('/list')} /> : <Navigate to="/list" />} />
          <Route path="/custom-form" element={customForm ? <CustomFormView 
              html={customForm.html} 
              title={customForm.title} 
              onBack={() => navigate('/form-templates')} 
              onSave={!customForm.id ? () => handleSaveFormTemplate(customForm.html, customForm.title) : undefined}
            /> : <Navigate to="/form-templates" />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

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
        inventory={inventory}
        boms={boms}
        specs={productSpecs}
        machineCapabilities={machineCapabilities}
        formTemplates={formTemplates}
        customKnowledge={customKnowledge}
        downtimeLogs={downtimeLogs}
        onUpdateJob={handleSaveJob}
        onCreateJob={handleCreateJob}
        onDeleteJob={handleDeleteJob}
        onUpdateActuals={handleUpdateActuals}
        onBatchUpsert={handleBatchUpsert}
        onGenerateForm={handleGenerateForm}
        onLogDowntime={handleLogDowntime}
        onAddKnowledge={handleAddCustomKnowledge}
        onAddBom={handleAddBom}
        onUpdateBom={handleUpdateBom}
        onDeleteBom={handleDeleteBom}
        onAddInventory={handleAddInventory}
        onUpdateInventory={handleUpdateInventory}
        onDeleteInventory={handleDeleteInventory}
        onChangeView={handleViewChange}
        onPrintTag={(jobOrder) => { const job = jobs.find(j => j.jobOrder === jobOrder); if(job) handlePrintTag(job); }}
        onPrintHandover={(jobOrders) => { const selected = jobs.filter(j => jobOrders.includes(j.jobOrder)); if(selected.length) handlePrintHandover(selected); }}
        onOpenImportModal={() => setIsImportPlanModalOpen(true)}
        messages={aiMessages}
        setMessages={setAiMessages}
      />

      <EditJobModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingJob(null); }} 
        job={editingJob}
        jobs={jobs}
        inventory={inventory}
        boms={boms}
        productSpecs={productSpecs}
        onSave={handleSaveJob} 
        onOpenImportModal={() => setIsImportPlanModalOpen(true)}
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
