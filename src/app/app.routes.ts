import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio';
import { PedidosComponent } from './pages/pedidos/pedidos';
import { LoginComponent } from './pages/Login/Login';
import { Postres } from './pages/postres/postres';
import { productosComponent } from './pages/productos/productos';
import { PromocionesComponent } from './pages/promociones/promociones';
import { Layout } from './pages/layout/layout';
import { AdminLayout } from './admin/admin-layout/admin-layout';
import { Dashboard } from './admin/dashboard/dashboard';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: InicioComponent },
      { path: 'promociones', component: PromocionesComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'login', component: LoginComponent },
      { path: 'carta-cafes', component: Postres },
      { path: 'productos', component: productosComponent },
    ],
  },
  {
    path: 'admin',
    component: AdminLayout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
    ]
  },
  { path: '**', redirectTo: 'inicio' },
];
