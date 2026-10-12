import { Component } from '@angular/core';
import { Catalog } from '../../shared/catalog';
@Component({ selector: 'app-productos', imports: [Catalog], template: '<app-catalog />' })
export class productosComponent {}
