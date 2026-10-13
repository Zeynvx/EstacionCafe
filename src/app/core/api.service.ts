import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  private options() {
    const token = sessionStorage.getItem('ec.accessToken');
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
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
    return firstValueFrom(this.http.get<T[]>(this.url(resource), this.options()));
  }

  async login(login: string, password: string) {
    return firstValueFrom(this.http.post<{accessToken: string; user: any}>(`${API_BASE_URL}/auth/login`, {login, password}));
  }
  async bootstrapAvailable() {
    return firstValueFrom(this.http.get<{disponible: boolean}>(`${API_BASE_URL}/auth/bootstrap-status`));
  }
  async me() { return firstValueFrom(this.http.get<any>(`${API_BASE_URL}/auth/me`, this.options())); }
  async logout() { return firstValueFrom(this.http.post<void>(`${API_BASE_URL}/auth/logout`, {}, this.options())); }
  async saveUser(profile: any, password: string, creating = false) {
    if (profile.id === this.currentUserId() && profile.rol === 'Cliente') {
      const { password: _ignored, ...body } = profile;
      return firstValueFrom(this.http.put<any>(`${API_BASE_URL}/auth/me/profile`, body, this.options()));
    }
    if (profile.rol === 'Cliente') throw new Error('No se puede crear clientes desde la administración.');
    if (password) profile = { ...profile, password };
    if (creating) return firstValueFrom(this.http.post<any>(this.url('users'), profile, this.options()));
    return firstValueFrom(this.http.put<any>(`${this.url('users')}/${encodeURIComponent(profile.id)}`, profile, this.options()));
  }
  async changePassword(currentPassword: string, newPassword: string) {
    return firstValueFrom(this.http.put<void>(`${API_BASE_URL}/auth/me/password`, {currentPassword, newPassword}, this.options()));
  }
  private currentUserId() { return sessionStorage.getItem('ec.session'); }
  async register(profile: any, password: string) {
    const endpoint = profile.rol === 'Administrador' ? 'bootstrap-admin' : 'register';
    const response = await firstValueFrom(this.http.post<any>(`${API_BASE_URL}/auth/${endpoint}`, {...profile, password}));
    if (profile.rol === 'Cliente') {
      sessionStorage.setItem('ec.accessToken', response.accessToken);
      return response.user;
    }
    return response;
  }
  async receivePurchase(id: string) {
    return firstValueFrom(this.http.post<any>(`${this.url('purchases')}/${encodeURIComponent(id)}/receive`, {}, this.options()));
  }
  async createOrder(order: any) {
    const { fecha: _fecha, total: _total, estado: _estado, pagado: _paid, ...body } = order;
    return firstValueFrom(this.http.post<any>(this.url('orders'), body, this.options()));
  }
  async savePurchase(purchase: any, editing: boolean) {
    const url = editing ? `${this.url('purchases')}/${encodeURIComponent(purchase.id)}` : this.url('purchases');
    const body = { ...purchase, fecha: new Date(purchase.fecha).toISOString() };
    return firstValueFrom(editing ? this.http.put<any>(url, body, this.options()) : this.http.post<any>(url, body, this.options()));
  }
  async delete(resource: ApiResource, id: string | number) {
    return firstValueFrom(this.http.delete<void>(`${this.url(resource)}/${encodeURIComponent(String(id))}`, this.options()));
  }
  async receiveOrder(id: string) {
    return firstValueFrom(this.http.post<any>(`${this.url('orders')}/${encodeURIComponent(id)}/confirm-cash`, {}, this.options()));
  }
  async setOrderStatus(id: string, estado: string) {
    return firstValueFrom(this.http.patch<any>(`${this.url('orders')}/${encodeURIComponent(id)}/status`, {estado}, this.options()));
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
    if (resource === 'orders') {
      const before = new Map(previous.map((item: any) => [String(item.id), item]));
      const after = new Map(current.map((item: any) => [String(item.id), item]));
      const jobs: Promise<unknown>[] = [];
      for (const [id, item] of after) {
        const prior: any = before.get(id);
        if (!prior) jobs.push(firstValueFrom(this.http.post(this.url(resource), item, this.options())));
        else if (JSON.stringify(prior) !== JSON.stringify(item)) {
          if (prior.estado !== item.estado) jobs.push(firstValueFrom(this.http.patch(`${this.url(resource)}/${encodeURIComponent(id)}/status`, {estado: (item as any).estado}, this.options())));
          if (!prior.pagado && (item as any).pagado) jobs.push(firstValueFrom(this.http.post(`${this.url(resource)}/${encodeURIComponent(id)}/confirm-cash`, {}, this.options())));
          if (prior.estado === (item as any).estado && prior.pagado === (item as any).pagado) jobs.push(firstValueFrom(this.http.put(`${this.url(resource)}/${encodeURIComponent(id)}`, item, this.options())));
        }
      }
      return Promise.all(jobs).then(() => undefined);
    }
    const before = new Map(previous.map((item) => [String(item.id), item]));
    const after = new Map(current.map((item) => [String(item.id), item]));
    const requests: Promise<unknown>[] = [];
    for (const [id, item] of after) {
      const prior = before.get(id);
      if (!prior) requests.push(firstValueFrom(this.http.post(this.url(resource), item, this.options())));
      else if (JSON.stringify(prior) !== JSON.stringify(item))
        requests.push(
          firstValueFrom(this.http.put(`${this.url(resource)}/${encodeURIComponent(id)}`, item, this.options())),
        );
    }
    for (const id of before.keys())
      if (!after.has(id))
        requests.push(
          firstValueFrom(this.http.delete(`${this.url(resource)}/${encodeURIComponent(id)}`, this.options())),
        );
    await Promise.all(requests);
  }
}
