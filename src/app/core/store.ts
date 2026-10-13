  import { Injectable, computed, inject, signal } from '@angular/core';
  import menu from './menu.json';
  import { ApiService } from './api.service';
import { API_MODE, API_RESOURCES, ApiResource } from './api.config';

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
    hash?: string;
    salt?: string;
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
    bootstrapAvailable = signal(false);
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
    authenticatedUser = signal<User | null>(null);
    user = computed(() => this.authenticatedUser() ?? this.users().find((u) => u.id === this.sessionId()) ?? null);
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
        const resources: ApiResource[] = API_MODE === 'http' ? ['products', 'categories'] : [...API_RESOURCES];
        const loaded = await Promise.all(resources.map((resource) => this.api.getCollection<any>(resource, initial[resource] as any[])));
        resources.forEach((resource, index) => {
          (this[resource] as any).set(loaded[index]);
          this.synced.set(resource, structuredClone(loaded[index]));
        });
        if (API_MODE === 'http') this.bootstrapAvailable.set((await this.api.bootstrapAvailable()).disponible);
        if (API_MODE === 'http' && sessionStorage.getItem('ec.accessToken')) {
          try {
            const user = await this.me();
            await this.loadPrivateCollections(user);
          } catch { this.logout(); }
        }
      } catch {
        this.storageError.set('No se pudo conectar con la API. Revisa la URL y que el servidor esté disponible.');
      } finally {
        this.loading.set(false);
      }
    }

    private async me(): Promise<User> {
      const user = await this.api.me();
      this.authenticatedUser.set(user);
      this.sessionId.set(user.id);
      return user;
    }

    private async loadPrivateCollections(user: User) {
      for (const resource of ['users', 'orders', 'stock', 'suppliers', 'purchases'] as ApiResource[]) {
        (this[resource] as any).set([]);
        this.synced.set(resource, []);
      }
      const resources: ApiResource[] = user.rol === 'Administrador'
        ? ['users', 'orders', 'stock', 'suppliers', 'purchases']
        : user.rol === 'Logistica'
          ? ['orders', 'stock', 'suppliers', 'purchases']
          : ['orders'];
      const loaded = await Promise.all(resources.map((resource) => this.api.getCollection<any>(resource, [])));
      resources.forEach((resource, index) => {
        (this[resource] as any).set(loaded[index]);
        this.synced.set(resource, structuredClone(loaded[index]));
      });
      if (user.rol === 'Cliente') {
        this.users.update((rows) => rows.some((row) => row.id === user.id) ? rows.map((row) => row.id === user.id ? user : row) : [...rows, user]);
      }
    }

    async savePurchaseRecord(purchase: Purchase, editing: boolean) {
      const saved = await this.api.savePurchase(purchase, editing);
      const rows = editing ? this.purchases().map((row) => row.id === purchase.id ? saved : row) : [saved, ...this.purchases()];
      this.purchases.set(rows);
      this.synced.set('purchases', structuredClone(rows));
      return saved as Purchase;
    }

    async deleteRecord(resource: ApiResource, id: string | number) {
      if (API_MODE === 'http') {
        await this.api.delete(resource, id);
        const current = structuredClone((this[resource] as any)() as any[]);
        this.synced.set(resource, current.filter((item) => String(item.id) !== String(id)));
      }
    }

    persist(): Promise<void> {
      try {
        localStorage.setItem('ec.cart', JSON.stringify(this.cart()));
      } catch {
        this.storageError.set('No se pudo guardar el carrito en este navegador.');
      }
      const jobs: Promise<void>[] = [];
      for (const resource of API_RESOURCES) {
        if (API_MODE === 'http' && resource === 'users') continue;
        const rows = structuredClone((this[resource] as any)() as any[]);
        if (JSON.stringify(this.synced.get(resource) ?? []) === JSON.stringify(rows)) continue;
        const queued = (this.pendingSync.get(resource) ?? Promise.resolve())
          .then(async () => {
            const previous = this.synced.get(resource) ?? [];
            await this.api.syncCollection(resource, previous, rows);
            this.synced.set(resource, rows);
          })
          .catch((error) => {
            this.storageError.set(`No se pudieron guardar los cambios de ${resource} en la API.`);
            this.pendingSync.delete(resource);
            throw error;
          });
        this.pendingSync.set(resource, queued);
        jobs.push(queued);
      }
      return Promise.all(jobs).then(() => undefined);
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
      if (API_MODE === 'http') {
        const response = await this.api.login(login, password);
        sessionStorage.setItem('ec.accessToken', response.accessToken);
        sessionStorage.setItem('ec.session', response.user.id);
        this.sessionId.set(response.user.id);
        this.authenticatedUser.set(response.user);
        await this.loadPrivateCollections(response.user);
        return response.user;
      }
      const user = this.users().find(
        (u) =>
          (u.rol === 'Cliente' ? u.correo : u.usuario).toLowerCase() === login.trim().toLowerCase(),
      );
      if (!user?.hash || !user.salt || (await this.credentials(password, user.salt)).hash !== user.hash)
        throw new Error('Usuario o contraseña incorrectos.');
      this.sessionId.set(user.id);
      sessionStorage.setItem('ec.session', user.id);
      return user;
    }
    async logout() {
      if (API_MODE === 'http' && sessionStorage.getItem('ec.accessToken')) {
        try { await this.api.logout(); } catch { /* Logout local se completa aunque la red no responda. */ }
      }
      this.sessionId.set(null);
      this.authenticatedUser.set(null);
      sessionStorage.removeItem('ec.session');
      sessionStorage.removeItem('ec.accessToken');
      if (API_MODE === 'http') {
        for (const resource of ['users', 'orders', 'stock', 'suppliers', 'purchases'] as ApiResource[]) {
          (this[resource] as any).set([]);
          this.synced.set(resource, []);
        }
      }
    }
    async saveUser(data: Omit<User, 'hash' | 'salt'>, password: string, currentPassword = '') {
      if (API_MODE === 'http') {
        const existing = this.users().some((u) => u.id === data.id);
        let user: User;
        if (!existing && (data.rol === 'Administrador' || data.rol === 'Cliente')) user = await this.api.register(data, password);
        else if (data.id === this.user()?.id && data.rol === 'Cliente') {
          user = await this.api.saveUser(data, '');
          if (password) await this.api.changePassword(currentPassword, password);
        } else user = await this.api.saveUser({ ...data, password } as any, password, !existing);
        this.users.update((rows) => existing ? rows.map((row) => row.id === user.id ? user : row) : [...rows, user]);
        this.synced.set('users', structuredClone(this.users()));
        if (data.id === this.user()?.id || (!existing && data.rol === 'Cliente')) {
          this.authenticatedUser.set(user);
          this.sessionId.set(user.id);
          sessionStorage.setItem('ec.session', user.id);
          if (data.rol === 'Cliente') await this.loadPrivateCollections(user);
        }
        this.persist();
        return user;
      }
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
      void this.persist();
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
      if (API_MODE === 'http') {
        this.api.createOrder(order).then((saved) => {
          this.orders.update((a) => [saved, ...a.filter((item) => item.id !== order.id)]);
          this.synced.set('orders', structuredClone(this.orders()));
        }).catch(() => {
          this.orders.update((a) => a.filter((item) => item.id !== order.id));
          this.synced.set('orders', structuredClone(this.orders()));
          this.storageError.set('No se pudo crear el pedido en el servidor.');
        });
        this.synced.set('orders', structuredClone(this.orders()));
      } else this.orders.update((a) => [order, ...a]);
      if (API_MODE === 'mock') this.persist();
      else { try { localStorage.setItem('ec.cart', JSON.stringify(this.cart())); } catch { this.storageError.set('No se pudo guardar el carrito en este navegador.'); } }
      return order;
    }
    async state(id: string, estado: string) {
      const order = this.orders().find((o) => o.id === id);
      if (!order || ['Finalizado', 'Cancelado'].includes(order.estado)) return;
      if (
        !this.canEditOrders() &&
        !(this.user()?.rol === 'Barista / Cocina' && estado === 'Finalizado')
      )
        return;
      if (API_MODE === 'http') {
        const saved = await this.api.setOrderStatus(id, estado);
        this.orders.update((a) => a.map((o) => (o.id === id ? saved : o)));
        this.synced.set('orders', structuredClone(this.orders()));
        return;
      }
      this.orders.update((a) => a.map((o) => (o.id === id ? { ...o, estado } : o)));
      this.persist();
    }
    async paid(id: string) {
      if (!this.canEditOrders()) return;
      if (API_MODE === 'http') {
        try {
          const saved = await this.api.receiveOrder(id);
          this.orders.update((a) => a.map((o) => (o.id === id ? saved : o)));
          this.synced.set('orders', structuredClone(this.orders()));
        } catch { this.storageError.set('No se pudo confirmar el pago del pedido.'); }
        return;
      }
      this.orders.update((a) =>
        a.map((o) =>
          o.id === id && o.pago === 'Efectivo' && o.estado !== 'Cancelado'
            ? { ...o, pagado: true }
            : o,
        ),
      );
      this.persist();
    }
    async receive(id: string) {
      if (!this.allowed('compras')) return;
      if (API_MODE === 'http') {
        try {
          await this.api.receivePurchase(id);
          const [stock, purchases] = await Promise.all([this.api.getCollection('stock', []), this.api.getCollection('purchases', [])]);
          this.stock.set(stock); this.purchases.set(purchases);
          this.synced.set('stock', structuredClone(stock)); this.synced.set('purchases', structuredClone(purchases));
        } catch { this.storageError.set('No se pudo registrar la recepción de la compra.'); }
        return;
      }
      const p = this.purchases().find((p) => p.id === id);
      if (!p || p.recibida) return;
      this.stock.update((a) =>
        a.map((s) => (s.id === p.insumo ? { ...s, cantidad: s.cantidad + p.cantidad } : s)),
      );
      this.purchases.update((a) => a.map((s) => (s.id === id ? { ...s, recibida: true } : s)));
      this.persist();
    }
  }
