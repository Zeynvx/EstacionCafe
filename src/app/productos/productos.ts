import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  cantidad: number;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class productosComponent {
  filtro: string = 'todos';

  producto: Producto[] = [
    // CAFÉS DE ESPECIALIDAD
    {
      id: 1,
      nombre: 'Café Expreso',
      descripcion: 'Extracción pura, intensa y aromática con crema avellanada persistente.',
      precio: 6.00,
      categoria: 'cafes',
      imagen: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=80',
      cantidad: 0
    },
    {
      id: 2,
      nombre: 'Capuchino Clásico',
      descripcion: 'Espresso doble con leche texturizada al vapor y abundante espuma sedosa.',
      precio: 8.50,
      categoria: 'cafes',
      imagen: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
      cantidad: 0
    },
    {
      id: 3,
      nombre: 'Café Americano',
      descripcion: 'Espresso balanceado con agua caliente a punto, de notas suaves y tostadas.',
      precio: 7.00,
      categoria: 'cafes',
      imagen: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80',
      cantidad: 0
    },
    {
      id: 4,
      nombre: 'Caramel Macchiato',
      descripcion: 'Vainilla suave, leche vaporizada, mancha de espresso y espiral de caramelo.',
      precio: 10.50,
      categoria: 'cafes',
      imagen: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&q=80',
      cantidad: 0
    },
    {
      id: 5,
      nombre: 'Mocaccino Belga',
      descripcion: 'Combinación armoniosa de espresso, ganache de chocolate amargo y leche cremosa.',
      precio: 11.00,
      categoria: 'cafes',
      imagen: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&q=80',
      cantidad: 0
    },
    {
      id: 6,
      nombre: 'Flat White Artesanal',
      descripcion: 'Doble ristretto concentrado cubierto con una fina microespuma aterciopelada.',
      precio: 9.50,
      categoria: 'cafes',
      imagen: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&q=80',
      cantidad: 0
    },

    // REPOSTERÍA & POSTRES
    {
      id: 7,
      nombre: 'Torta Tres Leches',
      descripcion: 'Bizcochuelo artesanal embebido en mezcla de tres leches y canela molida.',
      precio: 9.00,
      categoria: 'postres',
      imagen: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=400&q=80',
      cantidad: 0
    },
    {
      id: 8,
      nombre: 'Cheesecake de Oreo',
      descripcion: 'Base crocante de galleta, crema horneada de queso y trozos generosos de Oreo.',
      precio: 12.00,
      categoria: 'postres',
      imagen: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80',
      cantidad: 0
    },
    {
      id: 9,
      nombre: 'Croissant Mantequilla',
      descripcion: 'Hojaldrado francés crujiente por fuera, suave y aireado en su interior.',
      precio: 6.50,
      categoria: 'postres',
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80',
      cantidad: 0
    },
    {
      id: 10,
      nombre: 'Queque de Plátano & Nueces',
      descripcion: 'Porción húmeda y casera aromatizada con canela, nueces tostadas y miel.',
      precio: 7.50,
      categoria: 'postres',
      imagen: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&q=80',
      cantidad: 0
    },
    {
      id: 11,
      nombre: 'Pie de Limón Clásico',
      descripcion: 'Masa sableé crocante, cuajada ácida de limón criollo y merengue tostado.',
      precio: 9.50,
      categoria: 'postres',
      imagen: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400&q=80',
      cantidad: 0
    },
    {
      id: 12,
      nombre: 'Brownie con Fudge',
      descripcion: 'Bizcocho denso de chocolate al 70% bañado con fudge tibio de la casa.',
      precio: 8.00,
      categoria: 'postres',
      imagen: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80',
      cantidad: 0
    },

    // BEBIDAS FRÍAS & REFRESCANTES
    {
      id: 13,
      nombre: 'Jugo de Naranja Natural',
      descripcion: 'Zumo 100% puro de naranjas seleccionadas, recién exprimido al momento.',
      precio: 7.00,
      categoria: 'bebidas',
      imagen: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80',
      cantidad: 0
    },
    {
      id: 14,
      nombre: 'Iced Matcha Latte',
      descripcion: 'Té verde ceremonial japonés batido con leche vegetal sobre cubos de hielo.',
      precio: 12.50,
      categoria: 'bebidas',
      imagen: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80',
      cantidad: 0
    },
    {
      id: 15,
      nombre: 'Frappé de Moka & Crema',
      descripcion: 'Café helado batido con chocolate espeso, coronado con chantilly y virutas.',
      precio: 13.00,
      categoria: 'bebidas',
      imagen: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
      cantidad: 0
    },
    {
      id: 16,
      nombre: 'Cold Brew Especial',
      descripcion: 'Café infusionado en frío durante 18 horas; cuerpo sedoso y cero acidez.',
      precio: 10.00,
      categoria: 'bebidas',
      imagen: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&q=80',
      cantidad: 0
    },
    {
      id: 17,
      nombre: 'Limonada de Hierbabuena',
      descripcion: 'Refrescante limonada frappé macerada con hojas frescas de hierbabuena.',
      precio: 7.50,
      categoria: 'bebidas',
      imagen: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
      cantidad: 0
    },
    {
      id: 18,
      nombre: 'Iced Caramel Latte',
      descripcion: 'Espresso vertido sobre leche fría, hielo compacto y sirope de caramelo salado.',
      precio: 11.00,
      categoria: 'bebidas',
      imagen: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
      cantidad: 0
    }
  ];

  filtrar(categoria: string): void {
    this.filtro = categoria;
  }

  sumar(prod: Producto): void {
    prod.cantidad++;
  }

  restar(prod: Producto): void {
    if (prod.cantidad > 0) {
      prod.cantidad--;
    }
  }

  obtenerCarrito(): Producto[] {
    return this.producto.filter(p => p.cantidad > 0);
  }

  calcularTotal(): string {
    const total = this.obtenerCarrito().reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    return total.toFixed(2);
  }

  vaciarCarrito(): void {
    this.producto.forEach(p => p.cantidad = 0);
  }

  realizarPedido(): void {
    alert('¡Pedido confirmado! Tu orden está siendo preparada.');
  }
}