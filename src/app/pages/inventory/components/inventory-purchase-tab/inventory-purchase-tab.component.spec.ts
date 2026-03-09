import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryPurchaseTabComponent } from './inventory-purchase-tab.component';

describe('InventoryPurchaseTabComponent', () => {
  let component: InventoryPurchaseTabComponent;
  let fixture: ComponentFixture<InventoryPurchaseTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryPurchaseTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InventoryPurchaseTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
