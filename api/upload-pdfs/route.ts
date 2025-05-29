import { type NextRequest, NextResponse } from "next/server"
import { uploadMultiplePDFs } from "@/lib/blob"

export async function POST(request: NextRequest) {
  try {
    console.log("=== Iniciando subida de PDFs via API ===")

    const formData = await request.formData()
    const files: File[] = []

    // Obtener todos los archivos del FormData
    const fileEntries = formData.getAll("pdfs")

    for (const entry of fileEntries) {
      if (entry instanceof File && entry.size > 0) {
        console.log(`Archivo recibido: ${entry.name}, Tamaño: ${entry.size} bytes`)

        // Verificar tamaño del archivo (máximo 5MB por archivo)
        if (entry.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: `El archivo ${entry.name} excede el límite de 5MB` },
            { status: 400 },
          )
        }

        files.push(entry)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "No se recibieron archivos válidos" }, { status: 400 })
    }

    // Verificar token de Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN no está disponible")
      return NextResponse.json(
        { success: false, error: "Configuración de almacenamiento no disponible" },
        { status: 500 },
      )
    }

    // Subir archivos a Vercel Blob
    const uploadedPDFs = await uploadMultiplePDFs(files)

    console.log(`${uploadedPDFs.length} archivos subidos exitosamente`)

    return NextResponse.json({
      success: true,
      pdfs: uploadedPDFs,
    })
  } catch (error) {
    console.error("Error en la subida de PDFs:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Error al subir archivos: ${error instanceof Error ? error.message : "Error desconocido"}`,
      },
      { status: 500 },
    )
  }
}