import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvsitesListViewComponent } from './invsites-list-view.component';

describe('InvsitesListViewComponent', () => {
  let component: InvsitesListViewComponent;
  let fixture: ComponentFixture<InvsitesListViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvsitesListViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InvsitesListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
