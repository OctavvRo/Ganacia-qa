import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QaDatasetsListComponent } from './qa-datasets-list.component';

describe('QaDatasetsListComponent', () => {
  let component: QaDatasetsListComponent;
  let fixture: ComponentFixture<QaDatasetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QaDatasetsListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QaDatasetsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
