import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaColaRevisionComponent } from './qa-cola-revision.component';

describe('QaColaRevisionComponent', () => {
  let component: QaColaRevisionComponent;
  let fixture: ComponentFixture<QaColaRevisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaColaRevisionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaColaRevisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
