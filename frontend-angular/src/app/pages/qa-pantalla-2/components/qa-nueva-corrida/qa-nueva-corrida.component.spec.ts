import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaNuevaCorridaComponent } from './qa-nueva-corrida.component';

describe('QaNuevaCorridaComponent', () => {
  let component: QaNuevaCorridaComponent;
  let fixture: ComponentFixture<QaNuevaCorridaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaNuevaCorridaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaNuevaCorridaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
