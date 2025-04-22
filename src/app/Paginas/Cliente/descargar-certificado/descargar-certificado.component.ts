import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { catchError, map } from 'rxjs';
import { Alertas } from 'src/app/Control/Alerts';
import { Fechas } from 'src/app/Control/Fechas';
import { TipoDeTexto } from 'src/app/Control/TipoDeTexto';
import { GeneradorCertificado } from 'src/app/Control/GeneradoCertificado';
import {
  ResultadoCarteraI,
  ResultadoGestorI,
  ResultadoMenuI,
  ResultadoPermisosI,
} from 'src/app/Modelos/login.interface';
import {
  ContactabilidadI,
  FiltroGestion,
  CxcOperacionI,
  CertificadoI,
  generarPDF,
  ClienteI,
  GestorI,
  generarCertificadoPDF,
} from 'src/app/Modelos/response.interface';
import { ApiService } from 'src/app/service/api.service';

@Component({
  selector: 'app-descargar-certificado',
  templateUrl: './descargar-certificado.component.html',
  styleUrls: ['./descargar-certificado.component.css']
})
export class DescargarCertificadoComponent implements OnInit {

  constructor(
    private api: ApiService,
    private alerta: Alertas,
    public fechas: Fechas,
    private cookeService: CookieService,
    private router: Router,
    public certificado:GeneradorCertificado,
    public validar: TipoDeTexto
  ) {}

  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

  permisos: ResultadoPermisosI = JSON.parse(localStorage.getItem('usuario')!);
  Usuario: ResultadoGestorI = this.permisos.gestor;
  Menu: ResultadoMenuI[] = this.permisos.menu;
  PaginaActual: ResultadoMenuI = this.Menu.find((elemento) => {
    return elemento.men_url === 'descargarcertificado';
  }) as ResultadoMenuI;
  ConstanteFraccion: number = Number(this.Usuario.usr_fraccion_datos);
  RangoDatos: number = Number(this.Usuario.usr_rango_datos);
  LecturaEscritura: number = Number(this.PaginaActual.men_lectura);
  PaginaNombre: string = this.PaginaActual.men_descripcion;
  loading: boolean = false;

  CarteraGestor: any[] = [];
  TodasCarteras: number[] = [];
  Cartera: ResultadoCarteraI[] = this.permisos.cartera;
  gCredito!:generarCertificadoPDF;

  // ****************************************** LISTAR ELEMENTOS *****************************************************************
  ListaCertificado: any[] = [];

}
