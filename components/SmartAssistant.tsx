




import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { ProductionJob, SIMULATED_NOW, InventoryItem, ProductBOM, ProductSpec, MachineMoldCapability, AiMessage, FormTemplate, CustomKnowledge, DowntimeLog } from '../types';
import { Send, Bot, X, Loader2, CheckCircle, AlertTriangle, Paperclip, Image as ImageIcon, Trash2, BrainCircuit, FileSpreadsheet, MessageSquareText, Key } from 'lucide-react';
import * as XLSX from 'xlsx';

interface SmartAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: ProductionJob[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  specs: ProductSpec[];
  machineCapabilities: MachineMoldCapability[];
  formTemplates?: FormTemplate[];
  customKnowledge?: CustomKnowledge[];
  downtimeLogs?: DowntimeLog[];
  onUpdateJob: (job: ProductionJob) => void;
  onCreateJob: (job: ProductionJob) => void;
  onBatchUpsert?: (jobs: ProductionJob[]) => void;
  onGenerateForm?: (html: string, title: string) => void;
  onLogDowntime?: (data: any) => void;
  messages: AiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
}

// Define structure for selected file
type UploadedFile = {
  file: File;
  type: 'image' | 'excel';
  preview?: string; // For images
  content?: string; // For excel (parsed CSV/JSON string)
};

