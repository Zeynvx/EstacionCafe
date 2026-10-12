import { Injectable, inject } from '@angular/core';
import { Store, Supplier } from '../../core/store';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private store = inject(Store);
  list() { return this.store.suppliers(); }
  save(supplier: Supplier, editing: boolean) {
    this.store.suppliers.update(rows => editing ? rows.map(row => row.id === supplier.id ? supplier : row) : [...rows, supplier]); this.store.persist();
  }
  delete(id: string) {
    if (this.store.purchases().some(purchase => purchase.proveedor === id)) throw new Error('El proveedor tiene compras asociadas.');
    this.store.suppliers.update(rows => rows.filter(row => row.id !== id)); this.store.persist();
  }
}
