import { put, del } from "@vercel/blob"

export async function uploadPDF(file: File): Promise<{ url: string; filename: string }> {
  try {
    // Verificar que el token esté disponible
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN no está configurado")
      throw new Error("Token de Vercel Blob no configurado")
    }

    // Generar un nombre único para el archivo
    const timestamp = Date.now()
    const filename = `pdfs/${timestamp}-${file.name}`

    console.log("Subiendo archivo:", filename, "Tamaño:", file.size)

    // Subir el archivo a Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      contentType: "application/pdf",
      token: process.env.BLOB_READ_WRITE_TOKEN, // Pasar el token explícitamente
    })

    console.log("Archivo subido exitosamente:", blob.url)

    return {
      url: blob.url,
      filename: file.name, // Mantener el nombre original para mostrar al usuario
    }
  } catch (error) {
    console.error("Error uploading PDF:", error)
    throw new Error(`Error al subir el archivo PDF: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }
}

export async function uploadMultiplePDFs(files: File[]): Promise<{ url: string; filename: string }[]> {
  console.log(`Subiendo ${files.length} archivos PDF...`)

  const uploadPromises = files.map((file, index) => {
    console.log(`Procesando archivo ${index + 1}:`, file.name)
    return uploadPDF(file)
  })

  try {
    const results = await Promise.all(uploadPromises)
    console.log("Todos los archivos subidos exitosamente")
    return results
  } catch (error) {
    console.error("Error subiendo múltiples PDFs:", error)
    throw error
  }
}

export async function deletePDFFromBlob(url: string): Promise<void> {
  try {
    if (!url) {
      console.warn("URL vacía, no se puede eliminar el archivo")
      return
    }

    console.log("Eliminando archivo de Vercel Blob:", url)

    // Verificar que el token esté disponible
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN no está configurado")
      throw new Error("Token de Vercel Blob no configurado")
    }

    // Eliminar el archivo de Vercel Blob
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN })
    console.log("Archivo eliminado exitosamente")
  } catch (error) {
    console.error("Error eliminando archivo de Vercel Blob:", error)
    // No lanzamos el error para que no interrumpa el flujo de eliminación
    // pero lo registramos para debugging
  }
}

export async function deleteMultiplePDFsFromBlob(urls: string[]): Promise<void> {
  console.log(`Eliminando ${urls.length} archivos PDF de Vercel Blob...`)

  const deletePromises = urls.map((url) => deletePDFFromBlob(url))

  try {
    await Promise.all(deletePromises)
    console.log("Todos los archivos eliminados exitosamente")
  } catch (error) {
    console.error("Error eliminando múltiples PDFs:", error)
    // No lanzamos el error para que no interrumpa el flujo de eliminación
  }
}
