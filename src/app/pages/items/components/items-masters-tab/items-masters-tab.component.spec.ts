import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemsMastersTabComponent } from './items-masters-tab.component';

describe('ItemsMastersTabComponent', () => {
  let component: ItemsMastersTabComponent;
  let fixture: ComponentFixture<ItemsMastersTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemsMastersTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ItemsMastersTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
