import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store, money } from '../../core/store';
@Component({
  selector: 'app-usuario',
  imports: [FormsModule, DatePipe],
  templateUrl: './usuario.html',
})
export class Usuario {
  store = inject(Store);
  changeDetector = inject(ChangeDetectorRef);
  router = inject(Router);
  money = money;
  data = { ...this.store.user()! };
  current = '';
  password = '';
  repeat = '';
  message = '';
  error = '';
  busy = false;
  get orders() {
    return this.store.orders().filter((o) => o.userId === this.store.user()?.id);
  }
  async save() {
    this.error = '';
    this.message = '';
    this.busy = true;
    try {
      if (this.password) {
        if (this.password !== this.repeat) throw new Error('Las contraseñas no coinciden.');
        const u = this.store.user()!;
        if ((await this.store.credentials(this.current, u.salt)).hash !== u.hash)
          throw new Error('La contraseña actual es incorrecta.');
      }
      await this.store.saveUser(
        { ...this.data, correo: this.store.user()!.correo, rol: 'Cliente' },
        this.password,
      );
      this.password = '';
      this.current = '';
      this.repeat = '';
      this.message = 'Tus datos se guardaron.';
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
      this.changeDetector.markForCheck();
    }
  }
  logout() {
    this.store.logout();
    this.router.navigateByUrl('/inicio');
  }
}
