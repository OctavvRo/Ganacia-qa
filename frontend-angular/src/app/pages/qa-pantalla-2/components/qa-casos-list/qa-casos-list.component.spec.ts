import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaCasosListComponent } from './qa-casos-list.component';

describe('QaCasosListComponent', () => {
  let component: QaCasosListComponent;
  let fixture: ComponentFixture<QaCasosListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaCasosListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaCasosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
