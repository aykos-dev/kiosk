import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';

const CACHE_KEY = 'bellissimo-kiosk-react-query-catalog';

const idbStorage = {
  getItem: async (key) => {
    const value = await get(key);
    return value ?? null;
  },
  setItem: async (key, value) => {
    await set(key, value);
  },
  removeItem: async (key) => {
    await del(key);
  },
};

export const catalogPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: CACHE_KEY,
  throttleTime: 1000,
});
