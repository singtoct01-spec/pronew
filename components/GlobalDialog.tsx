import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { getDialogListener, setDialogListener, DialogState } from '../utils/dialog';

export const GlobalDialog: React.FC = () => {
  const [dialogs, setDialogs] = useState<DialogState[]>([]);

  useEffect(() => {
    setDialogListener((state) => {
      setDialogs((prev) => [...prev, state]);
    });
    return () => setDialogListener(null);
  }, []);

  if (dialogs.length === 0) return null;

  const currentDialog = dialogs[0];

  const handleClose = (result: boolean) => {
    currentDialog.resolve(result);
    setDialogs((prev) => prev.slice(1));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 font-kanit">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${currentDialog.type === 'confirm' ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'}`}>
              {currentDialog.type === 'confirm' ? <AlertCircle size={24} /> : <Info size={24} />}
            </div>
            <div className="pt-1">
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {currentDialog.type === 'confirm' ? 'ยืนยันการดำเนินการ' : 'ข้อความแจ้งเตือน'}
              </h3>
              <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">
                {currentDialog.message}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
          {currentDialog.type === 'confirm' && (
            <button
              onClick={() => handleClose(false)}
              className="px-4 py-2 font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
          )}
          <button
            onClick={() => handleClose(true)}
            className={`px-4 py-2 font-medium text-white rounded-lg transition-colors ${currentDialog.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
          >
            {currentDialog.type === 'confirm' ? 'ยืนยัน' : 'ตกลง'}
          </button>
        </div>
      </div>
    </div>
  );
};
