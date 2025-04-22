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
    this.ListarElementos(1);
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
  ListaCertificados: any[] = [];

  ListarElementos(num: number) {
    this.GetBusquedaPor('');
    if (num === 1) {
      this.ListaCertificados = [];
      this.FraccionDatos = 0;
    }

    this.ListaCertificados = [];
    this.loading = true;
    this.api
    .GetCertificadoFracionado(this.FraccionDatos, this.RangoDatos)
    .pipe(
      map((tracks) => {
        this.ListaCertificados = tracks['data'];
        this.DatosTemporalesBusqueda = tracks['data'];

        if (this.ListaCertificados.length === 0) {
          this.loading = false;
          this.alerta.NoExistenDatos();
        } else {
          this.loading = false;
          this.ContadorDatosGeneral = this.ListaCertificados.length;
          this.FraccionarValores(0, this.ListaCertificados, this.ConstanteFraccion);
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

/************************************** VER ELEMENTO  ******************************************************** */
TituloFormulario = '';

CertificadosForms = new FormGroup({
  id_certificado: new FormControl(0),
  id_gestor: new FormControl(0, Validators.required),
  ope_cod_credito: new FormControl('', [Validators.required,this.validar.VFN_AlfaNumerico()]),
  cli_identificacion: new FormControl(''),
  cli_nombres: new FormControl(''),
  cart_descripcion: new FormControl(''),
  ope_estado_contacta: new FormControl(''),
  cart_fecha_compra: new FormControl(''),
  cert_comentario: new FormControl(''),
  ges_nombres: new FormControl(''),
  gest_fecha_gestion: new FormControl(''),
  cert_hist_esactivo: new FormControl(true),
  cert_hist_baseactual: new FormControl(true),
  cert_hist_origendatos: new FormControl('Sistema_CobroSys')
});

ResetCertificadosForms() {
  this.CertificadosForms.reset({
    id_certificado: 0,
    id_gestor: 0,
    ope_cod_credito: '',
    cli_identificacion: '',
    cli_nombres: '',
    cart_descripcion: '',
    ope_estado_contacta: '',
    cart_fecha_compra: '',
    cert_comentario: '',
    ges_nombres: '',
    gest_fecha_gestion: '',
    cert_hist_esactivo: true,
    cert_hist_baseactual: true,
    cert_hist_origendatos: 'Sistema_CobroSys'
  });
}

CerrarAgregarEditarElemento() {
  this.EncerarComponentes();
}

ActDesControles(num: number) {
  if (num === 0) {
    //inactivos
    this.CertificadosForms.get('id_certificado')?.disable();
    this.CertificadosForms.get('cli_identificacion')?.disable();
    this.CertificadosForms.get('cli_nombres')?.disable();
    this.CertificadosForms.get('cart_descripcion')?.disable();
    this.CertificadosForms.get('ope_estado_contacta')?.disable();
    this.CertificadosForms.get('cart_fecha_compra')?.disable();
    this.CertificadosForms.get('cert_comentario')?.disable();
    this.CertificadosForms.get('ges_nombres')?.disable();
    this.CertificadosForms.get('gest_fecha_gestion')?.disable();
  }
  if (num === 2) {
    //edicion
    this.CertificadosForms.get('ope_cod_credito')?.enable();
    this.CertificadosForms.get('id_gestor')?.enable();
    this.CertificadosForms.get('cert_hist_esactivo')?.enable();
    this.CertificadosForms.get('cert_hist_baseactual')?.enable();
    this.CertificadosForms.get('cert_hist_origendatos').enable();
  }
}

AgregarEditarElemento(num: number) {
  if (num === 2) {
    this.ActDesControles(0);
    this.TituloFormulario = 'Imprimir';
    this.ActDesControles(2);
  }
  if (num === 3) {
    this.TituloFormulario = 'Visualizar';
    this.ActDesControles(0);
  }
}

CargarElemento(datos: any, num: number) {
  this.CertificadosForms.patchValue({
    id_certificado: datos.id_certificado,
    id_gestor: datos.id_gestor,
    ope_cod_credito: datos.ope_cod_credito,
    cli_identificacion: datos.cli_identificacion,
    cli_nombres: datos.cli_nombres,
    cart_descripcion: datos.cart_descripcion,
    ope_estado_contacta: datos.ope_estado_contacta,
    cart_fecha_compra: datos.cart_fecha_compra == null?'':this.fechas.getFechaEnLetras(datos.cart_fecha_compra),
    cert_comentario: datos.cert_comentario,
    ges_nombres: datos.ges_nombres+' '+datos.ges_apellidos,
    gest_fecha_gestion: datos.gest_fecha_gestion == null?'':this.fechas.getFechaEnLetras(datos.gest_fecha_gestion)
  });

  this.AgregarEditarElemento(num);
}

GuardarObjeto(datos: any) {
  datos.cert_hist_esactivo = datos.cert_hist_esactivo.toString() === 'true' ? '1' : '0';
  datos.cert_hist_baseactual = datos.cert_hist_baseactual.toString() === 'true' ? '1' : '0';

  // Generar Certificado
  let listadoObjeto:any[] = [];
  let ocD: any = {
    CarteraNom: datos.cart_descripcion,
    FechaCompra: datos.cart_fecha_compra,
    Identificacion:datos.cli_identificacion,
    Nombres: datos.cli_nombres,
    CodCredito: datos.ope_cod_credito,
  }
  listadoObjeto.push(ocD);
  let om: generarCertificadoPDF = {
    entidad: 'Credito', listado: listadoObjeto
  };
  this.gCredito=om;
  this.certificado.generarCertificadoPDF(this.gCredito);
  
  // Guardar Registro
  this.api
  .PostCertificadoHistorial(datos)
  .pipe(
    map((tracks) => {
      const exito = tracks['exito'];
      if (exito == 1) {
        this.ListarElementos(1);
        this.CerrarAgregarEditarElemento();
        this.EncerarComponentes();
        // this.TextoFiltro.patchValue('');
        this.alerta.RegistroAgregado();
      } else {
        this.alerta.ErrorEnLaPeticion(tracks['mensaje']);
        this.ActDesControles(0);
      }
    }),
    catchError((error) => {
      this.alerta.ErrorEnLaOperacion();
      this.ActDesControles(0);
      console.log(error);
      throw new Error(error);
    })
  )
  .subscribe();
}

// ****************************************** ENCERAR COMPONENTES *****************************************************************
EncerarComponentes() {
  //this.CarterasList = [];
  this.ResetCertificadosForms();
  this.loading = false;
  this.itemBusqueda.patchValue('');
  this.txtBusqueda.patchValue('');
  this.TituloFormulario = '';
  this.ActDesControles(0);
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
        const resultado = this.ListaCertificados.filter((elemento) => {
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
        const resultado = this.ListaCertificados.filter((elemento) => {
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
        const resultado = this.ListaCertificados.filter((elemento) => {
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
