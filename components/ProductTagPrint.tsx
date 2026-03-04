import React from 'react';
import { ProductionJob } from '../types';
import { calculateBOM } from '../utils/bomCalculator';

interface ProductTagPrintProps {
  job: ProductionJob;
  onBack: () => void;
}

export const ProductTagPrint: React.FC<ProductTagPrintProps> = ({ job, onBack }) => {
  const bom = calculateBOM(job.productItem, job.totalProduction, job.color);
  
  const handlePrint = () => {
    window.print();
  };

  // Generate an array of tags based on totalTags
  const tags = Array.from({ length: bom.totalTags }, (_, i) => i + 1);

  return (
    <div className="bg-gray-100 min-h-screen p-4 print:p-0 print:bg-white">
      {/* Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center print:hidden">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 font-medium"
        >
          &larr; กลับ
        </button>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            จำนวนใบบ่งชี้ทั้งหมด: <span className="font-bold text-black">{bom.totalTags}</span> ใบ
          </div>
          <button 
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            พิมพ์ใบบ่งชี้
          </button>
        </div>
      </div>

      {/* Print Container */}
      <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none print:p-0 print:max-w-none">
        
        {/* Grid of Tags (e.g., 2 columns for print layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:gap-4">
          {tags.map((tagNum) => (
            <div key={tagNum} className="border-2 border-black p-4 rounded-lg break-inside-avoid shadow-sm print:shadow-none">
              
              {/* Tag Header */}
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                <div className="text-xl font-bold tracking-wider">KPAC</div>
                <div className="text-lg font-bold">ใบบ่งชี้ผลิตภัณฑ์</div>
              </div>

              {/* Tag Content */}
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                  <div className="font-bold text-gray-600">รหัสสินค้า:</div>
                  <div className="col-span-2 font-bold text-lg text-blue-800">{job.productItem}</div>
                </div>
                
                <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                  <div className="font-bold text-gray-600">เลขที่ใบสั่งผลิต:</div>
                  <div className="col-span-2 font-medium">{job.jobOrder}</div>
                </div>

                <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                  <div className="font-bold text-gray-600">เครื่องจักร:</div>
                  <div className="col-span-2 font-medium">{job.machineId}</div>
                </div>

                <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                  <div className="font-bold text-gray-600">วันที่ผลิต:</div>
                  <div className="col-span-2 font-medium">{job.startDate || new Date().toLocaleDateString('th-TH')}</div>
                </div>

                <div className="grid grid-cols-3 border-b border-gray-200 pb-2 bg-orange-50 p-2 rounded">
                  <div className="font-bold text-orange-800">จำนวนบรรจุ:</div>
                  <div className="col-span-2 font-bold text-xl text-orange-600">
                    {bom.qtyPerTag.toLocaleString()} <span className="text-sm text-orange-800 font-normal">ชิ้น / {bom.tagType === 'box' ? 'กล่อง' : 'ถุง'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 pt-2">
                  <div className="font-bold text-gray-600">ลำดับที่:</div>
                  <div className="col-span-2 font-bold text-xl">
                    {tagNum} <span className="text-gray-400 font-normal text-sm">/ {bom.totalTags}</span>
                  </div>
                </div>
              </div>

              {/* Tag Footer */}
              <div className="mt-6 pt-4 border-t-2 border-black flex justify-between text-xs text-gray-500">
                <div>ผู้ตรวจสอบ: _________________</div>
                <div>วันที่: _________________</div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
