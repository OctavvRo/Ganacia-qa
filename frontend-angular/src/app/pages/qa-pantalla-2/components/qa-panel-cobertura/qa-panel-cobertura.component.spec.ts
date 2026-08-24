import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaPanelCoberturaComponent } from './qa-panel-cobertura.component';

describe('QaPanelCoberturaComponent', () => {
  let component: QaPanelCoberturaComponent;
  let fixture: ComponentFixture<QaPanelCoberturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaPanelCoberturaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaPanelCoberturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
