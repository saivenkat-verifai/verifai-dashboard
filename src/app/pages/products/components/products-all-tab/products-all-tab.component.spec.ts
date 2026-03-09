import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsAllTabComponent } from './products-all-tab.component';

describe('ProductsAllTabComponent', () => {
  let component: ProductsAllTabComponent;
  let fixture: ComponentFixture<ProductsAllTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsAllTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProductsAllTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
