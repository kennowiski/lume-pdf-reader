import React, { useState } from 'react';
import { X } from 'lucide-react';

interface JumpToPageModalProps {
  currentPage: number;
  numPages: number;
  activeTheme: 'light' | 'dark' | 'sepia';
  onClose: () => void;
  onJump: (page: number) => void;
}

export const JumpToPageModal: React.FC<JumpToPageModalProps> = ({ currentPage, numPages, activeTheme, onClose, onJump }) => {
  const [value, setValue] = useState(String(currentPage));

  const panelClasses = {
    light: 'bg-white text-gray-800',
    dark: 'bg-gray-800 text-gray-100',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(value, 10);
    if (!Number.isNaN(page) && page >= 1 && page <= numPages) {
      onJump(page);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`w-full max-w-xs rounded-2xl shadow-xl p-5 ${panelClasses[activeTheme]}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Ir para página</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-black/5">
            <X size={18} />
          </button>
        </div>
        <input
          autoFocus
          type="number"
          min={1}
          max={numPages}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-300 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 text-gray-900"
        />
        <p className="text-xs opacity-60 mt-2 text-center">de 1 a {numPages}</p>
        <button
          type="submit"
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Ir
        </button>
      </form>
    </div>
  );
};
