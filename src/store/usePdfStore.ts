import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'sepia' | 'system';
type ViewMode = 'scroll' | 'book';
type Screen = 'home' | 'reader' | 'tools';

interface PdfState {
  screen: Screen;
  file: File | string | null;
  numPages: number | null;
  currentPage: number;
  scale: number;
  rotation: number;
  theme: Theme;
  viewMode: ViewMode;
  isTextMode: boolean;
  setScreen: (screen: Screen) => void;
  setFile: (file: File | string | null) => void;
  setNumPages: (pages: number) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setRotation: (rotation: number) => void;
  setTheme: (theme: Theme) => void;
  setViewMode: (mode: ViewMode) => void;
  setIsTextMode: (mode: boolean) => void;
}

export const usePdfStore = create<PdfState>((set) => ({
  screen: 'home',
  file: null,
  numPages: null,
  currentPage: 1,
  scale: 1.0, // CORREÇÃO: Zoom padrão inicia em 100%
  rotation: 0,
  theme: 'system',
  viewMode: 'scroll',
  isTextMode: false,
  setScreen: (screen) => set({ screen }),
  setFile: (file) => set({ file, currentPage: 1, isTextMode: false, screen: file ? 'reader' : 'home', scale: 1.0 }),
  setNumPages: (numPages) => set({ numPages }),
  setCurrentPage: (currentPage) => set({ currentPage }), 
  setScale: (scale) => set({ scale }),
  setRotation: (rotation) => set({ rotation }),
  setTheme: (theme) => set({ theme }),
  setViewMode: (viewMode) => set({ viewMode, isTextMode: false }),
  setIsTextMode: (isTextMode) => set({ isTextMode }),
}));