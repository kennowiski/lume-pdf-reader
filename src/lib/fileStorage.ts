// Armazena os bytes dos PDFs abertos recentemente em IndexedDB, já que
// localStorage não comporta arquivos binários grandes e o zustand persist
// (localStorage) só guarda metadados serializáveis (JSON).

const DB_NAME = 'lume-pdf-reader';
const DB_VERSION = 1;
const STORE_NAME = 'recent-files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste ambiente.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredFileRecord {
  id: string;
  name: string;
  bytes: ArrayBuffer;
  lastPage: number;
  numPages: number | null;
  updatedAt: number;
}

export async function saveFileRecord(record: StoredFileRecord): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Falha silenciosa: persistência é um extra, não deve travar o app.
  }
}

export async function updateFileProgress(id: string, lastPage: number, numPages: number | null): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as StoredFileRecord | undefined;
        if (existing) {
          existing.lastPage = lastPage;
          existing.numPages = numPages;
          existing.updatedAt = Date.now();
          store.put(existing);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignora
  }
}

export async function listRecentFiles(limit = 8): Promise<StoredFileRecord[]> {
  try {
    const db = await openDb();
    const records = await new Promise<StoredFileRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as StoredFileRecord[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return records.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
  } catch {
    return [];
  }
}

export async function deleteFileRecord(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignora
  }
}

export async function getFileRecord(id: string): Promise<StoredFileRecord | undefined> {
  try {
    const db = await openDb();
    const record = await new Promise<StoredFileRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result as StoredFileRecord | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record;
  } catch {
    return undefined;
  }
}

// Um id estável por arquivo, baseado em nome + tamanho (evita depender de hash pesado).
export function makeFileId(name: string, size: number): string {
  return `${name}__${size}`;
}
