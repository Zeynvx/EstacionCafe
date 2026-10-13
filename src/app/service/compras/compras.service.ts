import { Injectable, inject } from '@angular/core';
import { Purchase, Store } from '../../core/store';
import { API_MODE } from '../../core/api.config';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private store = inject(Store);
  list() { return this.store.purchases(); }
  async save(purchase: Purchase, editing: boolean) {
    if (editing && this.store.purchases().find(row => row.id === purchase.id)?.recibida) throw new Error('Una compra recibida no se puede editar.');
    if (API_MODE === 'http') {
      await this.store.savePurchaseRecord(purchase, editing);
      return;
    }
    this.store.purchases.update(rows => editing ? rows.map(row => row.id === purchase.id ? purchase : row) : [...rows, purchase]); await this.store.persist();
  }
  async receive(id: string) { await this.store.receive(id); }
  async delete(id: string) {
    if (this.store.purchases().find(row => row.id === id)?.recibida) throw new Error('Una compra recibida no se puede eliminar.');
    await this.store.deleteRecord('purchases', id); this.store.purchases.update(rows => rows.filter(row => row.id !== id)); await this.store.persist();
  }
}
