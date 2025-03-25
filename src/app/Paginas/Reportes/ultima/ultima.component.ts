import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Alertas } from 'src/app/Control/Alerts';
import { ApiService } from 'src/app/service/api.service';
import { Fechas } from 'src/app/Control/Fechas';
import { ResultadoCarteraI, ResultadoGestorI, ResultadoMenuI, ResultadoPermisosI } from 'src/app/Modelos/login.interface';
import { Observable, catchError, map } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ContactabilidadI, FiltroGestion, FiltroGestion2, GestionCG, GestorI } from 'src/app/Modelos/response.interface';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { ngxCsv } from 'ngx-csv';
import autotable from 'jspdf-autotable';

@Component({
  selector: 'app-ultima',
  templateUrl: './ultima.component.html',
  styleUrls: ['./ultima.component.css']
})
export class UltimaComponent implements OnInit  {
  ListaUltimaGestion:any[]=[];
  ListaGestionar: any[] = [];
  FraccionDatos: number = 0;
  ContadorDatosGeneral: number = 0;
  ParametrosDeDescarga: Array<string> = ['PDF', 'EXCEL', 'CSV'];
  banderaDescargar:boolean=false;
  banderaTodas:boolean=false;
  banderaFiltro:boolean=false;
  valor:number=0;
  contac:any[] = [];
  TodasContactabilidades: number[] = [];
  @ViewChild('contenido',{static:false})el!:ElementRef
  ngOnInit(): void 
  {
    this.CarterasGestor();
    this.getContactabilidad().subscribe((result: any[]) => {
      this.ListaContactabilidad = result;
      for (let datos of this.ListaContactabilidad) {
        let c: any = {
          id_contactabilidad: Number(datos.id_contactabilidad),
          contac_descripcion: datos.contac_descripcion
        };
        this.contac.push(c);
        this.TodasContactabilidades.push(c.id_contactabilidad);
      }  
    });
  this.getElementosSinGestionar2();
  }
  constructor(private api: ApiService,private alerta: Alertas,public Fechas: Fechas,private router: Router) {}
  BuscarForms = new FormGroup({
    identificacion: new FormControl('', Validators.required),
    nombres_cliente: new FormControl('', Validators.required),
    cartera: new FormControl('0', Validators.required),
    gestor: new FormControl('0', Validators.required),
    contactabilidad: new FormControl('0', Validators.required),
    fecha_inicial_pp: new FormControl(
      this.Fechas.fechaActualCorta(),
      Validators.required
    ),
    fecha_final_pp: new FormControl(
      this.Fechas.fechaActualCorta(),
      Validators.required
    ),
    fecha_inicial_gestion: new FormControl(
      this.Fechas.fechaActualCorta(),
      Validators.required
    ),
    fecha_final_gestion: new FormControl(
      this.Fechas.fechaActualCorta(),
      Validators.required
    ),
    ultima_gestion: new FormControl(true, Validators.required),
  });
  ResetClienteForms() {
    this.BuscarForms.reset({
      identificacion: '',
      nombres_cliente: '',
      cartera: '0',
      gestor: '0',
      contactabilidad: '0',
      fecha_inicial_pp: this.Fechas.fechaActualCorta(),
      fecha_final_pp: this.Fechas.fechaActualCorta(),
      fecha_inicial_gestion: this.Fechas.fechaActualCorta(),
      fecha_final_gestion: this.Fechas.fechaActualCorta(),
      ultima_gestion: true,
    });
  }
  
/***********************************************/
 ListaCarteras: any[] = [
    { number: '1', name: 'Marcinex', icon: 'bi bi-list' },
    { number: '2', name: 'Pacifico', icon: 'bi bi-cake2' },
    { number: '3', name: 'Jep', icon: 'bi bi-building' },
    { number: '4', name: 'RM', icon: 'bi bi-battery-half' },
    { number: '5', name: 'Jaher', icon: 'bi bi-bank' },
  ];

