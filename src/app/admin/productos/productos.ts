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
  save(form: NgForm) {
    this.error = ''; if (form.invalid) { form.control.markAllAsTouched(); return; }
    const image = this.draft.imagen.trim();
    if (!/^(https:\/\/|\/[^/])/.test(image)) { this.error = 'Usa una imagen https o una ruta local absoluta.'; return; }
    if (this.draft.adicionales && this.draft.adicionales.split(',').some(x => !/^.+:\d+(\.\d{1,2})?$/.test(x.trim()))) { this.error = 'Formato de adicionales: Shot extra:2,Canela:0'; return; }
    this.service.save({ ...this.draft, id: this.editing ? this.draft.id : Date.now(), nombre: this.draft.nombre.trim(), imagen: image }, this.editing); this.notice = 'Producto guardado.'; this.editor.nativeElement.close();
  }
  remove(id: string) { if (confirm('¿Eliminar este producto?')) { this.service.delete(Number(id)); this.notice = 'Producto eliminado.'; } }
}
