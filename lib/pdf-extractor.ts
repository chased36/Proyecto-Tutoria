// app/lib/pdf-extractor.ts
import { get } from '@vercel/blob';

export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    console.log(`📄 Extrayendo texto de PDF: ${pdfUrl}`);

    // Verificar que el token esté disponible
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN no está configurado');
    }

    // Descargar el PDF desde Vercel Blob usando la función get
    const blob = await get(pdfUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    if (!blob) {
      throw new Error('No se pudo obtener el blob desde la URL proporcionada');
    }

    // Descargar el contenido del blob
    const response = await fetch(blob.url);
    
    if (!response.ok) {
      throw new Error(`Error descargando PDF: ${response.status} ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    
    // Importar PDF.js dinámicamente (compatible con Vercel)
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configurar el worker de PDF.js
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    // Cargar el documento PDF
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    
    console.log(`📖 PDF cargado con ${pdf.numPages} páginas`);

    let fullText = '';
    
    // Extraer texto de cada página
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      try {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        
        // Concatenar el texto de la página
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        fullText += pageText + '\n\n';
        
        console.log(`✅ Página ${pageNumber} procesada (${pageText.length} caracteres)`);
        
      } catch (pageError) {
        console.error(`❌ Error procesando página ${pageNumber}:`, pageError);
        // Continuar con la siguiente página aunque falle una
        continue;
      }
    }
    
    if (!fullText.trim()) {
      throw new Error('No se pudo extraer texto del PDF');
    }

    console.log(`✅ Texto extraído exitosamente: ${fullText.length} caracteres`);
    return fullText.trim();

  } catch (error) {
    console.error('❌ Error extrayendo texto del PDF:', error);
    
    if (error instanceof Error) {
      // Mejorar mensajes de error específicos
      if (error.message.includes('Failed to fetch')) {
        throw new Error('No se pudo acceder al archivo PDF. Verifica la URL y los permisos.');
      }
      if (error.message.includes('Invalid PDF')) {
        throw new Error('El archivo PDF parece estar corrupto o no es válido.');
      }
    }
    
    throw new Error(`No se pudo extraer texto del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función alternativa para PDFs muy grandes (procesamiento por lotes)
export async function extractTextFromPDFInChunks(
  pdfUrl: string, 
  chunkSize: number = 5 // número de páginas por chunk
): Promise<string[]> {
  try {
    console.log(`📄 Extrayendo texto de PDF en chunks: ${pdfUrl}`);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN no está configurado');
    }

    const blob = await get(pdfUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    const response = await fetch(blob.url);
    const pdfBuffer = await response.arrayBuffer();
    
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    console.log(`📖 PDF cargado con ${pdf.numPages} páginas para chunking`);

    const chunks: string[] = [];
    
    for (let startPage = 1; startPage <= pdf.numPages; startPage += chunkSize) {
      const endPage = Math.min(startPage + chunkSize - 1, pdf.numPages);
      let chunkText = '';
      
      console.log(`🔄 Procesando chunk: páginas ${startPage}-${endPage}`);
      
      for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
        try {
          const page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          chunkText += pageText + '\n\n';
          
        } catch (pageError) {
          console.error(`❌ Error en página ${pageNumber}:`, pageError);
          continue;
        }
      }
      
      if (chunkText.trim()) {
        chunks.push(chunkText.trim());
        console.log(`✅ Chunk ${chunks.length} completado: ${chunkText.length} caracteres`);
      }
    }
    
    if (chunks.length === 0) {
      throw new Error('No se pudo extraer texto del PDF en chunks');
    }

    console.log(`✅ Extracción en chunks completada: ${chunks.length} chunks`);
    return chunks;

  } catch (error) {
    console.error('❌ Error en extracción por chunks:', error);
    throw new Error(`Error extrayendo texto en chunks: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para verificar si un PDF es legible antes de procesarlo
export async function validatePDF(pdfUrl: string): Promise<{
  isValid: boolean;
  pageCount?: number;
  error?: string;
}> {
  try {
    console.log(`🔍 Validando PDF: ${pdfUrl}`);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { isValid: false, error: 'BLOB_READ_WRITE_TOKEN no configurado' };
    }

    const blob = await get(pdfUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    const response = await fetch(blob.url);
    const pdfBuffer = await response.arrayBuffer();
    
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    
    // Intentar leer la primera página para verificar que tiene texto
    try {
      const firstPage = await pdf.getPage(1);
      const textContent = await firstPage.getTextContent();
      const hasText = textContent.items.some((item: any) => item.str.trim().length > 0);
      
      return {
        isValid: hasText,
        pageCount: pdf.numPages,
        error: hasText ? undefined : 'El PDF no contiene texto legible'
      };
      
    } catch (pageError) {
      return {
        isValid: false,
        pageCount: pdf.numPages,
        error: 'No se pudo leer el contenido del PDF'
      };
    }

  } catch (error) {
    console.error('❌ Error validando PDF:', error);
    return {
      isValid: false,
      error: `Error validando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

// Función para obtener metadatos del PDF
export async function getPDFMetadata(pdfUrl: string): Promise<{
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
}> {
  try {
    console.log(`📊 Obteniendo metadatos de PDF: ${pdfUrl}`);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN no está configurado');
    }

    const blob = await get(pdfUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    const response = await fetch(blob.url);
    const pdfBuffer = await response.arrayBuffer();
    
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    
    const metadata = await pdf.getMetadata();
    
    return {
      pageCount: pdf.numPages,
      title: metadata?.info?.Title,
      author: metadata?.info?.Author,
      subject: metadata?.info?.Subject
    };

  } catch (error) {
    console.error('❌ Error obteniendo metadatos del PDF:', error);
    // Si falla, al menos devolver el número de páginas
    try {
      const blob = await get(pdfUrl, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      
      const response = await fetch(blob.url);
      const pdfBuffer = await response.arrayBuffer();
      
      const pdfjsLib = await import('pdfjs-dist');
      const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      
      return {
        pageCount: pdf.numPages,
        title: undefined,
        author: undefined,
        subject: undefined
      };
      
    } catch (fallbackError) {
      throw new Error(`No se pudieron obtener los metadatos del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}