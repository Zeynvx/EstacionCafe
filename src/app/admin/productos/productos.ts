import { Component, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Product, Store, money, price } from '../../core/store';
import { ProductosService } from '../../service/productos/productos.service';
import { DataTableComponent, TableRow } from '../../shared/data-table';

@Component({ selector: 'app-productos', imports: [FormsModule, DataTableComponent], templateUrl: './productos.html' })
export class ProductsPage {
  service = inject(ProductosService); store = inject(Store); money = money;
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  rows = computed<TableRow[]>(() => this.service.list().map(p => ({ id: String(p.id), cells: [p.nombre, this.store.categories().find(c => c.id === p.categoria)?.nombre || '', money(price(p)), `${p.descuento}%`, p.personalizable ? 'Sí' : 'No'], actions: ['Editar', 'Eliminar'] })));
  draft: Product = this.empty(); editing = false; error = ''; notice = '';
  private empty(): Product { return { id: 0, nombre: '', descripcion: '', categoria: '', imagen: '', precio: 0, descuento: 0, personalizable: false, adicionales: '' }; }
  open(product?: Product) { this.editing = !!product; this.draft = product ? { ...product } : this.empty(); this.error = ''; this.editor.nativeElement.showModal(); }
  async save(form: NgForm) {
    this.error = ''; if (form.invalid) { form.control.markAllAsTouched(); return; }
    const image = this.draft.imagen.trim();
    if (!/^(https:\/\/|\/[^/])/.test(image)) { this.error = 'Usa una imagen https o una ruta local absoluta.'; return; }
    if (this.draft.adicionales && this.draft.adicionales.split(',').some(x => !/^.+:\d+(\.\d{1,2})?$/.test(x.trim()))) { this.error = 'Formato de adicionales: Shot extra:2,Canela:0'; return; }
    try { await this.service.save({ ...this.draft, id: this.editing ? this.draft.id : Math.max(0, ...this.service.list().map(p => p.id)) + 1, nombre: this.draft.nombre.trim(), imagen: image }, this.editing); this.notice = 'Producto guardado.'; this.editor.nativeElement.close(); } catch (e) { this.error = (e as Error).message; }
  }
  async remove(id: string) { if (confirm('¿Eliminar este producto?')) { try { await this.service.delete(Number(id)); this.notice = 'Producto eliminado.'; } catch (e) { this.error = (e as Error).message; } } }
}
