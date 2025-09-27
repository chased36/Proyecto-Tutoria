import { type NextRequest, NextResponse } from "next/server";
import { streamText, type CoreMessage } from "ai";
import { groq } from "@ai-sdk/groq";
import { findSimilarChunksEnhanced, hybridSearch, type EnhancedChunk } from "@/lib/db";
import { HfInference, type FeatureExtractionOutput } from "@huggingface/inference";

export const maxDuration = 300;

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Cache para embeddings de consultas similares (opcional)
const embeddingCache = new Map<string, number[]>();

// Función para determinar el tipo de consulta y estrategia RAG apropiada
function analyzeQueryType(query: string): {
  isSpecific: boolean;
  requiresContext: boolean;
  searchStrategy: 'hybrid' | 'similarity' | 'enhanced';
  chunkCount: number;
} {
  const query_lower = query.toLowerCase();
  
  // Detectar consultas específicas que necesitan más contexto
  const specificIndicators = [
    'qué dice sobre', 'según el documento', 'en el texto', 'menciona',
    'define', 'explica detalladamente', 'cuál es la diferencia',
    'paso a paso', 'procedimiento', 'proceso'
  ];
  
  const isSpecific = specificIndicators.some(indicator => 
    query_lower.includes(indicator)
  );
  
  // Detectar si la consulta requiere múltiples fuentes o contexto amplio
  const contextIndicators = [
    'compara', 'diferencias', 'similitudes', 'relación entre',
    'en general', 'resumen', 'overview', 'panorama'
  ];
  
  const requiresContext = contextIndicators.some(indicator => 
    query_lower.includes(indicator)
  );

  // Determinar estrategia de búsqueda
  let searchStrategy: 'hybrid' | 'similarity' | 'enhanced' = 'enhanced';
  let chunkCount = 8;

  if (query.length > 100 || query.split(' ').length > 15) {
    // Consulta compleja - usar búsqueda híbrida
    searchStrategy = 'hybrid';
    chunkCount = 10;
  } else if (isSpecific) {
    // Consulta específica - similarity search enfocada
    searchStrategy = 'similarity';
    chunkCount = 6;
  } else if (requiresContext) {
    // Consulta que requiere contexto amplio
    searchStrategy = 'enhanced';
    chunkCount = 12;
  }

  return { isSpecific, requiresContext, searchStrategy, chunkCount };
}

// Función para formatear contexto con metadatos enriquecidos
function formatEnhancedContext(chunks: EnhancedChunk[]): {
  contextText: string;
  sourceSummary: string;
  hasHighRelevance: boolean;
} {
  if (chunks.length === 0) {
    return {
      contextText: "No se encontró información relevante en los documentos.",
      sourceSummary: "Sin fuentes disponibles",
      hasHighRelevance: false
    };
  }

  // Agrupar chunks por sección para mejor organización
  const chunksBySection = chunks.reduce((acc, chunk) => {
    const section = chunk.section_title || 'Contenido General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(chunk);
    return acc;
  }, {} as Record<string, EnhancedChunk[]>);

  let contextText = "CONTEXTO EXTRAÍDO DE LOS DOCUMENTOS:\n\n";
  let sourceCount = 0;

  // Formatear contexto por secciones
  Object.entries(chunksBySection).forEach(([section, sectionChunks]) => {
    contextText += `📚 **${section}**\n`;
    
    sectionChunks.forEach((chunk, index) => {
      sourceCount++;
      const relevanceIcon = chunk.similarity_score > 0.7 ? "🎯" : 
                           chunk.similarity_score > 0.5 ? "📍" : "📄";
      
      contextText += `\n[FUENTE ${sourceCount}] ${relevanceIcon} `;
      if (chunk.created_with_overlap) {
        contextText += `(Contexto expandido) `;
      }
      contextText += `\n${chunk.chunk_text}\n`;
    });
    contextText += "\n";
  });

  const avgRelevance = chunks.reduce((sum, c) => sum + c.similarity_score, 0) / chunks.length;
  const hasHighRelevance = avgRelevance > 0.5;

  const sourceSummary = `${sourceCount} fuentes encontradas`;

  return { contextText, sourceSummary, hasHighRelevance };
}

