import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'sepia' | 'system';
type ViewMode = 'scroll' | 'book';
type Screen = 'home' | 'reader' | 'tools';

interface PdfState {
  screen: Screen;
  file: File | string | null;
  fileId: string | null;
  fileName: string | null;
  numPages: number | null;
  currentPage: number;
  scale: number;
  rotation: number;
  theme: Theme;
  viewMode: ViewMode;
  isTextMode: boolean;
  setScreen: (screen: Screen) => void;
  setFile: (file: File | string | null, meta?: { id: string; name: string; startPage?: number }) => void;
  setNumPages: (pages: number) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setRotation: (rotation: number) => void;
  setTheme: (theme: Theme) => void;
  setViewMode: (mode: ViewMode) => void;
  setIsTextMode: (mode: boolean) => void;
}

export const usePdfStore = create<PdfState>()(
  persist(
    (set) => ({
      screen: 'home',
      file: null,
      fileId: null,
      fileName: null,
      numPages: null,
      currentPage: 1,
      scale: 1.0,
      rotation: 0,
      theme: 'system',
      viewMode: 'scroll',
      isTextMode: false,
      setScreen: (screen) => set({ screen }),
      setFile: (file, meta) =>
        set({
          file,
          fileId: meta?.id ?? null,
          fileName: meta?.name ?? null,
          currentPage: meta?.startPage ?? 1,
          isTextMode: false,
          screen: file ? 'reader' : 'home',
          scale: 1.0,
        }),
      setNumPages: (numPages) => set({ numPages }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setScale: (scale) => set({ scale }),
      setRotation: (rotation) => set({ rotation }),
      setTheme: (theme) => set({ theme }),
      setViewMode: (viewMode) => set({ viewMode, isTextMode: false }),
      setIsTextMode: (isTextMode) => set({ isTextMode }),
    }),
    {
      // Só persistimos preferências leves (JSON-serializáveis) no localStorage.
      // O PDF em si (File) e a lista de recentes ficam em IndexedDB — ver src/lib/fileStorage.ts.
      name: 'lume-preferences',
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
      }),
    }
  )
);
