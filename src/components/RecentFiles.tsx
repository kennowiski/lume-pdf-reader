import React, { useEffect, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { listRecentFiles, deleteFileRecord, type StoredFileRecord } from '../lib/fileStorage';
import { usePdfStore } from '../store/usePdfStore';

interface RecentFilesProps {
  activeTheme: 'light' | 'dark' | 'sepia';
}

export const RecentFiles: React.FC<RecentFilesProps> = ({ activeTheme }) => {
  const [recent, setRecent] = useState<StoredFileRecord[]>([]);
  const setFile = usePdfStore((s) => s.setFile);

  useEffect(() => {
    listRecentFiles().then(setRecent);
  }, []);

  if (recent.length === 0) return null;

  const cardClasses = {
    light: 'bg-white border-gray-200 hover:bg-gray-50',
    dark: 'bg-gray-800 border-gray-700 hover:bg-gray-700',
    sepia: 'bg-[#e9deb5] border-[#d4c391] hover:bg-[#e2d5a4]'
  };

  const handleOpen = (record: StoredFileRecord) => {
    const blob = new Blob([record.bytes], { type: 'application/pdf' });
    const file = new File([blob], record.name, { type: 'application/pdf' });
    setFile(file, { id: record.id, name: record.name, startPage: record.lastPage || 1 });
  };

  const handleRemove = async (record: StoredFileRecord) => {
    await deleteFileRecord(record.id);
    setRecent((prev) => prev.filter((r) => r.id !== record.id));
  };

  return (
    <div className="w-full max-w-sm mt-10">
      <span className={`text-xs font-bold uppercase tracking-wider block mb-3 text-center ${activeTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        Continuar lendo
      </span>
      <div className="flex flex-col gap-2">
        {recent.map((record) => (
          <div
            key={record.id}
            className={`flex items-center gap-1 p-1.5 rounded-xl border transition-colors ${cardClasses[activeTheme]}`}
          >
            {/*
              Dois <button> irmãos em vez de um "botão de remover" aninhado dentro
              do card inteiro: HTML/ARIA não suporta elemento interativo dentro de
              outro, e o aninhamento anterior também deixava o "X" inacessível via
              teclado (sem tabIndex/onKeyDown). Como botões irmãos, os dois já
              recebem foco e ativação por teclado (Tab + Enter/Espaço) de graça.
            */}
            <button
              onClick={() => handleOpen(record)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left p-1.5 rounded-lg hover:bg-black/5"
            >
              <FileText size={20} className="shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{record.name}</p>
                <p className="text-xs opacity-60">
                  Página {record.lastPage}{record.numPages ? ` de ${record.numPages}` : ''}
                </p>
              </div>
            </button>
            <button
              onClick={() => handleRemove(record)}
              className="p-1.5 rounded-full hover:bg-black/10 opacity-60 shrink-0"
              title="Remover dos recentes"
              aria-label={`Remover ${record.name} dos recentes`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
