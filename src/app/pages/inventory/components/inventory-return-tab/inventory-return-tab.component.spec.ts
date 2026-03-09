import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryReturnTabComponent } from './inventory-return-tab.component';

describe('InventoryReturnTabComponent', () => {
  let component: InventoryReturnTabComponent;
  let fixture: ComponentFixture<InventoryReturnTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryReturnTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InventoryReturnTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