export const SmartAssistant: React.FC<SmartAssistantProps> = ({ 
  isOpen, 
  onClose, 
  jobs,
  inventory,
  boms,
  specs,
  machineCapabilities,
  formTemplates,
  customKnowledge,
  downtimeLogs,
  onUpdateJob,
  onCreateJob,
  onBatchUpsert,
  onGenerateForm,
  onLogDowntime,
  messages,
  setMessages
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedApiKey, setSavedApiKey] = useState(() => localStorage.getItem('proplanner_gemini_api_key') || '');
  const [showKeySetup, setShowKeySetup] = useState(!localStorage.getItem('proplanner_gemini_api_key'));
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('proplanner_gemini_api_key', apiKeyInput.trim());
      setSavedApiKey(apiKeyInput.trim());
      setShowKeySetup(false);
    }
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('proplanner_gemini_api_key');
    setSavedApiKey('');
    setApiKeyInput('');
    setShowKeySetup(true);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Determine file type
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        // Handle Excel
        await processExcelFile(file);
      } else if (file.type.startsWith('image/')) {
        // Handle Image
        processImageFile(file);
      } else {
        alert('รองรับเฉพาะไฟล์รูปภาพ หรือ Excel (.xlsx, .xls) เท่านั้นครับ');
      }
    }
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedFile({
          file: file,
          type: 'image',
          preview: event.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const processExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to CSV for AI consumption (Tokens efficient enough for typical planning sheets)
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      
      setSelectedFile({
        file: file,
        type: 'excel',
        content: csvData
      });
    } catch (error) {
      console.error("Error reading excel:", error);
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); 
        const file = items[i].getAsFile();
        if (file) processImageFile(file);
        break; 
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMsgText = input;
    const currentFile = selectedFile;

    // Reset Input State
    setInput('');
    clearFile();

    // Add User Message to UI
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMsgText, 
      image: currentFile?.type === 'image' ? currentFile.preview : undefined, // Display image if it is one
      timestamp: new Date().toISOString()
    }]);

    setIsLoading(true);

    try {
      // 1. Prepare "Second Brain" Context
      const fullSystemContext = {
        meta: {
          currentTime: SIMULATED_NOW.toISOString(),
          appName: "ProPlanner AI",
        },
        productionPlan: jobs.map(j => ({
          id: j.id,
          machine: j.machineId,
          order: j.jobOrder,
          product: j.productItem,
          status: j.status,
          totalTarget: j.totalProduction, // ยอดสั่งผลิตทั้งหมด
          actualProduced: j.actualProduction || 0, // ยอดผลิตได้จริง (Current output)
          progressPercent: j.totalProduction > 0 ? Math.round(((j.actualProduction || 0) / j.totalProduction) * 100) + '%' : '0%',
          startDate: j.startDate,
          endDate: j.endDate,
          remarks: j.remarks
        })),
        inventorySnapshot: inventory.map(i => ({
          code: i.code,
          name: i.name,
          current: i.currentStock,
          unit: i.unit,
          status: i.currentStock <= i.minStock ? 'LOW STOCK' : 'OK'
        })),
        masterData: {
            recipesBOM: boms,
            productSpecifications: specs,
            machineMoldCapabilities: machineCapabilities
        },
        savedFormTemplates: formTemplates?.map(f => ({ id: f.id, title: f.title, html: f.html })) || [],
        customKnowledge: customKnowledge?.map(k => ({ topic: k.topic, content: k.content })) || [],
        downtimeHistory: downtimeLogs?.map(d => ({ machineId: d.machineId, date: d.date, durationMinutes: d.durationMinutes, category: d.category, reason: d.reason })) || []
      };

      // 2. Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: savedApiKey });
      
      // 3. Construct System Prompt (UPGRADED)
      const systemPrompt = `
        You are "ProPlanner Brain", a **Senior Production Manager** at KPAC Plastics Factory.
        You are intelligent, witty, proactive, and deeply understand manufacturing logistics.

        **YOUR PERSONALITY:**
        - You don't just answer; you **analyze**.
        - You know that **Machines break**, **Mold changes take time (2hrs)**, and **Color changes take time (1hr)**.
        - You are keenly aware of **"Starvation"**: Preform machines (Injection) are often SLOWER than Blow machines. If Preform stock is low, the Blow machine MUST stop.
        - You are helpful, professional, but sharp. You catch mistakes before they happen.

        **YOUR KNOWLEDGE BASE (MASTER DATA & CUSTOM KNOWLEDGE):**
        You have access to the full factory master data (provided in JSON context).
        - **Product Specs:** You know which Bottle (Jar) uses which Preform. (e.g., A01 uses P45).
        - **Machine Caps:** You know AB1 runs at ~800/hr, but IP machines might run differently.
        - **Colors:** You know changing from Black -> White is a nightmare (needs heavy cleaning).
        - **Custom Knowledge:** Pay special attention to the \`customKnowledge\` array in the context. This contains specific rules, warnings, or facts added by the user. Always prioritize these custom rules when answering or planning.

        **PREDICTIVE ANALYTICS (FORECASTING):**
        - You have access to \`downtimeHistory\` and current \`jobs\`.
        - **Machine Health:** Analyze the downtime history. If a machine (e.g., IP1) has frequent breakdowns or a recent major failure, warn the user that it might need maintenance soon or is at risk of breaking down again if heavily loaded.
        - **Material Shortage:** Analyze the current running jobs and inventory. If a Blow machine is running fast but the corresponding Injection machine is slow or stopped, calculate when the Preform stock will run out and warn the user (e.g., "วัตถุดิบจะหมดในอีก 5 ชั่วโมง").
        - Be proactive. If the user asks for a general update, include these predictive insights.

        **CRITICAL RULES:**
        1. **Preform Check:** If a user asks to plan a Blow Job (e.g., QE307 on AB5), CHECK PREFORM STOCK FIRST. If stock is low, WARN THEM immediately.
        2. **Breakdowns:** If a machine is 'Maintenance' (like AB7 is now), do not suggest putting jobs on it until repaired.
        3. **Optimization:** If you see short runs of different colors on one machine, suggest grouping them to save setup time.
        4. **Realism:** If a plan is impossible (e.g., producing 100k in 1 hour), say it's impossible.

        **DATA INTERPRETATION:**
        - \`actualProduced\` = Current output so far.
        - \`totalTarget\` = The goal.
        - Negative numbers in reports often mean "Stock Deficit" (Owe customers), but in Inventory reports, dashes '-' usually mean 0. Use context.

        **RESPONSE FORMAT & ACTIONS:**
        - Talk naturally in Thai.
        - Use emojis 🏭 ⚠️ ✅ appropriately.
        - **Direct Actions (Function Calling):** If the user asks to "เลื่อนงาน", "อัปเดตสถานะงาน", or "บันทึกเครื่องจักรเสีย", you MUST use the provided tools (Function Calling) to execute the action immediately. Do not return a JSON block for these.
        - **Other Actions (JSON Block):** For actions that don't have a specific tool (like creating a new job, batch importing schedule, or generating a form), append a JSON block for Action Proposal EXACTLY in this format:
        \`\`\`json
        {
          "type": "BATCH_UPSERT",
          "data": [
            {
              "jobOrder": "B6902-055",
              "machineId": "IP1",
              "productItem": "P45",
              "moldCode": "P45",
              "capacityPerShift": 5760,
              "totalProduction": 57600,
              "actualProduction": 25200,
              "color": "-",
              "startDate": "2026-02-12T09:00:00Z",
              "endDate": "2026-02-23T20:00:00Z",
              "status": "Running",
              "remarks": ""
            }
          ]
        }
        \`\`\`
        (Use "type": "UPDATE" or "CREATE" for single actions, or "BATCH_UPSERT" for multiple jobs. For BATCH_UPSERT, the system will update existing jobs by jobOrder, or create them if they don't exist.)
        
        - If the user asks you to create a form, document, or tag (especially if they upload an image of a template and ask you to use it), you can generate a custom HTML template for it. Use Tailwind CSS classes for styling. Return a JSON action with \`type: 'GENERATE_FORM'\`, \`html: '<div class=\"...\">...</div>'\`, and \`title: 'Form Title'\`. The HTML should be a complete, printable document layout. You can use data from the current jobs if the user specifies.
        - If the user asks to use an existing form template, you can refer to the \`savedFormTemplates\` in the context. You can generate a new form by taking the \`html\` of the saved template and modifying it to insert the requested data (e.g., job details, inventory data). Return a JSON action with \`type: 'GENERATE_FORM'\`, the modified \`html\`, and a new \`title\`.
        
        - If the user reports a machine breakdown, setup time, or any downtime (e.g., from a LINE chat message), extract the details and return a JSON action with \`type: 'LOG_DOWNTIME'\`.
        \`\`\`json
        {
          "type": "LOG_DOWNTIME",
          "data": {
            "machineId": "AB1",
            "date": "2026-03-01T00:00:00Z",
            "durationMinutes": 45,
            "category": "Breakdown",
            "reason": "มอเตอร์ไหม้",
            "reporter": "ช่างเอ"
          }
        }
        \`\`\`
        (Category must be one of: 'Breakdown', 'Setup', 'Quality', 'Material', 'Other')
        \`\`\`json
        {
          "type": "GENERATE_FORM",
          "title": "ใบแจ้งงานผลิต",
          "html": "<div class=\\"p-8 bg-white text-black\\"><h1 class=\\"text-2xl font-bold text-center\\">ใบแจ้งงานผลิต</h1>...</div>"
        }
        \`\`\`

        **IMAGE EXTRACTION & VISION RULES:**
        - **Data Extraction:** When extracting from images, you MUST extract ALL columns including "ยอดการผลิตได้" (actualProduction), "Cap ต่อกะ" (capacityPerShift), "รหัสแม่พิมพ์" (moldCode), "สี" (color), and "หมายเหตุ" (remarks). Do not leave them out.
        - **Form Templates:** If the image is a form template and the user wants to create a form based on it, extract its structure and generate a \`GENERATE_FORM\` action.
        - **Quality Control (Defects):** If the user uploads an image of a defective product (NG/Defect), analyze the visual anomaly (e.g., black spots, short shot, flash, scratches, bubbles). Explain the possible root causes based on plastic injection/blow molding principles, and suggest immediate troubleshooting steps.
        - **Machine Error Screens:** If the user uploads an image of a machine error screen or alarm, read the error code/message, explain what it means, and suggest how to fix it. If it implies downtime, you can propose a \`LOG_DOWNTIME\` action.
        
        FULL SYSTEM CONTEXT:
        ${JSON.stringify(fullSystemContext)}
      `;

      // 4. Prepare Content Parts
      const contents: any[] = [];
      
      contents.push({ role: 'user', parts: [{ text: `SYSTEM_INSTRUCTION_AND_CONTEXT: ${systemPrompt}` }] });

      // Add conversation history (limit to last 10 messages to save tokens and avoid context overflow)
      const historyMessages = messages.slice(-10);
      for (const msg of historyMessages) {
        const parts: any[] = [{ text: msg.text }];
        if (msg.image) {
          const match = msg.image.match(/^data:(image\/\w+);base64,(.*)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          }
        }
        contents.push({ role: msg.role, parts });
      }

      const userParts: any[] = [];
      
      // Attach Text
      let finalPrompt = userMsgText;
      
      // Attach Excel Content as Text
      if (currentFile?.type === 'excel' && currentFile.content) {
          finalPrompt += `\n\n[USER UPLOADED EXCEL FILE CONTENT (CSV FORMAT)]:\n${currentFile.content}\n[END OF EXCEL FILE] - Please analyze this KPAC Preform report based on the Strict Rules provided.`;
      }
      
      if (finalPrompt) {
          userParts.push({ text: finalPrompt });
      }

      // Attach Image Content
      if (currentFile?.type === 'image' && currentFile.preview) {
        const base64Data = currentFile.preview.split(',')[1];
        userParts.push({
          inlineData: {
            mimeType: currentFile.file.type,
            data: base64Data
          }
        });
      }
      
      contents.push({ role: 'user', parts: userParts });

      // Sanitize contents to ensure alternating roles (user -> model -> user -> model)
      const sanitizedContents: any[] = [];
      let lastRole = '';
      
      for (const content of contents) {
        if (content.role === lastRole) {
           // If same role, merge parts into the previous content
           sanitizedContents[sanitizedContents.length - 1].parts.push(...content.parts);
        } else {
           sanitizedContents.push(content);
           lastRole = content.role;
        }
      }

      // 4.5 Define Tools
      const rescheduleMachineJobsFunc: FunctionDeclaration = {
        name: "rescheduleMachineJobs",
        description: "เลื่อนงานทั้งหมดของเครื่องจักรที่ระบุ ไปยังวันและเวลาใหม่ (เช่น เลื่อนงานของ AB1 ไปพรุ่งนี้)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            machineId: { type: Type.STRING, description: "รหัสเครื่องจักร เช่น AB1, IP1" },
            newStartDate: { type: Type.STRING, description: "วันและเวลาเริ่มต้นใหม่ (ISO 8601 format)" }
          },
          required: ["machineId", "newStartDate"]
        }
      };

      const updateJobStatusFunc: FunctionDeclaration = {
        name: "updateJobStatus",
        description: "อัปเดตสถานะของรายการผลิต",
        parameters: {
          type: Type.OBJECT,
          properties: {
            jobOrder: { type: Type.STRING, description: "หมายเลข Job Order" },
            status: { type: Type.STRING, description: "สถานะใหม่ เช่น Running, Completed, Pending, Paused" }
          },
          required: ["jobOrder", "status"]
        }
      };

      const createJobFunc: FunctionDeclaration = {
        name: "createJob",
        description: "สร้างรายการผลิตใหม่ (Job Order)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            jobOrder: { type: Type.STRING, description: "รหัส Job Order (ถ้าไม่ระบุให้สร้างใหม่แบบสุ่ม)" },
            productCode: { type: Type.STRING, description: "รหัสสินค้า เช่น A01, P45" },
            machineId: { type: Type.STRING, description: "รหัสเครื่องจักร เช่น AB1, IP1" },
            targetQuantity: { type: Type.NUMBER, description: "จำนวนที่ต้องการผลิต" },
            startDate: { type: Type.STRING, description: "วันและเวลาเริ่มต้น (ISO 8601 format)" },
            endDate: { type: Type.STRING, description: "วันและเวลาสิ้นสุด (ISO 8601 format)" },
            priority: { type: Type.STRING, description: "ความสำคัญ: High, Medium, Low" }
          },
          required: ["productCode", "machineId", "targetQuantity", "startDate", "endDate"]
        }
      };

      const logDowntimeFunc: FunctionDeclaration = {
        name: "logDowntime",
        description: "บันทึกข้อมูลเครื่องจักรขัดข้อง หรือเวลาสูญเสีย",
        parameters: {
          type: Type.OBJECT,
          properties: {
            machineId: { type: Type.STRING, description: "รหัสเครื่องจักร" },
            date: { type: Type.STRING, description: "วันที่เกิดเหตุ (ISO 8601)" },
            durationMinutes: { type: Type.NUMBER, description: "ระยะเวลาที่เสีย (นาที)" },
            category: { type: Type.STRING, description: "หมวดหมู่: Breakdown, Setup, Quality, Material, Other" },
            reason: { type: Type.STRING, description: "สาเหตุ" }
          },
          required: ["machineId", "date", "durationMinutes", "category", "reason"]
        }
      };

      // 5. Call API
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: sanitizedContents,
        config: {
          tools: [{ functionDeclarations: [rescheduleMachineJobsFunc, updateJobStatusFunc, createJobFunc, logDowntimeFunc] }]
        }
      });

      let responseText = '';
      try {
        responseText = response.text || '';
      } catch (e) {
        // No text part
      }
      
      // 6. Parse Response
      let actionProposal = null;
      let displayText = responseText;

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'rescheduleMachineJobs') {
            const { machineId, newStartDate } = call.args as any;
            const machineJobs = jobs.filter(j => j.machineId === machineId).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            if (machineJobs.length > 0) {
              const startDiff = new Date(newStartDate).getTime() - new Date(machineJobs[0].startDate).getTime();
              const updatedJobs = machineJobs.map(job => ({
                ...job,
                startDate: new Date(new Date(job.startDate).getTime() + startDiff).toISOString(),
                endDate: new Date(new Date(job.endDate).getTime() + startDiff).toISOString(),
              }));
              if (onBatchUpsert) {
                onBatchUpsert(updatedJobs);
              } else {
                updatedJobs.forEach(j => onUpdateJob(j));
              }
              displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** เลื่อนงานของเครื่อง ${machineId} ไปเริ่มวันที่ ${new Date(newStartDate).toLocaleString('th-TH')} เรียบร้อยแล้วครับ`;
            } else {
              displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** ไม่พบงานของเครื่อง ${machineId} ในระบบครับ`;
            }
          } else if (call.name === 'updateJobStatus') {
            const { jobOrder, status } = call.args as any;
            const targetJob = jobs.find(j => j.jobOrder === jobOrder);
            if (targetJob) {
              onUpdateJob({ ...targetJob, status: status as any });
              displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** อัปเดตสถานะงาน ${jobOrder} เป็น ${status} เรียบร้อยแล้วครับ`;
            } else {
              displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** ไม่พบงาน ${jobOrder} ในระบบครับ`;
            }
          } else if (call.name === 'createJob') {
            const args = call.args as any;
            const newJob = {
              id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              jobOrder: args.jobOrder || `JO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
              productItem: args.productCode,
              machineId: args.machineId,
              targetQuantity: args.targetQuantity,
              actualProduced: 0,
              startDate: args.startDate,
              endDate: args.endDate,
              status: 'Pending',
              priority: args.priority || 'Medium',
              color: 'Clear',
              mold: 'Standard'
            };
            if (onAddJob) {
              onAddJob(newJob as any);
              displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** สร้างรายการผลิต ${newJob.jobOrder} สำหรับสินค้า ${newJob.productItem} บนเครื่อง ${newJob.machineId} เรียบร้อยแล้วครับ`;
            } else {
              displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** ไม่สามารถสร้างรายการผลิตได้ (Missing handler)`;
            }
          } else if (call.name === 'logDowntime') {
             if (onLogDowntime) {
               onLogDowntime(call.args);
               displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** บันทึกข้อมูลเครื่องจักรขัดข้อง (${(call.args as any).machineId} - ${(call.args as any).reason}) เรียบร้อยแล้วครับ`;
             }
          }
        }
      } else {
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            actionProposal = JSON.parse(jsonMatch[1]);
            displayText = responseText.replace(/```json\n[\s\S]*?\n```/, '').trim();
          } catch (e) {
            console.error("Failed to parse AI JSON action", e);
          }
        }
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: displayText,
        actionProposal,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: 'ระบบสมองกลขัดข้องชั่วคราว (Network/API Error) กรุณาตรวจสอบ API Key หรือการเชื่อมต่ออินเทอร์เน็ตครับ',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = (proposal: any, msgIndex: number) => {
    const type = proposal.type ? String(proposal.type).toUpperCase() : '';
    let responseText = '';

    if (type === 'UPDATE') {
      const targetJob = jobs.find(j => 
        j.jobOrder === proposal.data?.jobOrder || 
        j.id === proposal.data?.id || 
        (j.machineId === proposal.data?.machineId && j.productItem === proposal.data?.productItem)
      );
      
      if (targetJob) {
        const updatedJob = { ...targetJob, ...proposal.data };
        onUpdateJob(updatedJob);
        responseText = `✅ บันทึกการแก้ไขข้อมูล ${targetJob.jobOrder || targetJob.productItem} เรียบร้อย`;
      } else {
        responseText = `❌ ไม่พบรายการผลิตที่ตรงกันในระบบครับ (อ้างอิง: ${proposal.data?.jobOrder || proposal.data?.productItem || 'ไม่ระบุ'})`;
      }
    } else if (type === 'CREATE') {
      const newJob: ProductionJob = {
         id: `new-${Date.now()}`,
         machineId: proposal.data?.machineId || 'Unknown',
         productItem: proposal.data?.productItem || 'New Item',
         moldCode: proposal.data?.moldCode || '-',
         jobOrder: proposal.data?.jobOrder || `AUTO-${Date.now()}`,
         capacityPerShift: 0,
         totalProduction: proposal.data?.totalProduction || 0,
         color: '-',
         startDate: proposal.data?.startDate || SIMULATED_NOW.toISOString(),
         endDate: proposal.data?.endDate || SIMULATED_NOW.toISOString(),
         status: 'Running',
         ...proposal.data
      };
      onCreateJob(newJob);
      responseText = `✅ สร้างรายการผลิตใหม่ ${newJob.jobOrder} ลงตารางเรียบร้อย`;
    } else if (type === 'BATCH_UPSERT' && Array.isArray(proposal.data)) {
      let created = 0;
      let updated = 0;
      const batchJobs: ProductionJob[] = [];
      
      proposal.data.forEach((item: any, index: number) => {
        const targetJob = jobs.find(j => 
          (item.jobOrder && j.jobOrder === item.jobOrder) || 
          (item.id && j.id === item.id)
        );

        if (targetJob) {
          const updatedJob = { ...targetJob, ...item };
          batchJobs.push(updatedJob);
          updated++;
        } else {
          const newJob: ProductionJob = {
             id: `new-${Date.now()}-${index}`,
             machineId: item.machineId || 'Unknown',
             productItem: item.productItem || 'New Item',
             moldCode: item.moldCode || '-',
             jobOrder: item.jobOrder || `AUTO-${Date.now()}-${index}`,
             capacityPerShift: item.capacityPerShift || 0,
             totalProduction: item.totalProduction || 0,
             actualProduction: item.actualProduction || 0,
             color: item.color || '-',
             startDate: item.startDate || SIMULATED_NOW.toISOString(),
             endDate: item.endDate || SIMULATED_NOW.toISOString(),
             status: item.status || 'Running',
             ...item
          };
          batchJobs.push(newJob);
          created++;
        }
      });
      
      if (onBatchUpsert) {
        onBatchUpsert(batchJobs);
      } else {
        // Fallback if onBatchUpsert is not provided
        batchJobs.forEach(job => {
          if (jobs.find(j => j.id === job.id)) onUpdateJob(job);
          else onCreateJob(job);
        });
      }
      
      responseText = `✅ นำเข้าข้อมูลสำเร็จ: สร้างใหม่ ${created} รายการ, อัปเดต ${updated} รายการ`;
    } else if (type === 'GENERATE_FORM') {
      if (onGenerateForm && proposal.html) {
        onGenerateForm(proposal.html, proposal.title || 'เอกสารที่สร้างโดย AI');
        responseText = `✅ สร้างเอกสาร "${proposal.title || 'เอกสาร'}" เรียบร้อยแล้ว ระบบกำลังเปิดหน้าต่างเอกสาร...`;
      } else {
        responseText = `❌ ไม่สามารถสร้างเอกสารได้ (ระบบไม่รองรับ หรือ ข้อมูล HTML ไม่สมบูรณ์)`;
      }
    } else if (type === 'LOG_DOWNTIME') {
      if (onLogDowntime && proposal.data) {
        onLogDowntime(proposal.data);
        const dataPreview = Array.isArray(proposal.data) ? proposal.data[0] : proposal.data;
        responseText = `✅ บันทึกข้อมูลเครื่องจักรขัดข้อง (${dataPreview?.machineId || 'หลายรายการ'} - ${dataPreview?.reason || ''}) เรียบร้อยแล้ว`;
      } else {
        responseText = `❌ ไม่สามารถบันทึกข้อมูลเครื่องจักรขัดข้องได้`;
      }
    } else {
      responseText = `❌ รูปแบบคำสั่งไม่ถูกต้อง (Unknown Action Type: ${proposal.type || 'None'})`;
    }

    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages[msgIndex]) {
        newMessages[msgIndex] = { ...newMessages[msgIndex], actionProposal: undefined };
      }
      newMessages.push({ role: 'model', text: responseText, timestamp: new Date().toISOString() });
      return newMessages;
    });
  };

  if (!isOpen) return null;

  if (showKeySetup) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 font-kanit">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg">ProPlanner Brain</h2>
              <p className="text-xs text-indigo-200">ตั้งค่าการเชื่อมต่อ AI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Setup Body */}
        <div className="flex-1 p-6 flex flex-col justify-center items-center bg-slate-50 text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Key size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">ตั้งค่า Gemini API Key</h3>
          <p className="text-sm text-slate-600 mb-6 max-w-xs leading-relaxed">
            เพื่อใช้งานผู้ช่วยอัจฉริยะ คุณจำเป็นต้องใส่ API Key ของคุณเอง <br/>
            <span className="text-xs text-slate-400">(คีย์จะถูกบันทึกไว้ในเบราว์เซอร์ของคุณเท่านั้น ไม่มีการส่งไปเก็บที่เซิร์ฟเวอร์อื่น)</span>
          </p>
          
          <div className="w-full max-w-sm space-y-4">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="ใส่ API Key ที่ขึ้นต้นด้วย AIzaSy..."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-xl transition-colors shadow-md"
            >
              บันทึก API Key และเริ่มใช้งาน
            </button>
            
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-sm text-indigo-600 hover:text-indigo-800 underline mt-4"
            >
              รับ Gemini API Key ฟรีที่นี่
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 font-kanit">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg">ProPlanner Brain</h2>
            <p className="text-xs text-indigo-200">ระบบอัจฉริยะ & ฐานข้อมูล Master</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRemoveApiKey} className="text-xs text-slate-400 hover:text-white underline" title="เปลี่ยน API Key">
            เปลี่ยน Key
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              
              {/* Image Preview in Chat History */}
              {msg.image && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                  <img src={msg.image} alt="User upload" className="w-full h-auto object-cover max-h-48" />
                </div>
              )}

              {/* Special rendering if user uploaded Excel but didn't type text (or mixed) */}
              {msg.text.includes("[USER UPLOADED EXCEL FILE CONTENT") && msg.role === 'user' ? (
                  <div className="mb-2 flex items-center gap-2 bg-indigo-700/50 p-2 rounded-lg">
                      <FileSpreadsheet size={20} className="text-white"/>
                      <span className="text-xs font-mono">แนบไฟล์ Excel แล้ว</span>
                  </div>
              ) : null}
              
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text.replace(/\[USER UPLOADED EXCEL FILE CONTENT[\s\S]*$/, '(แนบไฟล์ Excel)')}</div>
              
              {/* Action Proposal Card */}
              {msg.actionProposal && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="text-indigo-600 shrink-0" size={16} />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Action Required: {msg.actionProposal.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 mb-3 font-mono overflow-x-auto max-h-32">
                    {JSON.stringify(msg.actionProposal.data, null, 2)}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => executeAction(msg.actionProposal, idx)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle size={14} /> ยืนยัน (Approve)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                <span className="text-xs text-slate-500">กำลังประมวลผลข้อมูล...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        
        {/* File Preview before sending */}
        {selectedFile && (
          <div className="mb-3 flex items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-200 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-12 rounded bg-white border border-slate-300 overflow-hidden flex-shrink-0 flex items-center justify-center">
               {selectedFile.type === 'image' ? (
                   <img src={selectedFile.preview} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                   <FileSpreadsheet size={24} className="text-emerald-600" />
               )}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-medium text-slate-700 truncate">{selectedFile.file.name}</p>
               <p className="text-[10px] text-slate-500">{(selectedFile.file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clearFile} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {/* File Input Hidden */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*,.xlsx,.xls,.csv"
            className="hidden" 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-xl transition-colors border border-slate-200"
            title="แนบรูปภาพ หรือ ไฟล์ Excel"
            disabled={isLoading}
          >
            {selectedFile ? (
                selectedFile.type === 'image' ? <ImageIcon size={20} className="text-indigo-600"/> : <FileSpreadsheet size={20} className="text-emerald-600"/>
            ) : <Paperclip size={20} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            onPaste={handlePaste}
            placeholder={selectedFile ? "พิมพ์คำสั่ง..." : "ถาม AI เรื่องผลิต, สต็อก, ถ่ายรูปของเสีย/Error..."}
            className="flex-1 px-4 py-3 bg-slate-100 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 placeholder-slate-400"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedFile)}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-colors shadow-lg shadow-indigo-200"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
           <MessageSquareText size={10} /> รองรับการสรุปแชทไลน์, วิเคราะห์แผน, วิเคราะห์รูปของเสีย/Error, และพยากรณ์แนวโน้ม (Predictive)
        </p>
      </div>
    </div>
  );
};
