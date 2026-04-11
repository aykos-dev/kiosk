import axios from 'axios';
import { getDefaultApiBaseUrl } from './config.js';

export const apiClient = axios.create({
  baseURL: getDefaultApiBaseUrl().replace(/\/$/, ''),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});
