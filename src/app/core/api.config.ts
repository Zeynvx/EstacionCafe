export const API_BASE_URL = 'http://localhost:3000/api/v1';
export const API_MODE: 'mock' | 'http' = 'mock';

export const API_RESOURCES = [
  'products',
  'categories',
  'users',
  'orders',
  'stock',
  'suppliers',
  'purchases',
] as const;

export type ApiResource = (typeof API_RESOURCES)[number];
