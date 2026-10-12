import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '../../core/store';
export const sections = [
  ['dashboard', 'Resumen'],
  ['pedidos', 'Pedidos'],
  ['productos', 'Carta'],
  ['categorias', 'Categorías'],
  ['empleados', 'Empleados'],
  ['clientes', 'Clientes'],
  ['stock', 'Stock'],
  ['proveedores', 'Proveedores'],
  ['compras', 'Compras'],
];
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  store = inject(Store);
  router = inject(Router);
  sections = sections;
  logout() {
    this.store.logout();
    this.router.navigateByUrl('/login');
  }
}
