import { ComponentFixture, TestBed } from '@angular/core/testing';
import { productosComponent } from './productos';

describe('Favoritos', () => {
  let component: productosComponent;
  let fixture: ComponentFixture<productosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [productosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(productosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
