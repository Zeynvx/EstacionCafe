import { Component, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Store, User } from '../../core/store';
import { ClientesService } from '../../service/clientes/clientes.service';
import { DataTableComponent, TableRow } from '../../shared/data-table';

type CustomerDraft = Omit<User, 'hash' | 'salt'> & { password: string };
@Component({
  selector: 'app-clientes',
  imports: [FormsModule, DataTableComponent],
  templateUrl: './clientes.html',
})
export class CustomersPage {
  service = inject(ClientesService);
  store = inject(Store);
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  rows = computed<TableRow[]>(() =>
    this.service
      .list()
      .map((u) => ({
        id: u.id,
        cells: [u.nombre, u.correo, u.telefono || '—', u.direccion || '—'],
        actions: ['Editar', 'Eliminar'],
      })),
  );
  draft: CustomerDraft = this.empty();
  editing = false;
  busy = false;
  error = '';
  notice = '';
  private empty(): CustomerDraft {
    return {
      id: '',
      nombre: '',
      paterno: '',
      materno: '',
      correo: '',
      telefono: '',
      direccion: '',
      rol: 'Cliente',
      usuario: '',
      password: '',
    };
  }
  open(user?: User) {
    this.editing = !!user;
    this.draft = user ? { ...user, password: '' } : this.empty();
    this.error = '';
    this.editor.nativeElement.showModal();
  }
  async save(form: NgForm) {
    this.error = '';
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    if (!this.editing && this.draft.password.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    this.busy = true;
    try {
      const { password, ...data } = this.draft;
      await this.service.save(
        { ...data, id: this.editing ? data.id : crypto.randomUUID(), rol: 'Cliente' },
        password,
      );
      this.notice = 'Cliente guardado.';
      this.editor.nativeElement.close();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }
  remove(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      this.service.delete(id);
      this.notice = 'Cliente eliminado.';
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
}
