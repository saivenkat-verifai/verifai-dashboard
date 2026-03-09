import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryActionsModalComponent } from './inventory-actions-modal.component';

describe('InventoryActionsModalComponent', () => {
  let component: InventoryActionsModalComponent;
  let fixture: ComponentFixture<InventoryActionsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryActionsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InventoryActionsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