// Función para crear prompt optimizado según el tipo de consulta
function createOptimizedPrompt(
  contextText: string,
  queryAnalysis: ReturnType<typeof analyzeQueryType>,
  sourceSummary: string,
  hasHighRelevance: boolean
): CoreMessage {
  
  const basePersona = `Eres TUTOR-IA, un asistente educativo experto especializado en esta asignatura.`;
  
  let instructions = "";
  let responseFormat = "";

  if (queryAnalysis.isSpecific) {
    instructions = `Tu tarea es proporcionar una respuesta precisa y detallada basándote EXCLUSIVAMENTE en el contexto proporcionado. Cita específicamente las fuentes usando [FUENTE X].`;
    responseFormat = `Estructura tu respuesta así:
1. **Respuesta directa** - Responde la pregunta específica
2. **Detalles adicionales** - Proporciona contexto relevante si está disponible
3. **Fuentes** - Menciona qué fuentes utilizaste`;
  } else if (queryAnalysis.requiresContext) {
    instructions = `Tu tarea es sintetizar información de múltiples fuentes para dar una visión comprehensiva del tema.`;
    responseFormat = `Estructura tu respuesta así:
1. **Resumen ejecutivo** - Idea principal en 2-3 líneas
2. **Puntos clave** - Los aspectos más importantes con sus fuentes
3. **Información adicional** - Detalles complementarios si están disponibles`;
  } else {
    instructions = `Tu tarea es responder de manera clara y educativa, usando el contexto disponible.`;
    responseFormat = `Proporciona una respuesta bien estructurada con viñetas o párrafos según sea apropiado.`;
  }

  const confidenceNote = hasHighRelevance 
    ? "El contexto proporcionado tiene alta relevancia para tu consulta."
    : "Ten en cuenta que el contexto disponible puede tener relevancia limitada para tu consulta específica.";

  const fallbackBehavior = `

**IMPORTANTE - Reglas de respuesta:**
- Si la información no está en el contexto: "No encuentro información específica sobre esto en el material de la asignatura disponible."
- Si el contexto es insuficiente: "La información disponible es limitada. Te recomiendo consultar material adicional o contactar al instructor."  
- NUNCA inventes o asumas información que no esté explícitamente en el contexto.
- Siempre cita las fuentes usando el formato [FUENTE X] cuando uses información específica.

${confidenceNote}`;

  const fullPrompt = `${basePersona}

${instructions}

${responseFormat}

CONTEXTO DISPONIBLE (${sourceSummary}):
${contextText}

${fallbackBehavior}`;

  return {
    role: "system",
    content: fullPrompt
  };
}

