import jsPDF from 'jspdf';
import autotable from 'jspdf-autotable';
import { Injectable } from '@angular/core';
import { Fechas } from 'src/app/Control/Fechas';
import { cargaMasiva, generarCertificadoPDF } from '../Modelos/response.interface';

@Injectable({
    providedIn: 'root',
})

export class GeneradorCertificado {
    public Fechas!: Fechas;

    /*
    generarCertificadoPDF(objeto:generarCertificadoPDF) {
        const doc = new jsPDF('p', 'pt', 'a4');
        const imageUrl = './assets/Imagenes/LogoSistema.png';
        const imgWidth = 60;
        const imgHeight = 60;
        const fecha = new Date().toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'America/Guayaquil',
        });
      
        // Encabezado
        doc.addImage(imageUrl, 'PNG', 470, 20, imgWidth, imgHeight); // Logo a la derecha
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('CERTIFICADO DE NO ADEUDAR', 210, 100, { align: 'center' });
      
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Cuenca, ${fecha}`, 400, 140);
      
        // Texto del certificado
        const texto = `
      ANTECEDENTES:
      
      POLCOMP CIA. LTDA., mediante contrato celebrado con el Banco del Pacífico, con fecha 31 de agosto de 2023, en el que se adquirió la cartera con todos los derechos, garantías y facultades inherentes a la calidad de acreedor, en la que consta como deudor/a el/la Señor/a con el Número de Operación de Tarjeta de Crédito Nº ___________.
      
      A petición de la parte interesada, certifico que el/la Señor/a ____________________________ con C.I. ________________ ha realizado la cancelación total de su obligación por la Operación Nº ____________.
      
      El cliente puede hacer uso del presente certificado en la forma que más convenga a sus intereses y sin responsabilidad para POLCOMP CIA. LTDA., ni para ninguno de sus funcionarios.
      `;
      
        const splitText = doc.splitTextToSize(texto.trim(), 500);
        doc.text(splitText, 50, 180);
      
        // Firma
        const firmaY = 550;
        doc.setDrawColor(0);
        doc.line(200, firmaY, 400, firmaY); // Línea para firma
        doc.setFontSize(11);
        doc.text('ING. LUIS MORA', 300, firmaY + 20, { align: 'center' });
        doc.text('GERENTE GENERAL', 300, firmaY + 35, { align: 'center' });
      
        // (Opcional) Firma escaneada
        // doc.addImage(firmaBase64, 'PNG', 230, firmaY - 40, 140, 30);
      
        // Descargar
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado_no_adeudar_${fecha}.pdf`;
        a.click();
    }
    */

    generarCertificadoPDF(objeto:generarCertificadoPDF) {
        const fecha = new Date().toLocaleDateString('es-EC', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'America/Guayaquil',
          });  
        const doc = new jsPDF('p', 'pt', 'a4');
      
        // Rutas locales relativas al proyecto Angular
        const encabezadoPath = './assets/Imagenes/assetsCertificados/encabezadoCertPOLCOMP.png';
        const firmaPath = './assets/Imagenes/assetsCertificados/FirmaMariaPaz.png';
        const piePath = './assets/Imagenes/assetsCertificados/piePaginaCertPOLCOMP.png';
      
        const loadImage = (url: string): Promise<HTMLImageElement> =>
          new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
          });
      
        Promise.all([
          loadImage(encabezadoPath),
          loadImage(firmaPath),
          loadImage(piePath),
        ]).then(([encabezado, firma, pie]) => {
          // Agregar encabezado
          doc.addImage(encabezado, 'PNG', 10, 0, 590, 170); // ancho completo (A4 en puntos)
      
          // Título
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(18);
          doc.text('CERTIFICADO DE NO ADEUDAR', 150, 120);
      
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.text(`Cuenca, ${fecha}`, 400, 160);
      
          // Cuerpo del certificado
          doc.text('ANTECEDENTES:', 50, 180);
      
          const texto1 = `POLCOMP CIA. LTDA., mediante contrato celebrado con el Banco del Pacífico, con fecha 31 de agosto de 2023, en el que se adquirió la cartera con todos los derechos, garantías y facultades inherentes a la calidad de acreedor, en la que consta como deudor/a el/la Señor/a con el Número de Operación de Tarjeta de Crédito N° .`;
          doc.text(doc.splitTextToSize(texto1, 500), 50, 200);
      
          const texto2 = `A petición de la parte interesada certifico que el/la Señor/a  con C.I. , ha realizado la cancelación total de su obligación por la Operación N° .`;
          doc.text(doc.splitTextToSize(texto2, 500), 50, 270);
      
          const texto3 = 'El cliente puede hacer uso del presente certificado en la forma que más convenga a sus intereses y sin responsabilidad para POLCOMP CIA. LTDA., ni para ninguno de sus funcionarios.';
          doc.text(doc.splitTextToSize(texto3, 500), 50, 340);
      
          // Firma
          doc.addImage(firma, 'PNG', 50, 390, 120, 60); // Ajustar tamaño según resolución real
          doc.setFontSize(11);
          doc.text('MA. PAZ GOMEZCOELLO SERRANO', 50, 470);
          doc.text('REPRESENTANTE LEGAL', 50, 490);
          doc.text('POLCOMP CIA. LTDA', 50, 510);
      
          // Pie de página
          doc.addImage(pie, 'PNG', 0, 710, 595.28, 80); // parte inferior de la hoja A4
      
          // Descargar PDF
          const pdf = doc.output('blob');
          const url = window.URL.createObjectURL(pdf);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${fecha}_certificado_no_adeudar.pdf`;
          a.click();
        });
      }

    getKeys2(valor:any[]): string[] {
        if (valor.length > 0) { // Checks if ListaResultado array has elements
            return Object.keys(valor[0]); // Returns the keys of the first object in ListaResultado array
        }
        
        return []; // Returns an empty array if ListaResultado is empty
    }
}
