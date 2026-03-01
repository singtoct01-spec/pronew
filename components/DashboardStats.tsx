import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Clock, PauseCircle } from 'lucide-react';
import { ProductionJob } from '../types';

interface DashboardStatsProps {
  data: ProductionJob[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ data }) => {
  const totalJobs = data.length;
  const delayedJobs = data.filter(j => j.status === 'Delayed').length;
  const runningJobs = data.filter(j => j.status === 'Running').length;
  const stoppedMachines = data.filter(j => j.status === 'Stopped').length;

  const cards = [
    {
      label: 'งานที่กำลังผลิต',
      value: runningJobs,
      icon: <TrendingUp className="text-emerald-500" size={24} />,
      color: 'border-l-4 border-emerald-500',
      subtext: 'เครื่องกำลังเดิน (Active)',
    },
    {
      label: 'งานตกแผน/เร่งด่วน',
      value: delayedJobs,
      icon: <AlertCircle className="text-red-500" size={24} />,
      color: 'border-l-4 border-red-500',
      subtext: 'ต้องรีบตรวจสอบแก้ไข',
    },
    {
      label: 'แผนงานทั้งหมด',
      value: totalJobs,
      icon: <CheckCircle2 className="text-blue-500" size={24} />,
      color: 'border-l-4 border-blue-500',
      subtext: 'ในสัปดาห์นี้',
    },
    {
      label: 'เครื่องหยุด/ซ่อม',
      value: stoppedMachines,
      icon: <PauseCircle className="text-slate-500" size={24} />,
      color: 'border-l-4 border-slate-500',
      subtext: 'ไม่มีแผน หรือ รอซ่อม',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 font-kanit">
      {cards.map((card, idx) => (
        <div key={idx} className={`bg-white rounded-xl shadow-sm p-6 ${card.color} flex items-start justify-between`}>
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">{card.label}</p>
            <h3 className="text-3xl font-bold text-slate-800">{card.value}</h3>
            <p className="text-xs text-slate-400 mt-2">{card.subtext}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-full">
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
};