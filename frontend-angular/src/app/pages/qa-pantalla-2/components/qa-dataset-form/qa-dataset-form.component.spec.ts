import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaDatasetFormComponent } from './qa-dataset-form.component';

describe('QaDatasetFormComponent', () => {
  let component: QaDatasetFormComponent;
  let fixture: ComponentFixture<QaDatasetFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaDatasetFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaDatasetFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
