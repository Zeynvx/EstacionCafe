import { Injectable, inject } from '@angular/core';
import { Order, Store, total } from '../../core/store';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private store = inject(Store);
  list() { return this.store.orders(); }
  async save(order: Order, editing: boolean) {
    if (editing) {
      const original = this.store.orders().find(row => row.id === order.id);
      if (!original || ['Finalizado', 'Cancelado'].includes(original.estado)) throw new Error('El pedido está cerrado.');
      if (original.pagado && (total(order.items) !== original.total || order.pago !== original.pago || order.estado === 'Cancelado')) throw new Error('Un pedido pagado no admite cambios de importe, medio de pago ni cancelación.');
      this.store.orders.update(rows => rows.map(row => row.id === order.id ? { ...order, total: total(order.items) } : row));
      await this.store.persist();
      return;
    }
    this.store.place(order);
  }
  finish(id: string) { return this.store.state(id, 'Finalizado'); }
  confirmCash(id: string) { return this.store.paid(id); }
}
