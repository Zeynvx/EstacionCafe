import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, API_MODE, ApiResource } from './api.config';

/** Acceso único a la API real o al adaptador simulado del navegador. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url(resource: string) {
    return `${API_BASE_URL}/${resource}`;
  }

  async getCollection<T>(resource: ApiResource, fallback: T[]): Promise<T[]> {
    if (API_MODE === 'mock') {
      const stored = localStorage.getItem(`ec.api.${resource}`);
      if (stored) return JSON.parse(stored) as T[];
      // Adopta datos guardados por la versión anterior de la aplicación.
      const legacy = localStorage.getItem(`ec.${resource}`);
      if (legacy) {
        const rows = JSON.parse(legacy) as T[];
        localStorage.setItem(`ec.api.${resource}`, JSON.stringify(rows));
        return rows;
      }
      localStorage.setItem(`ec.api.${resource}`, JSON.stringify(fallback));
      return fallback;
    }
    return firstValueFrom(this.http.get<T[]>(this.url(resource)));
  }

  async syncCollection<T extends { id: string | number }>(
    resource: ApiResource,
    previous: T[],
    current: T[],
  ): Promise<void> {
    if (API_MODE === 'mock') {
      localStorage.setItem(`ec.api.${resource}`, JSON.stringify(current));
      return;
    }
    const before = new Map(previous.map((item) => [String(item.id), item]));
    const after = new Map(current.map((item) => [String(item.id), item]));
    const requests: Promise<unknown>[] = [];
    for (const [id, item] of after) {
      const prior = before.get(id);
      if (!prior) requests.push(firstValueFrom(this.http.post(this.url(resource), item)));
      else if (JSON.stringify(prior) !== JSON.stringify(item))
        requests.push(
          firstValueFrom(this.http.put(`${this.url(resource)}/${encodeURIComponent(id)}`, item)),
        );
    }
    for (const id of before.keys())
      if (!after.has(id))
        requests.push(
          firstValueFrom(this.http.delete(`${this.url(resource)}/${encodeURIComponent(id)}`)),
        );
    await Promise.all(requests);
  }
}