export async function POST(request: NextRequest) {
  try {
    const { messages, subjectId }: { messages: CoreMessage[]; subjectId: string } = await request.json();

    // Validaciones mejoradas
    if (!subjectId) {
      throw new Error("El ID de la asignatura (subjectId) es requerido.");
    }

    if (!messages || messages.length === 0) {
      throw new Error("No se proporcionaron mensajes.");
    }

    const userQuery = messages[messages.length - 1]?.content;
    if (typeof userQuery !== "string" || userQuery.trim().length < 3) {
      throw new Error("La pregunta del usuario no es válida o es demasiado corta.");
    }

    console.log(`🔎 Consulta del usuario: "${userQuery}" para la asignatura ${subjectId}`);

    // Analizar tipo de consulta para optimizar la estrategia RAG
    const queryAnalysis = analyzeQueryType(userQuery);
    console.log(`🧠 Análisis de consulta:`, queryAnalysis);

    // Generar embedding (con cache opcional)
    const cacheKey = userQuery.toLowerCase().trim();
    let embedding: number[];

    if (embeddingCache.has(cacheKey)) {
      embedding = embeddingCache.get(cacheKey)!;
      console.log("✅ Embedding recuperado del cache");
    } else {
      console.log("🔄 Generando nuevo embedding...");
      const embeddingResponse: FeatureExtractionOutput = await hf.featureExtraction({
        model: "sentence-transformers/multi-qa-mpnet-base-dot-v1",
        inputs: userQuery,
      });

      // Manejo robusto de la respuesta de embedding
      if (Array.isArray(embeddingResponse) && typeof embeddingResponse[0] === 'number') {
        embedding = embeddingResponse as number[];
      } else if (Array.isArray(embeddingResponse) && Array.isArray(embeddingResponse[0])) {
        embedding = embeddingResponse[0] as number[];
      } else {
        console.error("Estructura de embedding inesperada:", embeddingResponse);
        throw new Error("La respuesta de la API de embeddings no tuvo un formato de vector válido.");
      }

      // Guardar en cache (limitar tamaño del cache)
      if (embeddingCache.size < 100) {
        embeddingCache.set(cacheKey, embedding);
      }
      console.log("✅ Embedding generado y almacenado en cache");
    }

    // Ejecutar búsqueda RAG optimizada según el análisis
    let contextChunks: EnhancedChunk[] = [];

    try {
      switch (queryAnalysis.searchStrategy) {
        case 'hybrid':
          console.log("🔍 Ejecutando búsqueda híbrida (similarity + keywords)");
          contextChunks = await hybridSearch(
            subjectId, 
            userQuery, 
            embedding, 
            {
              match_count: queryAnalysis.chunkCount,
              keyword_weight: 0.3,
              similarity_threshold: 0.25
            }
          );
          break;

        case 'similarity':
          console.log("🎯 Ejecutando búsqueda por similarity enfocada");
          contextChunks = await findSimilarChunksEnhanced(
            subjectId, 
            embedding, 
            {
              match_count: queryAnalysis.chunkCount,
              similarity_threshold: 0.4,
              diversify_results: false,
              include_overlap_chunks: true
            }
          );
          break;

        case 'enhanced':
        default:
          console.log("🔧 Ejecutando búsqueda enhanced con diversificación");
          contextChunks = await findSimilarChunksEnhanced(
            subjectId, 
            embedding, 
            {
              match_count: queryAnalysis.chunkCount,
              similarity_threshold: 0.3,
              diversify_results: true,
              include_overlap_chunks: true
            }
          );
          break;
      }
    } catch (ragError) {
      console.error("❌ Error en búsqueda RAG, fallback a búsqueda básica:", ragError);
      // Fallback a función básica si las nuevas fallan
      const { findSimilarChunks } = await import("@/lib/db");
      const basicChunks = await findSimilarChunks(subjectId, embedding, 5);
      contextChunks = basicChunks.map(chunk => ({
        chunk_text: chunk.chunk_text,
        section_title: 'Contenido',
        chunk_index: 0,
        similarity_score: 0.5,
        token_count: chunk.chunk_text.split(' ').length,
        created_with_overlap: false
      }));
    }

    console.log(`📚 Encontrados ${contextChunks.length} chunks de contexto`);
    if (contextChunks.length > 0) {
      const avgRelevance = contextChunks.reduce((sum, c) => sum + c.similarity_score, 0) / contextChunks.length;
      console.log(`📊 Relevancia promedio: ${(avgRelevance * 100).toFixed(1)}%`);
    }

    // Formatear contexto con metadatos enriquecidos
    const { contextText, sourceSummary, hasHighRelevance } = formatEnhancedContext(contextChunks);

    // Crear prompt optimizado
    const augmentedSystemPrompt = createOptimizedPrompt(
      contextText, 
      queryAnalysis, 
      sourceSummary, 
      hasHighRelevance
    );

    // Configuración optimizada para Groq
    const modelConfig = {
      model: groq(process.env.MODEL || "llama-3.1-8b-instant"),
      messages: [augmentedSystemPrompt, ...messages],
      temperature: queryAnalysis.isSpecific ? 0.1 : 0.3, // Menos creatividad para respuestas específicas
      max_tokens: queryAnalysis.requiresContext ? 1000 : 600, // Más tokens para respuestas comprehensivas
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    };

    console.log(`🚀 Iniciando stream de Groq con modelo optimizado`);
    console.log(`⚙️ Configuración: temp=${modelConfig.temperature}, max_tokens=${modelConfig.max_tokens}`);

    const result = await streamText(modelConfig);

    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error("❌ Error en el chatbot RAG mejorado:", error);
    
    // Error handling más detallado
    let errorMessage = "Ocurrió un error procesando tu consulta.";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("API")) {
        errorMessage = "Error temporal del servicio. Por favor, intenta nuevamente.";
        statusCode = 503;
      } else if (error.message.includes("embedding")) {
        errorMessage = "Error procesando tu consulta. Verifica que tu pregunta sea clara.";
        statusCode = 400;
      } else if (error.message.includes("subjectId")) {
        errorMessage = "ID de asignatura inválido.";  
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: statusCode });
  }
}