import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryIssuedTabComponent } from './inventory-issued-tab.component';

describe('InventoryIssuedTabComponent', () => {
  let component: InventoryIssuedTabComponent;
  let fixture: ComponentFixture<InventoryIssuedTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryIssuedTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InventoryIssuedTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