  valorD:number=0;
  EstadoCliente: any[] = [
    { number: '1', name: 'Contactado', icon: 'bi bi-list' },
    { number: '2', name: 'No Contactado', icon: 'bi bi-cake2' },
    { number: '3', name: 'Compromiso de pago', icon: 'bi bi-building' },
    { number: '4', name: 'Compromiso de incumplido', icon: 'bi bi-battery-half' },
    { number: '5', name: 'Combenio de pago', icon: 'bi bi-bank' },
  ];
  Gestores: any[] = [
    { number: '1', name: 'Juan Perez', icon: 'bi bi-list' },
    { number: '2', name: 'Pedro Perez', icon: 'bi bi-cake2' },
    { number: '3', name: 'Carlos Perez', icon: 'bi bi-building' },
    { number: '4', name: 'Marco Perez', icon: 'bi bi-battery-half' },
    { number: '5', name: 'Maria Perez', icon: 'bi bi-bank' },
  ];
  DatosTemporalesBusqueda: any[] = [];
  getCurrentDate() {
    const startDate = document.getElementById('startDate') as HTMLInputElement;
    const endDate = document.getElementById('endDate') as HTMLInputElement;
    const today = new Date();
    const year = today.getFullYear();
    let month = (today.getMonth() + 1).toString();
    let day = today.getDate().toString();
    month = (Number(month) < 10 ? `0${month}` : month).toString();
    day = (Number(day) < 10 ? `0${day}` : day).toString();

    startDate.value = `${year}-${month}-${day}`;
    endDate.value = `${year}-${month}-${day}`;

    // return `${year}-${month}-${day}`;
  }
  DatosTemporalesBusqueda2: any[] = [];
  CarteraGestor: any[] = [];
  TodasCarteras: number[] = [];
  permisos: ResultadoPermisosI = JSON.parse(localStorage.getItem('usuario')!);
  Cartera: ResultadoCarteraI[] = this.permisos.cartera;
  Usuario: ResultadoGestorI = this.permisos.gestor;
  Menu: ResultadoMenuI[] = this.permisos.menu;
  PaginaActual: ResultadoMenuI = this.Menu.find((elemento) => {
    return elemento.men_url === 'ultima-gestion';
  }) as ResultadoMenuI;
  ConstanteFraccion: number = Number(this.Usuario.usr_fraccion_datos);
  RangoDatos: number = Number(this.Usuario.usr_rango_datos);
  LecturaEscritura: number = Number(this.PaginaActual.men_lectura);
  PaginaNombre: string = this.PaginaActual.men_descripcion;
  loading: boolean = false;
  // ****************************************** PAGINACION *****************************************************************
  DatosCargaMasiva!: any[];
  DatosTemporales: any[] = [];
  ContadorDatos: number = 0;
  RangoPaginacion: number = 0;
  InicioPaginacion: number = 0;
  FinalPaginacion: number = 0;
  FraccionarValores(datos?: any, rango?: number ){
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
      EncerarVariablesPaginacion() {
        this.ContadorDatos = 0;
        this.RangoPaginacion = 0;
        this.InicioPaginacion = 0;
        this.FinalPaginacion = 0;
        this.DatosTemporales = [];
      }
      buscarFiltro(dato:any)
  {
    this.banderaFiltro=true;
    this.banderaTodas=false;
    let filtro:FiltroGestion2=
    {
      tipo:1,identificacion:(dato.identificacion.trim()===''?'0':dato.identificacion.trim())!,
      nombres_cliente:(dato.nombres_cliente.trim()===''?'0':dato.nombres_cliente.trim())!,
      cartera:dato.cartera=='0'?this.TodasCarteras:[Number(dato.cartera)],
      gestor:dato.gestor,
      contactabilidad:dato.contactabilidad=='0'?this.TodasContactabilidades:[Number(dato.contactabilidad)],
      fecha_inicial_pp:dato.fecha_inicial_pp,
      fecha_final_pp:dato.fecha_final_pp,
      fecha_inicial_gestion:dato.fecha_inicial_gestion,
      fecha_final_gestion:dato.fecha_final_gestion,
      ultima_gestion:dato.ultima_gestion==true?'1':'0'
    }
    this.ListaUltimaGestion = [];
    this.loading = true;
    this.api
      .GetGestionFracionadoThirdFiltro(filtro)
      .pipe(
        map((tracks) => {
          this.ListaUltimaGestion = tracks['data'];
          this.banderaDescargar=true;
          console.log(this.ListaUltimaGestion);
          this.valorD=this.getKeys2(this.ListaUltimaGestion).length;
          console.log(this.valorD);
          this.DatosTemporalesBusqueda = tracks['data'];
          if (this.ListaUltimaGestion.length === 0) {
            this.loading = false;
            this.alerta.NoExistenDatos();
          } else {
            this.loading = false;
            this.ContadorDatosGeneral = this.ListaUltimaGestion.length;
            this.FraccionarValores(this.ListaUltimaGestion, this.ConstanteFraccion);
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
  ListaContactabilidad: ContactabilidadI[] = [];
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
  getContactabilidad(): Observable<any[]> {
    return this.api.GetContactabilidadFracionado(0, 0).pipe(
      map((tracks) => {
          return tracks['data'].map((item: any) => ({
            id_contactabilidad: item['id_contactabilidad'],
            contac_descripcion: item['contac_descripcion']
          }));
      }),
      catchError((error) => {
        throw new Error(error);
      })
    );
  }
  /*********************  FILTRO MODO GENERAL *********************** */
  FirltroPor: string = '';
  TextoFiltro = new FormControl({ value: '', disabled: true }, [
    Validators.required,
  ]);

  FiltrarPor(filtro: string) {
    this.FirltroPor = filtro;
    this.TextoFiltro.patchValue('');
    const inputElement = document.getElementById(
      'TxtFiltro'
    ) as HTMLInputElement;
    const ThGestor = document.getElementById(
      'ThGestor'
    ) as HTMLInputElement;
    const ThNombres = document.getElementById(
      'ThNombres'
    ) as HTMLInputElement;
//ThTipoGestion
const ThTipoGestion = document.getElementById(
  'ThTipoGestion'
) as HTMLInputElement;
    ThNombres.style.color = '';
    ThGestor.style.color = '';
    ThTipoGestion.style.color = '';
    inputElement.disabled = false;
    inputElement.focus();
  }

  FiltrarLista(num: number) {
    const contador = this.TextoFiltro.value!.trim().length!;
    this.EncerarVariablesPaginacion();
    this.TextoFiltro.patchValue(this.TextoFiltro.value!.toUpperCase());
    const ThNombres = document.getElementById(
      'ThNombres'
    ) as HTMLInputElement;
    const ThGestor = document.getElementById(
      'ThGestorAsignado'
    ) as HTMLInputElement;
    const ThTipoGestion = document.getElementById(
      'ThTipoGestion'
    ) as HTMLInputElement;
    if(this.banderaTodas==true&&this.banderaFiltro==false)
      {
        if (this.FirltroPor === 'Nombres') {
          let nombre = this.TextoFiltro.value!;
          if (num === 0) {
            const resultado = this.ListaUltimaGestion.filter((elemento) => {
              return elemento['cli_nombres'].includes(nombre.toUpperCase());
            });
            this.FraccionarValores(resultado, this.ConstanteFraccion);
          }
    
          if (contador != 0) {
            ThNombres.style.color = 'red';
          } else {
            ThNombres.style.color = '';
          }
        }
        if (this.FirltroPor === 'Gestor') {
          let nombre = this.TextoFiltro.value!;
          if (num === 0) {
            const resultado = this.ListaUltimaGestion.filter((elemento) => {
              return elemento['nombreGestorAsig'].includes(nombre.toUpperCase());
            });
            this.FraccionarValores(resultado, this.ConstanteFraccion);
          }
    
          if (contador != 0) {
            ThGestor.style.color = 'red';
          } else {
            ThGestor.style.color = '';
          }
        }
        if (this.FirltroPor === 'TipoGestion') {
          let nombre = this.TextoFiltro.value!;
          if (num === 0) {
            const resultado = this.ListaUltimaGestion.filter((elemento) => {
              return elemento['gestion_tip_descripcion'].includes(nombre.toUpperCase());
            });
            this.FraccionarValores(resultado, this.ConstanteFraccion);
          }
    
          if (contador != 0) {
            ThTipoGestion.style.color = 'red';
          } else {
            ThTipoGestion.style.color = '';
          }
        }
      }
      if(this.banderaFiltro===true&&this.banderaTodas===false)
        {
          if (this.FirltroPor === 'Nombres') {
            let nombre = this.TextoFiltro.value!;
            if (num === 0) {
              const resultado = this.ListaUltimaGestion.filter((elemento) => {
                return elemento.Gestion.Cliente.cli_nombres.includes(nombre.toUpperCase());
              });
              this.FraccionarValores(resultado, this.ConstanteFraccion);
            }
      
            if (contador != 0) {
              ThNombres.style.color = 'red';
            } else {
              ThNombres.style.color = '';
            }
          }
          if (this.FirltroPor === 'Gestor') {
            let nombre = this.TextoFiltro.value!;
            if (num === 0) {
              const resultado = this.ListaUltimaGestion.filter((elemento) => {
                return elemento.GestorAsignado.includes(nombre.toUpperCase());
              });
              this.FraccionarValores(resultado, this.ConstanteFraccion);
            }
      
            if (contador != 0) {
              ThGestor.style.color = 'red';
            } else {
              ThGestor.style.color = '';
            }
          }
          if (this.FirltroPor === 'TipoGestion') {
            let nombre = this.TextoFiltro.value!;
            if (num === 0) {
              const resultado = this.ListaUltimaGestion.filter((elemento) => {
                return elemento.TipoGestion.includes(nombre.toUpperCase());
              });
              this.FraccionarValores(resultado, this.ConstanteFraccion);
            }
      
            if (contador != 0) {
              ThTipoGestion.style.color = 'red';
            } else {
              ThTipoGestion.style.color = '';
            }
          }
        }
    
  }
  VaciarFiltro() {
    const inputElement = document.getElementById(
      'TxtFiltro'
    ) as HTMLInputElement;
    const ThNombres = document.getElementById(
      'ThNombres'
    ) as HTMLInputElement;
    const ThGestor = document.getElementById(
      'ThGestorAsignado'
    ) as HTMLInputElement;
    const ThTipoGestion = document.getElementById(
      'ThTipoGestion'
    ) as HTMLInputElement;
    ThGestor.style.color = '';
    ThNombres.style.color = '';
    ThTipoGestion.style.color = '';
    inputElement.disabled = true;
    this.FirltroPor = '';
    this.TextoFiltro.patchValue('');
    this.FraccionarValores(
      this.DatosTemporalesBusqueda,
      this.ConstanteFraccion
    );
  }
  BtnNextUser(rango?: number) {
    if (rango != null) {
      this.FraccionDatos = this.FraccionDatos + this.RangoDatos;
      this.ListarElementos(2);
    }
    this.InicioPaginacion = this.InicioPaginacion + this.RangoPaginacion;
    this.FinalPaginacion = this.FinalPaginacion + this.RangoPaginacion;
    this.FraccionarValores();
  }

  BtnPreviousUser(rango?: number) {
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
  ListarElementos(num: number) {
    // this.GetBusquedaPor('');
    this.banderaTodas=true;
    this.banderaFiltro=false;
    if (num === 1) {
      this.ListaUltimaGestion = [];
      this.FraccionDatos = 0;
    }

    this.ListaUltimaGestion = [];
    this.loading = true;
    this.api
      .GetGestionFracionado3(this.FraccionDatos, this.RangoDatos)
      .pipe(
        map((tracks) => {
          this.ListaUltimaGestion = tracks['data'];
          this.banderaDescargar=true;
          this.DatosTemporalesBusqueda2 = tracks['data'];
          this.valorD=this.getKeys2(this.ListaUltimaGestion).length;
          console.log(this.valorD);
          if (this.ListaUltimaGestion.length === 0) {
            this.loading = false;
            this.alerta.NoExistenDatos();
          } else {
            this.loading = false;
            this.ContadorDatosGeneral = this.ListaUltimaGestion.length;
            this.FraccionarValores(this.ListaUltimaGestion, this.ConstanteFraccion);
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
  GetDescargaPor(val:string)
  {
    if(val==='PDF')
    {
      this.generarPDF();
    }
    if(val==='EXCEL')
    {
      this.excel();
    }
    if(val==='CSV')
    {
      this.csv();
    }
  }
  csv() {
   var opciones=
  {
    title:this.PaginaNombre,
    fieldSeparator:',',
    quoteStrings:'"',
    showLabels:false,
    noDownload:false,
    useBom:false,
    headers:this.getKeys()
  };

  new ngxCsv(this.ListaUltimaGestion,"reporte",opciones);

  }
  excel() {
    const fechaActual = new Date();
    const opciones = { timeZone: 'America/Guayaquil' };
    const fecha = fechaActual.toLocaleString('es-EC', opciones);
    let filename: string = `${fecha.substring(0, fecha.length - 3)}_reporte.xlsx`;
    let array:any[]=[];
    if(this.valorD===49)
    {
      array=this.ListaUltimaGestion;
      console.log(array);
    }else
    {
      array = this.ListaUltimaGestion.map((item: any) => ({
        id_cartera:item.Gestion.gest_id_cartera,
        cartera:item.Cartera,
        cedula:item.Gestion.Cliente.cli_identificacion,
        ope_cod_credito:item.Credito.ope_cod_credito,
        ope_descripcion:item.Credito.ope_descripcion,
        ope_producto: item.Credito.ope_producto,
        cli_nombres:item.Gestion.Cliente.cli_nombres,
        tipo_gestion: item.TipoGestion,
        cli_estado_contacta: item.Gestion.Cliente.cli_estado_contacta,
        Conectividad: item.Conectividad,
        gest_num_contacto:item.Gestion.gest_num_contacto,
        ope_saldo_cxc_actual:item.Credito.ope_saldo_cxc_actual,
        ope_dias_mora:item.Credito.ope_dias_mora,
        ope_gastos_cobranzas:item.Credito.ope_gastos_cobranzas,
        ope_interes_mora: item.Credito.ope_interes_mora,
        ope_liquidar:item.Credito.ope_liquidar,
        gest_fecha_in: this.Fechas.fechaCorta(item.Gestion.gest_fecha_in),
        gest_fecha_gestion: this.Fechas.fechaCorta(item.Gestion.gest_fecha_gestion),
        gest_fecha_compromiso:this.Fechas.fechaCorta(item.Gestion.gest_fecha_compromiso)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_compromiso),
        gest_valor_a_cobrar:item.Gestion.gest_valor_a_cobrar,
        gest_couta:item.Gestion.gest_couta,
        gest_fecha_prox_pago:this.Fechas.fechaCorta(item.Gestion.gest_fecha_prox_pago)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_prox_pago),
        gest_fecha_incumplido:this.Fechas.fechaCorta(item.Gestion.gest_fecha_incumplido)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_incumplido),
        gest_valor_incumplido:item.Gestion.gest_valor_incumplido,
        Gestionado:item.Gestion.Gestor.ges_nombres+' '+item.Gestion.Gestor.ges_apellidos,
        gest_fecha_volver_llamar:this.Fechas.fechaCorta(item.Gestion.gest_fecha_volver_llamar)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_volver_llamar),
        gest_hora_volver_llamar:item.Gestion.gest_hora_volver_llamar,
        volver_llamar:item.Gestion.gest_volver_llamar == '1'?'Si':'No',
        contac_descripcion:item.Contactabilidad.contac_descripcion,
        GestorAsignado:item.GestorAsignado,
        UltimaGestion:item.Credito.ope_id_ultima_gestion
      }));
      console.log(array);
    }
    const ws = XLSX.utils.json_to_sheet(array);
    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.PaginaNombre);
    /* save to file */
    XLSX.writeFile(wb, filename);
  }

  descargarPDF() {
    const fechaActual = new Date();
    const opciones = { timeZone: 'America/Guayaquil' };
    const fecha = fechaActual.toLocaleString('es-EC', opciones);
    const DATA = document.getElementById('contenido');
    const doc = new jsPDF('p', 'pt', 'a4');
    const options = {
      background: 'white',
      scale: 3
    };
    html2canvas(DATA!, options).then((canvas) => {

      const img = canvas.toDataURL('image/PNG');

      // Add image Canvas to PDF
      const bufferX = 60;
      const bufferY = 60;
      const imgProps = (doc as any).getImageProperties(img);
      const pdfWidth = doc.internal.pageSize.getWidth() - 2 * bufferX;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      doc.addImage(img, 'PNG', bufferX, bufferY, pdfWidth, pdfHeight, undefined, 'FAST');
      const textX = 60;
      const textY = 45;
     doc.text(this.PaginaNombre, textX, textY);
     //doc.text(this.usuario,textX,textY)
     doc.text(fecha.substring(0,fecha.length-3),textX+350,textY);

      return doc;
    }).then((docResult) => {
      docResult.save(`${fecha.substring(0,fecha.length-3)}_reporte.pdf`);
    });
  }
  headersTable:string[]=[
    'Id.Cartera',
    'Cartera',
    'Cedula',
    'CxC',
    'Descripcion',
    'Producto',
    'Nombres',
    'T.Gestion',
    'Estado',
    'Conectividad',
    'Numero',
    'S.S-CXC',
    'D.Mora',
    'G.Cobranzas',
    'I.Mora',
    'Liquidar','S.CxC','F.Origen','F.Gestion','F.Compromiso','V.Cobrar','Couta','F.ProxPago','F.Incumplido','V.Incumplido','Gestor','FV.Llamar','HV.Llamar','V.Llamar','Contactabilidad','Asignado','U.Gestion'
  ];
  getCabeceraTable()
  {
    if(this.valorD===49)
      {
        return this.headersTable;
      }else
      {
        const array= this.ListaUltimaGestion.map((item: any) => ({
          IdCartera:item.Gestion.gest_id_cartera,
          Cartera:item.Cartera,
          Cedula:item.Gestion.Cliente.cli_identificacion,
          CXC:item.Credito.ope_cod_credito,
          Descripcion:item.Credito.ope_descripcion,
          Producto: item.Credito.ope_producto,
          Nombres:item.Gestion.Cliente.cli_nombres,
          TipGestion: item.TipoGestion,
          Estado: item.Gestion.Cliente.cli_estado_contacta,
          Conectividad: item.Conectividad,
          Numero:item.Gestion.gest_num_contacto,
          SSCXCA:item.Credito.ope_saldo_cxc_actual,
          DMora:item.Credito.ope_dias_mora,
          GCobranzas:item.Credito.ope_gastos_cobranzas,
          InteresMora: item.Credito.ope_interes_mora,
          Liquidar:item.Credito.ope_liquidar,
          FOrigen: this.Fechas.fechaCorta(item.Gestion.gest_fecha_in),
          FGestion: this.Fechas.fechaCorta(item.Gestion.gest_fecha_gestion),
          FCompromiso:this.Fechas.fechaCorta(item.Gestion.gest_fecha_compromiso)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_compromiso),
          ValCobrar:item.Gestion.gest_valor_a_cobrar,
          Couta:item.Gestion.gest_couta,
          FProxPag:this.Fechas.fechaCorta(item.Gestion.gest_fecha_prox_pago)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_prox_pago),
          FIncumplido:this.Fechas.fechaCorta(item.Gestion.gest_fecha_incumplido)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_incumplido),
          ValorIncumplido:item.Gestion.gest_valor_incumplido,
          GestorG:item.Gestion.Gestor.ges_nombres+' '+item.Gestion.Gestor.ges_apellidos,
          FVLlamar:this.Fechas.fechaCorta(item.Gestion.gest_fecha_volver_llamar)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_volver_llamar),
          HVLlamar:item.Gestion.gest_hora_volver_llamar,
          VLlamar:item.Gestion.gest_volver_llamar == '1'?'Si':'No',
          Contactabilidad:item.Contactabilidad.contac_descripcion,
          GestorA:item.GestorAsignado,
          UGestion:item.Credito.ope_id_ultima_gestion
        }));
        return this.getKeys2(array);
      }
  }
  getProductData() {
    if(this.valorD===49)
    {
      return this.ListaUltimaGestion.map(gestion => [gestion.gest_id_cartera,gestion.cart_descripcion,gestion.cli_identificacion,gestion.ope_cod_credito,gestion.ope_descripcion,
        gestion.ope_producto,gestion.cli_nombres,gestion.gestion_tip_descripcion,gestion.cli_estado_contacta,gestion.conec_descripcion,gestion.gest_num_contacto,gestion.ope_saldo_cxc_actual,
        gestion.ope_dias_mora,gestion.ope_gastos_cobranzas,gestion.ope_interes_mora,gestion.ope_liquidar,gestion.ope_saldo_cxc_actual,
        this.Fechas.fechaCorta(gestion.gest_fecha_in),this.Fechas.fechaCorta(gestion.gest_fecha_gestion),
        this.Fechas.fechaCorta(gestion.gest_fecha_compromiso)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(gestion.gest_fecha_compromiso),
        gestion.gest_valor_a_cobrar,gestion.gest_couta,this.Fechas.fechaCorta(gestion.gest_fecha_prox_pago)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(gestion.gest_fecha_prox_pago),
        this.Fechas.fechaCorta(gestion.gest_fecha_incumplido)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(gestion.gest_fecha_incumplido),
        gestion.gest_valor_incumplido,gestion.nombreGest,this.Fechas.fechaCorta(gestion.gest_fecha_volver_llamar)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(gestion.gest_fecha_volver_llamar),
        gestion.gest_hora_volver_llamar,gestion.gest_volver_llamar == '1'?'Si':'No',gestion.contac_descripcion,gestion.nombreGestorAsig,gestion.ope_id_ultima_gestion]);
    }else
    {
      const val=this.ListaUltimaGestion.map((item: any) => ({
        id_cartera:item.Gestion.gest_id_cartera,
        cartera:item.Cartera,
        cedula:item.Gestion.Cliente.cli_identificacion,
        ope_cod_credito:item.Credito.ope_cod_credito,
        ope_descripcion:item.Credito.ope_descripcion,
        ope_producto: item.Credito.ope_producto,
        cli_nombres:item.Gestion.Cliente.cli_nombres,
        tipo_gestion: item.TipoGestion,
        cli_estado_contacta: item.Gestion.Cliente.cli_estado_contacta,
        Conectividad: item.Conectividad,
        gest_num_contacto:item.Gestion.gest_num_contacto,
        ope_saldo_cxc_actual:item.Credito.ope_saldo_cxc_actual,
        ope_dias_mora:item.Credito.ope_dias_mora,
        ope_gastos_cobranzas:item.Credito.ope_gastos_cobranzas,
        ope_interes_mora: item.Credito.ope_interes_mora,
        ope_liquidar:item.Credito.ope_liquidar,
        gest_fecha_in: this.Fechas.fechaCorta(item.Gestion.gest_fecha_in),
        gest_fecha_gestion: this.Fechas.fechaCorta(item.Gestion.gest_fecha_gestion),
        gest_fecha_compromiso:this.Fechas.fechaCorta(item.Gestion.gest_fecha_compromiso)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_compromiso),
        gest_valor_a_cobrar:item.Gestion.gest_valor_a_cobrar,
        gest_couta:item.Gestion.gest_couta,
        gest_fecha_prox_pago:this.Fechas.fechaCorta(item.Gestion.gest_fecha_prox_pago)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_prox_pago),
        gest_fecha_incumplido:this.Fechas.fechaCorta(item.Gestion.gest_fecha_incumplido)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_incumplido),
        gest_valor_incumplido:item.Gestion.gest_valor_incumplido,
        Gestionado:item.Gestion.Gestor.ges_nombres+' '+item.Gestion.Gestor.ges_apellidos,
        gest_fecha_volver_llamar:this.Fechas.fechaCorta(item.Gestion.gest_fecha_volver_llamar)==='31-12-1969' ? ' ' :this.Fechas.fechaCorta(item.Gestion.gest_fecha_volver_llamar),
        gest_hora_volver_llamar:item.Gestion.gest_hora_volver_llamar,
        volver_llamar:item.Gestion.gest_volver_llamar == '1'?'Si':'No',
        contac_descripcion:item.Contactabilidad.contac_descripcion,
        GestorAsignado:item.GestorAsignado,
        ultimaGestion:item.Credito.ope_id_ultima_gestion
      }));
      return val.map(gestion=>[gestion.id_cartera,gestion.cartera,gestion.cedula,gestion.ope_cod_credito,
        gestion.ope_descripcion,gestion.ope_producto,gestion.cli_nombres,gestion.tipo_gestion,gestion.cli_estado_contacta,
        gestion.Conectividad,gestion.gest_num_contacto,gestion.ope_saldo_cxc_actual,gestion.ope_dias_mora,
        gestion.ope_gastos_cobranzas,gestion.ope_interes_mora,gestion.ope_liquidar,gestion.gest_fecha_in,
        gestion.gest_fecha_gestion,gestion.gest_fecha_compromiso,gestion.gest_valor_a_cobrar,gestion.gest_couta,
        gestion.gest_fecha_prox_pago,gestion.gest_fecha_incumplido,gestion.gest_valor_incumplido,gestion.Gestionado,
        gestion.gest_fecha_volver_llamar,gestion.gest_hora_volver_llamar,gestion.volver_llamar,gestion.contac_descripcion,gestion.GestorAsignado,gestion.ultimaGestion]);
    }
    
  }
  generarPDF() {
    const fechaActual = new Date();
    const opciones = { timeZone: 'America/Guayaquil' };
    const fecha = fechaActual.toLocaleString('es-EC', opciones);
    const doc = new jsPDF('l', 'pt', 'a3');
    const imageUrl = './assets/Imagenes/LogoSistema.png';
    const imgWidth = 50; 
    const imgHeight = 50;
    doc.text(this.PaginaNombre, 0, 20);
    doc.text(fecha.substring(0,fecha.length-3), 260, 20);
    doc.addImage(imageUrl, 'PNG', 700, 0, imgWidth, imgHeight, '', 'FAST');
    autotable(doc, {
      head: [this.getCabeceraTable()],
      margin:{top: 60,left: 0},
      body: this.getProductData(), // empty body for now, you can add data later
      theme: 'grid',
      tableWidth:'auto',
      styles: {
        fontSize:7.5,
        fontStyle: 'normal',
        textColor: 'black',
        cellPadding: 3,
      },
      rowPageBreak: 'avoid', // Configuración para evitar dividir filas
      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        doc.setFontSize(10);
        doc.text('Header Text', data.settings.margin.left, 50);

        const pageCount = doc.internal.pages.length-1;
        doc.setPage(pageCount);
        doc.text(`Pagina ${pageCount}`, data.settings.margin.left, pageHeight - 10);
      },
      startY:60,
    });
    //const imag= File();
    const pdf = doc.output('blob');
    const url = window.URL.createObjectURL(pdf);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fecha.substring(0,fecha.length-3)}_reporte.pdf`;
    a.click();
  }

  getKeys(): string[] {
    if (this.ListaUltimaGestion.length > 0) {
      return Object.keys(this.ListaUltimaGestion[0]);
    }
    return [];
  }
/******************************************************************** */
getGestionesDiarias(valor:any[]):number
{
  let val:number=0;
  if ((this.getKeys2(valor)).length === 49) {
    valor.filter(elemento => {
      if (this.Fechas.fechaCorta(elemento['gest_fecha_gestion']) === this.Fechas.fechaActualCorta2()) {
        val += 1;
      }

    });
  }else
  {
    valor.filter(elemento => {
      if (this.Fechas.fechaCorta(elemento.Gestion['gest_fecha_gestion']) === this.Fechas.fechaActualCorta2()) {
        val += 1;
      }

    });
  }
  return val;
}
getGestionesMes(valor:any[]):number
{
  let val:number=0;
  if((this.getKeys2(valor)).length === 49){
  valor.filter(elemento=>
    {
      if(this.obtenerMesAnio(this.Fechas.fechaCorta(elemento['gest_fecha_gestion']),'MES')===this.obtenerMesAnio(this.Fechas.fechaActualCorta2(),'MES'))
        {
          val+=1;
        }
    });
  }else
  {
    valor.filter(elemento => {
      if (this.obtenerMesAnio(this.Fechas.fechaCorta(elemento.Gestion['gest_fecha_gestion']),'MES') === this.obtenerMesAnio(this.Fechas.fechaActualCorta2(),'MES')) {
        val += 1;
      }

    });
  }
  return val;
}
getGestionesYear(valor:any[]):number
{
  let val:number=0;
  if((this.getKeys2(valor)).length === 49){
  valor.filter(elemento=>
    {
      if(this.obtenerMesAnio(this.Fechas.fechaCorta(elemento['gest_fecha_gestion']),'ANIO')===this.obtenerMesAnio(this.Fechas.fechaActualCorta2(),'ANIO'))
        {
          val+=1;
        }

    });
  }else
  {
    valor.filter(elemento => {
      if (this.obtenerMesAnio(this.Fechas.fechaCorta(elemento.Gestion['gest_fecha_gestion']),'ANIO') === this.obtenerMesAnio(this.Fechas.fechaActualCorta2(),'ANIO')) {
        val += 1;
      }

    });
  }
  return val;
}
obtenerMesAnio(valor:string,parametro:string):string
{
  let val:string='';
  const partes = valor.split('-');
  if (parametro.toUpperCase() === 'MES') {
    val = partes[1];
  }
  if (parametro.toUpperCase() === 'ANIO') {
    val = partes[2];
  }

  return val;
}
/****************************Listar Listado sin gestionar****************************** */
getElementosSinGestionar2()
{
  this.api
      .GetNotificacionFracionado(10)
      .pipe(
        map((tracks) => {
          this.valor= tracks['data']['clientes']-tracks['data']['con_gestion'];
        }),
        catchError((error) => {
          
          this.alerta.ErrorAlRecuperarElementos();
          throw new Error(error);
        })
      ).subscribe();
}
/************************************************************** */
getKeys2(valor:any[]): string[] {
  if (this.ListaUltimaGestion.length > 0) { // Checks if ListaResultado array has elements
    return Object.keys(valor[0]); // Returns the keys of the first object in ListaResultado array
}
return []; // Returns an empty array if ListaResultado is empty
}
}
