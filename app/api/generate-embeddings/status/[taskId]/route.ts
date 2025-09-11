import { NextResponse } from "next/server"
import { getTaskById, getTaskStats, getTaskWithPDFInfo, updateTaskStatus } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: "taskId es requerido",
        },
        { status: 400 },
      )
    }

    console.log(`📊 Obteniendo estado de tarea: ${taskId}`)

    const task = await getTaskWithPDFInfo(taskId)

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: "Tarea no encontrada",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      task,
    })
  } catch (error: any) {
    console.error(`💥 Error obteniendo estado de tarea:`, error)

    const errorMessage = error.message || ""
    if (errorMessage.includes("Timeout") || errorMessage.includes("fetch failed")) {
      return NextResponse.json(
        {
          success: false,
          error: "La base de datos tardó demasiado en responder. Reintentando...",
          status: "retrying",
        },
        { status: 504 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor al obtener el estado de la tarea",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log("📈 Solicitando estadísticas del sistema de tareas")

    const stats = await getTaskStats()

    return NextResponse.json({
      success: true,
      system_status: "operational",
      statistics: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("💥 Error obteniendo estadísticas del sistema:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor al obtener estadísticas",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: "taskId es requerido",
        },
        { status: 400 },
      )
    }

    console.log(`🔄 Solicitando reprocesamiento de tarea: ${taskId}`)

    const task = await getTaskById(taskId)

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: "Tarea no encontrada",
        },
        { status: 404 },
      )
    }

    if (task.status !== "error") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo se pueden reprocesar tareas con estado 'error'",
          current_status: task.status,
        },
        { status: 400 },
      )
    }

    await updateTaskStatus(taskId, "pending", "Reintento manual solicitado")

    console.log(`✅ Tarea ${taskId} marcada para reprocesamiento`)

    return NextResponse.json({
      success: true,
      message: "Tarea marcada para reprocesamiento.",
      taskId: taskId,
      new_status: "pending",
    })
  } catch (error) {
    console.error(`💥 Error en reprocesamiento de tarea:`, error)

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor al reprocesar la tarea",
      },
      { status: 500 },
    )
  }
}
