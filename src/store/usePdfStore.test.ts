import { describe, it, expect, beforeEach } from 'vitest';
import { usePdfStore } from './usePdfStore';

const initialState = usePdfStore.getState();

describe('usePdfStore', () => {
  beforeEach(() => {
    usePdfStore.setState(initialState, true);
    localStorage.clear();
  });

  it('começa na tela home, sem arquivo', () => {
    const state = usePdfStore.getState();
    expect(state.screen).toBe('home');
    expect(state.file).toBeNull();
  });

  it('setFile abre o leitor e reseta a página para 1 por padrão', () => {
    const fakeFile = new File(['%PDF'], 'teste.pdf', { type: 'application/pdf' });
    usePdfStore.getState().setFile(fakeFile, { id: 'abc', name: 'teste.pdf' });

    const state = usePdfStore.getState();
    expect(state.screen).toBe('reader');
    expect(state.file).toBe(fakeFile);
    expect(state.fileId).toBe('abc');
    expect(state.currentPage).toBe(1);
  });

  it('setFile respeita a página inicial informada (retomar leitura)', () => {
    const fakeFile = new File(['%PDF'], 'teste.pdf', { type: 'application/pdf' });
    usePdfStore.getState().setFile(fakeFile, { id: 'abc', name: 'teste.pdf', startPage: 7 });
    expect(usePdfStore.getState().currentPage).toBe(7);
  });

  it('setFile(null) volta para a home', () => {
    const fakeFile = new File(['%PDF'], 'teste.pdf', { type: 'application/pdf' });
    usePdfStore.getState().setFile(fakeFile, { id: 'abc', name: 'teste.pdf' });
    usePdfStore.getState().setFile(null);
    expect(usePdfStore.getState().screen).toBe('home');
    expect(usePdfStore.getState().file).toBeNull();
  });

  it('setCurrentPage atualiza a página atual', () => {
    usePdfStore.getState().setCurrentPage(4);
    expect(usePdfStore.getState().currentPage).toBe(4);
  });

  it('setTheme muda o tema no estado', () => {
    usePdfStore.getState().setTheme('dark');
    expect(usePdfStore.getState().theme).toBe('dark');
  });

  it('setViewMode para "book" desliga o modo texto', () => {
    usePdfStore.getState().setIsTextMode(true);
    usePdfStore.getState().setViewMode('scroll');
    expect(usePdfStore.getState().isTextMode).toBe(false);
  });
});
