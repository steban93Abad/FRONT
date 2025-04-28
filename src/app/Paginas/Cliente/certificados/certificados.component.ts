import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { catchError, map } from 'rxjs';
import { Alertas } from 'src/app/Control/Alerts';
import { Fechas } from 'src/app/Control/Fechas';
import { TipoDeTexto } from 'src/app/Control/TipoDeTexto';
import { GeneradorReporte } from 'src/app/Control/GeneradoReporte';
import { GeneradorCertificado } from 'src/app/Control/GeneradoCertificado';
import {
  ResultadoCarteraI,
  ResultadoGestorI,
  ResultadoMenuI,
  ResultadoPermisosI,
} from 'src/app/Modelos/login.interface';
import {
  ContactabilidadI,
  FiltroCredito,
  CxcOperacionI,
  CertificadoI,
  generarPDF,
  ClienteI,
  GestorI,
  generarCertificadoPDF,
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
    public certificado:GeneradorCertificado,
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
    return elemento.men_url === 'certificados';
  }) as ResultadoMenuI;
  ConstanteFraccion: number = Number(this.Usuario.usr_fraccion_datos);
  RangoDatos: number = Number(this.Usuario.usr_rango_datos);
  PaginaNombre: string = this.PaginaActual.men_descripcion;
  loading: boolean = false;
  LecturaEscritura: number = Number(this.PaginaActual.men_lectura);
  gCredito!:generarCertificadoPDF;
  CarteraGestor: any[] = [];
  TodasCarteras: number[] = [];
  Cartera: ResultadoCarteraI[] = this.permisos.cartera;
  mostrarBtnImprimir: boolean = true;
  ModoBusqueda: boolean = false;
  FiltroActual: FiltroCredito | null = null;

  // ****************************************** CONTROLES DE BUSQUEDA *****************************************************************

  BuscarForms = new FormGroup({
    identificacion: new FormControl('', Validators.required),
    nombres_cliente: new FormControl('', Validators.required),
    cartera: new FormControl('0', Validators.required),
    gestor: new FormControl('0', Validators.required),
    contactabilidad: new FormControl('0', Validators.required),
    fecha_inicial: new FormControl('',
      Validators.required
    ),
    fecha_final: new FormControl('',
      Validators.required
    )
  });

  ResetBuscarClienteForms() {
    this.BuscarForms.reset({
      identificacion: '',
      nombres_cliente: '',
      cartera: '0',
      gestor: '0',
      contactabilidad: '0',
      fecha_inicial: '',
      fecha_final: ''
    });
  }

  ListaContactabilidad: ContactabilidadI[] = [];

  ListarContactabilidad() {
    this.ListaContactabilidad = [];
    this.api
      .GetContactabilidadFracionado(0, 0)
      .pipe(
        map((tracks) => {
          this.ListaContactabilidad = tracks['data'];
        }),
        catchError((error) => {
          this.loading = false;
          this.alerta.ErrorAlRecuperarElementos();
          throw new Error(error);
        })
      )
      .subscribe();
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
  ListaCreditos: any[] = [];
  FraccionDatos: number = 0;
  ContadorDatosGeneral: number = 0;

  ListarElementos(num: number) {
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
          this.FraccionarValores(this.ListaCreditos, this.ConstanteFraccion);
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
     let filtro: FiltroCredito = {
       identificacion: (datos.identificacion.trim() == ''
         ? '0'
         : datos.identificacion.trim())!,
       nombres_cliente: (datos.nombres_cliente.trim() == ''
         ? '0'
         : datos.nombres_cliente.trim())!,
       cartera:
         datos.cartera == '0' ? this.TodasCarteras : [Number(datos.cartera)],
       gestor: datos.gestor,
       contactabilidad: (datos.nombres_cliente == '0'
         ? 0
         : Number(datos.contactabilidad))!,
       fecha_inicial: datos.fecha_inicial == ''?this.fechas.fechaMinDate():datos.fecha_inicial,
       fecha_final: datos.fecha_final == ''?this.fechas.fechaMinDate():datos.fecha_final
     };

     this.ModoBusqueda = true;
     this.FiltroActual = filtro;

     this.ListaCreditos = [];
     this.loading = true;
     this.api
       .GetCreditoFracionadoFiltro(filtro, this.FraccionDatos, this.RangoDatos)
       .pipe(
         map((tracks) => {
           console.log(tracks['data']);
           this.ListaCreditos = tracks['data'];
           this.DatosTemporalesBusqueda = tracks['data'];
           if (this.ListaCreditos.length === 0) {
             this.loading = false;
             this.alerta.NoExistenDatos();
           } else {
             this.loading = false;
             this.ContadorDatosGeneral = this.ListaCreditos.length;
             this.FraccionarValores(this.ListaCreditos, this.ConstanteFraccion);
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
  ClienteInfo = new FormControl({ value: '', disabled: true });
  CertificadoInfo = new FormControl({ value: '', disabled: true });

  CreditosForms = new FormGroup({
    id_cxc_operacion: new FormControl(0),
    ope_cod_credito: new FormControl(''),
    cli_identificacion: new FormControl(''),
    cli_nombres: new FormControl(''),
    cart_descripcion: new FormControl(''),
    ope_estado_contacta: new FormControl(''),
    ope_descrip_unidad_gestion: new FormControl(''),
    cart_fecha_compra: new FormControl(''),
    gest_fecha_gestion: new FormControl(''),
    ges_nombres: new FormControl(''),
  });

  ResetCreditosForms() {
    this.CreditosForms.reset({
      id_cxc_operacion: 0,
      ope_cod_credito: '',
      cli_identificacion: '',
      cli_nombres: '',
      cart_descripcion: '',
      ope_estado_contacta: '',
      ope_descrip_unidad_gestion: '',
      cart_fecha_compra: '',
      gest_fecha_gestion: '',
      ges_nombres: '',
    });
  }

  CertificadoForms = new FormGroup({
    id_certificado: new FormControl(0, Validators.required),
    id_gestor: new FormControl(0, Validators.required),
    ope_cod_credito: new FormControl('',[Validators.required,this.validar.VFN_AlfaNumerico()]),
    cart_descripcion: new FormControl(''),
    cli_identificacion: new FormControl(''),
    cli_nombres: new FormControl(''),
    cart_fecha_compra: new FormControl(''),
    cert_comentario: new FormControl(''),
    cert_esactivo: new FormControl(true),
    cert_esdescargado: new FormControl(true),
    cert_baseactual: new FormControl(true),
    cert_origendatos: new FormControl('Sistema_CobroSys'),
    cert_url_certificado: new FormControl('')
  });

  ResetCertificadoForms() {
    this.CertificadoForms.reset({
      id_certificado: 0,
      id_gestor: 0,
      ope_cod_credito: '',
      cli_identificacion: '',
      cli_nombres: '',
      cart_descripcion: '',
      cart_fecha_compra: '',
      cert_comentario: '',
      cert_esactivo: true,
      cert_esdescargado: true,
      cert_baseactual: true,
      cert_origendatos: 'Sistema_CobroSys',
      cert_url_certificado: '',
    });
  }

  ActDesControles(num: number) {
    if (num === 0) {
      //inactivos
      this.CreditosForms.get('id_cxc_operacion')?.disable();
      this.CreditosForms.get('ope_cod_credito')?.disable();
      this.CreditosForms.get('cli_identificacion')?.disable();
      this.CreditosForms.get('cli_nombres')?.disable();
      this.CreditosForms.get('cart_descripcion')?.disable();
      this.CreditosForms.get('ope_estado_contacta')?.disable();
      this.CreditosForms.get('ope_descrip_unidad_gestion')?.disable();
      this.CreditosForms.get('cart_fecha_compra')?.disable();
      this.CreditosForms.get('ges_nombres')?.disable();
      this.CreditosForms.get('gest_fecha_gestion')?.disable();
    }
    if (num === 2) {
      //edicion
      this.CreditosForms.get('cart_descripcion')?.enable();
      this.CreditosForms.get('cart_fecha_compra')?.enable();
      this.CreditosForms.get('ope_cod_credito')?.enable();
      this.CreditosForms.get('cli_nombres')?.enable();
      this.CreditosForms.get('cli_identificacion')?.enable();
      this.CreditosForms.get('id_gestor')?.enable();
      this.CreditosForms.get('cert_comentario')?.enable();
      this.CreditosForms.get('cert_esactivo')?.enable();
      this.CreditosForms.get('cert_esdescargado')?.enable();
      this.CreditosForms.get('cert_baseactual')?.enable();
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

  CerrarAgregarEditarElemento() {
    this.EncerarComponentes();
  }

  CargarElemento(datos: any, num: number) {
    this.CreditosForms.patchValue({
      id_cxc_operacion: datos.id_cxc_operacion,
      ope_cod_credito: datos.ope_cod_credito,
      cli_identificacion: datos.cli_identificacion,
      cli_nombres: datos.cli_nombres,
      cart_descripcion: datos.cart_descripcion,
      ope_estado_contacta: datos.ope_estado_contacta,
      ope_descrip_unidad_gestion: datos.ope_descrip_unidad_gestion,
      cart_fecha_compra: datos.cart_fecha_compra == null?'':this.fechas.getFechaEnLetras(datos.cart_fecha_compra),
      ges_nombres: datos.ges_nombres+' '+datos.ges_apellidos,
      gest_fecha_gestion: datos.gest_fecha_gestion == null?'':this.fechas.getFechaEnLetras(datos.gest_fecha_gestion),
    });

    if (num != 1) {
      this.ListarCarteras();
      this.BuscarCliente(datos.cli_identificacion);
    }
    this.AgregarEditarElemento(num);
  }

  CargarElementoGestor(datos: any, num: number) {
    this.CertificadoForms.patchValue({
      id_gestor: datos.id_gestor,
      ope_cod_credito: datos.ope_cod_credito,
      cart_descripcion: datos.cart_descripcion,
      cli_identificacion: datos.cli_identificacion,
      cli_nombres: datos.cli_nombres,
      cart_fecha_compra: datos.cart_fecha_compra == null?'':this.fechas.getFechaEnLetras(datos.cart_fecha_compra)
    });
    if (num != 1) {
      this.BuscarCertificado(datos.ope_cod_credito);
    }
    this.AgregarEditarElemento(num);
  }

  GuardarObjeto(datos: any) {

      datos.cert_esactivo = datos.cert_esactivo.toString() === 'true' ? '1' : '0';
      datos.cert_esdescargado = datos.cert_esdescargado.toString() === 'true' ? '1' : '0';
      datos.cert_baseactual = datos.cert_baseactual.toString() === 'true' ? '1' : '0';

      // Verificar si el estado de contactabilidad es Liquidado
      const estadoContactabilidad = this.CreditosForms.get('ope_estado_contacta')?.value;

      if (estadoContactabilidad !== 'LIQUIDADO') {
        this.alerta.ErrorEnLaPeticion('No se puede generar el certificado. El estado de contactabilidad debe ser "LIQUIDADO".');
        return; // Detener el proceso si no está Liquidado
      }

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

      // Guardar Certificado
      this.api
      .PostCertificado(datos)
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

  /* Area para mostrar el certificado */
  CertificadoSeleccionado!: CertificadoI | null;

  BuscarCertificado(credito: any) {
    this.CertificadoInfo.patchValue('');

    if (credito == '') {
      this.alerta.ErrorEnLaPeticion(
        'No ingreso ningun identificador para su busqueda'
      );
    } else {
      this.api
        .GetCertificadoFracionadoFiltro(credito, 10)
        .pipe(
          map((tracks) => {
            const datos = tracks['data'];
            if (!datos) {
              this.mostrarBtnImprimir = true; // Si no hay datos, oculta el botón
            } else {
              this.CertificadoSeleccionado = datos;
              this.CertificadoInfo.patchValue(datos.cert_esdescargado);
              this.mostrarBtnImprimir = (datos.cert_esdescargado == 0);
              this.alerta.MensajePersonalizado("Certificado Descargado","No se puede descargar este certificado otra vez. Vaya al menu y descargue en Descargar Certificado.", 0);
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
    this.CarterasList = [];
    this.ClienteInfo.patchValue('');
    this.ClienteSeleccionado = null;
    this.CertificadoInfo.patchValue('');
    this.ResetCertificadoForms();
    //this.ResetCreditosForms();
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

  BtnNextUser(rango?: number) {
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

  BtnPreviousUser(rango?: number) {
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
    const ThContactabilidad = document.getElementById(
      'ThContactabilidad' + etiqueta
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
    ThContactabilidad.style.color = '';
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
    const ThContactabilidad = document.getElementById(
      'ThContactabilidad' + etiqueta
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
    ThContactabilidad.style.color = '';
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
    const ThContactabilidad = document.getElementById(
      'ThContactabilidad' + etiqueta
    ) as HTMLInputElement;
    const ThCartera = document.getElementById(
      'ThCartera' + etiqueta
    ) as HTMLInputElement;

    if (lblFiltro.textContent === 'Nombres') {
      let nombre = TxtFiltro.value!;
      if (num === 0) {
        const resultado = this.ListaCreditos.filter((elemento) => {
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
        const resultado = this.ListaCreditos.filter((elemento) => {
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
        const resultado = this.ListaCreditos.filter((elemento) => {
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
    if (lblFiltro.textContent === 'Contactabilidad') {
      let nombre = TxtFiltro.value!;
      if (num === 0) {
        const resultado = this.ListaCreditos.filter((elemento) => {
          return elemento.ope_estado_contacta.includes(nombre);
        });
        this.FraccionarValores(resultado, this.ConstanteFraccion);
      }

      if (contador != 0) {
        ThContactabilidad.style.color = 'red';
      } else {
        ThContactabilidad.style.color = '';
      }
    }
    if (lblFiltro.textContent === 'Cartera') {
      let nombre = TxtFiltro.value!;
      if (num === 0) {
        const resultado = this.ListaCreditos.filter((elemento) => {
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
