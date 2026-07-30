import React from 'react';
import { Document, Page } from 'react-pdf';
import { usePdfStore } from '../store/usePdfStore';

export const Sidebar: React.FC = () => {
  const { file, numPages, currentPage, setCurrentPage, theme } = usePdfStore();

  if (!file || !numPages) return null;

  // Calcula o tema real do sistema para a barra lateral
  const activeTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
    : theme;

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
        <div className="flex flex-col gap-6 items-center">
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
              <Document file={file} className={pdfFilters[activeTheme]}>
                <Page 
                  pageNumber={index + 1} 
                  width={150} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false} 
                />
              </Document>
              <p className="text-center text-xs font-medium text-gray-500 mt-2">{index + 1}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};