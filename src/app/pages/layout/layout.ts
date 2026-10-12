import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { Store, money } from '../../core/store';
@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.html',
})
export class Layout {
  store = inject(Store);
  router = inject(Router);
  money = money;
  checkout(drawer: HTMLDialogElement) {
    drawer.close();
    this.router.navigateByUrl('/pedidos');
  }
  logout() {
    this.store.logout();
    this.router.navigateByUrl('/inicio');
  }
}
