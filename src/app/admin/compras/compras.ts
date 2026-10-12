import { Component, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Purchase, Store, money } from '../../core/store';
import { ComprasService } from '../../service/compras/compras.service';
import { DataTableComponent, TableRow } from '../../shared/data-table';
@Component({ selector: 'app-compras', imports: [FormsModule, DataTableComponent], templateUrl: './compras.html' })
export class PurchasesPage {
  service = inject(ComprasService); store = inject(Store); money = money; @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  draft: Purchase = this.empty(); editing = false; error = ''; notice = '';
  rows = computed<TableRow[]>(() => this.service.list().map(p => ({ id: p.id, cells: [this.store.suppliers().find(s => s.id === p.proveedor)?.nombre || '', this.store.stock().find(s => s.id === p.insumo)?.nombre || '', `${p.cantidad} ${this.store.stock().find(s => s.id === p.insumo)?.unidad || ''}`, money(p.costo), p.fecha, p.recibida ? 'Recibida' : 'Pendiente'], actions: p.recibida ? [] : ['Editar', 'Recibir', 'Eliminar'] })));
  private empty(): Purchase { return { id: '', proveedor: '', insumo: '', cantidad: 0, costo: 0, fecha: new Date().toISOString().slice(0, 10), recibida: false }; }
  open(item?: Purchase) { this.editing = !!item; this.draft = item ? { ...item } : this.empty(); this.error = ''; this.editor.nativeElement.showModal(); }
  save(form: NgForm) { this.error = ''; if (form.invalid) { form.control.markAllAsTouched(); return; } try { this.service.save({ ...this.draft, id: this.editing ? this.draft.id : crypto.randomUUID() }, this.editing); this.notice = 'Compra guardada.'; this.editor.nativeElement.close(); } catch (e) { this.error = (e as Error).message; } }
  action(event: {id: string; action: string}) { const p = this.service.list().find(row => row.id === event.id); if (!p) return; if (event.action === 'Editar') this.open(p); else if (event.action === 'Recibir') { if (confirm('¿Confirmar recepción? El stock aumentará una sola vez.')) { this.service.receive(p.id); this.notice = 'Compra recibida y stock actualizado.'; } } else this.remove(p.id); }
  remove(id: string) { if (!confirm('¿Eliminar esta compra pendiente?')) return; try { this.service.delete(id); this.notice = 'Compra eliminada.'; } catch (e) { this.error = (e as Error).message; } }
}
