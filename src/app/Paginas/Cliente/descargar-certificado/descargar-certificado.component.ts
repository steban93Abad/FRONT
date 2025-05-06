import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { catchError, map } from 'rxjs';
import { Alertas } from 'src/app/Control/Alerts';
import { Fechas } from 'src/app/Control/Fechas';
import { TipoDeTexto } from 'src/app/Control/TipoDeTexto';
import { GeneradorCertificado } from 'src/app/Control/GeneradoCertificado';
import { GeneradorCertificadoSergSur } from 'src/app/Control/GeneradoCertificadoSergSur';
import {
  ResultadoCarteraI,
  ResultadoGestorI,
  ResultadoMenuI,
  ResultadoPermisosI,
} from 'src/app/Modelos/login.interface';
import {
  CxcOperacionI,
  CertificadoI,
  generarPDF,
  ClienteI,
  GestorI,
  FiltroCertificado,
  generarCertificadoPDF,
  generarCertificadoSergSurPDF
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
    public certficadoSergvSur:GeneradorCertificadoSergSur,
    public validar: TipoDeTexto
  ) {}

  ngOnInit(): void {
    this.ListarElementos(1);
    this.CarterasGestor();
  }

  CarterasGestor() {
    for (let datos of this.Cartera) {
      let cartera: any = {
        cart_id: Number(datos.cart_id),
        cart_descripcion: datos.cart_descripcion,
        cart_tip_descripcion: datos.cart_tip_descripcion,
      };
      this.CarteraGestor.push(cartera);
      this.TodasCarteras.push(cartera.cart_id);
    }
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
  gCreditoSergSur!:generarCertificadoSergSurPDF;
  ModoBusqueda: boolean = false;
  FiltroActual: FiltroCertificado | null = null;

  // ****************************************** CONTROLES DE BUSQUEDA *****************************************************************

  BuscarForms = new FormGroup({
    identificacion: new FormControl('', Validators.required),
    nombres_cliente: new FormControl('', Validators.required),
    cartera: new FormControl('0', Validators.required),
    gestor: new FormControl('0', Validators.required),
    fecha_inicial: new FormControl('',
      Validators.required
    ),
    fecha_final: new FormControl('',
      Validators.required
    ),
    estado: new FormControl(false, Validators.required)
  });

  ResetBuscarClienteForms() {
    this.BuscarForms.reset({
      identificacion: '',
      nombres_cliente: '',
      cartera: '0',
      gestor: '0',
      fecha_inicial: '',
      fecha_final: '',
      estado: false
    });
  }

  ListaGestores: GestorI[] = [];

  ListarGestores() {
    this.ListaGestores = [];
    this.api
      .GetGestoresFracionadoFiltro('g', 20)
      .pipe(
        map((tracks) => {
          this.ListaGestores = tracks['data'];
        }),
        catchError((error) => {
          this.loading = false;
          this.alerta.ErrorAlRecuperarElementos();
          throw new Error(error);
        })
      )
      .subscribe();
  }


  // ****************************************** LISTAR ELEMENTOS *****************************************************************
  ListaCertificados: any[] = [];

  ListarElementos(num: number) {
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
          this.FraccionarValores(this.ListaCertificados, this.ConstanteFraccion);
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

  GetFiltrarElemento(datos: any) {
    let filtro: FiltroCertificado = {
      identificacion: (datos.identificacion.trim() == ''
        ? '0'
        : datos.identificacion.trim())!,
      nombres_cliente: (datos.nombres_cliente.trim() == ''
        ? '0'
        : datos.nombres_cliente.trim())!,
      cartera:
        datos.cartera == '0' ? this.TodasCarteras : [Number(datos.cartera)],
      gestor: datos.gestor,
      fecha_inicial: datos.fecha_inicial == ''?this.fechas.fechaMinDate():datos.fecha_inicial,
      fecha_final: datos.fecha_final == ''?this.fechas.fechaMinDate():datos.fecha_final,
      estado: datos.estado == true ? '1' : '0'
    };

    this.ModoBusqueda = true;
    this.FiltroActual = filtro;

    datos.estado = datos.estado == true ? '1' : '0';
    this.ListaCertificados = [];
    this.loading = true;
    this.api
      .GetCertificadoDatoFracionadoFiltro(filtro)
      .pipe(
        map((tracks) => {
          console.log(tracks['data']);
          this.ListaCertificados = tracks['data'];
          this.DatosTemporalesBusqueda = tracks['data'];
          if (this.ListaCertificados.length === 0) {
            this.loading = false;
            this.alerta.NoExistenDatos();
          } else {
            this.loading = false;
            this.ContadorDatosGeneral = this.ListaCertificados.length;
            this.FraccionarValores(this.ListaCertificados, this.ConstanteFraccion);
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

/************************************** AGREGAR ELEMENTO  ******************************************************** */
TituloFormulario = '';
ClienteInfo = new FormControl({ value: '', disabled: true });

CertificadosForms = new FormGroup({
  ope_cod_credito: new FormControl(''),
  cli_identificacion: new FormControl(''),
  cli_nombres: new FormControl(''),
  cart_descripcion: new FormControl(''),
  ope_producto: new FormControl(''),
  ope_estado_contacta: new FormControl(''),
  cart_fecha_compra: new FormControl(''),
  ope_fecha_compra: new FormControl(''),
  ges_nombres: new FormControl(''),
  gest_fecha_gestion: new FormControl(''),
  cert_fecha_act: new FormControl(this.fechas.fecha()),
  cert_fecha_desact: new FormControl(this.fechas.fecha()),
  cert_fecha_in: new FormControl(this.fechas.fecha()),
  cert_fecha_up: new FormControl(this.fechas.fecha()),
});

ResetCertificadosForms() {
  this.CertificadosForms.reset({
    ope_cod_credito: '',
    cli_identificacion: '',
    cli_nombres: '',
    cart_descripcion: '',
    ope_producto: '',
    ope_estado_contacta: '',
    cart_fecha_compra: '',
    ope_fecha_compra: '',
    ges_nombres: '',
    gest_fecha_gestion: '',
    cert_fecha_act: this.fechas.fecha(),
    cert_fecha_desact: this.fechas.fecha(),
    cert_fecha_in: this.fechas.fecha(),
    cert_fecha_up: this.fechas.fecha(),
  });
}

DatosForms = new FormGroup({
  id_certificado: new FormControl(0),
  id_gestor: new FormControl(0, Validators.required),
  ope_cod_credito: new FormControl('', [Validators.required,this.validar.VFN_AlfaNumerico()]),
  cli_identificacion: new FormControl(''),
  cli_nombres: new FormControl(''),
  cart_descripcion: new FormControl(''),
  cart_fecha_compra: new FormControl(''),
  ope_fecha_compra: new FormControl(''),
  ope_producto: new FormControl(''),
  //cert_modelo: new FormControl('', Validators.required),
  cert_modelo: new FormControl('', Validators.required),
  gest_fecha_gestion: new FormControl(''),
  cert_hist_esactivo: new FormControl(true),
  cert_hist_baseactual: new FormControl(true),
  cert_hist_origendatos: new FormControl('Sistema_CobroSys')
});

ResetDatosForms() {
  this.DatosForms.reset({
    id_certificado: 0,
    id_gestor: 0,
    ope_cod_credito: '',
    cli_identificacion: '',
    cli_nombres: '',
    cart_descripcion: '',
    cart_fecha_compra: '',
    ope_fecha_compra: '',
    ope_producto: '',
    cert_modelo: '',
    gest_fecha_gestion: '',
    cert_hist_esactivo: true,
    cert_hist_baseactual: true,
    cert_hist_origendatos: 'Sistema_CobroSys'
  });
}

CertificadoEditForms = new FormGroup({
  id_certificado: new FormControl(0, Validators.required),
  id_gestor: new FormControl(0, Validators.required),
  ope_cod_credito: new FormControl('', [Validators.required,this.validar.VFN_AlfaNumerico()]),
  cert_comentario: new FormControl(''),
  cert_esactivo: new FormControl(true),
  cert_baseactual: new FormControl(true),
  cert_origendatos: new FormControl('Sistema_CobroSys')
});

ResetCertificadoEditForms() {
  this.CertificadoEditForms.reset({
    id_certificado: 0,
    id_gestor: 0,
    ope_cod_credito: '',
    cert_comentario: '',
    cert_esactivo: true,
    cert_origendatos: 'Sistema_CobroSys'
  });
}

CerrarAgregarEditarElemento() {
  this.EncerarComponentes();
}

ActDesControles(num: number) {
  if (num === 0) {
    //inactivos
    this.CertificadosForms.get('id_certificado')?.disable();
    this.CertificadosForms.get('ope_cod_credito')?.disable();
    this.CertificadosForms.get('cli_identificacion')?.disable();
    this.CertificadosForms.get('cli_nombres')?.disable();
    this.CertificadosForms.get('cart_descripcion')?.disable();
    this.CertificadosForms.get('ope_producto')?.disable();
    this.CertificadosForms.get('ope_fecha_compra')?.disable();
    this.CertificadosForms.get('ope_estado_contacta')?.disable();
    this.CertificadosForms.get('cart_fecha_compra')?.disable();
    this.CertificadosForms.get('ges_nombres')?.disable();
    this.CertificadosForms.get('gest_fecha_gestion')?.disable();
    this.CertificadosForms.get('cert_fecha_act')?.disable();
    this.CertificadosForms.get('cert_fecha_desact')?.disable();
    this.CertificadosForms.get('cert_fecha_in')?.disable();
    this.CertificadosForms.get('cert_fecha_up')?.disable();
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

/************************************** EDITAR ELEMENTO  ******************************************************** */

ActualizaEstado(elemento: CertificadoI) {
  elemento.cert_esactivo = (elemento.cert_esactivo == '1' ? 0 : 1).toString();
  this.api.PutCertificados(elemento).subscribe((x) => this.ListarElementos(1));
}

EliminarElemento(elemento: CertificadoI) {
  this.alerta.EliminarRegistro().then((confirmado) => {
    if (confirmado) {
      elemento.cert_esactivo = '3';
      this.api.PutCertificados(elemento).subscribe((x) => {
        this.ListarElementos(1);
        this.alerta.RegistroEliminado();
      });
    }
  });
}

CargarElemento(datos: any, num: number) {
  this.CertificadosForms.patchValue({
    ope_cod_credito: datos.ope_cod_credito,
    cli_identificacion: datos.cli_identificacion,
    cli_nombres: datos.cli_nombres,
    cart_descripcion: datos.cart_descripcion,
    ope_producto: datos.ope_producto,
    ope_estado_contacta: datos.ope_estado_contacta,
    cart_fecha_compra: datos.cart_fecha_compra == null?'':this.fechas.getFechaEnLetras(datos.cart_fecha_compra),
    ope_fecha_compra: datos.ope_fecha_compra == null?'':this.fechas.getFechaEnLetras(datos.ope_fecha_compra),
    ges_nombres: datos.ges_nombres+' '+datos.ges_apellidos,
    gest_fecha_gestion: datos.gest_fecha_gestion == null?'':this.fechas.getFechaEnLetras(datos.gest_fecha_gestion),
    cert_fecha_act: this.fechas.fechaFormato(datos.cert_fecha_act),
    cert_fecha_desact: this.fechas.fechaFormato(datos.cert_fecha_desact),
    cert_fecha_in: this.fechas.fechaFormato(datos.cert_fecha_in),
    cert_fecha_up: this.fechas.fechaFormato(datos.cert_fecha_up)
  });
  if (num != 1) {
    this.BuscarCliente(datos.cli_identificacion);
  }

  this.AgregarEditarElemento(num);
}

CargarElementoDato(datos: any, num: number) {
  this.DatosForms.patchValue({
    id_certificado: datos.id_certificado,
    id_gestor: datos.id_gestor,
    ope_cod_credito: datos.ope_cod_credito,
    cli_identificacion: datos.cli_identificacion,
    cli_nombres: datos.cli_nombres,
    cart_descripcion: datos.cart_descripcion,
    cart_fecha_compra: datos.cart_fecha_compra == null?'':this.fechas.getFechaEnLetras(datos.cart_fecha_compra),
    ope_fecha_compra: datos.ope_fecha_compra == null?'': this.fechas.fechaCorta(datos.ope_fecha_compra),
    ope_producto: datos.ope_producto,
    cert_modelo: datos.cert_modelo
  });

  this.AgregarEditarElemento(num);
}

CargarCertificadoElementoDato(datos: any, num: number) {
  this.CertificadoEditForms.patchValue({
    id_certificado: datos.id_certificado,
    id_gestor: datos.id_gestor,
    ope_cod_credito: datos.ope_cod_credito,
    cert_comentario: datos.cert_comentario,
    cert_esactivo: datos.cert_esactivo === '1' ? true : false,
    cert_baseactual: datos.cert_baseactual === '1' ? true : false,
    cert_origendatos: datos.cert_origendatos
  });

  this.AgregarEditarElemento(num);
}

GuardarObjeto(datos: any) {
  datos.cert_hist_esactivo = datos.cert_hist_esactivo.toString() === 'true' ? '1' : '0';
  datos.cert_hist_baseactual = datos.cert_hist_baseactual.toString() === 'true' ? '1' : '0';

  const opcionDescarga = this.DatosForms.get('cert_modelo')?.value;

  // Generar Certificado
  switch (opcionDescarga) {
    case 'POLCOMP CIA. LTDA':
      let listadoObjeto:any[] = [];
      let ocD: any = {
        CarteraNom: datos.cart_descripcion,
        FechaCompra: datos.cart_fecha_compra,
        Identificacion:datos.cli_identificacion,
        Nombres: datos.cli_nombres,
        CodCredito: datos.ope_cod_credito,
        NumModelo: datos.cert_modelo
      }
      listadoObjeto.push(ocD);
      let om: generarCertificadoPDF = {
        entidad: 'Credito', listado: listadoObjeto
      };0
      this.gCredito=om;
      this.certificado.generarCertificadoPDF(this.gCredito);
      break;
    case 'SERVIGESUR CIA. LTDA':
      let listadoObjeto2:any[] = [];
      let ocD2: any = {
        CarteraNom: datos.cart_descripcion,
        FechaCompra: datos.cart_fecha_compra,
        Identificacion:datos.cli_identificacion,
        Nombres: datos.cli_nombres,
        CodCredito: datos.ope_cod_credito,
        FechaCompraCred: datos.ope_fecha_compra,
        Producto: datos.ope_producto,
        NumModelo: datos.cert_modelo
      }
      listadoObjeto2.push(ocD2);
      let om2: generarCertificadoSergSurPDF = {
        entidad: 'CreditoSerg', listado: listadoObjeto2
      };
      this.gCreditoSergSur=om2;
      this.certficadoSergvSur.generarCertificadoSergSurPDF(this.gCreditoSergSur);
      break;
    default:
      catchError((error) => {
        this.alerta.ErrorEnLaOperacion();
        this.ActDesControles(0);
        console.log(error);
        throw new Error(error);
      })
      break;
  }

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
        this.alerta.CertificadoGenerado();
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

ActualizarObjetoCertificado(datos: any) {
  datos.id_certificado = Number(datos.id_certificado);
  datos.id_gestor = Number(datos.id_gestor);
  datos.cert_esactivo = datos.cert_esactivo.toString() === 'true' ? '1' : '0';
  datos.cert_baseactual = datos.cert_baseactual.toString() === 'true' ? '1' : '0';

  this.api
  .PutCertificados(datos)
  .pipe(
    map((tracks) => {
      const exito = tracks['exito'];
      if (exito == 1) {
        this.ListarElementos(1);
        this.CerrarAgregarEditarElemento();
        this.EncerarComponentes();
        // this.TextoFiltro.patchValue('');
        this.alerta.RegistroActualizado();
      } else {
        this.alerta.ErrorEnLaPeticion(tracks['mensaje']);
        this.ActDesControles(2);
      }
    }),
    catchError((error) => {
      this.alerta.ErrorEnLaOperacion();
      this.ActDesControles(2);
      throw new Error(error);
    })
  )
  .subscribe(); 
}

CambiarEstadoObjeto(datos: any) {
  datos.id_certificado = Number(datos.id_certificado);
  datos.id_gestor = Number(datos.id_gestor);
  datos.cert_esactivo = datos.cert_esactivo.toString() === 'true' ? '1' : '0';
  datos.cert_baseactual = datos.cert_baseactual.toString() === 'true' ? '1' : '0';

  this.api
  .PutCertificados(datos)
  .pipe(
    map((tracks) => {
      const exito = tracks['exito'];
      if (exito == 1) {
        this.ListarElementos(1);
        this.CerrarAgregarEditarElemento();
        this.EncerarComponentes();
        // this.TextoFiltro.patchValue('');
        this.alerta.RegistroActualizado();
      } else {
        this.alerta.ErrorEnLaPeticion(tracks['mensaje']);
        this.ActDesControles(2);
      }
    }),
    catchError((error) => {
      this.alerta.ErrorEnLaOperacion();
      this.ActDesControles(2);
      throw new Error(error);
    })
  )
  .subscribe();
}

// ****************************************** OTROS ELEMENTOS ****************************************************************

CarterasList: any[] = [];

ListarCarteras() {
  this.api
    .GetCarteraFracionado(0, 0)
    .pipe(
      map((tracks) => {
        console.log(tracks['data'])
        this.CarterasList = tracks['data'];
      })
    )
    .subscribe();
}

/* Area para mostrar al cliente */
ClienteSeleccionado!: ClienteI | null;

BuscarCliente(identificacion: any) {
  this.ClienteInfo.patchValue('');
  if (identificacion == '') {
    this.alerta.ErrorEnLaPeticion(
      'No ingreso ningun identificador para su busqueda'
    );
  } else {
    this.api
      .GetClienteFracionadoFiltro(identificacion, 10)
      .pipe(
        map((tracks) => {
          const datos = tracks['data'];
          if (!datos) {
            this.alerta.NoExistenDatos();
          } else {
            this.ClienteSeleccionado = datos;
            this.ClienteInfo.patchValue(datos.cli_nombres);
          }
          console.log(datos);
        }),
        catchError((error) => {
          this.alerta.ErrorAlRecuperarElementos();
          throw new Error(error);
        })
      )
      .subscribe();
  }
}

ListaInicio()
{
  this.ListarElementos(1);
  this.ResetBuscarClienteForms();
}

  ////////////////////////////////////////  PARAMETROS PARA IMPRESION   ////////////////////////////////////////////////
  ModeloEmpresa: any[] = [
    { id: 1, name: 'POLCOMP CIA. LTDA', value:'1' },
    { id: 2, name: 'SERVIGESUR CIA. LTDA', value:'2' },
  ];

  ////////////////////////////////////////  CLIENTE   ////////////////////////////////////////////////
  TipoIdentificacion: any[] = [
    { id: 1, name: 'Cedula', value: '1' },
    { id: 2, name: 'Ruc', value: '2' },
    { id: 3, name: 'Pasaporte', value: '3' },
  ];
  Genero: any[] = [
    { id: 1, name: 'Hombre', value: 'M' },
    { id: 2, name: 'Mujer', value: 'F' },
    { id: 3, name: 'No responder', value: '0' },
  ];
  EstadoCivil: any[] = [
    { id: 1, name: 'Soltero/a', value: '1' },
    { id: 2, name: 'Casado/a', value: '2' },
    { id: 3, name: 'Divorciado/a', value: '3' },
    { id: 4, name: 'Viudo/a', value: '4' },
    { id: 5, name: 'Union-Libre', value: '5' },
    { id: 6, name: 'No especificado', value: '6' },
  ];

  ClienteForms = new FormGroup({
    id_cliente: new FormControl(0),
    cli_identificacion: new FormControl(''),
    cli_nombres: new FormControl(''),
    cli_tipo_identificacion: new FormControl(''),
    cli_genero: new FormControl('0'),
    cli_estado_civil: new FormControl(''),
    cli_ocupacion: new FormControl(''),
    cli_fecha_nacimiento: new FormControl(''),
    cli_score: new FormControl(''),
    cli_fallecido: new FormControl(false),
    cli_fecha_fallecido: new FormControl(''),
    cli_observacion: new FormControl(''),
    cli_provincia: new FormControl(''),
    cli_canton: new FormControl(''),
    cli_parroquia: new FormControl(''),
    cli_esactivo: new FormControl(true)
  });

  ResetClienteForms() {
    this.ClienteForms.reset({
      id_cliente: 0,
      cli_identificacion: '',
      cli_nombres: '',
      cli_tipo_identificacion: '',
      cli_genero: '0',
      cli_estado_civil: '',
      cli_ocupacion: '',
      cli_fecha_nacimiento: '',
      cli_score: '',
      cli_fallecido: false,
      cli_fecha_fallecido: '',
      cli_observacion: '',
      cli_provincia: '',
      cli_canton: '',
      cli_parroquia: '',
      cli_esactivo: true
    });
  }

  VerCliente() {
    this.ClienteForms.get('cli_identificacion')?.disable();
    this.ClienteForms.get('cli_nombres')?.disable();
    this.ClienteForms.get('cli_tipo_identificacion')?.disable();
    this.ClienteForms.get('cli_genero')?.disable();
    this.ClienteForms.get('cli_estado_civil')?.disable();
    this.ClienteForms.get('cli_ocupacion')?.disable();
    this.ClienteForms.get('cli_fecha_nacimiento')?.disable();
    this.ClienteForms.get('cli_score')?.disable();
    this.ClienteForms.get('cli_fallecido')?.disable();
    this.ClienteForms.get('cli_fecha_fallecido')?.disable();
    this.ClienteForms.get('cli_observacion')?.disable();
    this.ClienteForms.get('cli_provincia')?.disable();
    this.ClienteForms.get('cli_canton')?.disable();
    this.ClienteForms.get('cli_parroquia')?.disable();
    this.ClienteForms.get('cli_esactivo')?.disable();
    (<HTMLElement>document.getElementById('ModalCliente')).classList.add(
      'modal--show'
    );
    console.log('modal--show');
    this.ClienteForms.patchValue({
      id_cliente: this.ClienteSeleccionado!.id_cliente,
      cli_identificacion: this.ClienteSeleccionado!.cli_identificacion,
      cli_nombres: this.ClienteSeleccionado!.cli_nombres,
      cli_tipo_identificacion:
        this.ClienteSeleccionado!.cli_tipo_identificacion.toString(),
      cli_genero: this.ClienteSeleccionado!.cli_genero,
      cli_estado_civil: this.ClienteSeleccionado!.cli_estado_civil,
      cli_ocupacion: this.ClienteSeleccionado!.cli_ocupacion,
      cli_fecha_nacimiento: this.fechas.fechaCortaFormato(
        this.ClienteSeleccionado!.cli_fecha_nacimiento
      ),
      cli_score: this.ClienteSeleccionado!.cli_score,
      cli_fallecido:
        this.ClienteSeleccionado!.cli_fallecido === '1' ? true : false,
      cli_fecha_fallecido: this.fechas.fechaCortaFormato(
        this.ClienteSeleccionado!.cli_fecha_fallecido
      ),
      cli_observacion: this.ClienteSeleccionado!.cli_observacion,
      cli_provincia: this.ClienteSeleccionado!.cli_provincia,
      cli_canton: this.ClienteSeleccionado!.cli_canton,
      cli_parroquia: this.ClienteSeleccionado!.cli_parroquia,
      cli_esactivo:
        this.ClienteSeleccionado!.cli_esactivo === '1' ? true : false,
    });
  }

  CerrarModalCliente() {
    this.ClienteForms.get('cli_identificacion')?.enable();
    this.ClienteForms.get('cli_nombres')?.enable();
    this.ClienteForms.get('cli_tipo_identificacion')?.enable();
    this.ClienteForms.get('cli_genero')?.enable();
    this.ClienteForms.get('cli_estado_civil')?.enable();
    this.ClienteForms.get('cli_ocupacion')?.enable();
    this.ClienteForms.get('cli_fecha_nacimiento')?.enable();
    this.ClienteForms.get('cli_score')?.enable();
    this.ClienteForms.get('cli_fallecido')?.enable();
    this.ClienteForms.get('cli_fecha_fallecido')?.enable();
    this.ClienteForms.get('cli_observacion')?.enable();
    this.ClienteForms.get('cli_provincia')?.enable();
    this.ClienteForms.get('cli_canton')?.enable();
    this.ClienteForms.get('cli_parroquia')?.enable();
    this.ClienteForms.get('cli_esactivo')?.enable();
    (<HTMLElement>document.getElementById('ModalCliente')).classList.remove(
      'modal--show'
    );
    this.ResetClienteForms();
  }

// ****************************************** ENCERAR COMPONENTES *****************************************************************
EncerarComponentes() {
  //this.CarterasList = [];
  this.ClienteInfo.patchValue('');
  this.ClienteSeleccionado = null;
  this.ResetCertificadosForms();
  this.ResetCertificadoEditForms();
  this.loading = false;
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

FraccionarValores(datos?: any, rango?: number) {
  if (rango != null && datos != null) {
    this.EncerarVariablesPaginacion();
    this.ContadorDatos = datos.length;
    this.DatosTemporales = datos;
    this.RangoPaginacion = rango;
    this.FinalPaginacion = rango;
    this.DatosCargaMasiva = datos.slice(
      this.InicioPaginacion,
      this.FinalPaginacion
    );
  } else {
    this.DatosCargaMasiva = this.DatosTemporales.slice(
      this.InicioPaginacion,
      this.FinalPaginacion
    );
  }
}

BtnNext(rango?: number) {
  if (this.ModoBusqueda) {
    if (rango != null) {
    this.FraccionDatos = this.FraccionDatos + this.RangoDatos;
    this.GetFiltrarElemento(this.BuscarForms.value);
    }
    this.InicioPaginacion = this.InicioPaginacion + this.RangoPaginacion;
    this.FinalPaginacion = this.FinalPaginacion + this.RangoPaginacion;
    this.FraccionarValores();
  } else {
    // Si no es modo búsqueda, paginación normal
    if (rango != null) {
      this.FraccionDatos = this.FraccionDatos + this.RangoDatos;
      this.ListarElementos(2);
    }
    this.InicioPaginacion = this.InicioPaginacion + this.RangoPaginacion;
    this.FinalPaginacion = this.FinalPaginacion + this.RangoPaginacion;
    this.FraccionarValores();
  }
}

BtnPrevious(rango?: number) {
  if (this.ModoBusqueda) {
    if (rango != null) {
      this.FraccionDatos = this.FraccionDatos - this.RangoDatos;
      this.GetFiltrarElemento(this.BuscarForms.value);
    }

    if (this.InicioPaginacion >= this.RangoPaginacion) {
      this.InicioPaginacion = this.InicioPaginacion - this.RangoPaginacion;
      this.FinalPaginacion = this.FinalPaginacion - this.RangoPaginacion;
      this.FraccionarValores();
    }
  } else {
    if (rango != null) {
      this.FraccionDatos = this.FraccionDatos - this.RangoDatos;
      this.ListarElementos(2);
    }

    if (this.InicioPaginacion >= this.RangoPaginacion) {
      this.InicioPaginacion = this.InicioPaginacion - this.RangoPaginacion;
      this.FinalPaginacion = this.FinalPaginacion - this.RangoPaginacion;
      this.FraccionarValores();
    }
  }
}

EncerarVariablesPaginacion() {
  this.ContadorDatos = 0;
  this.RangoPaginacion = 0;
  this.InicioPaginacion = 0;
  this.FinalPaginacion = 0;
  this.DatosTemporales = [];
}

  /*********************  FILTRO MODO GENERAL *********************** */
  DatosTemporalesBusqueda: any[] = [];
  FirltroPor: string = '';

  FiltrarPor(filtro: string, etiqueta: number) {
    const TxtFiltro = document.getElementById(
      'TxtFiltro' + etiqueta
    ) as HTMLInputElement;
    const ThCliente = document.getElementById(
      'ThCliente' + etiqueta
    ) as HTMLInputElement;
    const ThIdentificacion = document.getElementById(
      'ThIdentificacion' + etiqueta
    ) as HTMLInputElement;
    const ThCodCredito = document.getElementById(
      'ThCodCredito' + etiqueta
    ) as HTMLInputElement;
    const ThCartera = document.getElementById(
      'ThCartera' + etiqueta
    ) as HTMLInputElement;

    const lblFiltro = document.getElementById(
      'lblFiltro' + etiqueta
    ) as HTMLInputElement;
    lblFiltro.textContent = filtro;
    ThCliente.style.color = '';
    ThIdentificacion.style.color = '';
    ThCodCredito.style.color = '';
    ThCartera.style.color = '';
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
    const ThCliente = document.getElementById(
      'ThCliente' + etiqueta
    ) as HTMLInputElement;
    const ThCodCredito = document.getElementById(
      'ThCodCredito' + etiqueta
    ) as HTMLInputElement;
    const ThCartera = document.getElementById(
      'ThCartera' + etiqueta
    ) as HTMLInputElement;
    const lblFiltro = document.getElementById(
      'lblFiltro' + etiqueta
    ) as HTMLInputElement;
    lblFiltro.textContent = '';
    ThCliente.style.color = '';
    ThIdentificacion.style.color = '';
    ThCodCredito.style.color = '';
    ThCartera.style.color = '';
    TxtFiltro.disabled = true;
    TxtFiltro.value = '';
    this.FirltroPor = '';
    if (etiqueta === 0) {
      this.FraccionarValores(
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
    this.EncerarVariablesPaginacion();
    lblFiltro.textContent != 'ThCodCredito'
      ? (TxtFiltro.value = TxtFiltro.value!.toUpperCase())
      : (TxtFiltro.value = TxtFiltro.value!);
    const ThCliente = document.getElementById(
      'ThCliente' + etiqueta
    ) as HTMLInputElement;
    const ThIdentificacion = document.getElementById(
      'ThIdentificacion' + etiqueta
    ) as HTMLInputElement;
    const ThCodCredito = document.getElementById(
      'ThCodCredito' + etiqueta
    ) as HTMLInputElement;
    const ThCartera = document.getElementById(
      'ThCartera' + etiqueta
    ) as HTMLInputElement;

    if (lblFiltro.textContent === 'Nombres') {
      let nombre = TxtFiltro.value!;
      if (num === 0) {
        const resultado = this.ListaCertificados.filter((elemento) => {
          return elemento.cli_nombres.includes(nombre.toUpperCase());
        });
        this.FraccionarValores(resultado, this.ConstanteFraccion);
      }

      if (contador != 0) {
        ThCliente.style.color = 'red';
      } else {
        ThCliente.style.color = '';
      }
    }
    if (lblFiltro.textContent === 'Identificacion') {
      let nombre = TxtFiltro.value!;
      if (num === 0) {
        const resultado = this.ListaCertificados.filter((elemento) => {
          return elemento.cli_identificacion.includes(nombre.toUpperCase());
        });
        this.FraccionarValores(resultado, this.ConstanteFraccion);
      }

      if (contador != 0) {
        ThIdentificacion.style.color = 'red';
      } else {
        ThIdentificacion.style.color = '';
      }
    }
    if (lblFiltro.textContent === 'Cod. Credito') {
      let nombre = TxtFiltro.value!;
      if (num === 0) {
        const resultado = this.ListaCertificados.filter((elemento) => {
          return elemento.ope_cod_credito.includes(nombre);
        });
        this.FraccionarValores(resultado, this.ConstanteFraccion);
      }

      if (contador != 0) {
        ThCodCredito.style.color = 'red';
      } else {
        ThCodCredito.style.color = '';
      }
    }
    if (lblFiltro.textContent === 'Cartera') {
      let nombre = TxtFiltro.value!;
      if (num === 0) {
        const resultado = this.ListaCertificados.filter((elemento) => {
          return elemento.cart_descripcion.includes(nombre);
        });
        this.FraccionarValores(resultado, this.ConstanteFraccion);
      }

      if (contador != 0) {
        ThCartera.style.color = 'red';
      } else {
        ThCartera.style.color = '';
      }
    }
  }
}
