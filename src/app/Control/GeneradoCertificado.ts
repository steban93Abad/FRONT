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

                /* Parrafo 1 */
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                const texto1 = `POLCOMP CIA. LTDA., mediante contrato celebrado con el ${datos.CarteraNom}, con fecha ${datos.FechaCompra}, en el que se adquirió la cartera con todos los derechos, garantías y facultades inherentes a la calidad de acreedor, en la que consta como deudor/a el/la Señor/a ${datos.Nombres} con el Número de Operación de Tarjeta de Crédito N° ${datos.CodCredito}.`;
                doc.text(doc.splitTextToSize(texto1, 400), 75, 315, {maxWidth: 445, align: "justify"});

                /* Parrafo 2 */
                const texto2 = `A petición de la parte interesada certifico que el/la Señor/a ${datos.Nombres} con C.I. ${datos.Identificacion}, ha realizado la cancelación total de su obligación por la Operación N° ${datos.CodCredito}.`;
                doc.text(doc.splitTextToSize(texto2, 400), 75, 415, {maxWidth: 445, align: "justify"});
                            
                /* Parrafo 3 */
                const textoCompleto = `El cliente puede hacer uso del presente certificado en la forma que más convenga a sus intereses y sin responsabilidad para POLCOMP CIA. LTDA., ni para ninguno de sus funcionarios.`;
                const palabraNegrita = "POLCOMP CIA. LTDA.";
                const maxWidth = 450;
                const xInicial = 75;
                let y = 475;

                // Dividir el texto completo en partes
                const partes = textoCompleto.split(palabraNegrita);

                const secciones: { texto: string, negrita: boolean }[] = [];
                if (partes[0]) secciones.push({ texto: partes[0], negrita: false });
                secciones.push({ texto: palabraNegrita, negrita: true });
                if (partes[1]) secciones.push({ texto: partes[1], negrita: false });

                // Crear una lista de palabras con su atributo de negrita
                const palabras: { texto: string, negrita: boolean }[] = [];
                secciones.forEach(seccion => {
                    seccion.texto.split(' ').forEach((word, idx, arr) => {
                        let palabra = word;
                        if (idx !== arr.length - 1) {
                        palabra += ' '; // agregar espacio solo si no es la última palabra
                        }
                        palabras.push({ texto: palabra, negrita: seccion.negrita });
                    });
                });

                let linea: { texto: string, negrita: boolean }[] = [];

                palabras.forEach((palabra, index) => {
                // Calcular ancho de la línea actual
                const anchoLineaActual = linea.reduce((acc, p) => {
                    doc.setFont('helvetica', p.negrita ? 'bold' : 'normal');
                    return acc + doc.getTextWidth(p.texto);
                }, 0);

                // Calcular ancho de la palabra nueva
                doc.setFont('helvetica', palabra.negrita ? 'bold' : 'normal');
                const anchoPalabra = doc.getTextWidth(palabra.texto);

                if (anchoLineaActual + anchoPalabra > maxWidth && linea.length > 0) {
                    // Escribir línea justificada
                    const totalEspacioExtra = maxWidth - anchoLineaActual;
                    const espacios = linea.length - 1;
                    const espacioExtraPorPalabra = espacios > 0 ? totalEspacioExtra / espacios : 0;

                    let x = xInicial;

                    linea.forEach((p, idx) => {
                    doc.setFont('helvetica', p.negrita ? 'bold' : 'normal');
                    doc.text(p.texto.trim(), x, y);
                    const anchoTexto = doc.getTextWidth(p.texto);
                    if (idx !== linea.length - 1) {
                        x += anchoTexto + espacioExtraPorPalabra;
                    }
                    });

                    // Nueva línea
                    y += 15;
                    linea = [];
                }

                    // Agregar palabra a la línea
                    linea.push(palabra);
                });

                // Escribir la última línea (sin justificado, alineado normal)
                if (linea.length > 0) {
                    let x = xInicial;
                    linea.forEach(p => {
                        doc.setFont('helvetica', p.negrita ? 'bold' : 'normal');
                        doc.text(p.texto.trim(), x, y);
                        x += doc.getTextWidth(p.texto);
                    });
                }
                
                // Firma
                doc.addImage(firma, 'PNG', 236, 540, 120, 60); // Ajustar tamaño según resolución real
                doc.setFontSize(12);
                doc.text('MA. PAZ GOMEZCOELLO SERRANO', 188, 610);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('REPRESENTANTE LEGAL', 219, 625);
                doc.text('POLCOMP CIA. LTDA', 232, 640

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
                console.log(a.href);
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
