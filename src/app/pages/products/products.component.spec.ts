import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsLayoutComponent } from './products.component';

describe('ProductsLayoutComponent', () => {
  let component: ProductsLayoutComponent;
  let fixture: ComponentFixture<ProductsLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsLayoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProductsLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
