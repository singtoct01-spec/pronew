import React, { useState, useRef } from 'react';
import { Upload, Search, FileSpreadsheet, Package, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface InventoryItemFG {
  id: string;
  name: string;
  pcs: number;
  newFactoryTotal: number;
  oldFactoryTotal: number;
  totalAll: number;
  min: number;
  max: number;
  status: 'MIN' | 'MAX' | 'NORMAL' | '';
}

export const InventoryDashboard: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<InventoryItemFG[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON, assuming header is on row 2 or 3 (index 1 or 2)
      // Since the user's sheet has a complex header, we'll use a raw array format to extract data
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const parsedData: InventoryItemFG[] = [];
      
      // Skip the first few rows of headers (usually 2-3 rows in complex sheets)
      // We'll look for rows where the first column is a number (ลำดับ)
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 5) continue;
        
        // Check if the first column is a number (item index)
        const indexCol = row[0];
        if (typeof indexCol === 'number' || (typeof indexCol === 'string' && !isNaN(parseInt(indexCol, 10)))) {
          // Map columns based on the user's image structure
          // 0: ลำดับ
          // 1: ชื่อรายการสินค้า
          // 2: PCS
          // 3-4: รับ/เบิก รง.ใหม่
          // 5-7: ยอดรวม รง.ใหม่ (ลัง/เศษ/ชิ้น) -> index 7 is คิดเป็นชิ้น
          // 8-10: ยอดรวม รง.เก่า (ลัง/เศษ/ชิ้น) -> index 10 is คิดเป็นชิ้น
          // 11-13: ยอดรวมทั้งสองคลัง (ลัง/เศษ/ชิ้น) -> index 13 is คิดเป็นชิ้น
          // 14: ยอดยกมา
          // 15: จุดต่ำสุด (Min)
          // 16: จุดสูงสุด (Max)
          // 17: สถานะ
          
          const name = row[1] || '';
          if (!name) continue;
          
          parsedData.push({
            id: `INV-${i}`,
            name: String(name),
            pcs: Number(row[2]) || 0,
            newFactoryTotal: Number(row[7]) || 0,
            oldFactoryTotal: Number(row[10]) || 0,
            totalAll: Number(row[13]) || 0,
            min: Number(row[15]) || 0,
            max: Number(row[16]) || 0,
            status: (row[17] as string)?.toUpperCase() as any || '',
          });
        }
      }
      
      setInventoryData(parsedData);
      
    } catch (error) {
      console.error("Error parsing Excel:", error);
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter data
  const filteredData = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalItems = inventoryData.length;
  const minItems = inventoryData.filter(item => item.status === 'MIN').length;
  const maxItems = inventoryData.filter(item => item.status === 'MAX').length;
  const normalItems = inventoryData.filter(item => item.status === 'NORMAL').length;
  const totalPieces = inventoryData.reduce((sum, item) => sum + item.totalAll, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard สินค้าคงคลัง (FG)</h1>
          <p className="text-slate-500">ภาพรวมสต๊อกสินค้าบรรจุภัณฑ์และจุดสั่งซื้อ</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <FileSpreadsheet size={20} />}
            {isUploading ? 'กำลังประมวลผล...' : 'อัปโหลดไฟล์ Excel'}
          </button>
        </div>
      </div>

      {inventoryData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <FileSpreadsheet size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">ยังไม่มีข้อมูลสินค้าคงคลัง</h2>
          <p className="text-slate-500 max-w-md mb-6">
            กรุณาอัปโหลดไฟล์ Excel รายงานสต๊อก FG เพื่อดู Dashboard และการวิเคราะห์ข้อมูล
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Upload size={20} />
            อัปโหลดไฟล์รายงาน
          </button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">รายการสินค้าทั้งหมด</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalItems}</h3>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Package size={20} />
                </div>
              </div>
              <p className="text-xs text-slate-500">รวม {totalPieces.toLocaleString()} ชิ้น</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">สินค้าใกล้หมด (MIN)</p>
                  <h3 className="text-2xl font-bold text-red-600 mt-1">{minItems}</h3>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <AlertTriangle size={20} />
                </div>
              </div>
              <p className="text-xs text-slate-500">ต้องสั่งซื้อเพิ่มด่วน</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">สินค้าล้นคลัง (MAX)</p>
                  <h3 className="text-2xl font-bold text-amber-600 mt-1">{maxItems}</h3>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <ArrowUpRight size={20} />
                </div>
              </div>
              <p className="text-xs text-slate-500">เกินจุดสูงสุดที่กำหนดไว้</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">สถานะปกติ (NORMAL)</p>
                  <h3 className="text-2xl font-bold text-emerald-600 mt-1">{normalItems}</h3>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle size={20} />
                </div>
              </div>
              <p className="text-xs text-slate-500">อยู่ในเกณฑ์ที่เหมาะสม</p>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อรายการสินค้า..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-slate-500 font-medium whitespace-nowrap">สถานะ:</span>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ALL">ทั้งหมด</option>
                  <option value="MIN">ใกล้หมด (MIN)</option>
                  <option value="MAX">ล้นคลัง (MAX)</option>
                  <option value="NORMAL">ปกติ (NORMAL)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                    <th className="px-4 py-3 font-medium">ชื่อรายการสินค้า</th>
                    <th className="px-4 py-3 font-medium text-right">PCS</th>
                    <th className="px-4 py-3 font-medium text-right">รง.ใหม่ (ชิ้น)</th>
                    <th className="px-4 py-3 font-medium text-right">รง.เก่า (ชิ้น)</th>
                    <th className="px-4 py-3 font-medium text-right bg-slate-100">รวมทั้งหมด (ชิ้น)</th>
                    <th className="px-4 py-3 font-medium text-right">Min</th>
                    <th className="px-4 py-3 font-medium text-right">Max</th>
                    <th className="px-4 py-3 font-medium text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        ไม่พบข้อมูลที่ค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.pcs.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.newFactoryTotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.oldFactoryTotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 bg-slate-50">{item.totalAll.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{item.min ? item.min.toLocaleString() : '-'}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{item.max ? item.max.toLocaleString() : '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {item.status === 'MIN' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              MIN
                            </span>
                          )}
                          {item.status === 'MAX' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              MAX
                            </span>
                          )}
                          {item.status === 'NORMAL' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              NORMAL
                            </span>
                          )}
                          {!['MIN', 'MAX', 'NORMAL'].includes(item.status) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
