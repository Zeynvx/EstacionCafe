import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
export interface TableRow {
  id: string;
  cells: string[];
  actions: string[];
}
interface TableApi {
  destroy(): void;
}
declare global {
  interface Window {
    DataTable?: new (table: HTMLTableElement, options: object) => TableApi;
  }
}
@Component({
  selector: 'app-data-table',
  template:
    '<div class="overflow-auto"><table #table class="table w-100"></table></div>@if (unavailable()) { <p class="fg-warning" role="status">No se pudo cargar DataTables. Se muestra la tabla básica; revisa tu conexión.</p> }',
})
export class DataTableComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() headings: string[] = [];
  @Input() rows: TableRow[] = [];
  @Output() action = new EventEmitter<{ id: string; action: string }>();
  @ViewChild('table', { static: true }) table!: ElementRef<HTMLTableElement>;
  api?: TableApi;
  ready = false;
  unavailable = signal(false);
  ngAfterViewInit() {
    this.ready = true;
    this.render();
  }
  ngOnChanges() {
    if (this.ready) this.render();
  }
  ngOnDestroy() {
    this.api?.destroy();
  }
  render() {
    this.api?.destroy();
    this.api = undefined;
    const table = this.table.nativeElement;
    table.replaceChildren();
    const head = table.createTHead().insertRow();
    for (const label of [...this.headings, 'Acciones']) {
      const th = document.createElement('th');
      th.textContent = label;
      th.scope = 'col';
      head.append(th);
    }
    const body = table.createTBody();
    for (const row of this.rows) {
      const tr = body.insertRow();
      for (const value of row.cells) tr.insertCell().textContent = value;
      const td = tr.insertCell();
      for (const label of row.actions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-outline theme-primary btn-sm m-1';
        button.textContent = label;
        button.addEventListener('click', () => this.action.emit({ id: row.id, action: label }));
        td.append(button);
      }
    }
    if (window.DataTable) {
      this.unavailable.set(false);
      this.api = new window.DataTable(table, {
        pageLength: 10,
        order: [],
        columnDefs: [{ targets: -1, orderable: false, searchable: false }],
        language: {
          search: 'Buscar:',
          lengthMenu: 'Mostrar _MENU_',
          info: '_START_–_END_ de _TOTAL_ registros',
          infoEmpty: 'Sin registros',
          infoFiltered: '(de _MAX_ registros)',
          emptyTable: 'No hay registros todavía',
          zeroRecords: 'No se encontraron resultados',
          paginate: { first: 'Primera', last: 'Última', next: 'Siguiente', previous: 'Anterior' },
        },
      });
    } else this.unavailable.set(true);
  }
}
