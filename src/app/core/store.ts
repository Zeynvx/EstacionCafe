import { Injectable, computed, inject, signal } from '@angular/core';
import menu from './menu.json';
import { ApiService } from './api.service';
import { API_RESOURCES, ApiResource } from './api.config';

export type Role = 'Administrador' | 'Logistica' | 'Barista / Cocina' | 'Caja' | 'Cliente';
export interface Product {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  descuento: number;
  personalizable: boolean;
  adicionales: string;
}
export interface User {
  id: string;
  nombre: string;
  paterno: string;
  materno: string;
  correo: string;
  telefono: string;
  direccion: string;
  rol: Role;
  usuario: string;
  hash: string;
  salt: string;
}
export interface Line {
  id: string;
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  leche: string;
  endulzante: string;
  extras: string[];
  indicaciones: string;
}
export interface Order {
  id: string;
  userId: string | null;
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  mesa: string;
  entrega: string;
  pago: string;
  pagado: boolean;
  estado: string;
  fecha: string;
  items: Line[];
  total: number;
}
export interface Category {
  id: string;
  nombre: string;
  postre: boolean;
}
export interface Stock {
  id: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  minimo: number;
}
export interface Supplier {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
}
export interface Purchase {
  id: string;
  proveedor: string;
  insumo: string;
  cantidad: number;
  costo: number;
  fecha: string;
  recibida: boolean;
}
export const roles: Role[] = ['Administrador', 'Logistica', 'Barista / Cocina', 'Caja'];
export const money = (n: number) => `S/ ${n.toFixed(2)}`;
const read = <T>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem('ec.' + key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
};
export const price = (p: Product) => Math.round(p.precio * (1 - p.descuento / 100) * 100) / 100;
export const total = (lines: Line[]) =>
  Math.round(lines.reduce((sum, l) => sum + l.precio * l.cantidad, 0) * 100) / 100;

@Injectable({ providedIn: 'root' })
export class Store {
  private api = inject(ApiService);
  private synced = new Map<ApiResource, any[]>();
  private pendingSync = new Map<ApiResource, Promise<void>>();
  loading = signal(true);
  products = signal<Product[]>(read('products', menu));
  categories = signal<Category[]>(
    read('categories', [
      { id: 'cafes', nombre: 'Cafés de especialidad', postre: false },
      { id: 'postres', nombre: 'Postres y repostería', postre: true },
      { id: 'bebidas', nombre: 'Bebidas frías', postre: false },
      { id: 'combos', nombre: 'Combos', postre: false },
    ]),
  );
  users = signal<User[]>(read('users', []));
  orders = signal<Order[]>(read('orders', []));
  stock = signal<Stock[]>(
    read('stock', [
      { id: 'cafe', nombre: 'Café en grano', unidad: 'kg', cantidad: 12, minimo: 3 },
      { id: 'leche', nombre: 'Leche entera', unidad: 'L', cantidad: 20, minimo: 5 },
    ]),
  );
  suppliers = signal<Supplier[]>(read('suppliers', []));
  purchases = signal<Purchase[]>(read('purchases', []));
  cart = signal<Line[]>(read('cart', []));
  sessionId = signal<string | null>(sessionStorage.getItem('ec.session'));
  user = computed(() => this.users().find((u) => u.id === this.sessionId()) ?? null);
  count = computed(() => this.cart().reduce((n, l) => n + l.cantidad, 0));
  cartTotal = computed(() => total(this.cart()));
  storageError = signal('');

  async initialize() {
    try {
      const initial = {
        products: this.products(),
        categories: this.categories(),
        users: this.users(),
        orders: this.orders(),
        stock: this.stock(),
        suppliers: this.suppliers(),
        purchases: this.purchases(),
      };
      const loaded = await Promise.all(
        API_RESOURCES.map((resource) =>
          this.api.getCollection<any>(resource, initial[resource] as any[]),
        ),
      );
      API_RESOURCES.forEach((resource, index) => {
        (this[resource] as any).set(loaded[index]);
        this.synced.set(resource, structuredClone(loaded[index]));
      });
    } catch {
      this.storageError.set('No se pudo conectar con la API. Revisa la URL y que el servidor esté disponible.');
    } finally {
      this.loading.set(false);
    }
  }

