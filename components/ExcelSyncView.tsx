import { uiAlert, uiConfirm } from '../utils/dialog';
import React, { useState, useEffect } from 'react';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Link as LinkIcon, RefreshCcw, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';
import { ProductionJob, InventoryItem, ProductBOM, ProductSpec, MachineMoldCapability } from '../types';

interface ExcelSyncViewProps {
  jobs: ProductionJob[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  productSpecs: ProductSpec[];
  machineCapabilities: MachineMoldCapability[];
}

export const ExcelSyncView: React.FC<ExcelSyncViewProps> = ({ jobs, inventory, boms, productSpecs, machineCapabilities }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // Google Sheets Settings
  const [isSyncing, setIsSyncing] = useState(false);
  const [gsUrls, setGsUrls] = useState({ jobs: '', fg: '', rm: '' });

  useEffect(() => {
    // Load config from firebase
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'googleSheets');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGsUrls(docSnap.data() as any);
        }
      } catch (e) {
        console.error("Error loading settings", e);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'googleSheets'), gsUrls);
      uiAlert("บันทึกการตั้งค่าลิงก์ Google Sheets เรียบร้อย");
    } catch (e) {
      uiAlert("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า");
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // 1. Jobs
      const wsJobs = XLSX.utils.json_to_sheet(jobs);
      XLSX.utils.book_append_sheet(wb, wsJobs, "Jobs");

      // 2. Inventory
      const wsInventory = XLSX.utils.json_to_sheet(inventory);
      XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");

      // 3. BOMs (flatten materials for simple export, or just stringify)
      const bomsExport = boms.map(b => ({
        ...b,
        materials: JSON.stringify(b.materials)
      }));
      const wsBoms = XLSX.utils.json_to_sheet(bomsExport);
      XLSX.utils.book_append_sheet(wb, wsBoms, "BOMs");

      // 4. Product Specs
      const specsExport = productSpecs.map(p => ({
        ...p,
        packagingDetail: JSON.stringify(p.packagingDetail)
      }));
      const wsSpecs = XLSX.utils.json_to_sheet(specsExport);
      XLSX.utils.book_append_sheet(wb, wsSpecs, "ProductSpecs");

      // 5. Machine Capabilities
      const wsMachines = XLSX.utils.json_to_sheet(machineCapabilities);
      XLSX.utils.book_append_sheet(wb, wsMachines, "MachineCapabilities");

      XLSX.writeFile(wb, `ProPlanner_DataExport_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      uiAlert("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    } finally {
      setIsExporting(false);
    }
  };

  const processImportedData = async (wb: XLSX.WorkBook, source: string = 'excel') => {
    const batch = writeBatch(db);
    let updateCount = 0;

    // We can accept sheet names like "Jobs", "Inventory" or just one sheet from a published CSV 
    // We'll figure out what data it is based on column names generally, or if we pass specific sources.
    
    // Import Jobs
    if (wb.SheetNames.includes("Jobs") || source === 'jobs_csv') {
      const wsJobs = wb.Sheets[wb.SheetNames.includes("Jobs") ? "Jobs" : wb.SheetNames[0]];
      const importedJobs = XLSX.utils.sheet_to_json<any>(wsJobs);
      importedJobs.forEach(job => {
        if (job.id) {
          const docRef = doc(db, 'jobs', String(job.id));
          batch.set(docRef, job, { merge: true });
          updateCount++;
        }
      });
    }

    // Import Inventory FG/RM
    if (wb.SheetNames.includes("Inventory") || source === 'fg_csv' || source === 'rm_csv') {
      const wsInventory = wb.Sheets[wb.SheetNames.includes("Inventory") ? "Inventory" : wb.SheetNames[0]];
      const importedInventory = XLSX.utils.sheet_to_json<any>(wsInventory);
      importedInventory.forEach(item => {
        if (item.id) {
          const docRef = doc(db, 'inventory', String(item.id));
          if (source === 'fg_csv') item.category = 'FG';
          if (source === 'rm_csv' && !item.category) item.category = 'RM'; // Defaults if not fully set
          batch.set(docRef, item, { merge: true });
          updateCount++;
        }
      });
    }

    // Import BOMs
    if (wb.SheetNames.includes("BOMs")) {
      const wsBoms = wb.Sheets["BOMs"];
      const importedBoms = XLSX.utils.sheet_to_json<any>(wsBoms);
      importedBoms.forEach(bom => {
        if (bom.id) {
          try {
            if (typeof bom.materials === 'string') {
              bom.materials = JSON.parse(bom.materials);
            }
          } catch (e) {
            console.warn("Could not parse materials for BOM", bom.id);
          }
          const docRef = doc(db, 'boms', String(bom.id));
          batch.set(docRef, bom, { merge: true });
          updateCount++;
        }
      });
    }

    // Import Product Specs
    if (wb.SheetNames.includes("ProductSpecs")) {
      const wsSpecs = wb.Sheets["ProductSpecs"];
      const importedSpecs = XLSX.utils.sheet_to_json<any>(wsSpecs);
      importedSpecs.forEach(spec => {
        if (spec.code) {
          try {
            if (typeof spec.packagingDetail === 'string') {
              spec.packagingDetail = JSON.parse(spec.packagingDetail);
            }
          } catch (e) {
            console.warn("Could not parse packagingDetail for Spec", spec.code);
          }
          const docRef = doc(db, 'productSpecs', String(spec.code));
          batch.set(docRef, spec, { merge: true });
          updateCount++;
        }
      });
    }

    // Import Machine Capabilities
    if (wb.SheetNames.includes("MachineCapabilities")) {
      const wsMachines = wb.Sheets["MachineCapabilities"];
      const importedMachines = XLSX.utils.sheet_to_json<any>(wsMachines);
      importedMachines.forEach(machine => {
        if (machine.machineGroup && machine.moldName) {
          const docId = `${machine.machineGroup}_${machine.moldName}`.replace(/\//g, '-');
          const docRef = doc(db, 'machineCapabilities', docId);
          batch.set(docRef, machine, { merge: true });
          updateCount++;
        }
      });
    }

    if (updateCount > 0) {
      setImportStatus({ type: 'info', message: `กำลังบันทึกข้อมูล ${updateCount} รายการลงฐานข้อมูล...` });
      await batch.commit();
      return updateCount;
    }
    return 0;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: 'info', message: 'กำลังอ่านไฟล์ Excel...' });

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const updateCount = await processImportedData(wb);
      
      if (updateCount > 0) {
        setImportStatus({ type: 'success', message: `นำเข้าข้อมูลสำเร็จ ${updateCount} รายการ` });
      } else {
        setImportStatus({ type: 'warning' as any, message: 'ไม่พบข้อมูลที่สามารถนำเข้าได้ (ตรวจสอบว่ามีคอลัมน์ id หรือ code)' });
      }

    } catch (error) {
      console.error("Import error:", error);
      setImportStatus({ type: 'error', message: `เกิดข้อผิดพลาด: ${(error as Error).message}` });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (e.target) e.target.value = '';
    }
  };

  const parseGoogleSheetUrlToExportUrl = (url: string) => {
    if (!url) return '';
    // if already pub url
    if (url.includes('/pub?')) return url;
    // from standard edit url: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      const sid = match[1];
      const gidMatch = url.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      return `https://docs.google.com/spreadsheets/d/${sid}/export?format=csv&gid=${gid}`;
    }
    return url;
  };

  const fetchGoogleSheetAndImport = async (url: string, type: 'jobs_csv' | 'fg_csv' | 'rm_csv') => {
    if (!url) return 0;
    
    // We proxy it through a reliable public CORS proxy for CSVs if needed, or stick to raw 
    // First try direct fetch
    const fetchUrl = parseGoogleSheetUrlToExportUrl(url);
    
    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const csvStr = await response.text();
      const wb = XLSX.read(csvStr, { type: 'string' });
      return await processImportedData(wb, type);
    } catch (e: any) {
      console.error(`Error fetching ${type}:`, e);
      // fallback via proxy
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`;
      const response2 = await fetch(proxyUrl);
      const csvStr = await response2.text();
      const wb = XLSX.read(csvStr, { type: 'string' });
      return await processImportedData(wb, type);
    }
  };

  const handleSyncGoogleSheets = async () => {
    if (!gsUrls.jobs && !gsUrls.fg && !gsUrls.rm) {
      uiAlert("กรุณาระบุลิงก์ Google Sheets อย่างน้อย 1 ลิงก์");
      return;
    }
    
    setIsSyncing(true);
    setImportStatus({ type: 'info', message: 'กำลังดึงข้อมูลจาก Google Sheets...' });
    let totalUpdated = 0;
    try {
      if (gsUrls.jobs) totalUpdated += await fetchGoogleSheetAndImport(gsUrls.jobs, 'jobs_csv');
      if (gsUrls.fg) totalUpdated += await fetchGoogleSheetAndImport(gsUrls.fg, 'fg_csv');
      if (gsUrls.rm) totalUpdated += await fetchGoogleSheetAndImport(gsUrls.rm, 'rm_csv');
      
      setImportStatus({ type: 'success', message: `ดึงข้อมูลสำเร็จ! อัปเดต ${totalUpdated} ข้อมูล` });
    } catch (e: any) {
      console.error("GS Sync Error", e);
      setImportStatus({ type: 'error', message: "เกิดข้อผิดพลาดในการดึงข้อมูล โปรดตรวจสอบว่าเปิดแชร์แบบสาธารณะแล้ว (Anyone with the link)" });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 font-kanit">
      {/* ⚠️ Warning Box for Firebase Quota */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start">
        <div className="p-2 bg-amber-100/50 rounded-full text-amber-600 mt-1 shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="font-bold text-amber-800 text-lg mb-1">ปัญหา Quota Exceeded (โควต้าเต็ม)</h3>
          <p className="text-amber-700 text-sm leading-relaxed whitespace-pre-wrap">
            จากที่แจ้งว่า <b>FirebaseError: [code=resource-exhausted]: Quota exceeded.</b>
            {"\n"}หมายความว่าปริมาณการอ่าน/เขียนของฐานข้อมูลฟรีวันนี้เต็มแล้ว แนะนำให้รันส่วนนี้เพื่อซิงค์ข้อมูลทีเดียว ไม่ดึงซ้ำบ่อยๆ โควต้าจะเริ่มนับใหม่ทุกเที่ยงคืน โชคดีที่เรามีฟังก์ชันออฟไลน์ที่ช่วยให้ใช้งานต่อได้แบบมีข้อจำกัด หากเกิดบ่อยสามารถพิจารณาอัปเกรดแผน Firebase (Blaze) ได้ครับ
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <LinkIcon size={24} className="text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-800">เชื่อมต่อและดึงข้อมูลจาก Google Sheets อัตโนมัติ</h2>
            <p className="text-sm text-slate-500">วางลิงก์ Google Sheets ของคุณ เพื่อดึงข้อมูลเข้าสู่ระบบแบบไม่ต้องอัพไฟล์</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
            <b>ข้อควรระวัง: </b> 
            Google Sheets ต้องตั้งค่าแชร์เป็น <b>"Anyone with the link"</b> (ทุกคนที่มีลิงก์) 
            มีคอลัมน์สำคัญคือ <b>id</b> เป็นคีย์หลักข้อมูล
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-purple-600" /> ลิงก์แผนผลิต (Jobs)
              </label>
              <input 
                type="text" 
                value={gsUrls.jobs} 
                onChange={(e) => setGsUrls({...gsUrls, jobs: e.target.value})}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring focus:ring-brand-200 outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-emerald-600" /> ลิงก์สินค้า FG
              </label>
              <input 
                type="text" 
                value={gsUrls.fg} 
                onChange={(e) => setGsUrls({...gsUrls, fg: e.target.value})}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring focus:ring-brand-200 outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-amber-600" /> ลิงก์วัตถุดิบ RM
              </label>
              <input 
                type="text" 
                value={gsUrls.rm} 
                onChange={(e) => setGsUrls({...gsUrls, rm: e.target.value})}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring focus:ring-brand-200 outline-none"
              />
            </div>
          </div>
          
          <div className="flex gap-4 pt-4 border-t border-slate-100">
             <button
                onClick={handleSaveSettings}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
               <Save size={18} /> บันทึกลิงก์
             </button>
             <button
                onClick={handleSyncGoogleSheets}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
              {isSyncing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <RefreshCcw size={18} />}
               ดึงข้อมูลล่าสุด (Sync Now)
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <FileSpreadsheet size={24} className="text-brand-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-800">นำเข้า/ส่งออกข้อมูล (Excel ไฟล์ดิบ)</h2>
            <p className="text-sm text-slate-500">รวบรวมข้อมูลทั้งหมดในระบบให้อยู่ในไฟล์ Excel เดียว</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Export Section */}
          <div className="border border-slate-200 rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:border-brand-300 transition-colors bg-slate-50/50">
            <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-2">
              <Download size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">ส่งออกข้อมูล (Export)</h3>
            <p className="text-sm text-slate-600 mb-4">
              ดาวน์โหลดข้อมูลทั้งหมด (แผนการผลิต, คลังสินค้า, สูตรการผลิต, ฯลฯ) เป็นไฟล์ Excel (.xlsx) โดยแยกเป็น Sheet
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="mt-auto bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังส่งออก...
                </>
              ) : (
                <>
                  <Download size={20} />
                  ดาวน์โหลดไฟล์ Excel
                </>
              )}
            </button>
          </div>

          {/* Import Section */}
          <div className="border border-slate-200 rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:border-emerald-300 transition-colors bg-slate-50/50">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">นำเข้าข้อมูล (Import)</h3>
            <p className="text-sm text-slate-600 mb-4">
              อัปโหลดไฟล์ Excel ที่ได้จากการส่งออก เพื่ออัปเดตข้อมูลกลับเข้าสู่ระบบ (ระบบจะอัปเดตตาม ID ของแต่ละรายการ)
            </p>
            
            <div className="mt-auto w-full">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className={`bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer w-full justify-center ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    กำลังนำเข้า...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    อัปโหลดไฟล์ Excel
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {importStatus && (
          <div className={`m-6 p-4 rounded-lg flex items-start gap-3 ${
            importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            importStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {importStatus.type === 'success' ? <CheckCircle2 className="mt-0.5 flex-shrink-0" size={20} /> : <AlertCircle className="mt-0.5 flex-shrink-0" size={20} />}
            <div>
              <h4 className="font-bold">{importStatus.type === 'success' ? 'สำเร็จ' : importStatus.type === 'error' ? 'ข้อผิดพลาด' : 'สถานะ'}</h4>
              <p className="text-sm mt-1">{importStatus.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

