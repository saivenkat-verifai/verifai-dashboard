import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvsitesDetailedViewComponent } from './invsites-detailed-view.component';

describe('InvsitesDetailedViewComponent', () => {
  let component: InvsitesDetailedViewComponent;
  let fixture: ComponentFixture<InvsitesDetailedViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvsitesDetailedViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InvsitesDetailedViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
