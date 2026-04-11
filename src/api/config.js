export function getDefaultApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? 'https://io.bellissimo.uz/api';
}
