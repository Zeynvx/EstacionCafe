import { Injectable, inject } from '@angular/core';
import { Category, Store } from '../../core/store';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private store = inject(Store);
  list() {
    return this.store.categories();
  }
  async save(category: Category, editing: boolean) {
    this.store.categories.update((rows) =>
      editing ? rows.map((row) => (row.id === category.id ? category : row)) : [...rows, category],
    );
    await this.store.persist();
  }
  async delete(id: string) {
    if (this.store.products().some((product) => product.categoria === id))
      throw new Error('La categoría tiene productos. Reasígnalos antes de eliminarla.');
    await this.store.deleteRecord('categories', id);
    this.store.categories.update((rows) => rows.filter((row) => row.id !== id));
    await this.store.persist();
  }
}
