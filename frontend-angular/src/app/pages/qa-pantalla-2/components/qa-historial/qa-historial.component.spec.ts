import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaHistorialComponent } from './qa-historial.component';

describe('QaHistorialComponent', () => {
  let component: QaHistorialComponent;
  let fixture: ComponentFixture<QaHistorialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaHistorialComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaHistorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
