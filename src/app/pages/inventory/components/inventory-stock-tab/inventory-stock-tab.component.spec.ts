import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryStockTabComponent } from './inventory-stock-tab.component';

describe('InventoryStockTabComponent', () => {
  let component: InventoryStockTabComponent;
  let fixture: ComponentFixture<InventoryStockTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryStockTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InventoryStockTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
