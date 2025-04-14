import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { catchError, map } from 'rxjs';
import { Alertas } from 'src/app/Control/Alerts';
import { Fechas } from 'src/app/Control/Fechas';
import { GeneradorReporte } from 'src/app/Control/GeneradoReporte';
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
  generarPDF,
  GestorI,
} from 'src/app/Modelos/response.interface';
import { ApiService } from 'src/app/service/api.service';

@Component({
  selector: 'app-certificados',
  templateUrl: './certificados.component.html',
  styleUrls: ['./certificados.component.css']
})

export class CertificadosComponent implements OnInit {
  constructor(
    private api: ApiService,
    private alerta: Alertas,
    public fechas: Fechas,
    private cookeService: CookieService,
    private router: Router,public reporte:GeneradorReporte
  ) {}

  ngOnInit(): void {
    this.ListarElementos(1);
  }

  permisos: ResultadoPermisosI = JSON.parse(localStorage.getItem('usuario')!);
  Usuario: ResultadoGestorI = this.permisos.gestor;
  Menu: ResultadoMenuI[] = this.permisos.menu;
  PaginaActual: ResultadoMenuI = this.Menu.find((elemento) => {
    return elemento.men_url === 'certificados';
  }) as ResultadoMenuI;
  ConstanteFraccion: number = Number(this.Usuario.usr_fraccion_datos);
  RangoDatos: number = Number(this.Usuario.usr_rango_datos);
  LecturaEscritura: number = Number(this.PaginaActual.men_lectura);
  PaginaNombre: string = this.PaginaActual.men_descripcion;
  loading: boolean = false;
  gCredito!:generarPDF;
  TituloFormulario = '';
  CarteraGestor: any[] = [];
  TodasCarteras: number[] = [];
  Cartera: ResultadoCarteraI[] = this.permisos.cartera;

  // ****************************************** CONTROLES DE BUSQUEDA *****************************************************************
  ParametrosDeBusqueda: Array<string> = [
    '',
    'Identificación',
    'Nombre Completo',
    'Nombre Incompleto',
    'Codigo Credito'
  ];

  itemBusqueda = new FormControl('', [Validators.required]);
  txtBusqueda = new FormControl('', [Validators.required]);

  GetBusquedaPor(item: string) {
    this.itemBusqueda.patchValue(item);
    this.txtBusqueda.patchValue('');
    const inputElement = document.getElementById(
      'txtValorBusqueda'
    ) as HTMLInputElement;

    if (item.length > 0 && inputElement != null) {
      inputElement.focus();
    }
  }

  ConvertirMayusculas() {
    if (
      this.itemBusqueda.value != 'Nombre Completo' &&
      this.itemBusqueda.value != 'Nombre Incompleto' &&
      this.itemBusqueda.value != 'Codigo Credito'
    ) {
      this.txtBusqueda.patchValue(this.txtBusqueda.value!.toUpperCase());
    }
  }

  // ****************************************** LISTAR ELEMENTOS *****************************************************************
  ListaCreditos: any[] = [];

  ListarElementos(num: number) {

    this.GetBusquedaPor('');
    if (num === 1) {
      this.ListaCreditos = [];
      this.FraccionDatos = 0;
    }

    this.ListaCreditos = [];
    this.loading = true;
    this.api
      .GetCreditoFracionado(this.FraccionDatos, this.RangoDatos)
      .pipe(
        map((tracks) => {
          this.ListaCreditos = tracks['data'];
          this.DatosTemporalesBusqueda = tracks['data'];
          if (this.ListaCreditos.length === 0) {
            this.loading = false;
            this.alerta.NoExistenDatos();
          } else {
            this.loading = false;
            this.ContadorDatosGeneral = this.ListaCreditos.length;
            this.FraccionarValores(0, this.ListaCreditos, this.ConstanteFraccion);
          }
        }),
        catchError((error) => {
          this.loading = false;
          this.alerta.ErrorAlRecuperarElementos();
          throw new Error(error);
        })
      )
      .subscribe();
  }


  FiltrarElemento() {
    const valor: any = this.txtBusqueda.value?.toString();
    let tipo: number;
    if (this.itemBusqueda.value === 'Identificación') {
      tipo = 0;
      this.GetFiltrarElemento(valor, tipo);
    }
    if (this.itemBusqueda.value === 'Nombre Completo') {
      tipo = 1;
      this.GetFiltrarElemento(valor, tipo);
    }
    if (this.itemBusqueda.value === 'Nombre Incompleto') {
      tipo = 2;
      this.GetFiltrarElemento(valor, tipo);
    }
    if (this.itemBusqueda.value === 'Codigo Credito') {
      tipo = 3;
      this.GetFiltrarElemento(valor, tipo);
    }
  }

