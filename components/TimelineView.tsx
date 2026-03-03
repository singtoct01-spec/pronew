
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ProductionJob } from '../types';
import { GripVertical } from 'lucide-react';

interface TimelineViewProps {
  jobs: ProductionJob[];
  onUpdateJob?: (job: ProductionJob) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ jobs, onUpdateJob }) => {
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

  const machines = Array.from(new Set(jobs.map(j => j.machineId))) as string[];
  machines.sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true });
  });

  const getPosition = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffTime = Math.max(0, d.getTime() - startDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const percentage = (diffDays / totalDays) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const getDateFromPercentage = (percentage: number) => {
    const diffDays = (percentage / 100) * totalDays;
    const d = new Date(startDate.getTime() + diffDays * 24 * 60 * 60 * 1000);
    return d;
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-emerald-500 border border-emerald-600';
      case 'Delayed': return 'bg-red-500 border border-red-600';
      case 'Completed': return 'bg-blue-400 border border-blue-500';
      case 'Maintenance': return 'bg-orange-400 border border-orange-500 stripes-orange';
      case 'Paused': return 'bg-amber-400 border border-amber-500';
      default: return 'bg-slate-300 border border-slate-400';
    }
  };

  // Drag & Drop State
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    jobId: string;
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    startLeft: number;
    startWidth: number;
    startMachine: string;
    currentLeft: number;
    currentWidth: number;
    currentMachine: string;
  } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !timelineRef.current) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragState.startX;
      const deltaPercentage = (deltaX / timelineRect.width) * 100;

      let newLeft = dragState.startLeft;
      let newWidth = dragState.startWidth;

      if (dragState.type === 'move') {
        newLeft = Math.max(0, Math.min(100 - newWidth, dragState.startLeft + deltaPercentage));
      } else if (dragState.type === 'resize-left') {
        const maxLeft = dragState.startLeft + dragState.startWidth - 1; // Minimum width 1%
        newLeft = Math.max(0, Math.min(maxLeft, dragState.startLeft + deltaPercentage));
        newWidth = dragState.startWidth + (dragState.startLeft - newLeft);
      } else if (dragState.type === 'resize-right') {
        newWidth = Math.max(1, Math.min(100 - dragState.startLeft, dragState.startWidth + deltaPercentage));
      }

      setDragState(prev => prev ? { ...prev, currentLeft: newLeft, currentWidth: newWidth } : null);
    };

    const handleMouseUp = () => {
      if (dragState && onUpdateJob) {
        const job = jobs.find(j => j.id === dragState.jobId);
        if (job) {
          const newStartDate = getDateFromPercentage(dragState.currentLeft).toISOString();
          const newEndDate = getDateFromPercentage(dragState.currentLeft + dragState.currentWidth).toISOString();
          
          onUpdateJob({
            ...job,
            machineId: dragState.currentMachine,
            startDate: newStartDate,
            endDate: newEndDate
          });
        }
      }
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, jobs, onUpdateJob, totalDays, startDate]);

  const handleMouseDown = (e: React.MouseEvent, job: ProductionJob, type: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation();
    if (!job.startDate || !job.endDate) return;

    const left = getPosition(job.startDate);
    const width = getPosition(job.endDate) - left;

    setDragState({
      jobId: job.id,
      type,
      startX: e.clientX,
      startLeft: left,
      startWidth: width,
      startMachine: job.machineId,
      currentLeft: left,
      currentWidth: width,
      currentMachine: job.machineId
    });
  };

  const handleRowDragEnter = (machineId: string) => {
    if (dragState && dragState.type === 'move' && dragState.currentMachine !== machineId) {
      setDragState(prev => prev ? { ...prev, currentMachine: machineId } : null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full font-kanit select-none">
      <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-white sticky top-0 z-20">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Timeline การผลิต (Interactive)</h2>
          <p className="text-xs text-slate-500">
             ลากและวางเพื่อย้ายคิวงาน หรือดึงขอบเพื่อเปลี่ยนเวลา
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
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
                <div className="flex-1 relative" ref={timelineRef}>
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
                    const machineJobs = jobs.filter(j => j.machineId === machineId && (!dragState || dragState.jobId !== j.id));
                    const isDragTarget = dragState && dragState.currentMachine === machineId;
                    
                    return (
                        <div 
                          key={machineId} 
                          className={`flex h-14 transition-colors ${isDragTarget ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                          onMouseEnter={() => handleRowDragEnter(machineId)}
                        >
                            <div className="w-24 flex-shrink-0 p-2 font-bold text-slate-700 border-r border-slate-200 flex items-center justify-center bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                {machineId}
                            </div>
                            <div className="flex-1 relative group">
                                {/* Grid Lines Background */}
                                {days.map((day, i) => (
                                    <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-50/50' : ''}`} 
                                        style={{ left: `${(i/totalDays)*100}%` }}></div>
                                ))}

                                {/* Static Job Bars */}
                                {machineJobs.map(job => {
                                    if (!job.startDate || !job.endDate || isNaN(new Date(job.startDate).getTime()) || isNaN(new Date(job.endDate).getTime())) return null;

                                    const left = getPosition(job.startDate);
                                    const width = getPosition(job.endDate) - left;
                                    
                                    if (width <= 0) return null;

                                    return (
                                        <div 
                                            key={job.id}
                                            className={`absolute top-2 bottom-2 rounded-md shadow-sm ${getBarColor(job.status)} cursor-grab active:cursor-grabbing flex items-center px-2 overflow-hidden transition-all hover:z-20 group/job`}
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                            title={`${job.productItem} (${job.status})\nStart: ${new Date(job.startDate).toLocaleString('th-TH')}\nEnd: ${new Date(job.endDate).toLocaleString('th-TH')}`}
                                            onMouseDown={(e) => handleMouseDown(e, job, 'move')}
                                        >
                                            {/* Left Resize Handle */}
                                            <div 
                                              className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 z-10"
                                              onMouseDown={(e) => handleMouseDown(e, job, 'resize-left')}
                                            />
                                            
                                            <div className="flex flex-col overflow-hidden pointer-events-none w-full">
                                                <span className="text-[10px] text-white font-bold whitespace-nowrap truncate drop-shadow-md leading-tight">
                                                    {job.productItem}
                                                </span>
                                                <span className="text-[8px] text-white/90 whitespace-nowrap truncate leading-tight">
                                                    {job.jobOrder}
                                                </span>
                                            </div>

                                            {/* Right Resize Handle */}
                                            <div 
                                              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 z-10"
                                              onMouseDown={(e) => handleMouseDown(e, job, 'resize-right')}
                                            />
                                        </div>
                                    );
                                })}

                                {/* Dragging Job Bar */}
                                {dragState && dragState.currentMachine === machineId && (() => {
                                    const job = jobs.find(j => j.id === dragState.jobId);
                                    if (!job) return null;
                                    return (
                                        <div 
                                            key={`drag-${job.id}`}
                                            className={`absolute top-2 bottom-2 rounded-md shadow-lg ${getBarColor(job.status)} opacity-80 z-50 flex items-center px-2 overflow-hidden ring-2 ring-blue-500`}
                                            style={{ left: `${dragState.currentLeft}%`, width: `${dragState.currentWidth}%` }}
                                        >
                                            <div className="flex flex-col overflow-hidden pointer-events-none w-full">
                                                <span className="text-[10px] text-white font-bold whitespace-nowrap truncate drop-shadow-md leading-tight">
                                                    {job.productItem}
                                                </span>
                                                <span className="text-[8px] text-white/90 whitespace-nowrap truncate leading-tight">
                                                    {getDateFromPercentage(dragState.currentLeft).toLocaleDateString('th-TH', {day:'numeric', month:'short'})} - {getDateFromPercentage(dragState.currentLeft + dragState.currentWidth).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
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
