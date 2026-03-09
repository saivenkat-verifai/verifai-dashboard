import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsMastersTabComponent } from './products-masters-tab.component';

describe('ProductsMastersTabComponent', () => {
  let component: ProductsMastersTabComponent;
  let fixture: ComponentFixture<ProductsMastersTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsMastersTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProductsMastersTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
