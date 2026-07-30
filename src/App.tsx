import React, { useRef, useEffect, useState } from 'react';
import { PdfViewer } from './components/PdfViewer';
import { Sidebar } from './components/Sidebar';
import { PdfTools } from './components/PdfTools';
import { usePdfStore } from './store/usePdfStore';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, Moon, Sun, BookOpen, ScrollText, Book, AlignLeft, ArrowLeft, Monitor, Upload } from 'lucide-react';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    setFile, currentPage, numPages, setCurrentPage, 
    scale, setScale, rotation, setRotation, file,
    theme, setTheme, viewMode, setViewMode,
    isTextMode, setIsTextMode, screen, setScreen
  } = usePdfStore();

  const [systemPrefersDark, setSystemPrefersDark] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const activeTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const themeClasses = {
    light: 'bg-gray-100 text-gray-800',
    dark: 'bg-gray-900 text-gray-100',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]'
  };

  const headerClasses = {
    light: 'bg-white border-gray-200',
    dark: 'bg-gray-800 border-gray-700',
    sepia: 'bg-[#e9deb5] border-[#d4c391]'
  };

  if (screen === 'tools') {
    return <PdfTools />;
  }

  // TELA INICIAL COM AS CORES ORIGINAIS E SELETOR DE TEMA
  if (screen === 'home') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen p-4 transition-colors duration-300 ${themeClasses[activeTheme]}`}>
        <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        
        <div className={`w-16 h-16 rounded-full border-[3px] border-t-transparent border-r-transparent rotate-45 mb-6 opacity-90 ${activeTheme === 'dark' ? 'border-blue-400' : activeTheme === 'sepia' ? 'border-amber-700' : 'border-blue-600'}`}></div>
        
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Lume</h1>
        
        <p className={`text-center max-w-sm mb-10 leading-relaxed ${activeTheme === 'dark' ? 'text-gray-400' : activeTheme === 'sepia' ? 'text-[#7a6452]' : 'text-gray-500'}`}>
          Escolha um PDF do seu celular para começar a ler.<br/>
          Tudo fica salvo neste app — sem contas, sem anúncios.
        </p>
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-blue-600 text-white px-10 py-3.5 rounded-full mb-4 font-medium text-lg hover:bg-blue-700 transition-colors shadow-md w-full max-w-xs flex justify-center items-center gap-2"
        >
           Abrir PDF
        </button>
        
        <button 
          onClick={() => setScreen('tools')} 
          className={`border px-10 py-3.5 rounded-full font-medium transition-colors w-full max-w-xs ${activeTheme === 'dark' ? 'border-gray-600 hover:bg-gray-800 text-gray-300' : activeTheme === 'sepia' ? 'border-[#d4c391] hover:bg-[#e9deb5] text-[#5b4636]' : 'border-gray-300 hover:bg-gray-200 text-gray-700'}`}
        >
          Ferramentas de PDF
        </button>

        {/* SELETOR DE TEMA NA TELA INICIAL */}
        <div className="mt-16 flex flex-col items-center gap-3">
          <span className={`text-xs font-bold uppercase tracking-wider ${activeTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Aparência</span>
          <div className={`flex shrink-0 items-center space-x-1 p-1 rounded-xl shadow-sm ${activeTheme === 'dark' ? 'bg-gray-800 border border-gray-700' : activeTheme === 'sepia' ? 'bg-[#e9deb5] border border-[#d4c391]' : 'bg-white border border-gray-200'}`}>
            <button onClick={() => setTheme('system')} className={`p-2 rounded-lg transition-all ${theme === 'system' ? (activeTheme === 'dark' ? 'bg-gray-700 shadow text-white' : activeTheme === 'sepia' ? 'bg-[#f4ecd8] shadow text-amber-900' : 'bg-gray-100 shadow text-gray-900') : 'hover:bg-black/5 text-gray-500'}`} title="Automático"><Monitor size={20} /></button>
            <button onClick={() => setTheme('light')} className={`p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-gray-100 shadow text-blue-600' : 'hover:bg-black/5 text-gray-500'}`} title="Modo Claro"><Sun size={20} /></button>
            <button onClick={() => setTheme('sepia')} className={`p-2 rounded-lg transition-all ${theme === 'sepia' ? 'bg-[#f4ecd8] shadow text-amber-700' : 'hover:bg-black/5 text-gray-500'}`} title="Modo Sépia"><BookOpen size={20} /></button>
            <button onClick={() => setTheme('dark')} className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-gray-700 shadow text-blue-400' : 'hover:bg-black/5 text-gray-500'}`} title="Modo Escuro"><Moon size={20} /></button>
          </div>
        </div>
      </div>
    );
  }

  // TELA DO LEITOR (Mantida Inalterada)
  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden transition-colors duration-300 ${themeClasses[activeTheme]}`}>
      <header className={`flex flex-col md:flex-row gap-4 items-center justify-between p-3 shadow-sm z-20 border-b ${headerClasses[activeTheme]}`}>
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <button 
            onClick={() => setFile(null)} 
            className={`p-2 rounded-lg transition-colors ${activeTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
            title="Voltar ao Início"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black ml-1 text-blue-600 dark:text-blue-400">Lume</h1>
        </div>
        
        <div className="flex w-full md:w-auto items-center justify-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <div className={`flex shrink-0 items-center space-x-1 p-1 rounded-lg ${activeTheme === 'dark' ? 'bg-gray-700' : 'bg-black/5'}`}>
            <button onClick={() => setViewMode('scroll')} className={`p-2 rounded flex items-center gap-1 ${viewMode === 'scroll' ? (activeTheme === 'dark' ? 'bg-gray-600 shadow text-white' : 'bg-white shadow text-gray-900') : 'hover:bg-white/50'}`}>
              <ScrollText size={18} /> <span className="text-xs font-bold hidden sm:block">Scroll</span>
            </button>
            <button onClick={() => setViewMode('book')} className={`p-2 rounded flex items-center gap-1 ${viewMode === 'book' ? (activeTheme === 'dark' ? 'bg-gray-600 shadow text-white' : 'bg-white shadow text-gray-900') : 'hover:bg-white/50'}`}>
              <Book size={18} /> <span className="text-xs font-bold hidden sm:block">Livro</span>
            </button>
            <div className={`w-px h-6 mx-1 ${activeTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <button 
              onClick={() => setIsTextMode(!isTextMode)} 
              disabled={viewMode !== 'book'}
              className={`p-2 rounded flex items-center gap-1 ${viewMode !== 'book' ? 'opacity-30 cursor-not-allowed' : isTextMode ? (activeTheme === 'dark' ? 'bg-gray-600 shadow text-white' : 'bg-white shadow text-gray-900') : 'hover:bg-white/50'}`}
            >
              <AlignLeft size={18} /> <span className="text-xs font-bold hidden sm:block">Ler Texto</span>
            </button>
          </div>

          <div className={`flex shrink-0 items-center space-x-1 p-1 rounded-lg ${activeTheme === 'dark' ? 'bg-gray-700' : 'bg-black/5'}`}>
            <button onClick={() => setTheme('system')} className={`p-2 rounded ${theme === 'system' ? (activeTheme === 'dark' ? 'bg-gray-600 shadow text-white' : activeTheme === 'sepia' ? 'bg-[#f4ecd8] shadow text-amber-900' : 'bg-white shadow text-gray-900') : 'hover:bg-white/30 text-gray-500'}`} title="Automático"><Monitor size={18} /></button>
            <button onClick={() => setTheme('light')} className={`p-2 rounded ${theme === 'light' ? 'bg-white shadow text-blue-600' : 'hover:bg-white/50 text-gray-500'}`} title="Modo Claro"><Sun size={18} /></button>
            <button onClick={() => setTheme('sepia')} className={`p-2 rounded ${theme === 'sepia' ? 'bg-[#f4ecd8] shadow text-amber-700' : 'hover:bg-white/50 text-gray-500'}`} title="Modo Sépia"><BookOpen size={18} /></button>
            <button onClick={() => setTheme('dark')} className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-600 shadow text-blue-400' : 'hover:bg-black/10 text-gray-500'}`} title="Modo Escuro"><Moon size={18} /></button>
          </div>

          <div className={`flex shrink-0 items-center space-x-2 p-1 rounded-lg ${activeTheme === 'dark' ? 'bg-gray-700' : 'bg-black/5'}`}>
            <button onClick={() => setScale(Math.max(0.4, scale - 0.2))} className="p-2 hover:bg-white/50 rounded shadow-sm"><ZoomOut size={18} /></button>
            <span className="text-sm font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(scale + 0.2)} className="p-2 hover:bg-white/50 rounded shadow-sm"><ZoomIn size={18} /></button>
            {!isTextMode && (
              <>
                <div className={`w-px h-6 mx-1 ${activeTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <button onClick={() => setRotation((rotation + 90) % 360)} className="p-2 hover:bg-white/50 rounded shadow-sm"><RotateCw size={18} /></button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {viewMode === 'scroll' && <Sidebar />}
        <div className={`flex-1 overflow-hidden relative ${activeTheme === 'dark' ? 'bg-gray-900' : activeTheme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-gray-200/50'}`}>
          <PdfViewer />
        </div>
      </main>

      <footer className={`flex items-center justify-center gap-6 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 pb-safe ${headerClasses[activeTheme]} ${viewMode === 'scroll' ? 'md:hidden justify-between' : 'justify-center'}`}>
        <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="p-2 rounded-lg hover:bg-black/5 transition-colors"><ChevronLeft size={24} /></button>
        <span className="text-sm font-medium px-4 py-2 rounded-lg opacity-80">Página {currentPage} de {numPages || '-'}</span>
        <button onClick={() => setCurrentPage(Math.min(numPages || 1, currentPage + 1))} className="p-2 rounded-lg hover:bg-black/5 transition-colors"><ChevronRight size={24} /></button>
      </footer>
    </div>
  );
};

export default App;