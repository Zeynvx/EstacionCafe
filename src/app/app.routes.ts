import { Routes } from '@angular/router';
import { PedidosComponent } from './pedidos/pedidos';
import { LoginComponent } from './Login/Login'; // Importa tu componente de login

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // Opcional: puedes redirigir al login o mantener 'pedidos'
  { path: 'pedidos', component: PedidosComponent },
  { path: 'login', component: LoginComponent }       // Registra la ruta para el login
];