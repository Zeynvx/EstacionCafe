import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '../../core/store';
@Component({ selector: 'app-login', imports: [FormsModule], templateUrl: './Login.html' })
export class LoginComponent {
  store = inject(Store);
  changeDetector = inject(ChangeDetectorRef);
  router = inject(Router);
  loginName = '';
  password = '';
  name = '';
  email = '';
  newPassword = '';
  repeat = '';
  accepted = false;
  error = '';
  busy = false;
  async login() {
    this.busy = true;
    this.error = '';
    try {
      const u = await this.store.login(this.loginName, this.password);
      await this.router.navigateByUrl(u.rol === 'Cliente' ? '/usuario' : '/admin');
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
      this.changeDetector.markForCheck();
    }
  }
  async register(admin = false) {
    this.error = '';
    if (this.newPassword !== this.repeat) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    if (!this.accepted || (admin && this.store.users().length)) return;
    this.busy = true;
    try {
      const u = await this.store.saveUser(
        {
          id: crypto.randomUUID(),
          nombre: this.name.trim(),
          correo: this.email,
          telefono: '',
          direccion: '',
          paterno: '',
          materno: '',
          rol: admin ? 'Administrador' : 'Cliente',
          usuario: admin ? 'admin.local' : '',
        },
        this.newPassword,
      );
      await this.store.login(admin ? u.usuario : u.correo, this.newPassword);
      await this.router.navigateByUrl(admin ? '/admin' : '/usuario');
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
      this.changeDetector.markForCheck();
    }
  }
}
