// Esta función ya no es necesaria para extraer texto de PDFs para embeddings,
// ya que la API de Python lo hará. Se mantiene si la necesitas para otros propósitos.
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    console.log(`📄 Extrayendo texto de PDF: ${pdfUrl}`)

    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error(`Error descargando PDF: ${response.status}`)
    }

    // Simulación de extracción de texto
    const simulatedText = `
    Contenido extraído del PDF: ${pdfUrl}

    Este es un texto de ejemplo que simula el contenido extraído de un PDF.
    En una implementación real, aquí estaría el texto completo del documento.

    Capítulo 1: Introducción
    Este capítulo introduce los conceptos básicos de la materia.

    Capítulo 2: Desarrollo
    Aquí se desarrollan los temas principales con ejemplos prácticos.

    Capítulo 3: Conclusiones
    Se presentan las conclusiones y recomendaciones finales.

    Referencias bibliográficas y material adicional.
    `

    console.log(`✅ Texto extraído: ${simulatedText.length} caracteres`)
    return simulatedText
  } catch (error) {
    console.error("Error extrayendo texto del PDF:", error)
    throw error
  }
}

// La función processAllPDFsForSubject ha sido eliminada,
// ya que la lógica de procesamiento de embeddings se ha movido a la API de Python.
