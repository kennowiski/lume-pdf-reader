import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { usePdfStore } from '../store/usePdfStore';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

export const PdfViewer: React.FC = () => {
  const { file, scale, setScale, rotation, setNumPages, numPages, theme, viewMode, currentPage, setCurrentPage, isTextMode } = usePdfStore();
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [pinchDistance, setPinchDistance] = useState<number | null>(null);
  const minSwipeDistance = 50; 

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  // Aqui está o pulo do gato: um "renderScale" atrasado.
  const [renderScale, setRenderScale] = useState(scale);

  useEffect(() => {
    // Quando o usuário parar de dar zoom por 350 milissegundos, a gente atualiza a imagem real pra ficar nítida
    const timer = setTimeout(() => {
      setRenderScale(scale);
    }, 350);
    return () => clearTimeout(timer);
  }, [scale]);

  // A diferença entre o que o usuário quer (scale) e o que está renderizado (renderScale)
  // Isso gera um zoom CSS provisório ultra-suave.
  const visualScale = scale / renderScale;

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
  }, [viewMode, numPages, setCurrentPage, scale]); 

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

  const activeTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
    : theme;

  const onDocumentLoadSuccess = useCallback((pdf: any) => {
    setNumPages(pdf.numPages);
    setPdfDocument(pdf);
    setLoading(false);
  }, [setNumPages]);

  useEffect(() => {
    if (!isTextMode || !pdfDocument) return;

    let isMounted = true;
    setIsExtracting(true);
    setExtractedText('');

    const extractText = async () => {
      try {
        const page = await pdfDocument.getPage(currentPage);
        const textContent = await page.getTextContent();
        
        let formattedText = '';
        let lastY = -1;

        textContent.items.forEach((item: any) => {
          if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
            formattedText += '\n\n'; 
          } else if (lastY !== -1) {
            formattedText += ' '; 
          }
          formattedText += item.str;
          lastY = item.transform[5];
        });

        if (isMounted) {
          setExtractedText(formattedText || "Nenhum texto legível encontrado nesta página.");
          setIsExtracting(false);
        }
      } catch (error) {
        if (isMounted) {
          setExtractedText("Erro ao extrair o texto desta página.");
          setIsExtracting(false);
        }
      }
    };

    extractText();

    return () => { isMounted = false; };
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

  useEffect(() => {
    if (viewMode === 'book' && !isTextMode) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [currentPage, viewMode, isTextMode]);

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

  return (
    <div 
      ref={containerRef}
      className="p-4 min-h-full h-full overflow-auto scroll-smooth text-center"
      style={{ touchAction: 'pan-x pan-y' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {loading && <div className="text-blue-500 font-bold mb-4">Carregando documento...</div>}
      
      {/* Zoom visual temporário e ultra-rápido, aplicado aqui */}
      <div style={{ zoom: visualScale, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadStart={() => setLoading(true)}
          className={`transition-all duration-300 ease-in-out inline-flex flex-col gap-6 text-left mx-auto ${isTextMode ? 'w-full' : 'w-max'} ${!isTextMode ? pdfFilters[activeTheme] : ''}`}
          error={<div className="text-red-500 font-bold p-4 bg-red-50 rounded shadow text-center">Erro ao carregar o PDF.</div>}
        >
          
          {viewMode === 'scroll' && Array.from(new Array(numPages || 0), (_, index) => (
            <div 
              key={`page-${index + 1}`} 
              id={`pdf-page-${index + 1}`} 
              data-page-number={index + 1} 
              className="pdf-page-container shadow-xl bg-white relative inline-block mx-auto max-w-full"
            >
              <Page 
                pageNumber={index + 1} 
                // Renderiza com o "renderScale" (que atualiza em alta definição só quando você solta o zoom)
                scale={renderScale} 
                rotate={rotation}
                width={containerWidth && containerWidth < 768 ? containerWidth : undefined}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}

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
                    extractedText
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