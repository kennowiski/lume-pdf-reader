import { describe, it, expect } from 'vitest';
import { saveFileRecord, listRecentFiles, updateFileProgress, deleteFileRecord, makeFileId } from './fileStorage';

const bytesFor = (text: string) => new TextEncoder().encode(text).buffer;

describe('fileStorage (IndexedDB)', () => {
  it('makeFileId gera um id estável a partir de nome + tamanho', () => {
    expect(makeFileId('a.pdf', 100)).toBe('a.pdf__100');
  });

  it('salva e lista um arquivo recente', async () => {
    const id = makeFileId('doc-1.pdf', 10);
    await saveFileRecord({
      id,
      name: 'doc-1.pdf',
      bytes: bytesFor('conteúdo'),
      lastPage: 1,
      numPages: 5,
      updatedAt: Date.now(),
    });

    const recent = await listRecentFiles();
    expect(recent.some((r) => r.id === id)).toBe(true);
  });

  it('updateFileProgress atualiza a última página lida', async () => {
    const id = makeFileId('doc-2.pdf', 20);
    await saveFileRecord({
      id,
      name: 'doc-2.pdf',
      bytes: bytesFor('conteúdo'),
      lastPage: 1,
      numPages: 10,
      updatedAt: Date.now(),
    });

    await updateFileProgress(id, 6, 10);

    const recent = await listRecentFiles();
    const record = recent.find((r) => r.id === id);
    expect(record?.lastPage).toBe(6);
  });

  it('deleteFileRecord remove o arquivo da lista', async () => {
    const id = makeFileId('doc-3.pdf', 30);
    await saveFileRecord({
      id,
      name: 'doc-3.pdf',
      bytes: bytesFor('conteúdo'),
      lastPage: 1,
      numPages: 1,
      updatedAt: Date.now(),
    });

    await deleteFileRecord(id);

    const recent = await listRecentFiles();
    expect(recent.some((r) => r.id === id)).toBe(false);
  });

  it('listRecentFiles ordena do mais recente para o mais antigo', async () => {
    const idOld = makeFileId('velho.pdf', 1);
    const idNew = makeFileId('novo.pdf', 2);
    await saveFileRecord({ id: idOld, name: 'velho.pdf', bytes: bytesFor('a'), lastPage: 1, numPages: 1, updatedAt: 1000 });
    await saveFileRecord({ id: idNew, name: 'novo.pdf', bytes: bytesFor('b'), lastPage: 1, numPages: 1, updatedAt: 2000 });

    const recent = await listRecentFiles();
    const idxOld = recent.findIndex((r) => r.id === idOld);
    const idxNew = recent.findIndex((r) => r.id === idNew);
    expect(idxNew).toBeLessThan(idxOld);
  });
});
