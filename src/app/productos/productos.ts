import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-productos',
  styleUrl: './productos.css',
  templateUrl: './productos.html',
})
export class productosComponent {
  constructor(private router: Router) {}
  // Filtro activo actual
  filtro: string = 'todos';

  // Lista de productos de la cafetería
  producto = [
    { nombre: 'Café Expreso', categoria: 'cafes', precio: 6.00, cantidad: 0, descripcion: 'Café intenso y aromático.', imagen: 'espresso.jpg' },
    { nombre: 'Capuchino', categoria: 'cafes', precio: 8.50, cantidad: 0, descripcion: 'Con leche vaporizada y espuma.', imagen: 'capuchino.jpg' },
    { nombre: 'Tres Leches', categoria: 'postres', precio: 9.00, cantidad: 0, descripcion: 'Postre suave y húmedo.', imagen: 'tres-leches.jpg' },
    { nombre: 'Jugo de Naranja', categoria: 'bebidas', precio: 7.00, cantidad: 0, descripcion: '100% natural y recién exprimido.', imagen: 'jugo.jpg' }
  ];

  // Función para cambiar el filtro 
  filtrar(categoria: string) {
    this.filtro = categoria;
  }

  // Funciones del contador y carrito
  sumar(producto: any) {
    producto.cantidad++;
  }

  restar(producto: any) {
    if (producto.cantidad > 0) {
      producto.cantidad--;
    }
  }

  obtenerCarrito() {
    return this.producto.filter(p => p.cantidad > 0);
  }

  calcularTotal(): number {
    return this.obtenerCarrito().reduce((total, p) => total + (p.precio * p.cantidad), 0);
  }

  realizarPedido() {
    this.router.navigate(['/pedidos']);
  }

  vaciarCarrito() {
    this.producto.forEach(p => p.cantidad = 0);
  }

}
