import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bootstrapApiBase } from './api/bootstrapApi.js';
import { shouldPersistCatalogQuery } from './api/catalogPolicy.js';
import { catalogPersister } from './api/catalogPersister.js';
import { queryClient } from './api/queryClient.js';
import App from './App.jsx';
import './index.css';

const PERSIST_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

const el = document.getElementById('root');

async function mount() {
  await bootstrapApiBase();

  if (!el) return;

  createRoot(el).render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: catalogPersister,
          maxAge: PERSIST_MAX_AGE_MS,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => shouldPersistCatalogQuery(query),
          },
        }}
      >
        <App />
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}

void mount();
