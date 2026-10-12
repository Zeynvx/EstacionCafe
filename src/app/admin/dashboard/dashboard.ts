import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store, money } from '../../core/store';
@Component({ selector: 'app-dashboard', imports: [RouterLink], templateUrl: './dashboard.html' })
export class Dashboard {
  store = inject(Store);
  money = money;
  get pending() {
    return this.store.orders().filter((o) => !['Finalizado', 'Cancelado'].includes(o.estado))
      .length;
  }
  get sales() {
    return this.store
      .orders()
      .filter((o) => o.pagado && o.estado !== 'Cancelado')
      .reduce((n, o) => n + o.total, 0);
  }
  get low() {
    return this.store.stock().filter((s) => s.cantidad <= s.minimo);
  }
}
