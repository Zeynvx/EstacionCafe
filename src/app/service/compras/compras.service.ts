import { Injectable, inject } from '@angular/core';
import { Purchase, Store } from '../../core/store';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private store = inject(Store);
  list() { return this.store.purchases(); }
  save(purchase: Purchase, editing: boolean) {
    if (editing && this.store.purchases().find(row => row.id === purchase.id)?.recibida) throw new Error('Una compra recibida no se puede editar.');
    this.store.purchases.update(rows => editing ? rows.map(row => row.id === purchase.id ? purchase : row) : [...rows, purchase]); this.store.persist();
  }
  receive(id: string) { this.store.receive(id); }
  delete(id: string) {
    if (this.store.purchases().find(row => row.id === id)?.recibida) throw new Error('Una compra recibida no se puede eliminar.');
    this.store.purchases.update(rows => rows.filter(row => row.id !== id)); this.store.persist();
  }
}
