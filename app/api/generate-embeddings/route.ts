import { NextResponse } from "next/server";
import { 
  createEmbeddingTaskSafe, 
  getPDFWithProcessingStatus,
  getTaskStats 
} from '@/lib/db';

export async function POST(request: Request) {
  try {
    console.log("📥 Recibiendo solicitud para crear tarea de embeddings");

    const { pdfId } = await request.json();

    if (!pdfId) {
      return NextResponse.json({ 
        success: false, 
        error: "pdfId es requerido" 
      }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(pdfId)) {
      return NextResponse.json({ 
        success: false, 
        error: "pdfId debe ser un UUID válido" 
      }, { status: 400 });
    }

    // 1. Validar que el PDF existe
    const pdfWithStatus = await getPDFWithProcessingStatus(pdfId);
    if (!pdfWithStatus) {
      return NextResponse.json({ 
        success: false, 
        error: "PDF no encontrado" 
      }, { status: 404 });
    }

    // 2. Si ya tiene embeddings y está completado → responder inmediatamente
    if (pdfWithStatus.embeddings_url && pdfWithStatus.task_status === 'completed') {
      return NextResponse.json({
        success: true,
        status: "completed",
        taskId: pdfWithStatus.id,
        embeddings_url: pdfWithStatus.embeddings_url,
        message: "Los embeddings ya fueron generados previamente"
      });
    }

    // 3. Crear una nueva tarea (o devolver la existente en estado pending/processing)
    const taskResult = await createEmbeddingTaskSafe(pdfId);

    if (!taskResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: taskResult.message 
      }, { status: 500 });
    }

    // Este endpoint solo devuelve el taskId para que el worker en Railway lo procese
    return NextResponse.json({
      success: true,
      taskId: taskResult.task?.id || taskResult.existingTask?.id,
      status: taskResult.task?.status || taskResult.existingTask?.status,
      pdf: {
        id: pdfWithStatus.id,
        filename: pdfWithStatus.filename,
        url: pdfWithStatus.url,
      },
      message: "Tarea creada, será procesada por el worker externo (Railway)",
      check_status_url: `/api/generate-embeddings/status/${taskResult.task?.id || taskResult.existingTask?.id}`
    });

  } catch (error) {
    console.error("❌ Error inesperado creando tarea:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor al crear la tarea" },
      { status: 500 }
    );
  }
}

// Endpoint GET → healthcheck
export async function GET() {
  try {
    const stats = await getTaskStats();
    return NextResponse.json({
      success: true,
      service: "generate-embeddings",
      status: "operational",
      task_stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        service: "generate-embeddings",
        status: "degraded",
        error: "No se pudo conectar a la base de datos",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
