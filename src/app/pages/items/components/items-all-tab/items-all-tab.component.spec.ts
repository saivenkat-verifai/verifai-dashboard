import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemsAllTabComponent } from './items-all-tab.component';

describe('ItemsAllTabComponent', () => {
  let component: ItemsAllTabComponent;
  let fixture: ComponentFixture<ItemsAllTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemsAllTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ItemsAllTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
