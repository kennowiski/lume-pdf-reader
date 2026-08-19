import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePdfStore } from './store/usePdfStore';

// Mock do react-pdf: evita depender de parsing real de PDF/canvas (não
// suportado pelo jsdom). O vi.mock precisa ficar aqui, no nível superior do
// arquivo de teste, para o vitest conseguir "hoistá-lo" corretamente acima
// dos imports (inclusive do próprio App, que carrega o Sidebar/PdfViewer).
const mockState = vi.hoisted(() => ({ numPages: 3 }));

vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess, className }: {
    children?: React.ReactNode;
    onLoadSuccess?: (pdf: { numPages: number; getPage: (n: number) => Promise<unknown> }) => void;
    className?: string;
  }) => {
    React.useEffect(() => {
      onLoadSuccess?.({
        numPages: mockState.numPages,
        getPage: async (pageNumber: number) => ({
          getTextContent: async () => ({
            items: [{ str: `Texto da página ${pageNumber}`, transform: [1, 0, 0, 1, 0, 700] }],
          }),
        }),
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return React.createElement('div', { className, 'data-testid': 'mock-document' }, children);
  },
  Page: ({ pageNumber }: { pageNumber: number }) =>
    React.createElement('div', { 'data-testid': 'mock-page', 'data-page-number': pageNumber }, `Página ${pageNumber}`),
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
}));

import App from './App';

const initialState = usePdfStore.getState();

describe('App — fluxos principais', () => {
  beforeEach(() => {
    usePdfStore.setState(initialState, true);
    localStorage.clear();
    mockState.numPages = 3;
  });

  it('mostra a tela inicial com o botão de abrir PDF', () => {
    render(<App />);
    expect(screen.getByText('Lume')).toBeInTheDocument();
    expect(screen.getByText('Abrir PDF')).toBeInTheDocument();
  });

  it('troca de tema e persiste no localStorage', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTitle('Modo Escuro'));

    await waitFor(() => {
      const stored = localStorage.getItem('lume-preferences');
      expect(stored).toContain('"dark"');
    });
    expect(usePdfStore.getState().theme).toBe('dark');
  });

  it('navega para as Ferramentas de PDF e volta para a home', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText('Ferramentas de PDF'));
    expect(await screen.findByText('Ferramentas de PDF', { selector: 'h1' })).toBeInTheDocument();

    await user.click(screen.getByTitle('Voltar ao Início'));
    expect(await screen.findByText('Abrir PDF')).toBeInTheDocument();
  });

  it('abre um PDF (via store) e navega entre páginas', async () => {
    const user = userEvent.setup();
    const fakeFile = new File(['%PDF-1.4'], 'teste.pdf', { type: 'application/pdf' });

    render(<App />);

    // Simula a seleção do arquivo diretamente no store, equivalente ao que
    // handleFileUpload faz após o <input type="file"> disparar onChange.
    usePdfStore.getState().setFile(fakeFile, { id: 'x', name: 'teste.pdf' });

    expect(await screen.findByText(/Página 1 de 3/)).toBeInTheDocument();

    const nextButtons = screen.getAllByRole('button');
    const nextPageButton = nextButtons.find((b) => b.querySelector('svg.lucide-chevron-right'));
    expect(nextPageButton).toBeTruthy();

    await user.click(nextPageButton!);
    expect(await screen.findByText(/Página 2 de 3/)).toBeInTheDocument();
    expect(usePdfStore.getState().currentPage).toBe(2);
  });

  it('abre o modal de "ir para página" e fecha com Esc', async () => {
    const user = userEvent.setup();
    const fakeFile = new File(['%PDF-1.4'], 'teste.pdf', { type: 'application/pdf' });

    render(<App />);
    usePdfStore.getState().setFile(fakeFile, { id: 'x', name: 'teste.pdf' });

    const pageLabel = await screen.findByText(/Página 1 de 3/);
    await user.click(pageLabel);

    expect(await screen.findByText('Ir para página')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Ir para página')).not.toBeInTheDocument();
    });
  });
});
