import { Component, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Category } from '../../core/store';
import { CategoriasService } from '../../service/categorias/categorias.service';
import { DataTableComponent, TableRow } from '../../shared/data-table';

@Component({ selector: 'app-categorias', imports: [FormsModule, DataTableComponent], templateUrl: './categorias.html' })
export class CategoriesPage {
  service = inject(CategoriasService);
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  rows = computed<TableRow[]>(() => this.service.list().map(c => ({ id: c.id, cells: [c.nombre, c.postre ? 'Sí' : 'No'], actions: ['Editar', 'Eliminar'] })));
  draft: Category = this.empty(); editing = false; error = ''; notice = '';
  private empty(): Category { return { id: '', nombre: '', postre: false }; }
  open(category?: Category) { this.editing = !!category; this.draft = category ? { ...category } : this.empty(); this.error = ''; this.editor.nativeElement.showModal(); }
  async save(form: NgForm) {
    this.error = ''; if (form.invalid) { form.control.markAllAsTouched(); return; }
    const id = this.editing ? this.draft.id : this.slug(this.draft.nombre);
    if (!this.editing && this.service.list().some(c => c.nombre.toLowerCase() === this.draft.nombre.trim().toLowerCase())) { this.error = 'Esta categoría ya existe.'; return; }
    try { await this.service.save({ ...this.draft, id, nombre: this.draft.nombre.trim() }, this.editing); this.notice = 'Categoría guardada.'; this.editor.nativeElement.close(); } catch (e) { this.error = (e as Error).message; }
  }
  async remove(id: string) { if (!confirm('¿Eliminar esta categoría?')) return; try { await this.service.delete(id); this.notice = 'Categoría eliminada.'; } catch (e) { this.error = (e as Error).message; } }
  private slug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
}