  persist() {
    try {
      localStorage.setItem('ec.cart', JSON.stringify(this.cart()));
    } catch {
      this.storageError.set('No se pudo guardar el carrito en este navegador.');
    }
    for (const resource of API_RESOURCES) {
      const rows = structuredClone((this[resource] as any)() as any[]);
      if (JSON.stringify(this.synced.get(resource) ?? []) === JSON.stringify(rows)) continue;
      const queued = (this.pendingSync.get(resource) ?? Promise.resolve())
        .then(async () => {
          const previous = this.synced.get(resource) ?? [];
          await this.api.syncCollection(resource, previous, rows);
          this.synced.set(resource, rows);
        })
        .catch(() => {
          this.storageError.set(`No se pudieron guardar los cambios de ${resource} en la API.`);
        });
      this.pendingSync.set(resource, queued);
    }
  }
  allowed(section: string) {
    const role = this.user()?.rol;
    if (role === 'Administrador') return true;
    if (section === 'dashboard') return !!role && role !== 'Cliente';
    if (role === 'Logistica')
      return ['stock', 'pedidos', 'compras', 'proveedores'].includes(section);
    return (role === 'Caja' || role === 'Barista / Cocina') && section === 'pedidos';
  }
  canEditOrders() {
    return ['Administrador', 'Caja'].includes(this.user()?.rol || '');
  }
  add(line: Line) {
    this.cart.update((a) => [...a, { ...line, id: crypto.randomUUID() }]);
    this.persist();
  }
  quantity(id: string, n: number) {
    if (!Number.isInteger(n) || n < 1 || n > 99) return;
    this.cart.update((a) => a.map((l) => (l.id === id ? { ...l, cantidad: n } : l)));
    this.persist();
  }
  remove(id: string) {
    this.cart.update((a) => a.filter((l) => l.id !== id));
    this.persist();
  }
  async credentials(password: string, salt: string = crypto.randomUUID()) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
      key,
      256,
    );
    return {
      salt,
      hash: Array.from(new Uint8Array(bits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    };
  }
  async login(login: string, password: string) {
    const user = this.users().find(
      (u) =>
        (u.rol === 'Cliente' ? u.correo : u.usuario).toLowerCase() === login.trim().toLowerCase(),
    );
    if (!user || (await this.credentials(password, user.salt)).hash !== user.hash)
      throw new Error('Usuario o contraseña incorrectos.');
    this.sessionId.set(user.id);
    sessionStorage.setItem('ec.session', user.id);
    return user;
  }
  logout() {
    this.sessionId.set(null);
    sessionStorage.removeItem('ec.session');
  }
  async saveUser(data: Omit<User, 'hash' | 'salt'>, password: string) {
    const old = this.users().find((u) => u.id === data.id);
    if (
      this.users().some(
        (u) =>
          u.id !== data.id &&
          (u.correo.toLowerCase() === data.correo.toLowerCase() ||
            (data.usuario && u.usuario === data.usuario)),
      )
    )
      throw new Error('El correo o usuario ya está registrado.');
    if ((!old || password) && password.length < 8)
      throw new Error('La contraseña debe tener al menos 8 caracteres.');
    const secret = password
      ? await this.credentials(password)
      : { hash: old!.hash, salt: old!.salt };
    const user = { ...data, correo: data.correo.trim().toLowerCase(), ...secret };
    this.users.update((a) => (old ? a.map((u) => (u.id === user.id ? user : u)) : [...a, user]));
    this.persist();
    return user;
  }
  place(data: Omit<Order, 'id' | 'fecha' | 'total' | 'estado' | 'pagado'>) {
    if (
      !data.items.length ||
      data.items.some((l) => !Number.isInteger(l.cantidad) || l.cantidad < 1 || l.precio < 0)
    )
      throw new Error('Agrega productos válidos al pedido.');
    const order: Order = {
      ...data,
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      total: total(data.items),
      estado: 'Pendiente',
      pagado: false,
    };
    this.orders.update((a) => [order, ...a]);
    this.persist();
    return order;
  }
  state(id: string, estado: string) {
    const order = this.orders().find((o) => o.id === id);
    if (!order || ['Finalizado', 'Cancelado'].includes(order.estado)) return;
    if (
      !this.canEditOrders() &&
      !(this.user()?.rol === 'Barista / Cocina' && estado === 'Finalizado')
    )
      return;
    this.orders.update((a) => a.map((o) => (o.id === id ? { ...o, estado } : o)));
    this.persist();
  }
  paid(id: string) {
    if (!this.canEditOrders()) return;
    this.orders.update((a) =>
      a.map((o) =>
        o.id === id && o.pago === 'Efectivo' && o.estado !== 'Cancelado'
          ? { ...o, pagado: true }
          : o,
      ),
    );
    this.persist();
  }
  receive(id: string) {
    if (!this.allowed('compras')) return;
    const p = this.purchases().find((p) => p.id === id);
    if (!p || p.recibida) return;
    this.stock.update((a) =>
      a.map((s) => (s.id === p.insumo ? { ...s, cantidad: s.cantidad + p.cantidad } : s)),
    );
    this.purchases.update((a) => a.map((s) => (s.id === id ? { ...s, recibida: true } : s)));
    this.persist();
  }
}
