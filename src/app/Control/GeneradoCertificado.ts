import jsPDF from 'jspdf';
import autotable from 'jspdf-autotable';
import { Injectable } from '@angular/core';
import { Fechas } from 'src/app/Control/Fechas';
import { cargaMasiva, generarCertificadoPDF } from '../Modelos/response.interface';

@Injectable({
    providedIn: 'root',
})

export class GeneradorCertificado {

    constructor(
        public fechas: Fechas
    ) {}
    
    generarCertificadoPDF(objeto:generarCertificadoPDF) {
        if (objeto.entidad === 'Credito') {
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

            const datos = objeto.listado[0];

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
                doc.text('CERTIFICADO DE NO ADEUDAR', 150, 150);
            
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                doc.text(`Cuenca, ${fecha}`, 370, 215);
            
                // Cuerpo del certificado
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('ANTECEDENTES:', 75, 275);        

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                const texto1 = `POLCOMP CIA. LTDA., mediante contrato celebrado con el ${datos.CarteraNom}, con fecha ${datos.FechaCompra}, en el que se adquirió la cartera con todos los derechos, garantías y facultades inherentes a la calidad de acreedor, en la que consta como deudor/a el/la Señor/a ${datos.Nombres} con el Número de Operación de Tarjeta de Crédito N° ${datos.CodCredito}.`;
                doc.text(doc.splitTextToSize(texto1, 400), 75, 315, {maxWidth: 445, align: "justify"});
            
                const texto2 = `A petición de la parte interesada certifico que el/la Señor/a ${datos.Nombres} con C.I. ${datos.Identificacion}, ha realizado la cancelación total de su obligación por la Operación N° ${datos.CodCredito}.`;
                doc.text(doc.splitTextToSize(texto2, 400), 75, 415, {maxWidth: 445, align: "justify"});
                                             
                const texto3 = `El cliente puede hacer uso del presente certificado en la forma que más convenga a sus intereses y sin responsabilidad para POLCOMP CIA. LTDA., ni para ninguno de sus funcionarios.`;
                doc.text(doc.splitTextToSize(texto3, 450), 75, 475, {maxWidth: 445, align: "justify"});
                

                // Firma
                doc.addImage(firma, 'PNG', 235, 540, 120, 60); // Ajustar tamaño según resolución real
                doc.setFontSize(12);
                doc.text('MA. PAZ GOMEZCOELLO SERRANO', 187, 610);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('REPRESENTANTE LEGAL', 215, 630);
                doc.text('POLCOMP CIA. LTDA', 225, 650

                );
            
                // Pie de página
                doc.addImage(pie, 'PNG', -10, 650, 615, 200); // parte inferior de la hoja A4
            
                // Descargar PDF
                const pdf = doc.output('blob');
                const url = window.URL.createObjectURL(pdf);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fecha}_certificado_no_adeudar.pdf`;
                a.click();
            });
        }
    }

    getKeys2(valor:any[]): string[] {
        if (valor.length > 0) { // Checks if ListaResultado array has elements
            return Object.keys(valor[0]); // Returns the keys of the first object in ListaResultado array
        }
        
        return []; // Returns an empty array if ListaResultado is empty
    }
}
