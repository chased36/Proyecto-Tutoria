import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import os from "os"
import fs from "fs"
import { tmpdir } from "os"
import { put } from "@vercel/blob"
import { 
  getPendingTasksWithPDFInfo, 
  updateTaskStatus, 
  updatePDFWithEmbeddings,
  getTaskStats,
  resetStuckTasks
} from '@/lib/db'

export const dynamic = 'force-dynamic'

// Verificación de autenticación para cron job
function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return token === process.env.CRON_SECRET
  }
  
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')
  if (querySecret) {
    return querySecret === process.env.CRON_SECRET
  }
  
  return false
}

// Función para ejecutar script Python (se mantiene igual)
async function runPythonScript(taskId: string, pdfData: any): Promise<any> {
  return new Promise((resolve) => {
    const isWindows = os.platform() === "win32"
    const pythonScript = path.join(process.cwd(), "scripts", "generate_embeddings.py")
    const venvPath = path.join(process.cwd(), "scripts", "venv")

    const tempDir = tmpdir()
    const tempFile = path.join(tempDir, `pdf-task-${taskId}.json`)
    
    const processingData = [{
      id: pdfData.id,
      filename: pdfData.filename,
      url: pdfData.url
    }]
    
    fs.writeFileSync(tempFile, JSON.stringify(processingData, null, 2), "utf8")

    let pythonCommand: string
    let pythonArgs: string[]

    if (isWindows) {
      const venvPython = path.join(venvPath, "Scripts", "python.exe")
      pythonCommand = venvPython
      pythonArgs = [pythonScript, tempFile]
    } else {
      pythonCommand = "bash"
      pythonArgs = [
        "-c", 
        `source ${path.join(venvPath, "bin", "activate")} && python ${pythonScript} "${tempFile}"`
      ]
    }

    console.log(`🐍 Ejecutando Python para tarea ${taskId}`)

    const pythonProcess = spawn(pythonCommand, pythonArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: isWindows,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        OMP_NUM_THREADS: "1",
        TOKENIZERS_PARALLELISM: "false",
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
      if (output.includes("Procesando") || output.includes("chunk") || 
          output.includes("embedding") || output.includes("Error")) {
        console.log(`Python [${taskId}]: ${output.trim()}`)
      }
    })

    pythonProcess.on("close", (code) => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
      } catch (cleanupError) {
        console.log("Advertencia limpieza temporal:", cleanupError)
      }

      if (code !== 0) {
        resolve({
          success: false,
          error: `Script falló con código ${code}: ${stderr.slice(-500)}`
        })
        return
      }

      try {
        const result = JSON.parse(stdout)
        resolve(result)
      } catch (parseError) {
        resolve({
          success: false,
          error: `Error parseando resultado JSON: ${parseError}`
        })
      }
    })

    pythonProcess.on("error", (error) => {
      resolve({
        success: false,
        error: `Error ejecutando script: ${error.message}`
      })
    })

    setTimeout(() => {
      if (!pythonProcess.killed) {
        pythonProcess.kill()
        resolve({
          success: false,
          error: "Timeout después de 4 minutos"
        })
      }
    }, 240000)
  })
}

export async function GET(request: Request) {
  let processedTask = null

  try {
    // Verificar autenticación
    if (!verifyCronAuth(request)) {
      console.error("❌ Intento de acceso no autorizado al cron job")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔄 Iniciando procesamiento de embeddings via Cron Job")
    console.log("⏰ Hora de inicio:", new Date().toISOString())

    // Resetear tareas atascadas primero
    const resetCount = await resetStuckTasks(2)
    if (resetCount > 0) {
      console.log(`🔄 Se reiniciaron ${resetCount} tareas atascadas`)
    }

    // Obtener tareas pendientes
    const pendingTasks = await getPendingTasksWithPDFInfo(1)
    
    if (pendingTasks.length === 0) {
      console.log("✅ No hay tareas pendientes - terminando ejecución")
      return NextResponse.json({ 
        success: true, 
        message: "No hay tareas pendientes",
        processed: 0,
        timestamp: new Date().toISOString()
      })
    }

    const task = pendingTasks[0]
    processedTask = task
    console.log(`🔧 Procesando tarea ${task.task_id} para PDF: ${task.filename}`)

    // Actualizar estado a processing
    await updateTaskStatus(task.task_id, "processing")
    console.log(`📊 Estado actualizado: pending → processing`)

    // Procesar con Python
    console.log(`🚀 Iniciando procesamiento Python para: ${task.filename}`)
    const result = await runPythonScript(task.task_id, {
      id: task.pdf_id,
      filename: task.filename,
      url: task.pdf_url
    })
    
    if (result.success && result.embeddings && result.embeddings.length > 0) {
      console.log(`✅ Procesamiento Python exitoso: ${result.embeddings.length} chunks generados`)

      // Subir embeddings a Vercel Blob
      console.log("📤 Subiendo embeddings a Vercel Blob...")
      const timestamp = Date.now()
      const embeddingsFilename = `embeddings/${task.pdf_id}-${timestamp}.json`
      
      const embeddingsBlob = await put(
        embeddingsFilename, 
        JSON.stringify(result.embeddings, null, 2), 
        {
          access: "public",
          contentType: "application/json",
          token: process.env.BLOB_READ_WRITE_TOKEN!,
        }
      )

      console.log(`📦 Embeddings subidos: ${embeddingsBlob.url}`)

      // Actualizar PDF y tarea usando las funciones de lib/db
      await updatePDFWithEmbeddings(
        task.pdf_id, 
        embeddingsBlob.url,
        result.embeddings.length
      )
      
      await updateTaskStatus(task.task_id, "completed")

      console.log(`🎉 Tarea ${task.task_id} COMPLETADA exitosamente`)
      console.log(`📊 Resumen: ${result.embeddings.length} chunks procesados`)

      const processingTime = Math.round((Date.now() - new Date(task.task_created).getTime()) / 1000)
      
      return NextResponse.json({
        success: true,
        taskId: task.task_id,
        status: "completed",
        processed: true,
        chunks: result.embeddings.length,
        embeddingsUrl: embeddingsBlob.url,
        processingTime: `${processingTime} segundos`,
        pdf: {
          id: task.pdf_id,
          filename: task.filename,
          originalUrl: task.pdf_url
        },
        timestamp: new Date().toISOString()
      })

    } else {
      const errorMsg = result.error || "Error desconocido en el procesamiento Python"
      console.error(`❌ Error en procesamiento Python: ${errorMsg}`)
      
      await updateTaskStatus(task.task_id, "error", errorMsg)
      
      return NextResponse.json({
        success: false,
        taskId: task.task_id,
        error: errorMsg,
        processed: false,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error("💥 Error inesperado en cron job:", error)
    
    if (processedTask) {
      try {
        await updateTaskStatus(
          processedTask.task_id, 
          "error", 
          `Error interno: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      } catch (dbError) {
        console.error("Error al actualizar estado de tarea fallida:", dbError)
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "Error interno del servidor",
        taskId: processedTask?.task_id,
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Endpoint adicional para monitoreo
export async function POST(request: Request) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stats = await getTaskStats()
    const resetCount = await resetStuckTasks(2)

    return NextResponse.json({
      success: true,
      task_stats: stats,
      reset_tasks: resetCount,
      recommendation: stats.pending > 10 
        ? "Considerar aumentar la frecuencia del cron job" 
        : "Estado normal",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      { error: "Error obteniendo estadísticas" },
      { status: 500 }
    )
  }
}
