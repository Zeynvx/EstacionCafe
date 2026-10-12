import { Component } from '@angular/core';
import { Catalog } from '../../shared/catalog';
@Component({
  selector: 'app-promociones',
  imports: [Catalog],
  template: '<app-catalog mode="promociones" />',
})
export class PromocionesComponent {}
