import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';
import { PDFDocument } from 'pdf-lib';

type Tool = 'merge' | 'split' | 'image';

export const PdfTools: React.FC = () => {
  const { setScreen, theme } = usePdfStore();
  const [activeTool, setActiveTool] = useState<Tool>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [splitStart, setSplitStart] = useState('1');
  const [splitEnd, setSplitEnd] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const downloadBlob = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      if (activeTool === 'merge') {
        const mergedPdf = await PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          const pdfBytes = new Uint8Array(await files[i].arrayBuffer());
          const pdf = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        const savedBytes = await mergedPdf.save();
        downloadBlob(savedBytes, 'Lume_Mesclado.pdf');
      } 
      
      else if (activeTool === 'split') {
        const pdfBytes = new Uint8Array(await files[0].arrayBuffer());
        const pdf = await PDFDocument.load(pdfBytes);
        const totalPages = pdf.getPageCount();
        
        let start = parseInt(splitStart) - 1;
        let end = splitEnd ? parseInt(splitEnd) - 1 : totalPages - 1;
        
        if (start < 0) start = 0;
        if (end >= totalPages) end = totalPages - 1;
        if (start > end) { alert("Intervalo inválido"); setIsProcessing(false); return; }

        const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        
        const savedBytes = await newPdf.save();
        downloadBlob(savedBytes, `Lume_Extraido_${start+1}-${end+1}.pdf`);
      } 
      
      else if (activeTool === 'image') {
        const pdf = await PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const bytes = new Uint8Array(await file.arrayBuffer());
          let image;
          if (file.type === 'image/jpeg') image = await pdf.embedJpg(bytes);
          else if (file.type === 'image/png') image = await pdf.embedPng(bytes);
          else continue;

          const page = pdf.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        const savedBytes = await pdf.save();
        downloadBlob(savedBytes, 'Lume_Imagens.pdf');
      }
    } catch (error) {
      alert("Erro ao processar o arquivo. Verifique se ele não está protegido por senha.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getToolDescription = () => {
    switch(activeTool) {
      case 'merge': return "Escolha 2 ou mais PDFs. Eles serão unidos na ordem selecionada. Tudo acontece offline no seu aparelho.";
      case 'split': return "Selecione 1 arquivo PDF para extrair apenas as páginas desejadas para um novo arquivo.";
      case 'image': return "Selecione imagens (JPG/PNG) para transformá-las em um único arquivo PDF.";
    }
  };

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 ${themeClasses[activeTheme]}`}>
      <header className={`flex items-center gap-4 p-4 md:p-6 shadow-sm z-10 border-b ${headerClasses[activeTheme]}`}>
        <button onClick={() => setScreen('home')} className={`p-2 rounded-lg transition-colors ${activeTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Ferramentas de PDF</h1>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 mt-4">
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={() => setActiveTool('merge')} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTool === 'merge' ? 'bg-blue-600 text-white shadow-md' : activeTheme === 'dark' ? 'border border-gray-600 text-gray-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
            Mesclar
          </button>
          <button onClick={() => setActiveTool('split')} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTool === 'split' ? 'bg-blue-600 text-white shadow-md' : activeTheme === 'dark' ? 'border border-gray-600 text-gray-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
            Dividir / Extrair
          </button>
          <button onClick={() => setActiveTool('image')} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTool === 'image' ? 'bg-blue-600 text-white shadow-md' : activeTheme === 'dark' ? 'border border-gray-600 text-gray-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
            Imagem → PDF
          </button>
        </div>

        <p className={`mb-8 leading-relaxed ${activeTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {getToolDescription()}
        </p>

        {activeTool === 'split' && (
          <div className={`flex items-center gap-4 mb-6 p-4 rounded-xl border ${activeTheme === 'dark' ? 'bg-gray-800 border-gray-700' : activeTheme === 'sepia' ? 'bg-[#e9deb5] border-[#d4c391]' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col">
              <label className={`text-sm font-bold mb-1 ${activeTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Página Inicial</label>
              <input type="number" min="1" value={splitStart} onChange={e => setSplitStart(e.target.value)} className={`w-24 p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${activeTheme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
            </div>
            <div className="flex flex-col">
              <label className={`text-sm font-bold mb-1 ${activeTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Página Final (opcional)</label>
              <input type="number" min="1" placeholder="Última" value={splitEnd} onChange={e => setSplitEnd(e.target.value)} className={`w-32 p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${activeTheme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
            </div>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          multiple={activeTool !== 'split'} 
          accept={activeTool === 'image' ? 'image/png, image/jpeg' : 'application/pdf'} 
        />

        <button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isProcessing}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
        >
          {isProcessing ? <><Loader2 size={24} className="animate-spin" /> Processando...</> : 'Escolher Arquivos'}
        </button>
      </main>
    </div>
  );
};