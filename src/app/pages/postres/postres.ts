import { Component } from '@angular/core';
import { Catalog } from '../../shared/catalog';
@Component({
  selector: 'app-postres',
  imports: [Catalog],
  template: '<app-catalog mode="postres" />',
})
export class Postres {}
