import React, { useState } from 'react';
import { 
  BarChart4, Calendar, TrendingUp, AlertTriangle, Lightbulb, 
  RefreshCw, FileText, Download, CheckCircle2, Copy 
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ProductionJob, DailyReportLog, ShiftProductionLog, DowntimeLog, AppUser } from '../types';
import { uiAlert } from '../utils/dialog';

interface AiAnalyticsReportProps {
  jobs: ProductionJob[];
  dailyReports: DailyReportLog[];
  shiftLogs: ShiftProductionLog[];
  downtimeLogs: DowntimeLog[];
}

export const AiAnalyticsReport: React.FC<AiAnalyticsReportProps> = ({ 
  jobs, dailyReports, shiftLogs, downtimeLogs 
}) => {
  const [reportType, setReportType] = useState<'executive' | 'trend' | 'performance' | 'improvement'>('executive');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error('ไม่พบ API Key ในระบบ กรุณาตั้งค่า Environment Variable GEMINI_API_KEY');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Filter data by date
      let start = startDate;
      let end = endDate;
      
      if (dateRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        start = d.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        start = d.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
      }

      const filterByDate = (item: any) => {
        const d = item.date || item.createdAt?.split('T')[0];
        return d >= start && d <= end;
      };

      const filteredDailyReports = dailyReports.filter(filterByDate);

      // Aggregate context
      let prompt = `คุณคือผู้จัดการโรงงานระดับสูงและที่ปรึกษาด้านการผลิต (Manufacturing Consultant)\n`;
      prompt += `วิเคราะห์ข้อมูลจากรายงานประจำวันที่ถูกบันทึกไว้ตั้งแต่วันที่ ${start} ถึง ${end}\n\n`;
      
      prompt += `ข้อมูลเนื้อหารายงานประจำวัน (Daily Reports Context):\n`;
      prompt += `มีรายงานจำนวน ${filteredDailyReports.length} รายการ\n\n`;
      
      if (filteredDailyReports.length > 0) {
        const summarizedReports = filteredDailyReports.slice(0, 30).map(l => `วันที่ ${l.date}:\nเนื้อหาก่อนใช้ AI สรุป:\n${l.rawText}\nเนื้อหาที่ AI สรุปไว้แล้ว:\n${l.generatedReport}\n---`);
        prompt += summarizedReports.join('\n') + '\n';
      }

      prompt += `\nคำสั่ง (Instruction):\n`;
      
      if (reportType === 'executive') {
        prompt += `เขียนรายงานวิเคราะห์ภาพรวมการปฏิบัติงาน (Executive Summary) ในรูปแบบที่เป็นทางการ กระชับ อ่านง่าย\n`;
        prompt += `เน้นที่:\n1. สรุปภาพรวมเหตุการณ์สำคัญจากรายงานประจำวัน\n2. ไฮไลท์ปัญหาที่ส่งผลกระทบต่อภาพรวม\n3. ข้อเสนอแนะ 3 ข้อสำหรับผู้บริหาร`;
      } else if (reportType === 'trend') {
        prompt += `วิเคราะห์แนวโน้มปัญหา (Trend Analysis)\n`;
        prompt += `เน้นที่:\n1. ปัญหาช้ำซาก (Recurring Problems) ที่ถูกระบุซ้ำๆ ในรายงานประจำวัน\n2. แนวโน้มของเหตุการณ์ (เช่น เริ่มเกิดบ่อยขึ้นต่อเนื่อง)\n3. ช่วงเวลาหรือจุดที่มักมีปัญหา`;
      } else if (reportType === 'performance') {
        prompt += `วิเคราะห์ประสิทธิภาพการทำงานจากรายงานประจำวัน\n`;
        prompt += `เน้นที่:\n1. การสรุปผลลัพธ์หรือเหตุการณ์ที่ลุล่วงได้ดี\n2. การวิเคราะห์ปัญหาที่ทำให้งานล่าช้าจากข้อมูลที่บันทึกไว้\n3. คำแนะนำในการป้องกัน`;
      } else if (reportType === 'improvement') {
        prompt += `เสนอแผนปรับปรุงกระบวนการและแก้ไขปัญหาที่เจอ (Action Plan)\n`;
        prompt += `เน้นที่:\n1. 3 สิ่งเร่งด่วนที่ควรปรับปรุงตามปัญหาที่พบในรายงาน\n2. กลยุทธ์ในการสื่อสารและแก้ไขระยะสั้น\n3. แนวทางลดความผิดพลาดระยะยาว`;
      }

      prompt += `\n\nการตั้งค่ารูปแบบการตอบ:\n- ใช้ Format Markdown\n- จัด Bullet ให้อ่านง่าย\n- ใช้ Keyword สำคัญให้ชัดเจน เน้นเป้าหมายที่เกิดผลกระทบ (Business Impact)\n- ปรับภาษาให้น่าดึงดูด น่าอ่าน`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setReportContent(response.text || '');
    } catch (err: any) {
      console.error('Error generating analytics report:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างรายงาน กรุณาลองใหม่อีกครั้ง');
      uiAlert('เกิดข้อผิดพลาดในการสร้างรายงาน กรุณาดูใน Console');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    uiAlert('คัดลอกลงคลิปบอร์ดแล้ว');
  };

  return (
    <div className="space-y-6 font-kanit">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <BarChart4 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">วิเคราะห์ข้อมูลเชิงลึกด้วย AI (Advanced AI Analytics)</h2>
            <p className="text-sm text-slate-500">นำข้อมูลประวัติการทำงานจากผู้ช่วยสร้างรายงานประจำวันมาต่อยอด เพื่อวิเคราะห์แนวโน้ม และเสนอแนวทางการปรับปรุง</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">1. เลือกช่วงเวลา (Date Range)</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setDateRange('week')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${dateRange === 'week' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  7 วันย้อนหลัง
                </button>
                <button
                  onClick={() => setDateRange('month')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${dateRange === 'month' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  30 วันย้อนหลัง
                </button>
                <button
                  onClick={() => setDateRange('custom')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${dateRange === 'custom' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  กำหนดเอง
                </button>
              </div>

              {dateRange === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:ring focus:ring-brand-200 outline-none"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:ring focus:ring-brand-200 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">2. เลือกประเภทรายงาน (Report Type)</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
              >
                <option value="executive">📊 สรุปภาพรวมผู้บริหาร (Executive Summary)</option>
                <option value="trend">📈 วิเคราะห์แนวโน้มปัญหา (Trend Analysis)</option>
                <option value="performance">⚙️ วิเคราะห์ประสิทธิภาพการทำงาน (Performance Insights)</option>
                <option value="improvement">💡 เสนอแผนปรับปรุงและแก้ไขปัญหา (Process Improvement)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-start border-t border-slate-100 pt-6">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  กำลังรอ AI วิเคราะห์ข้อมูล...
                </>
              ) : (
                <>
                  <Lightbulb size={18} />
                  เริ่มการวิเคราะห์เชิงลึกด้วย AI
                </>
              )}
            </button>
          </div>
          
          {error && (
             <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                 <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                 <span>{error}</span>
             </div>
          )}
        </div>
      </div>

      {reportContent && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-purple-400" />
              ผลลัพธ์การวิเคราะห์ ({dateRange === 'week' ? '7 วันที่ผ่านมา' : dateRange === 'month' ? '30 วันที่ผ่านมา' : `${startDate} ถึง ${endDate}`})
            </h3>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <Copy size={16} /> คัดลอก
            </button>
          </div>
          <div className="p-6 bg-[#fdfdfd] prose prose-slate prose-p:leading-relaxed prose-headings:text-slate-800 prose-a:text-brand-600 max-w-none text-slate-700 text-sm md:text-base">
             <div className="markdown-body" dangerouslySetInnerHTML={{ 
               __html: reportContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             }} />
          </div>
        </div>
      )}
    </div>
  );
};
