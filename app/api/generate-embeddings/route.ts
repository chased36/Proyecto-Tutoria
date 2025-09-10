import { NextResponse } from "next/server";
import { getTaskStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = await getTaskStats();
    
    return NextResponse.json({
      success: true,
      service: "generate-embeddings-status",
      status: "operational",
      task_stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("💥 Error en el health check del servicio de embeddings:", error);
    
    return NextResponse.json(
      {
        success: false,
        service: "generate-embeddings-status",
        status: "degraded",
        error: "No se pudo conectar a la base de datos para obtener estadísticas.",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
