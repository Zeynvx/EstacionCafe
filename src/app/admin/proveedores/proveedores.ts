import { Component, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Supplier } from '../../core/store';
import { ProveedoresService } from '../../service/proveedores/proveedores.service';
import { DataTableComponent, TableRow } from '../../shared/data-table';
@Component({ selector: 'app-proveedores', imports: [FormsModule, DataTableComponent], templateUrl: './proveedores.html' })
export class SuppliersPage {
  service = inject(ProveedoresService); @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  draft: Supplier = this.empty(); editing = false; error = ''; notice = '';
  rows = computed<TableRow[]>(() => this.service.list().map(s => ({ id: s.id, cells: [s.nombre, s.correo, s.telefono], actions: ['Editar', 'Eliminar'] })));
  private empty(): Supplier { return { id: '', nombre: '', correo: '', telefono: '' }; }
  open(item?: Supplier) { this.editing = !!item; this.draft = item ? { ...item } : this.empty(); this.error = ''; this.editor.nativeElement.showModal(); }
  save(form: NgForm) { this.error = ''; if (form.invalid) { form.control.markAllAsTouched(); return; } try { this.service.save({ ...this.draft, id: this.editing ? this.draft.id : crypto.randomUUID(), nombre: this.draft.nombre.trim() }, this.editing); this.notice = 'Proveedor guardado.'; this.editor.nativeElement.close(); } catch (e) { this.error = (e as Error).message; } }
  remove(id: string) { if (!confirm('¿Eliminar este proveedor?')) return; try { this.service.delete(id); this.notice = 'Proveedor eliminado.'; } catch (e) { this.error = (e as Error).message; } }
}
