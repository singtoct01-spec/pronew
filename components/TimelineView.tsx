
import React, { useMemo } from 'react';
import { ProductionJob } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineViewProps {
  jobs: ProductionJob[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ jobs }) => {
  // 1. Calculate Dynamic Date Range
  const { startDate, endDate, totalDays, days } = useMemo(() => {
    const validJobs = jobs.filter(j => j.startDate && j.endDate && !isNaN(new Date(j.startDate).getTime()) && !isNaN(new Date(j.endDate).getTime()));

    if (validJobs.length === 0) {
      const now = new Date();
      return { 
        startDate: new Date(now.setDate(now.getDate() - 1)), 
        endDate: new Date(now.setDate(now.getDate() + 7)), 
        totalDays: 8,
        days: Array.from({ length: 8 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - 1 + i);
          return d;
        })
      };
    }

    const timestamps = validJobs.flatMap(j => [new Date(j.startDate).getTime(), new Date(j.endDate).getTime()]);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    // Add buffer: Start 1 day before earliest, End 1 day after latest
    const start = new Date(minTime);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(maxTime);
    end.setDate(end.getDate() + 1);
    end.setHours(23, 59, 59, 999);

    const diffTime = end.getTime() - start.getTime();
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dayArray = [];
    for(let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dayArray.push(d);
    }

    return { startDate: start, endDate: end, totalDays: daysCount, days: dayArray };
  }, [jobs]);

  const machines = Array.from(new Set(jobs.map(j => j.machineId))).sort((a: string, b: string) => {
      // Basic alphanumeric sort for timeline grouping
      return a.localeCompare(b, undefined, { numeric: true });
  });

  const getPosition = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffTime = Math.max(0, d.getTime() - startDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const percentage = (diffDays / totalDays) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-emerald-500 border border-emerald-600';
      case 'Delayed': return 'bg-red-500 border border-red-600';
      case 'Completed': return 'bg-blue-400 border border-blue-500';
      case 'Maintenance': return 'bg-orange-400 border border-orange-500 stripes-orange'; // Conceptual class
      case 'Paused': return 'bg-amber-400 border border-amber-500';
      default: return 'bg-slate-300 border border-slate-400';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full font-kanit">
      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Timeline การผลิต</h2>
          <p className="text-xs text-slate-500">
             ช่วงเวลา: {startDate.toLocaleDateString('th-TH')} - {endDate.toLocaleDateString('th-TH')}
          </p>
        </div>
        <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Running</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Delayed</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div> Completed</div>
        </div>
      </div>

      <div className="overflow-x-auto relative flex-1">
        <div className="min-w-[1000px] pb-4">
            {/* Header Dates */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10 h-10 shadow-sm">
                <div className="w-24 flex-shrink-0 p-2 text-xs font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center bg-slate-100 sticky left-0 z-20 shadow-r">
                    Machine
                </div>
                <div className="flex-1 relative">
                    {days.map((day, i) => (
                        <div key={i} className={`absolute h-full border-r border-slate-200 flex flex-col items-center justify-center text-[10px] text-slate-500 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-50' : ''}`} 
                             style={{ left: `${(i/totalDays)*100}%`, width: `${100/totalDays}%` }}>
                            <span className="font-bold">{day.getDate()}</span>
                            <span className="text-[9px]">{day.toLocaleDateString('th-TH', { weekday: 'short' })}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
                {machines.map(machineId => {
                    const machineJobs = jobs.filter(j => j.machineId === machineId);
                    return (
                        <div key={machineId} className="flex h-14 hover:bg-slate-50 transition-colors">
                            <div className="w-24 flex-shrink-0 p-2 font-bold text-slate-700 border-r border-slate-200 flex items-center justify-center bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                {machineId}
                            </div>
                            <div className="flex-1 relative group">
                                {/* Grid Lines Background */}
                                {days.map((day, i) => (
                                    <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-50/50' : ''}`} 
                                        style={{ left: `${(i/totalDays)*100}%` }}></div>
                                ))}

                                {/* Job Bars */}
                                {machineJobs.map(job => {
                                    if (!job.startDate || !job.endDate || isNaN(new Date(job.startDate).getTime()) || isNaN(new Date(job.endDate).getTime())) return null;

                                    const left = getPosition(job.startDate);
                                    const width = getPosition(job.endDate) - left;
                                    
                                    if (width <= 0) return null;

                                    return (
                                        <div 
                                            key={job.id}
                                            className={`absolute top-2 bottom-2 rounded-md shadow-sm ${getBarColor(job.status)} hover:opacity-90 hover:shadow-md cursor-pointer flex items-center px-2 overflow-hidden transition-all hover:scale-[1.02] hover:z-20`}
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                            title={`${job.productItem} (${job.status})\nStart: ${new Date(job.startDate).toLocaleString('th-TH')}\nEnd: ${new Date(job.endDate).toLocaleString('th-TH')}`}
                                        >
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[10px] text-white font-bold whitespace-nowrap truncate drop-shadow-md leading-tight">
                                                    {job.productItem}
                                                </span>
                                                <span className="text-[8px] text-white/90 whitespace-nowrap truncate leading-tight">
                                                    {job.jobOrder}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};
