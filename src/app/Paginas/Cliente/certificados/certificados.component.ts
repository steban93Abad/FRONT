import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { catchError, map } from 'rxjs';
import { Alertas } from 'src/app/Control/Alerts';
import { Fechas } from 'src/app/Control/Fechas';
import { TipoDeTexto } from 'src/app/Control/TipoDeTexto';
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
  ClienteI,
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
    private router: Router,public reporte:GeneradorReporte,
    public validar: TipoDeTexto
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
    let listadoObjeto:any[] = [];
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

  /************************************** VER ELEMENTO  ******************************************************** */
  TituloFormulario = '';
  ClienteInfo = new FormControl({ value: '', disabled: true }, Validators.required);

  CreditosForms = new FormGroup({
    id_cxc_operacion: new FormControl(0),
    ope_cod_credito: new FormControl(''),    
    cli_identificacion: new FormControl(''),
    cart_descripcion: new FormControl(''),
    ope_estado_contacta: new FormControl(''),
    ope_descrip_unidad_gestion: new FormControl(''),
    cart_fecha_compra: new FormControl(''),
    ges_nombres: new FormControl(''),
  });

  ResetCreditosForms() {
    this.CreditosForms.reset({
      id_cxc_operacion: 0,
      ope_cod_credito: '',
      cli_identificacion: '',
      cart_descripcion: '',
      ope_estado_contacta: '',
      ope_descrip_unidad_gestion: '',
      cart_fecha_compra: '',
      ges_nombres: '',
    });
  }

  CertificadoForms = new FormGroup({
    id_certificado: new FormControl(0, Validators.required),
    id_gestor: new FormControl(0, Validators.required),
    ope_cod_credito: new FormControl(''),
    cert_comentario: new FormControl(''),
    cert_fecha_in: new FormControl(this.fechas.fecha()),
    cert_fecha_up: new FormControl(this.fechas.fecha()),
    cert_esactivo: new FormControl(true),
    cert_esdescargado: new FormControl(true),
    cert_baseactual: new FormControl(true),
    cert_origendatos: new FormControl('Sistema_CobroSys'),
    cert_url_certificado: new FormControl('')
  });


  ActDesControles(num: number) {
    if (num === 0) {
      //inactivos
      this.CreditosForms.get('id_cxc_operacion')?.disable();
      this.CreditosForms.get('ope_cod_credito')?.disable();
      this.CreditosForms.get('cli_identificacion')?.disable();
      this.CreditosForms.get('cart_descripcion')?.disable();
      this.CreditosForms.get('ope_estado_contacta')?.disable();
      this.CreditosForms.get('ope_descrip_unidad_gestion')?.disable();
      this.CreditosForms.get('cart_fecha_compra')?.disable();
      this.CreditosForms.get('ges_nombres')?.disable();
    }
  }

  AgregarEditarElemento(num: number) {
    if (num === 1) {
      this.TituloFormulario = 'Visualizar';
      this.ActDesControles(0);
    }
  }

  CerrarAgregarEditarElemento() {
    this.EncerarComponentes();
  }

  CargarElemento(datos: any, num: number) {
    this.CreditosForms.patchValue({
      id_cxc_operacion: datos.id_cxc_operacion,
      ope_cod_credito: datos.ope_cod_credito,    
      cli_identificacion: datos.cli_identificacion,
      cart_descripcion: datos.cart_descripcion,
      ope_estado_contacta: datos.ope_estado_contacta,
      ope_descrip_unidad_gestion: datos.ope_descrip_unidad_gestion,
      cart_fecha_compra: datos.cart_fecha_compra == null?'':this.fechas.fechaCortaAbt(datos.cart_fecha_compra),
      ges_nombres: datos.ges_nombres
    });
    if (num != 1) {
      this.ListarCarteras();
      this.BuscarCliente(datos.cli_identificacion);
    }
    this.AgregarEditarElemento(num);
  }

  ImprimirObjeto(datos: any) {
    if (this.TituloFormulario === 'Editar') {
    }
  }

// ****************************************** OTROS ELEMENTOS *****************************************************************
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

  ClienteSeleccionado!: ClienteI | null;

  BuscarCliente(identificacion: string) {
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
          }),
          catchError((error) => {
            this.alerta.ErrorAlRecuperarElementos();
            throw new Error(error);
          })
        )
        .subscribe();
    }
  }
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

  ModoVistaCliente: boolean = false;
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
    cli_esactivo: new FormControl(true),
  }
  ,
  {
    validators: [
      this.validar.ValidatorTipo_Identificacion(
        'cli_identificacion',
        'cli_tipo_identificacion'
      ),
    ],
  }
);
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
      cli_esactivo: true,
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
    this.ModoVistaCliente = true;
    (<HTMLElement>document.getElementById('ModalCliente')).classList.add(
      'modal--show'
    );
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

  AbrirModalCliente() {
    this.CreditosForms.patchValue({ cli_identificacion: '' });
    this.ClienteInfo.patchValue('');
    (<HTMLElement>document.getElementById('ModalCliente')).classList.add(
      'modal--show'
    );
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
    this.ModoVistaCliente = false;
    (<HTMLElement>document.getElementById('ModalCliente')).classList.remove(
      'modal--show'
    );
    this.ResetClienteForms();
  }


  // ****************************************** ENCERAR COMPONENTES *****************************************************************
  EncerarComponentes() {
    this.CarterasList = [];
    this.ClienteInfo.patchValue('');
    this.ClienteSeleccionado = null;
    this.ResetCreditosForms();
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
