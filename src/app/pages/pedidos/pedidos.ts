import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store, money, Order } from '../../core/store';
@Component({
  selector: 'app-pedidos',
  imports: [FormsModule, RouterLink],
  templateUrl: './pedidos.html',
})
export class PedidosComponent {
  store = inject(Store);
  money = money;
  error = '';
  result: Order | null = null;
  data = {
    nombre: this.store.user()?.nombre || '',
    correo: this.store.user()?.correo || '',
    telefono: this.store.user()?.telefono || '',
    direccion: this.store.user()?.direccion || '',
    mesa: '',
    entrega: 'Mesa',
    pago: 'Efectivo',
  };
  finish() {
    try {
      this.result = this.store.place({
        ...this.data,
        direccion: this.data.entrega === 'Mesa' ? '' : this.data.direccion,
        mesa: this.data.entrega === 'Mesa' ? this.data.mesa : '',
        userId: this.store.user()?.id || null,
        items: structuredClone(this.store.cart()),
      });
      this.store.cart.set([]);
      this.store.persist();
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
}
