import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, ClipboardPaste, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ProductionJob } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (jobs: Partial<ProductionJob>[]) => void;
}

export const GoogleSheetsImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'api'>('paste');
  const [pasteData, setPasteData] = useState('');
  const [parsedJobs, setParsedJobs] = useState<Partial<ProductionJob>[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasteProcess = () => {
    try {
      // Simple TSV parser for pasted data from Google Sheets
      const rows = pasteData.split('\n').map(row => row.split('\t'));
      if (rows.length < 2) throw new Error('ข้อมูลไม่เพียงพอ หรือไม่มีหัวตาราง');

      // Assuming columns: JobOrder, Product, Machine, Target, StartDate, EndDate
      const jobs: Partial<ProductionJob>[] = rows.slice(1).filter(r => r.length >= 2 && r[0].trim() !== '').map((row, i) => ({
        id: `IMP-${Date.now()}-${i}`,
        jobOrder: row[0] || `JOB-IMP-${i}`,
        productItem: row[1] || 'Unknown Product',
        machineId: row[2] || 'IP1',
        totalProduction: parseInt(row[3]) || 1000,
        startDate: row[4] ? new Date(row[4]).toISOString() : new Date().toISOString(),
        endDate: row[5] ? new Date(row[5]).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        status: 'Planned',
        moldCode: 'Standard',
      }));

      setParsedJobs(jobs);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอ่านข้อมูล');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const jobs: Partial<ProductionJob>[] = data.map((row, i) => ({
          id: `EXC-${Date.now()}-${i}`,
          jobOrder: row['JobOrder'] || row['เลขที่ใบสั่งผลิต'] || `JOB-EXC-${i}`,
          productItem: row['Product'] || row['สินค้า'] || 'Unknown Product',
          machineId: row['Machine'] || row['เครื่องจักร'] || 'IP1',
          totalProduction: parseInt(row['Target'] || row['เป้าหมาย']) || 1000,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
          status: 'Planned',
          moldCode: row['Mold'] || row['แม่พิมพ์'] || 'Standard',
        }));

        setParsedJobs(jobs);
        setError(null);
      } catch (err: any) {
        setError('ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    onImport(parsedJobs);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-kanit">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">นำเข้าข้อมูลจาก Google Sheets / Excel</h2>
              <p className="text-sm text-slate-500">สร้างใบสั่งผลิตหลายรายการพร้อมกัน</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-4 pt-2 gap-4 bg-slate-50">
          <button 
            onClick={() => setActiveTab('paste')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'paste' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2"><ClipboardPaste size={16}/> วางข้อมูล (Copy/Paste)</div>
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2"><Upload size={16}/> อัปโหลดไฟล์ Excel</div>
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'api' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2"><FileSpreadsheet size={16}/> เชื่อมต่อ API อัตโนมัติ</div>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>เปิด Google Sheets ของคุณ ลากคลุมข้อมูลที่ต้องการ (รวมหัวตาราง) กด Ctrl+C แล้วนำมาวาง (Ctrl+V) ในช่องด้านล่างนี้</p>
              </div>
              <textarea 
                className="w-full h-40 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono whitespace-pre"
                placeholder="JobOrder&#9;Product&#9;Machine&#9;Target&#10;JOB-001&#9;กระปุก 500g&#9;IP1&#9;5000"
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
              />
              <button 
                onClick={handlePasteProcess}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium"
              >
                ตรวจสอบข้อมูล
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
               <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                  <Upload size={40} className="text-slate-400 mb-4" />
                  <p className="text-slate-700 font-medium mb-1">ลากไฟล์ Excel (.xlsx, .csv) มาวางที่นี่</p>
                  <p className="text-slate-500 text-sm mb-4">หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ</p>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileUpload}
                    className="hidden" 
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer text-sm font-medium shadow-sm">
                    เลือกไฟล์
                  </label>
               </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet size={32} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">เชื่อมต่อ Google Sheets API</h3>
                <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">
                  ดึงข้อมูลใบสั่งผลิตจาก "แบบฟอร์มใหม่ กระปุก-โหล ผูกสูตร" ของคุณโดยอัตโนมัติแบบ Real-time
                </p>
                <div className="space-y-3 max-w-sm mx-auto text-left bg-white p-4 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Google Sheet ID</label>
                    <input type="text" placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm" disabled />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Sheet Name</label>
                    <input type="text" placeholder="e.g. Sheet1" className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm" disabled />
                  </div>
                  <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium mt-2 opacity-50 cursor-not-allowed">
                    ตั้งค่าการเชื่อมต่อ (Coming Soon)
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-4">* ฟีเจอร์นี้ต้องการการตั้งค่า Google Cloud OAuth</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {parsedJobs.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  พบข้อมูล {parsedJobs.length} รายการ
                </h3>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Job Order</th>
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 font-medium">Machine</th>
                      <th className="px-4 py-2 font-medium">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedJobs.slice(0, 5).map((job, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="px-4 py-2 font-mono text-xs">{job.jobOrder}</td>
                        <td className="px-4 py-2">{job.productItem}</td>
                        <td className="px-4 py-2">{job.machineId}</td>
                        <td className="px-4 py-2">{job.totalProduction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedJobs.length > 5 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-white border-t border-slate-100">
                    ... และอีก {parsedJobs.length - 5} รายการ
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
            ยกเลิก
          </button>
          <button 
            onClick={confirmImport}
            disabled={parsedJobs.length === 0}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2
              ${parsedJobs.length > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            <Upload size={16} />
            นำเข้า {parsedJobs.length > 0 ? parsedJobs.length : ''} รายการ
          </button>
        </div>
      </div>
    </div>
  );
};
