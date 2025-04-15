import jsPDF from 'jspdf';
import autotable from 'jspdf-autotable';
import { Injectable } from '@angular/core';
import { Fechas } from 'src/app/Control/Fechas';
import { cargaMasiva, generarPDF } from '../Modelos/response.interface';

@Injectable({
    providedIn: 'root',
})

export class GeneradoCertificado {
    public Fechas!: Fechas;

    GenerarCertificadoPDF(objeto:generarPDF) {
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

    getKeys2(valor:any[]): string[] {
        if (valor.length > 0) { // Checks if ListaResultado array has elements
            return Object.keys(valor[0]); // Returns the keys of the first object in ListaResultado array
        }
        
        return []; // Returns an empty array if ListaResultado is empty
    }
}
