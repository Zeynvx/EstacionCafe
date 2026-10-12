import { TestBed } from '@angular/core/testing';
import { Store, User, Line, price, total } from './store';
const line: Line = {
  id: 'line',
  productoId: 1,
  nombre: 'Café',
  precio: 8.5,
  cantidad: 2,
  leche: 'Avena',
  endulzante: 'Stevia',
  extras: ['Shot extra'],
  indicaciones: 'Tibio',
};
const user = (rol: User['rol']): User => ({
  id: rol,
  nombre: rol,
  paterno: '',
  materno: '',
  correo: rol + '@example.com',
  usuario: rol,
  telefono: '',
  direccion: '',
  rol,
  hash: '',
  salt: '',
});
describe('Store workflows', () => {
  let store: Store;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    store = TestBed.inject(Store);
  });
  it('persists customized cart and validates quantities', () => {
    store.add(line);
    const id = store.cart()[0].id;
    store.quantity(id, 0);
    expect(store.count()).toBe(2);
    store.quantity(id, 3);
    expect(store.cartTotal()).toBe(25.5);
    const restored = new Store();
    expect(restored.cart()[0].leche).toBe('Avena');
    expect(restored.count()).toBe(3);
    store.remove(id);
    expect(store.count()).toBe(0);
  });
  it('calculates discounts and rounded totals', () => {
    expect(
      price({ ...store.products()[0], precio: 19.5, descuento: (1 - 13.9 / 19.5) * 100 }),
    ).toBe(13.9);
    expect(total([{ ...line, precio: 0.1, cantidad: 3 }])).toBe(0.3);
  });
  it('enforces role access and kitchen-only completion', () => {
    store.users.set(
      ['Administrador', 'Logistica', 'Barista / Cocina', 'Caja', 'Cliente'].map((r) =>
        user(r as User['rol']),
      ),
    );
    store.sessionId.set('Logistica');
    expect(store.allowed('stock')).toBe(true);
    expect(store.allowed('trabajadores')).toBe(false);
    expect(store.canEditOrders()).toBe(false);
    const o = store.place({
      userId: null,
      nombre: '',
      correo: '',
      telefono: '',
      direccion: '',
      mesa: '2',
      entrega: 'Mesa',
      pago: 'Efectivo',
      items: [line],
    });
    store.state(o.id, 'Finalizado');
    expect(store.orders()[0].estado).toBe('Pendiente');
    store.sessionId.set('Barista / Cocina');
    store.paid(o.id);
    expect(store.orders()[0].pagado).toBe(false);
    store.state(o.id, 'En preparación');
    expect(store.orders()[0].estado).toBe('Pendiente');
    store.state(o.id, 'Finalizado');
    expect(store.orders()[0].estado).toBe('Finalizado');
    store.sessionId.set('Caja');
    store.paid(o.id);
    expect(store.orders()[0].pagado).toBe(true);
    expect(store.allowed('compras')).toBe(false);
  });
  it('receives a purchase once with the stock unit unchanged', () => {
    store.users.set([user('Logistica')]);
    store.sessionId.set('Logistica');
    const before = store.stock()[0];
    store.purchases.set([
      {
        id: 'p',
        proveedor: 's',
        insumo: before.id,
        cantidad: 2,
        costo: 20,
        fecha: '2026-10-11',
        recibida: false,
      },
    ]);
    store.receive('p');
    store.receive('p');
    expect(store.stock()[0].cantidad).toBe(before.cantidad + 2);
    expect(store.stock()[0].unidad).toBe(before.unidad);
  });
  it('rejects empty orders and keeps electronic payments pending', () => {
    const data = {
      userId: null,
      nombre: 'Ana',
      correo: 'ana@example.com',
      telefono: '999999999',
      direccion: 'Calle 1',
      mesa: '',
      entrega: 'Delivery',
      pago: 'Billetera digital',
      items: [],
    };
    expect(() => store.place(data)).toThrow();
    const order = store.place({ ...data, items: [line] });
    expect(order.pagado).toBe(false);
    expect(order.total).toBe(17);
  });
});
