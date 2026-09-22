import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio';
import { PedidosComponent } from './pedidos/pedidos';
import { LoginComponent } from './Login/Login';
import { Postres } from './postres/postres';
import { productosComponent } from './productos/productos';
import { PromocionesComponent } from './promociones/promociones';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { path: 'promociones', component: PromocionesComponent },
  { path: 'pedidos', component: PedidosComponent },
  { path: 'login', component: LoginComponent },
  { path: 'carta-cafes', component: Postres },
  { path: 'productos', component: productosComponent }
];