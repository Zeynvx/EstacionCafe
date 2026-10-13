import { Injectable, inject } from '@angular/core';
import { Store, User } from '../../core/store';

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private store = inject(Store);
  list() { return this.store.users().filter(user => user.rol !== 'Cliente'); }
  async save(user: Omit<User, 'hash' | 'salt'>, password: string) { return this.store.saveUser(user, password); }
  async delete(id: string) {
    if (id === this.store.user()?.id) throw new Error('No puedes desactivar tu propia cuenta.');
    await this.store.deleteRecord('users', id);
    this.store.users.update(rows => rows.filter(row => row.id !== id)); await this.store.persist();
  }
}
