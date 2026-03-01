import React from 'react';
import { ProductionJob, SIMULATED_NOW } from '../types';
import { Cpu, Zap, AlertTriangle, Play, Pause, AlertOctagon } from 'lucide-react';

interface MachineGridProps {
  jobs: ProductionJob[];
  onEditJob: (job: ProductionJob) => void;
}

export const MachineGrid: React.FC<MachineGridProps> = ({ jobs, onEditJob }) => {
  // Extract unique machines
  const machineIds = Array.from(new Set(jobs.map(j => j.machineId))).sort() as string[];

  const getMachineStatus = (machineId: string) => {
    // Find job active at SIMULATED_NOW
    const activeJob = jobs.find(j => 
      j.machineId === machineId && 
      new Date(j.startDate) <= SIMULATED_NOW && 
      new Date(j.endDate) >= SIMULATED_NOW
    );
    
    // If no active job, find the next one or the last one
    const nextJob = !activeJob ? jobs.find(j => j.machineId === machineId && new Date(j.startDate) > SIMULATED_NOW) : null;
    
    return { activeJob, nextJob };
  };

  const getProgress = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = SIMULATED_NOW.getTime();
    const total = e - s;
    const elapsed = now - s;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return 'border-emerald-500 bg-emerald-50';
      case 'Delayed': return 'border-red-500 bg-red-50';
      case 'Stopped': return 'border-slate-300 bg-slate-50';
      case 'Maintenance': return 'border-orange-500 bg-orange-50';
      default: return 'border-slate-200 bg-white';
    }
  };

  const getStatusTextThai = (status: string) => {
      switch (status) {
      case 'Running': return 'กำลังผลิต';
      case 'Delayed': return 'ล่าช้า/ตกแผน';
      case 'Stopped': return 'หยุด';
      case 'Maintenance': return 'ซ่อมบำรุง';
      default: return 'ว่าง (Idle)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running': return <Play size={16} className="text-emerald-600" />;
      case 'Delayed': return <AlertTriangle size={16} className="text-red-600" />;
      case 'Stopped': return <Pause size={16} className="text-slate-600" />;
      case 'Maintenance': return <AlertOctagon size={16} className="text-orange-600" />;
      default: return <Cpu size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 font-kanit">
      {machineIds.map(id => {
        const { activeJob, nextJob } = getMachineStatus(id);
        const displayJob = activeJob || nextJob;
        const isRunning = activeJob && activeJob.status !== 'Stopped' && activeJob.status !== 'Maintenance';
        
        return (
          <div 
            key={id} 
            onClick={() => displayJob && onEditJob(displayJob)}
            className={`rounded-xl border-l-4 shadow-sm p-5 transition-all hover:shadow-md cursor-pointer bg-white ${activeJob ? getStatusColor(activeJob.status) : 'border-slate-300'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeJob ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                  <Cpu className="text-slate-700" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{id}</h3>
                  <p className="text-xs text-slate-500">
                    {activeJob ? getStatusTextThai(activeJob.status) : 'เครื่องว่าง'}
                  </p>
                </div>
              </div>
              <div className="px-2 py-1 rounded-md bg-white shadow-sm border border-slate-100">
                {activeJob ? getStatusIcon(activeJob.status) : <Pause size={16} className="text-slate-400"/>}
              </div>
            </div>

            {displayJob ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">สินค้า:</span>
                  <span className="font-semibold text-slate-700">{displayJob.productItem}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">แม่พิมพ์:</span>
                  <span className="font-mono text-slate-600">{displayJob.moldCode}</span>
                </div>
                
                {activeJob && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">ความคืบหน้า</span>
                      <span className="font-medium text-slate-700">{Math.round(getProgress(activeJob.startDate, activeJob.endDate))}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${activeJob.status === 'Delayed' ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${getProgress(activeJob.startDate, activeJob.endDate)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>เริ่ม: {new Date(activeJob.startDate).toLocaleDateString('th-TH')}</span>
                      <span>จบ: {new Date(activeJob.endDate).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                )}
                
                {!activeJob && nextJob && (
                   <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-500 border border-slate-100">
                      ถัดไป: {nextJob.productItem} เริ่ม {new Date(nextJob.startDate).toLocaleDateString('th-TH')}
                   </div>
                )}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-slate-400 text-sm italic">
                ไม่มีแผนการผลิต
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};