import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescargarCertificadoComponent } from './descargar-certificado.component';

describe('DescargarCertificadoComponent', () => {
  let component: DescargarCertificadoComponent;
  let fixture: ComponentFixture<DescargarCertificadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DescargarCertificadoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DescargarCertificadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