  GetFiltrarElemento(valor: string, tipo: number) {
    this.ListaCreditos = [];
    this.loading = true;
    let listadoObjeto:any[] = [];
    this.api
      .GetCxcOperacionFracionadoFiltro(valor, tipo)
      .pipe(
        map((tracks) => {
          this.ListaCreditos = tracks['data'];
          this.DatosTemporalesBusqueda = tracks['data'];
          for (const credito of this.ListaCreditos)
            {
              let ocD: any = {
                CodigoCxc:credito.ope_cod_credito,
                Cedula:credito.cli_identificacion,
                Nombres:credito.cli_nombres,
                EstadoContactabilidad:credito.ope_estado_contacta,
                Gestor:credito.ges_nombres+' '+credito.ges_apellidos,
                Cartera:credito.cart_descripcion,
                FechaGestion:credito.gest_fecha_gestion ===null?null:this.fechas.fechaCortaAbt(credito.gest_fecha_gestion.toString())
              };
              listadoObjeto.push(ocD);
            }
            let om: generarPDF = {
              entidad: 'Credito', listado: listadoObjeto
            };
            this.gCredito=om;
          if (this.ListaCreditos.length === 0) {
            this.loading = false;
            this.alerta.NoExistenDatos();
          } else {
            this.loading = false;
            this.ContadorDatosGeneral = this.ListaCreditos.length;
            this.FraccionarValores(
              0,
              this.ListaCreditos,
              this.ConstanteFraccion
            );
          }
        }),
        catchError((error) => {
          this.loading = false;
          this.alerta.ErrorAlRecuperarElementos();
          throw new Error(error);
        })
      )
      .subscribe();

  }

  // ****************************************** ENCERAR COMPONENTES *****************************************************************
  EncerarComponentes() {
    this.loading = false;
  }

   // ****************************************** PAGINACION *****************************************************************
  DatosCargaMasiva!: any[];
  DatosTemporales: any[] = [];
  ContadorDatos: number = 0;
  RangoPaginacion: number = 0;
  InicioPaginacion: number = 0;
  FinalPaginacion: number = 0;
  FraccionDatos: number = 0;
  ContadorDatosGeneral: number = 0;


  FraccionarValores(tipo: number, datos?: any, rango?: number) {
    if (rango != null && datos != null) {
      if (tipo == 0) {
        this.EncerarVariablesPaginacion(0);
        this.ContadorDatos = datos.length;
        this.DatosTemporales = datos;
        this.RangoPaginacion = rango;
        this.FinalPaginacion = rango;
        this.DatosCargaMasiva = datos.slice(
          this.InicioPaginacion,
          this.FinalPaginacion
        );
      }
    } else {
      if (tipo == 0) {
        this.DatosCargaMasiva = this.DatosTemporales.slice(
          this.InicioPaginacion,
          this.FinalPaginacion
        );
      }
    }
  }

  BtnNext(tipo: number, rango?: number) {
    if (tipo == 0) {
      if (rango != null) {
        this.FraccionDatos = this.FraccionDatos + this.RangoDatos;
        this.ListarElementos(2);
      }
      this.InicioPaginacion = this.InicioPaginacion + this.RangoPaginacion;
      this.FinalPaginacion = this.FinalPaginacion + this.RangoPaginacion;
      this.FraccionarValores(0);
    }
  }

  BtnPrevious(tipo: number, rango?: number) {
    if (tipo == 0) {
      if (rango != null) {
        this.FraccionDatos = this.FraccionDatos - this.RangoDatos;
        this.ListarElementos(2);
      }

      if (this.InicioPaginacion >= this.RangoPaginacion) {
        this.InicioPaginacion = this.InicioPaginacion - this.RangoPaginacion;
        this.FinalPaginacion = this.FinalPaginacion - this.RangoPaginacion;
        this.FraccionarValores(0);
      }
    }
  }

  EncerarVariablesPaginacion(tipo: number) {
    if (tipo == 0) {
      this.ContadorDatos = 0;
      this.RangoPaginacion = 0;
      this.InicioPaginacion = 0;
      this.FinalPaginacion = 0;
      this.DatosTemporales = [];
    }
  }

    /*********************  FILTRO MODO GENERAL *********************** */
    DatosTemporalesBusqueda: any[] = [];
    FirltroPor: string = '';

