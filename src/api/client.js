import axios from 'axios';
import { getDefaultApiBaseUrl } from './config.js';
import { API_CATALOG_TIMEOUT_MS } from '../lib/apiDefaults.js';

export const apiClient = axios.create({
  baseURL: getDefaultApiBaseUrl().replace(/\/$/, ''),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: API_CATALOG_TIMEOUT_MS,
});
