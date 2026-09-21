import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { 
    path: 'pedidos', 
    loadComponent: () => import('./pedidos/pedidos').then(m => m.PedidosComponent) 
  }
];