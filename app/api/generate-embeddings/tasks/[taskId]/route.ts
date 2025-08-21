import { NextResponse } from "next/server"
import { getTaskWithPDFInfo, getTaskStats } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId
    
    if (!taskId) {
      return NextResponse.json({ 
        success: false, 
        error: "taskId es requerido" 
      }, { status: 400 })
    }

    console.log(`🔍 Consultando estado de tarea: ${taskId}`)

    // Obtener información completa de la tarea con datos del PDF
    const taskWithPDF = await getTaskWithPDFInfo(taskId)
    
    if (!taskWithPDF) {
      console.error(`❌ Tarea no encontrada: ${taskId}`)
      return NextResponse.json({ 
        success: false, 
        error: "Tarea no encontrada" 
      }, { status: 404 })
    }

    console.log(`📊 Estado de tarea ${taskId}: ${taskWithPDF.task_status}`)

    // Construir respuesta basada en el estado de la tarea
    let responseData: any = {
      success: true,
      task: {
        id: taskId,
        status: taskWithPDF.task_status,
        error_message: taskWithPDF.error_message || null,
        created_at: taskWithPDF.task_created,
        updated_at: taskWithPDF.task_updated,
        processing_time: taskWithPDF.task_created ? 
          Math.round((new Date(taskWithPDF.task_updated).getTime() - new Date(taskWithPDF.task_created).getTime()) / 1000) : null
      },
      pdf: {
        id: taskWithPDF.pdf_id,
        filename: taskWithPDF.filename,
        url: taskWithPDF.pdf_url,
        embeddings_url: taskWithPDF.embeddings_url || null,
        total_chunks: taskWithPDF.total_chunks || 0,
        asignatura_id: taskWithPDF.asignatura_id
      }
    }

    // Agregar información adicional basada en el estado
    switch (taskWithPDF.task_status) {
      case 'completed':
        responseData.message = "Procesamiento completado exitosamente"
        responseData.download_url = taskWithPDF.embeddings_url
        break
        
      case 'processing':
        responseData.message = "El PDF está siendo procesado actualmente"
        responseData.estimated_completion = "Puede tomar varios minutos dependiendo del tamaño del PDF"
        break
        
      case 'pending':
        responseData.message = "El PDF está en cola para procesamiento"
        responseData.queue_position = "Será procesado en los próximos 5-10 minutos"
        break
        
      case 'error':
        responseData.message = "Error en el procesamiento del PDF"
        responseData.retry_recommended = true
        break
    }

    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error(`💥 Error obteniendo estado de tarea ${params.taskId}:`, error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Error interno del servidor al obtener el estado de la tarea",
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}

// Endpoint adicional para obtener estadísticas del sistema
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    
    if (taskId) {
      // Si se proporciona un taskId, devolver información específica
      return await GET(request, { params: { taskId } } as any)
    }

    // Si no hay taskId, devolver estadísticas del sistema
    console.log("📈 Solicitando estadísticas del sistema de tareas")
    
    const stats = await getTaskStats()
    const totalTasks = stats.pending + stats.processing + stats.completed + stats.error

    return NextResponse.json({
      success: true,
      system_status: "operational",
      statistics: {
        total_tasks: totalTasks,
        by_status: stats,
        utilization: totalTasks > 0 ? 
          Math.round((stats.completed / totalTasks) * 100) : 0,
        pending_ratio: totalTasks > 0 ? 
          Math.round((stats.pending / totalTasks) * 100) : 0
      },
      recommendations: {
        ...(stats.pending > 20 && { 
          priority: "high",
          message: "Muchas tareas pendientes. Considerar aumentar la capacidad de procesamiento."
        }),
        ...(stats.error > 5 && {
          priority: "medium", 
          message: "Varias tareas fallidas. Revisar logs para identificar problemas recurrentes."
        }),
        ...(stats.pending === 0 && stats.processing === 0 && {
          priority: "low",
          message: "Sistema al día. No hay tareas pendientes o en procesamiento."
        })
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("💥 Error obteniendo estadísticas del sistema:", error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Error interno del servidor al obtener estadísticas",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Endpoint para forzar reprocesamiento de una tarea fallida
export async function PUT(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId
    
    if (!taskId) {
      return NextResponse.json({ 
        success: false, 
        error: "taskId es requerido" 
      }, { status: 400 })
    }

    console.log(`🔄 Solicitando reprocesamiento de tarea: ${taskId}`)

    // Obtener información actual de la tarea
    const taskWithPDF = await getTaskWithPDFInfo(taskId)
    
    if (!taskWithPDF) {
      return NextResponse.json({ 
        success: false, 
        error: "Tarea no encontrada" 
      }, { status: 404 })
    }

    // Solo permitir reprocesamiento de tareas en error
    if (taskWithPDF.task_status !== 'error') {
      return NextResponse.json({
        success: false,
        error: "Solo se pueden reprocesar tareas con estado 'error'",
        current_status: taskWithPDF.task_status
      }, { status: 400 })
    }

    // Importar función para actualizar estado (evitar circular dependency)
    const { updateTaskStatus } = await import('@/lib/db')
    
    // Cambiar estado a pending para reprocesamiento
    await updateTaskStatus(taskId, 'pending', 'Reintento manual solicitado')
    
    console.log(`✅ Tarea ${taskId} marcada para reprocesamiento`)

    return NextResponse.json({
      success: true,
      message: "Tarea marcada para reprocesamiento",
      taskId: taskId,
      new_status: "pending",
      estimated_processing: "El reprocesamiento comenzará en los próximos 5 minutos",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(`💥 Error en reprocesamiento de tarea ${params.taskId}:`, error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Error interno del servidor al reprocesar la tarea",
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}
