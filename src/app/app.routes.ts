import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio';
import { PedidosComponent } from './pedidos/pedidos';
import { LoginComponent } from './Login/Login';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { path: 'pedidos', component: PedidosComponent },
  { path: 'login', component: LoginComponent }
];