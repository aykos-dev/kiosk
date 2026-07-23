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
  testPayment: (kind = 'humo') => ipcRenderer.invoke('hardware:test-payment', kind),
  // Charge a specific card terminal: kind is 'humo' (Sunmi P3) or 'uzcard' (PAX A35).
  chargeCard: (kind, amount) => ipcRenderer.invoke('hardware:charge', { kind, amount }),
  printReceipt: (data) => ipcRenderer.invoke('hardware:print-receipt', data),
  // Hardware diagnostics (dev): fetch recent errors + subscribe to live ones.
  getHardwareErrors: () => ipcRenderer.invoke('hardware:recent-errors'),
  onHardwareError: (callback) => {
    const fn = (_e, data) => callback(data);
    ipcRenderer.on('hardware:error', fn);
    return () => ipcRenderer.removeListener('hardware:error', fn);
  },
  onSyncStatus: (callback) => {
    const fn = (_e, data) => callback(data);
    ipcRenderer.on('sync:status', fn);
    return () => ipcRenderer.removeListener('sync:status', fn);
  },
});
