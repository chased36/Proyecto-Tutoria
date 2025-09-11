import { type NextRequest, NextResponse } from "next/server";
import { streamText, type CoreMessage } from "ai";
import { groq } from "@ai-sdk/groq";
import { findSimilarChunks } from "@/lib/db";
import { HfInference, type FeatureExtractionOutput } from "@huggingface/inference";

export const maxDuration = 300;

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { messages, subjectId }: { messages: CoreMessage[]; subjectId: string } = await request.json();

    if (!subjectId) {
      throw new Error("El ID de la asignatura (subjectId) es requerido.");
    }

    const userQuery = messages[messages.length - 1]?.content;
    if (typeof userQuery !== "string") {
      throw new Error("La pregunta del usuario no es válida.");
    }
    console.log(`🔎 Consulta del usuario: "${userQuery}" para la asignatura ${subjectId}`);

    const embeddingResponse: FeatureExtractionOutput = await hf.featureExtraction({
      model: "sentence-transformers/multi-qa-mpnet-base-dot-v1",
      inputs: userQuery,
    });

    let embedding: number[];

    if (Array.isArray(embeddingResponse) && typeof embeddingResponse[0] === 'number') {
      embedding = embeddingResponse as number[];
    } else if (Array.isArray(embeddingResponse) && Array.isArray(embeddingResponse[0])) {
      embedding = embeddingResponse[0] as number[];
    } else {
      console.error("Estructura de embedding inesperada:", embeddingResponse);
      throw new Error("La respuesta de la API de embeddings no tuvo un formato de vector válido.");
    }

    console.log("✔️ Embedding de la consulta creado.");

    const contextChunks = await findSimilarChunks(subjectId, embedding, 5);
    console.log(`📚 Encontrados ${contextChunks.length} chunks de contexto.`);

    const contextText = contextChunks.map((chunk) => `- ${chunk.chunk_text}`).join("\n");

    const augmentedSystemPrompt: CoreMessage = {
      role: "system",
      content: `Eres un asistente educativo experto llamado TUTOR-IA. Tu tarea es responder a la pregunta del usuario basándote ÚNICA Y EXCLUSIVamente en el siguiente contexto extraído de los documentos de la asignatura. Si la respuesta no se encuentra en el contexto, di "Lo siento, no tengo suficiente información en los documentos para responder a esa pregunta." No inventes información.

CONTEXTO:
${contextText}
`,
    };
    const result = await streamText({
      model: groq(process.env.MODEL || "llama-3.1-8b-instant"),
      messages: [augmentedSystemPrompt, ...messages],
    });
    console.log("✅ Stream de Groq iniciado con contexto RAG.");

    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error("❌ Error en el chatbot RAG:", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