    FiltrarPor(filtro: string, etiqueta: number) {
      const TxtFiltro = document.getElementById(
        'TxtFiltro' + etiqueta
      ) as HTMLInputElement;
      const ThDescripcion = document.getElementById(
        'ThDescripcion' + etiqueta
      ) as HTMLInputElement;
      const ThIdentificacion = document.getElementById(
        'ThIdentificacion' + etiqueta
      ) as HTMLInputElement;
      const ThCodCredito = document.getElementById(
        'ThCodCredito' + etiqueta
      ) as HTMLInputElement;

      const lblFiltro = document.getElementById(
        'lblFiltro' + etiqueta
      ) as HTMLInputElement;
      lblFiltro.textContent = filtro;
      ThDescripcion.style.color = '';
      ThIdentificacion.style.color = '';
      ThCodCredito.style.color = '';
      TxtFiltro.value = '';
      TxtFiltro.disabled = false;
      TxtFiltro.focus();
    }

    VaciarFiltro(etiqueta: number) {
      const TxtFiltro = document.getElementById(
        'TxtFiltro' + etiqueta
      ) as HTMLInputElement;
      const ThIdentificacion = document.getElementById(
        'ThIdentificacion' + etiqueta
      ) as HTMLInputElement;
      const ThDescripcion = document.getElementById(
        'ThDescripcion' + etiqueta
      ) as HTMLInputElement;
      const ThCodCredito = document.getElementById(
        'ThCodCredito' + etiqueta
      ) as HTMLInputElement;
      const lblFiltro = document.getElementById(
        'lblFiltro' + etiqueta
      ) as HTMLInputElement;
      lblFiltro.textContent = '';
      ThDescripcion.style.color = '';
      ThIdentificacion.style.color = '';
      ThCodCredito.style.color = '';
      TxtFiltro.disabled = true;
      TxtFiltro.value = '';
      this.FirltroPor = '';
      if (etiqueta === 0) {
        this.FraccionarValores(
          0,
          this.DatosTemporalesBusqueda,
          this.ConstanteFraccion
        );
      }
    }

    FiltrarLista(num: number, etiqueta: number) {
      const TxtFiltro = document.getElementById(
        'TxtFiltro' + etiqueta
      ) as HTMLInputElement;
      const lblFiltro = document.getElementById(
        'lblFiltro' + etiqueta
      ) as HTMLInputElement;
      const contador = TxtFiltro.value!.length;
      this.EncerarVariablesPaginacion(0);
      lblFiltro.textContent != 'ThCodCredito'
        ? (TxtFiltro.value = TxtFiltro.value!.toUpperCase())
        : (TxtFiltro.value = TxtFiltro.value!);
      const ThDescripcion = document.getElementById(
        'ThDescripcion' + etiqueta
      ) as HTMLInputElement;
      const ThIdentificacion = document.getElementById(
        'ThIdentificacion' + etiqueta
      ) as HTMLInputElement;
      const ThCodCredito = document.getElementById(
        'ThCodCredito' + etiqueta
      ) as HTMLInputElement;

      if (lblFiltro.textContent === 'Nombres') {
        let nombre = TxtFiltro.value!;
        if (num === 0) {
          const resultado = this.ListaCreditos.filter((elemento) => {
            return elemento.cli_nombres.includes(nombre.toUpperCase());
          });
          this.FraccionarValores(0, resultado, this.ConstanteFraccion);
        }

        if (contador != 0) {
          ThDescripcion.style.color = 'red';
        } else {
          ThDescripcion.style.color = '';
        }
      }
      if (lblFiltro.textContent === 'Identificacion') {
        let nombre = TxtFiltro.value!;
        if (num === 0) {
          const resultado = this.ListaCreditos.filter((elemento) => {
            return elemento.cli_identificacion.includes(nombre.toUpperCase());
          });
          this.FraccionarValores(0, resultado, this.ConstanteFraccion);
        }

        if (contador != 0) {
          ThIdentificacion.style.color = 'red';
        } else {
          ThIdentificacion.style.color = '';
        }
      }
      if (lblFiltro.textContent === 'CodCredito') {
        let nombre = TxtFiltro.value!;
        if (num === 0) {
          const resultado = this.ListaCreditos.filter((elemento) => {
            return elemento.ope_cod_credito.includes(nombre);
          });
          this.FraccionarValores(0, resultado, this.ConstanteFraccion);
        }

        if (contador != 0) {
          ThCodCredito.style.color = 'red';
        } else {
          ThCodCredito.style.color = '';
        }
      }
    }
}
