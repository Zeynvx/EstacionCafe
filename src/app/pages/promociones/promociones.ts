import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-promociones',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './promociones.html',
  styleUrl: './promociones.css'
})
export class PromocionesComponent {
  combos = [
    {
      id: 1,
      titulo: 'Desayunito Favorito',
      descripcion: 'Cappuccino cremoso caliente + Croissant artesanal horneado a la mantequilla.',
      precioAntes: 'S/ 17.00',  
      precioPromo: 'S/ 12.50',
      badge: 'DESCUENTO ESPECIAL 🔥',
      imagen: 'combo1.jpg'
    },
    {
      id: 2,
      titulo: 'Matcha & Dulce Tarde',
      descripcion: 'Matcha Latte ceremonial caliente con arte latte + Generosa porción de queque artesanal del día.',
      precioAntes: 'S/ 19.50',
      precioPromo: 'S/ 13.90',
      badge: 'FIT & FRESH 🌿',
      imagen: 'combo2.jpg'
    },
    {
      id: 3,
      titulo: 'Generosa Porción',
      descripcion: '2 panes artesanales con chicharrón crocante y sarza criolla + 1 jugo natural grande a elección.',
      precioAntes: 'S/ 33.00',
      precioPromo: 'S/ 25.00',
      badge: 'TOP VENTAS ⭐',
      imagen: 'combo3.jpg'
    },
    {
      id: 4,
      titulo: 'Pecado de Chocolate',
      descripcion: 'Café bombón multicapa con crema batida y chocolate + Generosa porción de cheesecake de Oreo y manjar.',
      precioAntes: 'S/ 28.00',
      precioPromo: 'S/ 21.90',
      badge: 'DULCE TENTACIÓN 🍫',
      imagen: 'combo4.jpg'
    }, 
    {
  id: 5,
      titulo: 'Club Sándwich Clásico',
      descripcion: 'Tradicional sándwich de 3 pisos en pan tostado con pollo, jamón, palta y vegetales + crocantes papas fritas.',
      precioAntes: 'S/ 26.00',
      precioPromo: 'S/ 20.50',
      badge: 'SÚPER CONTUNDENTE 🥪',
      imagen: 'combo5.jpg'
    }
  ];
}