# Lume — Leitor de PDF

Leitor de PDF simples, rápido e offline, direto no navegador. Sem contas, sem anúncios — tudo roda no seu aparelho.

**App publicado:** https://lume-pdf-reader-iota.vercel.app

## Funcionalidades

- Leitura em modo Scroll (contínuo) ou Livro (página a página, com gestos de swipe)
- Modo "Ler Texto": extrai e exibe o texto da página, com busca dentro da página
- Zoom (pinça no touch, `Alt/Ctrl` + scroll no desktop) e rotação
- Temas Claro, Escuro, Sépia e Automático (segue o sistema), com persistência entre sessões
- Lista de "Continuar lendo": os PDFs abertos ficam salvos localmente (IndexedDB), com a página onde você parou
- Ferramentas de PDF: mesclar arquivos, dividir/extrair páginas, e converter imagens (JPG/PNG) em PDF — tudo offline, local no navegador
- Instalável como PWA (ícone, splash e tela cheia no celular)

## Rodando localmente

Pré-requisitos: Node.js 18+ e npm.

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

Outros comandos úteis:

```bash
npm run build    # build de produção (tsc + vite build) em dist/
npm run preview  # serve o build de produção localmente
npm run lint     # roda o eslint
npm run test     # roda os testes (vitest)
```

## Estrutura do projeto

```
src/
  components/
    PdfViewer.tsx        # renderização do PDF (scroll/livro, zoom, extração de texto, busca)
    Sidebar.tsx           # miniaturas de página (Document único do react-pdf, ver comentário no arquivo)
    PdfTools.tsx           # mesclar / dividir / imagem→PDF (pdf-lib), carregado sob demanda
    JumpToPageModal.tsx    # modal de "ir para página"
    RecentFiles.tsx        # lista de "Continuar lendo" na tela inicial
    ErrorBoundary.tsx      # error boundary global do app
  hooks/
    useActiveTheme.ts      # resolve o tema "Automático" para claro/escuro
  lib/
    fileStorage.ts         # persistência dos PDFs recentes em IndexedDB
  store/
    usePdfStore.ts         # estado global (zustand), com persistência de tema/modo de visualização
```

## Stack

React 19 + TypeScript + Vite, Tailwind CSS v4, zustand, react-pdf (pdf.js), pdf-lib, lucide-react.
