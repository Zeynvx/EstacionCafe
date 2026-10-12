import { Component, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Store, User, roles } from '../../core/store';
import { EmpleadosService } from '../../service/empleados/empleados.service';
import { DataTableComponent, TableRow } from '../../shared/data-table';

type EmployeeDraft = Omit<User, 'hash' | 'salt'> & { password: string };
@Component({
  selector: 'app-empleados',
  imports: [FormsModule, DataTableComponent],
  templateUrl: './empleados.html',
})
export class WorkersPage {
  service = inject(EmpleadosService);
  store = inject(Store);
  roles = roles;
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  rows = computed<TableRow[]>(() =>
    this.service
      .list()
      .map((u) => ({
        id: u.id,
        cells: [`${u.nombre} ${u.paterno} ${u.materno}`.trim(), u.usuario, u.correo, u.rol],
        actions: ['Editar', 'Eliminar'],
      })),
  );
  draft: EmployeeDraft = this.empty();
  editing = false;
  busy = false;
  error = '';
  notice = '';
  private empty(): EmployeeDraft {
    return {
      id: '',
      nombre: '',
      paterno: '',
      materno: '',
      correo: '',
      telefono: '',
      direccion: '',
      rol: 'Caja',
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
  changedName() {
    const clean = (s: string) =>
      s
        .trim()
        .split(/\s+/)[0]
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .toLowerCase();
    this.draft.usuario = `${clean(this.draft.nombre)}.${clean(this.draft.paterno)}`;
  }
  async save(form: NgForm) {
    this.error = '';
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    if (!/^[a-z]+\.[a-z]+\d*$/.test(this.draft.usuario)) {
      this.error = 'Usa primernombre.primerapellido; agrega un número si hay un homónimo.';
      return;
    }
    if (!this.editing && this.draft.password.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.draft.id === this.store.user()?.id && this.draft.rol !== 'Administrador') {
      this.error = 'No puedes quitarte el rol de administrador.';
      return;
    }
    this.busy = true;
    try {
      const { password, ...data } = this.draft;
      await this.service.save(
        { ...data, id: this.editing ? data.id : crypto.randomUUID() },
        password,
      );
      this.notice = 'Empleado guardado.';
      this.editor.nativeElement.close();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }
  remove(id: string) {
    if (!confirm('¿Eliminar este empleado?')) return;
    try {
      this.service.delete(id);
      this.notice = 'Empleado eliminado.';
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
}
