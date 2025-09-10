"use server";

import { getTaskWithPDFInfo } from "@/lib/db";

export async function enqueueEmbeddingGeneration(taskId: string) {
  try {
    console.log(`🚀 Iniciando encolamiento para la tarea: ${taskId}`);

    const taskWithPdf = await getTaskWithPDFInfo(taskId);
    if (!taskWithPdf) {
      throw new Error("No se encontró la tarea o el PDF asociado.");
    }

    const { pdf_id, pdf_url } = taskWithPdf;
    const workerUrl = process.env.EMBEDDING_WORKER_URL;
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerUrl || !workerSecret) {
      console.error("La URL del worker o el secreto no están configurados en .env");
      throw new Error("Configuración del worker incompleta en el servidor.");
    }

    console.log(`📞 Llamando al worker en: ${workerUrl}`);

    fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerSecret}`,
      },
      body: JSON.stringify({
        pdf_id: pdf_id,
        task_id: taskId,
        pdf_url: pdf_url,
      }),
    });
    
    console.log(`✅ Tarea ${taskId} encolada exitosamente. El worker la procesará en segundo plano.`);

    return { success: true, message: "La tarea ha sido encolada." };

  } catch (error) {
    console.error("❌ Error al encolar la tarea de embeddings:", error);
    // Aquí podrías actualizar el estado de la tarea a 'error' en la DB si lo deseas.
    return { success: false, error: (error as Error).message };
  }
}
