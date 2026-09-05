import React, { useState, useRef } from 'react';
import { ArrowLeft, Loader2, ArrowUp, ArrowDown, X, Download, FileText, Image as ImageIcon, RotateCcw, Plus } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';
import { useActiveTheme } from '../hooks/useActiveTheme';
import { PDFDocument } from 'pdf-lib';

type Tool = 'merge' | 'split' | 'image';

interface PendingFile {
  id: string;
  file: File;
}

interface GeneratedFile {
  bytes: Uint8Array;
  filename: string;
}

let pendingFileSeq = 0;
const nextPendingId = () => `pf-${Date.now()}-${pendingFileSeq++}`;

export const PdfTools: React.FC = () => {
  const { setScreen } = usePdfStore();
  const activeTheme = useActiveTheme();
  const [activeTool, setActiveTool] = useState<Tool>('merge');
  const [isProcessing, setIsProcessing] = useState(false);

  const [splitStart, setSplitStart] = useState('1');
  const [splitEnd, setSplitEnd] = useState('');

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [generated, setGenerated] = useState<GeneratedFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resetSelection = () => {
    setPendingFiles([]);
    setGenerated(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectTool = (tool: Tool) => {
    setActiveTool(tool);
    resetSelection();
  };

  const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const incoming = Array.from(files).map((file) => ({ id: nextPendingId(), file }));
    setGenerated(null);

    if (activeTool === 'split') {
      setPendingFiles(incoming);
    } else {
      setPendingFiles((prev) => {
        const existingKeys = new Set(prev.map((pf) => fileKey(pf.file)));
        const uniqueIncoming = incoming.filter((pf) => !existingKeys.has(fileKey(pf.file)));
        return [...prev, ...uniqueIncoming];
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    setPendingFiles((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== id));
  };

  const handleGenerate = async () => {
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);
    try {
      if (activeTool === 'merge') {
        const mergedPdf = await PDFDocument.create();
        for (const { file } of pendingFiles) {
          const pdfBytes = await file.arrayBuffer();
          const pdf = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        const savedBytes = await mergedPdf.save();
        setGenerated({ bytes: savedBytes, filename: 'Lume_Mesclado.pdf' });
      }

      else if (activeTool === 'split') {
        const pdfBytes = await pendingFiles[0].file.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        const totalPages = pdf.getPageCount();

        let start = parseInt(splitStart, 10) - 1;
        let end = splitEnd ? parseInt(splitEnd, 10) - 1 : totalPages - 1;

        if (Number.isNaN(start) || start < 0) start = 0;
        if (Number.isNaN(end) || end >= totalPages) end = totalPages - 1;
        if (start > end) {
          alert('Intervalo inválido');
          setIsProcessing(false);
          return;
        }

        const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const savedBytes = await newPdf.save();
        setGenerated({ bytes: savedBytes, filename: `Lume_Extraido_${start + 1}-${end + 1}.pdf` });
      }

      else if (activeTool === 'image') {
        const pdf = await PDFDocument.create();
        for (const { file } of pendingFiles) {
          const bytes = await file.arrayBuffer();
          let image;
          if (file.type === 'image/jpeg') image = await pdf.embedJpg(bytes);
          else if (file.type === 'image/png') image = await pdf.embedPng(bytes);
          else continue;

          const page = pdf.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        const savedBytes = await pdf.save();
        setGenerated({ bytes: savedBytes, filename: 'Lume_Imagens.pdf' });
      }
    } catch (error) {
      console.error('Erro ao processar arquivo em PdfTools:', error);
      alert('Erro ao processar o arquivo. Verifique se ele não está protegido por senha.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!generated) return;
    const blob = new Blob([new Uint8Array(generated.bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generated.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getToolDescription = () => {
    switch (activeTool) {
      case 'merge': return 'Escolha 2 ou mais PDFs, defina a ordem de junção e gere o arquivo final. Tudo acontece offline no seu aparelho.';
      case 'split': return 'Selecione 1 arquivo PDF para extrair apenas as páginas desejadas para um novo arquivo.';
      case 'image': return 'Selecione imagens (JPG/PNG), organize a ordem das páginas e gere o PDF final.';
    }
  };

  const canReorder = activeTool === 'merge' || activeTool === 'image';
  const canAddMore = activeTool !== 'split';
  const canGenerate = activeTool === 'split'
    ? pendingFiles.length === 1
    : pendingFiles.length >= (activeTool === 'merge' ? 2 : 1);

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 ${themeClasses[activeTheme]}`}>
      <header className={`flex items-center gap-4 p-4 md:p-6 shadow-sm z-10 border-b ${headerClasses[activeTheme]}`}>
        <button onClick={() => setScreen('home')} title="Voltar ao Início" className={`p-2 rounded-lg transition-colors ${activeTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Ferramentas de PDF</h1>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 mt-4">
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={() => handleSelectTool('merge')} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTool === 'merge' ? 'bg-blue-600 text-white shadow-md' : activeTheme === 'dark' ? 'border border-gray-600 text-gray-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
            Mesclar
          </button>
          <button onClick={() => handleSelectTool('split')} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTool === 'split' ? 'bg-blue-600 text-white shadow-md' : activeTheme === 'dark' ? 'border border-gray-600 text-gray-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
            Dividir / Extrair
          </button>
          <button onClick={() => handleSelectTool('image')} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTool === 'image' ? 'bg-blue-600 text-white shadow-md' : activeTheme === 'dark' ? 'border border-gray-600 text-gray-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
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

        {pendingFiles.length === 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 mt-4"
          >
            Escolher Arquivos
          </button>
        )}

        {pendingFiles.length > 0 && (
          <div className="mt-4">
            <div className={`rounded-xl border overflow-hidden mb-4 ${activeTheme === 'dark' ? 'bg-gray-800 border-gray-700' : activeTheme === 'sepia' ? 'bg-[#e9deb5] border-[#d4c391]' : 'bg-white border-gray-200'}`}>
              {canAddMore && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center justify-center gap-2 p-3 text-sm font-bold border-b transition-colors ${activeTheme === 'dark' ? 'border-gray-700 text-blue-400 hover:bg-gray-700' : 'border-gray-200 text-blue-600 hover:bg-gray-50'}`}
                >
                  <Plus size={16} /> Adicionar arquivos
                </button>
              )}
              {pendingFiles.map((pf, index) => (
                <div
                  key={pf.id}
                  className={`flex items-center gap-3 p-3 ${index !== pendingFiles.length - 1 ? (activeTheme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}
                >
                  <span className={`w-6 text-center text-sm font-bold shrink-0 ${activeTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {index + 1}
                  </span>
                  {activeTool === 'image'
                    ? <ImageIcon size={18} className="shrink-0 text-blue-500" />
                    : <FileText size={18} className="shrink-0 text-blue-500" />}
                  <span className="flex-1 truncate text-sm">{pf.file.name}</span>

                  {canReorder && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveFile(index, -1)}
                        disabled={index === 0}
                        title="Mover para cima"
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => moveFile(index, 1)}
                        disabled={index === pendingFiles.length - 1}
                        title="Mover para baixo"
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${activeTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => removeFile(pf.id)}
                    title="Remover"
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${activeTheme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetSelection}
                title="Trocar arquivos"
                className={`p-4 rounded-xl border transition-colors shrink-0 ${activeTheme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-200'}`}
              >
                <RotateCcw size={20} />
              </button>
              <button
                onClick={handleGenerate}
                disabled={isProcessing || !canGenerate}
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isProcessing ? <><Loader2 size={24} className="animate-spin" /> Processando...</> : 'Gerar PDF'}
              </button>
            </div>
          </div>
        )}

        {generated && (
          <button
            onClick={handleDownload}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2 mt-4"
          >
            <Download size={22} /> Baixar {generated.filename}
          </button>
        )}
      </main>
    </div>
  );
};

export default PdfTools;
