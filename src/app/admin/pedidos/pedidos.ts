import { Component, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Line, Order, Product, Store, money, price, total } from '../../core/store';
import { PedidosService } from '../../service/pedidos/pedidos.service';
import { DataTableComponent, TableRow } from '../../shared/data-table';
@Component({ selector: 'app-admin-pedidos', imports: [FormsModule, DataTableComponent], templateUrl: './pedidos.html' })
export class OrdersPage {
  service = inject(PedidosService); store = inject(Store); money = money; total = total;
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  rows = computed<TableRow[]>(() => this.service.list().map(o => ({ id: o.id, cells: [o.id.slice(0, 8), `${o.nombre || 'Sin nombre'}${o.mesa ? ` / Mesa ${o.mesa}` : ''}`, o.entrega, money(o.total), `${o.pago} · ${o.pagado ? 'Pagado' : 'Pendiente'}`, o.estado], actions: this.actions(o) })));
  draft: Order = this.empty(); editing = false; readonly = false; error = ''; notice = ''; productId = ''; amount = 1; milk = 'Entera'; sweetener = 'Sin endulzante'; extras: string[] = [];
  private empty(): Order { return { id: '', userId: null, nombre: '', correo: '', telefono: '', direccion: '', mesa: '', entrega: 'Mesa', pago: 'Efectivo', pagado: false, estado: 'Pendiente', fecha: new Date().toISOString(), items: [], total: 0 }; }
  get selectedProduct(): Product | undefined { return this.store.products().find(p => p.id === Number(this.productId)); }
  get items(): Line[] { return this.draft.items; }
  get extraOptions() { return (this.selectedProduct?.adicionales || '').split(',').filter(Boolean).map(v => { const [name, cost] = v.split(':'); return { name, cost: Number(cost) || 0 }; }); }
  actions(o: Order) { if (o.estado === 'Finalizado' || o.estado === 'Cancelado') return ['Ver']; return ['Ver', ...(this.store.canEditOrders() ? ['Editar'] : []), ...((this.store.canEditOrders() || this.store.user()?.rol === 'Barista / Cocina') ? ['Finalizar'] : []), ...(this.store.canEditOrders() && o.pago === 'Efectivo' && !o.pagado ? ['Confirmar pago'] : [])]; }
  open(order?: Order, readonly = false) { this.editing = !!order; this.readonly = readonly; this.draft = order ? structuredClone(order) : this.empty(); this.error = ''; this.productId = ''; this.amount = 1; this.extras = []; this.editor.nativeElement.showModal(); }
  toggleExtra(name: string) { this.extras = this.extras.includes(name) ? this.extras.filter(e => e !== name) : [...this.extras, name]; }
  addItem() {
    const p = this.selectedProduct; if (!p || !Number.isInteger(this.amount) || this.amount < 1 || this.amount > 99) return;
    const extras = this.extraOptions.filter(e => this.extras.includes(e.name));
    this.draft.items = [...this.items, { id: crypto.randomUUID(), productoId: p.id, nombre: p.nombre, precio: Math.round((price(p) + extras.reduce((sum, e) => sum + e.cost, 0)) * 100) / 100, cantidad: this.amount, leche: p.personalizable ? this.milk : '', endulzante: p.personalizable ? this.sweetener : '', extras: extras.map(e => e.name), indicaciones: '' }]; this.extras = [];
  }
  removeItem(id: string) { this.draft.items = this.items.filter(item => item.id !== id); }
  async save(form: NgForm) {
    this.error = ''; if (form.invalid) { form.control.markAllAsTouched(); return; }
    if (!this.items.length || this.items.some(item => !Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 99)) { this.error = 'El pedido debe tener productos con cantidades válidas.'; return; }
    if (this.draft.entrega === 'Mesa') { if (!this.draft.mesa || Number(this.draft.mesa) < 1) { this.error = 'Indica el número de mesa.'; return; } this.draft.direccion = ''; } else { if (!this.draft.direccion.trim()) { this.error = 'Indica la dirección.'; return; } this.draft.mesa = ''; }
    try { await this.service.save({ ...this.draft, total: total(this.items) }, this.editing); this.notice = 'Pedido guardado.'; this.editor.nativeElement.close(); } catch (e) { this.error = (e as Error).message; }
  }
  async action(event: {id: string; action: string}) { const order = this.service.list().find(o => o.id === event.id); if (!order) return; if (event.action === 'Ver') this.open(order, true); else if (event.action === 'Editar') this.open(order); else if (event.action === 'Finalizar') { await this.service.finish(order.id); this.notice = 'Pedido finalizado.'; } else if (event.action === 'Confirmar pago') { await this.service.confirmCash(order.id); this.notice = 'Pago en efectivo confirmado.'; } }
}
