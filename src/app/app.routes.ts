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
import { Usuario } from './pages/usuario/usuario';
import { adminGuard, customerGuard } from './core/guards';
import { ProductsPage } from './admin/productos/productos';
import { CategoriesPage } from './admin/categorias/categorias';
import { WorkersPage } from './admin/empleados/empleados';
import { CustomersPage } from './admin/clientes/clientes';
import { StockPage } from './admin/stock/stock';
import { SuppliersPage } from './admin/proveedores/proveedores';
import { PurchasesPage } from './admin/compras/compras';
import { OrdersPage } from './admin/pedidos/pedidos';
export const routes: Routes = [
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard, data: { section: 'dashboard' } },
      { path: 'productos', component: ProductsPage, data: { section: 'productos' } },
      { path: 'categorias', component: CategoriesPage, data: { section: 'categorias' } },
      { path: 'empleados', component: WorkersPage, data: { section: 'trabajadores' } },
      { path: 'clientes', component: CustomersPage, data: { section: 'clientes' } },
      { path: 'stock', component: StockPage, data: { section: 'stock' } },
      { path: 'proveedores', component: SuppliersPage, data: { section: 'proveedores' } },
      { path: 'compras', component: PurchasesPage, data: { section: 'compras' } },
      { path: 'pedidos', component: OrdersPage, data: { section: 'pedidos' } },
    ],
  },
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: InicioComponent },
      { path: 'productos', component: productosComponent },
      { path: 'promociones', component: PromocionesComponent },
      { path: 'postres', component: Postres },
      { path: 'carta-cafes', redirectTo: 'postres', pathMatch: 'full' },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'login', component: LoginComponent },
      { path: 'usuario', component: Usuario, canActivate: [customerGuard] },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
