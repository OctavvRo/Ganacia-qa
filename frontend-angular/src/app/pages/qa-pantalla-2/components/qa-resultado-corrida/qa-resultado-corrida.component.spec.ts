import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaResultadoCorridaComponent } from './qa-resultado-corrida.component';

describe('QaResultadoCorridaComponent', () => {
  let component: QaResultadoCorridaComponent;
  let fixture: ComponentFixture<QaResultadoCorridaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaResultadoCorridaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaResultadoCorridaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
