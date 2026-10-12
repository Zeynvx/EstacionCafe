import { Injectable, inject } from '@angular/core';
import { Store, User } from '../../core/store';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private store = inject(Store);
  list() { return this.store.users().filter(user => user.rol === 'Cliente'); }
  async save(user: Omit<User, 'hash' | 'salt'>, password: string) { return this.store.saveUser(user, password); }
  delete(id: string) {
    if (id === this.store.user()?.id || this.store.orders().some(order => order.userId === id)) throw new Error('No se puede eliminar tu cuenta actual ni una cuenta con pedidos.');
    this.store.users.update(rows => rows.filter(row => row.id !== id)); this.store.persist();
  }
}
