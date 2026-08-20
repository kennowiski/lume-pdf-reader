import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api.js';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';
import { useActiveTheme } from '../hooks/useActiveTheme';
import { updateFileProgress } from '../lib/fileStorage';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Quantas páginas ficam "montadas" de cada lado da página atual no modo Scroll.
// Fora dessa janela, entra um placeholder vazio com a altura estimada — isso evita
// renderizar centenas de páginas de uma vez em PDFs longos.
const SCROLL_RENDER_WINDOW = 3;

export const PdfViewer: React.FC = () => {
  const { file, fileId, scale, setScale, rotation, setNumPages, numPages, viewMode, currentPage, setCurrentPage, isTextMode } = usePdfStore();
  const activeTheme = useActiveTheme();
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  // Chave da busca atual (texto + página). Usada para resetar o índice do
  // match durante o render quando ela muda — em vez de um useEffect, seguindo
  // o padrão do React para "ajustar estado quando uma prop muda" sem
  // disparar setState de forma síncrona dentro do corpo de um efeito.
  const [prevSearchKey, setPrevSearchKey] = useState('');

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [pinchDistance, setPinchDistance] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  // Debounce: só recalculamos o PDF em alta definição 200ms depois do
  // usuário parar de mexer no zoom (clique, roda do mouse ou pinça).
  // Isso evita redesenhar o PDF.js a cada tick de um gesto contínuo.
  const [renderScale, setRenderScale] = useState(scale);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderScale(scale);
    }, 200);
    return () => clearTimeout(timer);
  }, [scale]);

  // Rede de segurança: sempre que o zoom terminar de ser aplicado (renderScale
  // alcança o valor pedido) e o navegador tiver desenhado o novo layout,
  // recentraliza explicitamente a página atual na tela. Isso substitui um
  // cálculo manual de scrollTop/scrollLeft (frágil e sujeito a ficar
  // dessincronizado do redesenho assíncrono do PDF.js) por uma reancoragem
  // direta no elemento certo — é o que corrige tanto a "troca de página"
  // quanto o desalinhamento para a lateral ao dar zoom.
  useEffect(() => {
    if (viewMode !== 'scroll') return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`pdf-page-${currentPage}`);
      el?.scrollIntoView({ block: 'center', inline: 'center' });
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderScale]);

  useEffect(() => {
    if (viewMode !== 'scroll' || !numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.getAttribute('data-page-number'));
            if (pageNum) {
              setCurrentPage(pageNum);
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '-50% 0px -49% 0px',
        threshold: 0
      }
    );

    const timeout = setTimeout(() => {
      const pageNodes = document.querySelectorAll('.pdf-page-container');
      pageNodes.forEach((node) => observer.observe(node));
    }, 500);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
    // "scale" fica de fora de propósito: os nós observados não mudam com o
    // zoom, então recriar o observer a cada zoom só reintroduzia o bug de
    // detectar a página errada enquanto o layout ainda estava se ajustando.
  }, [viewMode, numPages, setCurrentPage]);

  useEffect(() => {
    const viewer = containerRef.current;
    const handleWheel = (e: WheelEvent) => {
      if (e.altKey || e.ctrlKey) {
        e.preventDefault();
        const zoomAmount = e.deltaY < 0 ? 0.1 : -0.1;
        setScale(Math.max(0.4, Math.min(4.0, scale + zoomAmount)));
      }
    };

    if (viewer) {
      viewer.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (viewer) {
        viewer.removeEventListener('wheel', handleWheel);
      }
    };
  }, [scale, setScale]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    setPdfDocument(pdf);
    setLoading(false);
  }, [setNumPages]);

  // Extração de texto da página atual (usada no modo "Ler Texto" e na busca).
  // O setState inicial é adiado para fora do corpo síncrono do efeito (setTimeout 0),
  // evitando o padrão de "setState síncrono dentro de efeito" que causa renders em cascata.
  useEffect(() => {
    if (!isTextMode || !pdfDocument) return;

    let isMounted = true;

    const extractText = async () => {
      if (!isMounted) return;
      setIsExtracting(true);
      setExtractedText('');
      try {
        const page = await pdfDocument.getPage(currentPage);
        const textContent = await page.getTextContent();

        let formattedText = '';
        let lastY = -1;

        textContent.items.forEach((item) => {
          if (!('str' in item)) return;
          const textItem = item as TextItem;
          if (lastY !== -1 && Math.abs(lastY - textItem.transform[5]) > 4) {
            formattedText += '\n\n';
          } else if (lastY !== -1) {
            formattedText += ' ';
          }
          formattedText += textItem.str;
          lastY = textItem.transform[5];
        });

        if (isMounted) {
          setExtractedText(formattedText || 'Nenhum texto legível encontrado nesta página.');
          setIsExtracting(false);
        }
      } catch {
        if (isMounted) {
          setExtractedText('Erro ao extrair o texto desta página.');
          setIsExtracting(false);
        }
      }
    };

    const timer = setTimeout(extractText, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentPage, isTextMode, pdfDocument]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'book' && !isTextMode) {
        if (e.key === 'ArrowRight') setCurrentPage(Math.min(numPages || 1, currentPage + 1));
        else if (e.key === 'ArrowLeft') setCurrentPage(Math.max(1, currentPage - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, viewMode, setCurrentPage, isTextMode]);

  // Animação de "virar página": o disparo de setState é adiado com setTimeout(0)
  // para não acontecer de forma síncrona dentro do corpo do efeito.
  useEffect(() => {
    if (viewMode === 'book' && !isTextMode) {
      const startTimer = setTimeout(() => setIsAnimating(true), 0);
      const endTimer = setTimeout(() => setIsAnimating(false), 400);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    }
  }, [currentPage, viewMode, isTextMode]);

  // Salva o progresso de leitura (página atual) em IndexedDB, com debounce simples,
  // para que o usuário possa retomar de onde parou na próxima vez que abrir o app.
  useEffect(() => {
    if (!fileId || !currentPage) return;
    const timer = setTimeout(() => {
      updateFileProgress(fileId, currentPage, numPages);
    }, 600);
    return () => clearTimeout(timer);
  }, [fileId, currentPage, numPages]);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || !extractedText) return [] as number[];
    const query = searchQuery.toLowerCase();
    const text = extractedText.toLowerCase();
    const indices: number[] = [];
    let idx = text.indexOf(query);
    while (idx !== -1) {
      indices.push(idx);
      idx = text.indexOf(query, idx + query.length);
    }
    return indices;
  }, [searchQuery, extractedText]);

  // Reseta o índice do match durante o render (não em um efeito) quando a
  // busca ou a página mudam — evita o padrão de setState síncrono em efeito.
  const searchKey = `${searchQuery}__${currentPage}`;
  if (searchKey !== prevSearchKey) {
    setPrevSearchKey(searchKey);
    if (searchMatchIndex !== 0) setSearchMatchIndex(0);
  }

  useEffect(() => {
    if (searchMatches.length === 0) return;
    const el = containerRef.current?.querySelector(`[data-match-index="${searchMatchIndex}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchMatchIndex, searchMatches.length]);

  const renderHighlightedText = () => {
    if (!searchQuery.trim() || searchMatches.length === 0) return extractedText;
    const query = searchQuery;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    searchMatches.forEach((matchIndex, i) => {
      parts.push(extractedText.slice(lastIndex, matchIndex));
      parts.push(
        <span
          key={`match-${i}`}
          data-match-index={i}
          className={i === searchMatchIndex ? 'bg-orange-400 text-black rounded px-0.5' : 'bg-yellow-300 text-black rounded px-0.5'}
        >
          {extractedText.slice(matchIndex, matchIndex + query.length)}
        </span>
      );
      lastIndex = matchIndex + query.length;
    });
    parts.push(extractedText.slice(lastIndex));
    return parts;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchDistance(dist);
      setTouchStart(null);
    } else if (e.touches.length === 1) {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistance !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = dist - pinchDistance;

      if (Math.abs(diff) > 2) {
        const zoomAmount = diff * 0.005;
        setScale(Math.max(0.4, Math.min(4.0, scale + zoomAmount)));
        setPinchDistance(dist);
      }
    } else if (e.touches.length === 1) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    setPinchDistance(null);

    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (viewMode === 'book' && scale <= 1.0) {
      if (isLeftSwipe) {
        setCurrentPage(Math.min(numPages || 1, currentPage + 1));
      }
      if (isRightSwipe) {
        setCurrentPage(Math.max(1, currentPage - 1));
      }
    }
  };

  if (!file) return null;

  const pdfFilters = {
    light: '',
    dark: 'invert-[1] hue-rotate-180 brightness-90 contrast-125',
    sepia: 'sepia-[0.6] brightness-95 contrast-90'
  };

  // Altura estimada de uma página fora da janela de renderização, para o scroll
  // não "pular" quando o placeholder é trocado pela página real (ou vice-versa).
  const estimatedPageHeight = 842 * renderScale + 24;

  return (
    <div
      ref={containerRef}
      className="p-4 min-h-full h-full overflow-auto scroll-smooth text-center relative"
      style={{ touchAction: 'pan-x pan-y' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {loading && <div className="text-blue-500 font-bold mb-4">Carregando documento...</div>}

      {isTextMode && (
        <div className="sticky top-0 z-30 flex justify-end mb-2">
          {searchOpen ? (
            <div className={`flex items-center gap-1 p-1.5 rounded-full shadow-md ${activeTheme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <Search size={16} className="ml-2 opacity-50 shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nesta página..."
                className="bg-transparent outline-none text-sm px-1 w-40 sm:w-56"
              />
              {searchMatches.length > 0 && (
                <span className="text-xs opacity-60 shrink-0 px-1">{searchMatchIndex + 1}/{searchMatches.length}</span>
              )}
              <button
                onClick={() => setSearchMatchIndex((i) => (i - 1 + searchMatches.length) % Math.max(searchMatches.length, 1))}
                disabled={searchMatches.length === 0}
                className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-30"
              ><ChevronUp size={16} /></button>
              <button
                onClick={() => setSearchMatchIndex((i) => (i + 1) % Math.max(searchMatches.length, 1))}
                disabled={searchMatches.length === 0}
                className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-30"
              ><ChevronDown size={16} /></button>
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="p-1.5 rounded-full hover:bg-black/5"
              ><X size={16} /></button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className={`p-2 rounded-full shadow-md ${activeTheme === 'dark' ? 'bg-gray-800 border border-gray-700 text-gray-300' : 'bg-white border border-gray-200 text-gray-600'}`}
              title="Buscar nesta página"
            >
              <Search size={18} />
            </button>
          )}
        </div>
      )}

      {/* As páginas são desenhadas direto no "renderScale" (debounced) — sem
          truque de zoom CSS temporário por cima, que era a fonte da
          dessincronização entre o que aparecia na tela e a rolagem real. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadStart={() => setLoading(true)}
          className={`transition-all duration-300 ease-in-out inline-flex flex-col gap-6 text-left mx-auto ${isTextMode ? 'w-full' : 'w-max'} ${!isTextMode ? pdfFilters[activeTheme] : ''}`}
          error={<div className="text-red-500 font-bold p-4 bg-red-50 rounded shadow text-center">Erro ao carregar o PDF.</div>}
        >

          {viewMode === 'scroll' && Array.from(new Array(numPages || 0), (_, index) => {
            const pageNumber = index + 1;
            const withinRenderWindow = Math.abs(pageNumber - currentPage) <= SCROLL_RENDER_WINDOW;
            return (
              <div
                key={`page-${pageNumber}`}
                id={`pdf-page-${pageNumber}`}
                data-page-number={pageNumber}
                className="pdf-page-container shadow-xl bg-white relative inline-block mx-auto max-w-full"
                style={!withinRenderWindow ? { minHeight: estimatedPageHeight, width: containerWidth } : undefined}
              >
                {withinRenderWindow ? (
                  <Page
                    pageNumber={pageNumber}
                    // Renderiza com o "renderScale" (que atualiza em alta definição só quando você solta o zoom)
                    scale={renderScale}
                    rotate={rotation}
                    width={containerWidth && containerWidth < 768 ? containerWidth : undefined}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                ) : (
                  // Placeholder leve: mantém a altura do documento estável sem montar as ~N páginas inteiras.
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold">
                    {pageNumber}
                  </div>
                )}
              </div>
            );
          })}

          {viewMode === 'book' && (
            <div className={`relative ${!isTextMode ? 'shadow-2xl bg-white mx-auto' : 'w-full'} inline-block max-w-full ${isAnimating ? 'animate-page-turn' : ''}`}>

              <div className={isTextMode ? 'opacity-0 h-0 w-0 overflow-hidden absolute pointer-events-none' : ''}>
                <Page
                  pageNumber={currentPage}
                  scale={renderScale}
                  rotate={rotation}
                  width={containerWidth && containerWidth < 768 ? containerWidth : undefined}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </div>

              {isTextMode && (
                <div
                  className={`w-full max-w-3xl mx-auto p-6 md:p-12 text-left leading-relaxed whitespace-pre-wrap transition-all duration-200 ${activeTheme === 'dark' ? 'text-gray-200' : activeTheme === 'sepia' ? 'text-[#5b4636]' : 'text-gray-800'}`}
                >
                  {isExtracting ? (
                    <p className="text-center opacity-50 animate-pulse font-bold mt-10">Lendo texto da página...</p>
                  ) : (
                    renderHighlightedText()
                  )}
                </div>
              )}

              {!isTextMode && (
                <>
                  <div
                    className="absolute top-0 left-0 w-1/4 h-full cursor-pointer z-10"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    title="Página Anterior"
                  />
                  <div
                    className="absolute top-0 right-0 w-1/4 h-full cursor-pointer z-10"
                    onClick={() => setCurrentPage(Math.min(numPages || 1, currentPage + 1))}
                    title="Próxima Página"
                  />
                </>
              )}
            </div>
          )}
        </Document>
      </div>
    </div>
  );
};
