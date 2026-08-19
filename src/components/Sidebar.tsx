import React from 'react';
import { Document, Page } from 'react-pdf';
import { usePdfStore } from '../store/usePdfStore';
import { useActiveTheme } from '../hooks/useActiveTheme';

export const Sidebar: React.FC = () => {
  const { file, numPages, currentPage, setCurrentPage } = usePdfStore();
  const activeTheme = useActiveTheme();

  if (!file || !numPages) return null;

  const pdfFilters = {
    light: '',
    dark: 'invert-[1] hue-rotate-180 brightness-90 contrast-125',
    sepia: 'sepia-[0.6] brightness-95 contrast-90'
  };

  const bgColors = {
    light: 'bg-gray-50 border-gray-200',
    dark: 'bg-gray-800 border-gray-700',
    sepia: 'bg-[#e9deb5] border-[#d4c391]'
  };

  const handleThumbnailClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    document.getElementById(`pdf-page-${pageNumber}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <aside className={`w-48 lg:w-64 border-r overflow-y-auto hidden md:block h-full transition-colors duration-300 ${bgColors[activeTheme]}`}>
      <div className="p-4">
        <h2 className={`text-xs uppercase tracking-wider font-bold mb-4 ${activeTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Páginas ({numPages})
        </h2>
        {/*
          Um único <Document> compartilhado por todas as miniaturas: o PDF é
          carregado/parseado uma única vez e cada <Page> apenas renderiza a
          página correspondente a partir dele, em vez de cada miniatura
          reabrir o arquivo inteiro (o comportamento antigo custava N parses
          completos do PDF para um documento de N páginas).
        */}
        <Document file={file} loading={null} error={null} className={`flex flex-col gap-6 items-center ${pdfFilters[activeTheme]}`}>
          {Array.from(new Array(numPages), (_, index) => (
            <div
              key={`thumb-${index + 1}`}
              onClick={() => handleThumbnailClick(index + 1)}
              className={`cursor-pointer transition-all p-1 bg-white ${
                currentPage === index + 1
                  ? 'ring-2 ring-blue-500 shadow-md'
                  : 'ring-1 ring-gray-200 hover:ring-blue-300'
              }`}
            >
              <Page
                pageNumber={index + 1}
                width={150}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              <p className="text-center text-xs font-medium text-gray-500 mt-2">{index + 1}</p>
            </div>
          ))}
        </Document>
      </div>
    </aside>
  );
};
