import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import { put } from "@vercel/blob"
import path from "path"
import os from "os"
import fs from "fs"
import { tmpdir } from "os"

// Sin límite de tiempo - dejar que tome el tiempo que necesite
export const maxDuration = 0

function extractJsonFromOutput(output: string): any {
  try {
    // Intentar parsear directamente
    return JSON.parse(output)
  } catch (error) {
    // Si falla, buscar el JSON válido en la salida
    const lines = output.split("\n")

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      if (line.startsWith("{") && line.endsWith("}")) {
        try {
          return JSON.parse(line)
        } catch (parseError) {
          continue
        }
      }
    }

    // Buscar patrones JSON más complejos
    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch (parseError) {
        // Continuar con el siguiente método
      }
    }

    // Si todo falla, lanzar el error original
    throw error
  }
}

export async function POST(request: NextRequest) {
  let tempFile: string | null = null

  try {
    console.log("=== Iniciando generación de embeddings (proceso directo) ===")

    const { pdfs } = await request.json()

    if (!pdfs || !Array.isArray(pdfs) || pdfs.length === 0) {
      return NextResponse.json({ success: false, error: "No se proporcionaron PDFs para procesar" }, { status: 400 })
    }

    console.log(`📚 Procesando ${pdfs.length} PDFs para embeddings`)

    // Verificar token de Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN no está disponible")
      return NextResponse.json(
        { success: false, error: "Configuración de almacenamiento no disponible" },
        { status: 500 },
      )
    }

    // Determinar el comando Python y el script
    const isWindows = os.platform() === "win32"
    const pythonScript = path.join(process.cwd(), "scripts", "generate_embeddings.py")
    const venvPath = path.join(process.cwd(), "scripts", "venv")

    // Crear archivo temporal para los datos de PDFs
    const tempDir = tmpdir()
    tempFile = path.join(tempDir, `pdf-data-${Date.now()}.json`)
    fs.writeFileSync(tempFile, JSON.stringify(pdfs, null, 2), "utf8")

    let pythonCommand: string
    let pythonArgs: string[]

    if (isWindows) {
      const venvPython = path.join(venvPath, "Scripts", "python.exe")
      pythonCommand = venvPython
      pythonArgs = [pythonScript, tempFile]
    } else {
      pythonCommand = "bash"
      pythonArgs = ["-c", `source ${path.join(venvPath, "bin", "activate")} && python ${pythonScript} "${tempFile}"`]
    }

    console.log("🐍 Ejecutando script de Python (proceso directo)...")
    console.log("Comando:", pythonCommand)
    console.log("Argumentos:", pythonArgs)

    const result = await new Promise<{ success: boolean; embeddings?: any[]; error?: string }>((resolve) => {
      const pythonProcess = spawn(pythonCommand, pythonArgs, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: isWindows,
        env: {
          ...process.env,
          CUDA_VISIBLE_DEVICES: "", // Forzar CPU
          TRANSFORMERS_OFFLINE: "0", // Permitir descarga de modelos
          PYTHONIOENCODING: "utf-8", // Asegurar codificación UTF-8
          // Configuraciones adicionales para Windows
          PYTORCH_CUDA_ALLOC_CONF: "max_split_size_mb:512",
          OMP_NUM_THREADS: "1", // Limitar threads para evitar problemas de memoria
          TOKENIZERS_PARALLELISM: "false", // Evitar warnings de paralelismo
        },
      })

      let stdout = ""
      let stderr = ""

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString("utf8")
      })

      pythonProcess.stderr.on("data", (data) => {
        const output = data.toString("utf8")
        stderr += output

        // Mostrar progreso detallado
        if (
          output.includes("Error") ||
          output.includes("Procesando PDF:") ||
          output.includes("chunks generados") ||
          output.includes("Procesamiento completado") ||
          output.includes("✅") ||
          output.includes("❌") ||
          output.includes("Generando embeddings") ||
          output.includes("Texto extraído") ||
          output.includes("Progreso:") ||
          output.includes("Procesando lote")
        ) {
          console.log("Python:", output.trim())
        }
      })

      pythonProcess.on("close", (code) => {
        console.log(`Python script terminó con código: ${code}`)

        if (code !== 0) {
          console.error("Error en script de Python:", stderr.slice(-2000))

          // Verificar diferentes tipos de errores
          if (stderr.includes("ModuleNotFoundError") || stderr.includes("No module named")) {
            resolve({
              success: false,
              error:
                "Dependencias de Python no instaladas. Ejecuta el script de configuración correspondiente a tu sistema operativo.",
            })
          } else if (stderr.includes("FileNotFoundError")) {
            resolve({
              success: false,
              error: "Error interno: archivo temporal no encontrado. Intenta nuevamente.",
            })
          } else if (stderr.includes("JSONDecodeError")) {
            resolve({
              success: false,
              error: "Error procesando datos. Verifica que los PDFs sean válidos e intenta nuevamente.",
            })
          } else if (stderr.includes("connection") || stderr.includes("timeout")) {
            resolve({
              success: false,
              error: "Error de conexión descargando modelos. Verifica tu conexión a internet e intenta nuevamente.",
            })
          } else if (
            stderr.includes("MemoryError") ||
            stderr.includes("out of memory") ||
            stderr.includes("paginación") ||
            stderr.includes("os error 1455")
          ) {
            resolve({
              success: false,
              error:
                "Error de memoria. Intenta reiniciar la aplicación, procesar menos PDFs a la vez, o usar archivos más pequeños.",
            })
          } else if (stderr.includes("Error inicializando modelos")) {
            resolve({
              success: false,
              error:
                "Error inicializando modelos de IA. Esto puede deberse a problemas de memoria. Intenta reiniciar la aplicación.",
            })
          } else {
            resolve({
              success: false,
              error: `Error en procesamiento: ${stderr.includes("Error general:") ? stderr.split("Error general:")[1].split("\n")[0] : "Error desconocido"}`,
            })
          }
          return
        }

        try {
          // Usar la función mejorada para extraer JSON
          const result = extractJsonFromOutput(stdout)
          resolve(result)
        } catch (parseError) {
          console.error("Error parseando resultado de Python:", parseError)
          console.log("Stdout recibido (últimos 2000 caracteres):", stdout.slice(-2000))

          // Intentar encontrar información útil en stderr
          const stderrLines = stderr.split("\n")
          const lastErrorLine = stderrLines
            .reverse()
            .find((line) => line.includes("chunks totales") || line.includes("Error") || line.includes("✅"))

          resolve({
            success: false,
            error: `Error parseando resultado del procesamiento. ${lastErrorLine ? "Último estado: " + lastErrorLine : ""}`,
          })
        }
      })

      pythonProcess.on("error", (error) => {
        console.error("Error ejecutando Python:", error)
        resolve({ success: false, error: `Error ejecutando script: ${error.message}` })
      })

      // Sin timeout - el proceso toma el tiempo que necesite
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    console.log(`✅ Embeddings generados: ${result.embeddings?.length} chunks`)

    // Subir JSON de embeddings a Vercel Blob
    const timestamp = Date.now()
    const embeddingsFilename = `embeddings/${timestamp}-embeddings.json`

    console.log("📤 Subiendo embeddings a Vercel Blob...")
    const embeddingsBlob = await put(embeddingsFilename, JSON.stringify(result.embeddings, null, 2), {
      access: "public",
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    console.log("📤 Embeddings subidos a Blob:", embeddingsBlob.url)

    return NextResponse.json({
      success: true,
      embeddings_url: embeddingsBlob.url,
      total_chunks: result.embeddings?.length || 0,
      processed_pdfs: pdfs.length,
    })
  } catch (error) {
    console.error("Error en generación de embeddings:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Error al generar embeddings: ${error instanceof Error ? error.message : "Error desconocido"}`,
      },
      { status: 500 },
    )
  } finally {
    // Limpiar archivo temporal
    if (tempFile) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
      } catch (cleanupError) {
        console.log("Advertencia: No se pudo limpiar archivo temporal:", cleanupError)
      }
    }
  }
}
