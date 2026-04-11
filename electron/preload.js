import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kiosk', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveCatalogFallback: (name, json) => ipcRenderer.invoke('catalog:saveFallback', { name, json }),
  loadCatalogFallback: (name) => ipcRenderer.invoke('catalog:loadFallback', name),
  processCheckout: (payload) => ipcRenderer.invoke('checkout:process', payload),
  listOrders: () => ipcRenderer.invoke('orders:list'),
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  setOnline: (online) => ipcRenderer.send('network:online', online),
  testPrinter: () => ipcRenderer.invoke('hardware:test-print'),
  testPayment: () => ipcRenderer.invoke('hardware:test-payment'),
  onSyncStatus: (callback) => {
    const fn = (_e, data) => callback(data);
    ipcRenderer.on('sync:status', fn);
    return () => ipcRenderer.removeListener('sync:status', fn);
  },
  onTerminalEvent: (callback) => {
    const fn = (_e, data) => callback(data);
    ipcRenderer.on('terminal:event', fn);
    return () => ipcRenderer.removeListener('terminal:event', fn);
  },
});
