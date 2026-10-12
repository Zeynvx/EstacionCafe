import { Component, input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store, Product, Line, price, money } from '../core/store';
@Component({ selector: 'app-catalog', imports: [FormsModule], templateUrl: './catalog.html' })
export class Catalog {
  mode = input('todos');
  store = inject(Store);
  money = money;
  price = price;
  category = 'todos';
  selected: Product | null = null;
  quantity = 1;
  milk = 'Entera';
  sweetener = 'Sin endulzante';
  extras: string[] = [];
  notes = '';
  message = '';
  get products() {
    return this.store
      .products()
      .filter(
        (p) =>
          (this.mode() !== 'promociones' || p.descuento > 0) &&
          (this.mode() !== 'postres' ||
            this.store.categories().some((c) => c.id === p.categoria && c.postre)) &&
          (this.category === 'todos' || p.categoria === this.category),
      );
  }
  options(p: Product) {
    return p.adicionales
      .split(',')
      .filter(Boolean)
      .map((s) => {
        const [name, cost] = s.split(':');
        return { name, cost: Number(cost) || 0 };
      });
  }
  choose(p: Product, dialog: HTMLDialogElement) {
    this.selected = p;
    this.quantity = 1;
    this.milk = 'Entera';
    this.sweetener = 'Sin endulzante';
    this.extras = [];
    this.notes = '';
    dialog.showModal();
  }
  toggle(name: string) {
    this.extras = this.extras.includes(name)
      ? this.extras.filter((n) => n !== name)
      : [...this.extras, name];
  }
  unit() {
    return this.selected
      ? price(this.selected) +
          this.options(this.selected)
            .filter((e) => this.extras.includes(e.name))
            .reduce((n, e) => n + e.cost, 0)
      : 0;
  }
  add(dialog: HTMLDialogElement) {
    if (
      !this.selected ||
      !Number.isInteger(this.quantity) ||
      this.quantity < 1 ||
      this.quantity > 99
    )
      return;
    const p = this.selected;
    const line: Line = {
      id: '',
      productoId: p.id,
      nombre: p.nombre,
      precio: Math.round(this.unit() * 100) / 100,
      cantidad: this.quantity,
      leche: p.personalizable ? this.milk : '',
      endulzante: p.personalizable ? this.sweetener : '',
      extras: [...this.extras],
      indicaciones: this.notes.trim(),
    };
    this.store.add(line);
    this.message = `${p.nombre} agregado al carrito.`;
    dialog.close();
  }
}
