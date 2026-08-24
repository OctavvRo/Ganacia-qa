import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaCasoFormComponent } from './qa-caso-form.component';

describe('QaCasoFormComponent', () => {
  let component: QaCasoFormComponent;
  let fixture: ComponentFixture<QaCasoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaCasoFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaCasoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
