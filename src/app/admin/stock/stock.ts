import { Component, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Stock } from '../../core/store';
import { StockService } from '../../service/stock/stock.service';
import { DataTableComponent, TableRow } from '../../shared/data-table';
@Component({ selector: 'app-stock', imports: [FormsModule, DataTableComponent], templateUrl: './stock.html' })
export class StockPage {
  service = inject(StockService); @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  units = ['kg', 'g', 'L', 'mL', 'unidad']; editing = false; error = ''; notice = '';
  draft: Stock = this.empty();
  rows = computed<TableRow[]>(() => this.service.list().map(s => ({ id: s.id, cells: [s.nombre, `${s.cantidad} ${s.unidad}`, `${s.minimo} ${s.unidad}`, s.cantidad <= s.minimo ? 'Bajo mínimo' : 'Disponible'], actions: ['Editar', 'Eliminar'] })));
  private empty(): Stock { return { id: '', nombre: '', unidad: 'kg', cantidad: 0, minimo: 0 }; }
  open(item?: Stock) { this.editing = !!item; this.draft = item ? { ...item } : this.empty(); this.error = ''; this.editor.nativeElement.showModal(); }
  save(form: NgForm) { this.error = ''; if (form.invalid) { form.control.markAllAsTouched(); return; } try { const item = { ...this.draft, id: this.editing ? this.draft.id : crypto.randomUUID(), nombre: this.draft.nombre.trim() }; this.service.save(item, this.editing); this.notice = 'Insumo guardado.'; this.editor.nativeElement.close(); } catch (e) { this.error = (e as Error).message; } }
  remove(id: string) { if (!confirm('¿Eliminar este insumo?')) return; try { this.service.delete(id); this.notice = 'Insumo eliminado.'; } catch (e) { this.error = (e as Error).message; } }
}
