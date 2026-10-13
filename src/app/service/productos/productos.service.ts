import { Injectable, inject } from '@angular/core';
import { Product, Store } from '../../core/store';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private store = inject(Store);
  list() { return this.store.products(); }
  async save(product: Product, editing: boolean) {
    this.store.products.update(rows => editing ? rows.map(row => row.id === product.id ? product : row) : [...rows, product]);
    await this.store.persist();
  }
  async delete(id: number) { await this.store.deleteRecord('products', id); this.store.products.update(rows => rows.filter(row => row.id !== id)); await this.store.persist(); }
}
