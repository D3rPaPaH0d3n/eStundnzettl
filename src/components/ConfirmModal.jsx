import React from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop (Hintergrund abdunkeln) */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
        
        {/* Header mit Icon */}
        <div className="p-6 flex flex-col items-center text-center pb-2">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-500">
            <AlertTriangle size={32} />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {title}
          </h3>
          
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="p-4 grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/50">
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Abbrechen
          </button>
          
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;