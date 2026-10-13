import { Injectable, inject } from '@angular/core';
import { Stock, Store } from '../../core/store';

@Injectable({ providedIn: 'root' })
export class StockService {
  private store = inject(Store);
  list() { return this.store.stock(); }
  async save(item: Stock, editing: boolean) {
    const original = this.store.stock().find(row => row.id === item.id);
    if (editing && original?.unidad !== item.unidad && this.store.purchases().some(purchase => purchase.insumo === item.id)) throw new Error('No cambies la unidad de un insumo con compras asociadas.');
    this.store.stock.update(rows => editing ? rows.map(row => row.id === item.id ? item : row) : [...rows, item]); await this.store.persist();
  }
  async delete(id: string) {
    if (this.store.purchases().some(purchase => purchase.insumo === id)) throw new Error('El insumo tiene compras asociadas.');
    await this.store.deleteRecord('stock', id); this.store.stock.update(rows => rows.filter(row => row.id !== id)); await this.store.persist();
  }
}
