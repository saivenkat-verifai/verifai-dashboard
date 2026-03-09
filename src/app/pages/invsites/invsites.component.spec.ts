import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvSitesComponent } from './invsites.component';

describe('InvSitesComponent', () => {
  let component: InvSitesComponent;
  let fixture: ComponentFixture<InvSitesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvSitesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InvSitesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
