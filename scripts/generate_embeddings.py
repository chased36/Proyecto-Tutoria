#!/usr/bin/env python3
import json
import os
import sys
import tempfile
import requests
from pathlib import Path
import traceback
import re
import gc  # Para limpieza de memoria
import signal
import time

MODEL_NAME = "sentence-transformers/multi-qa-mpnet-base-dot-v1"
MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), "model_cache")
EMBEDDING_BATCH_SIZE = 4  # Reducido para entornos con RAM limitada

# Variable global para el modelo (singleton)
_embedding_model = None
_pymupdf4llm = None

# Configurar manejo de señales para terminación limpia
def signal_handler(signum, frame):
    print(f"Recibida señal {signum}, terminando limpiamente...", file=sys.stderr)
    cleanup_model()
    sys.exit(1)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

def download_model():
    """Descargar modelo solo si no existe en caché"""
    try:
        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
        
        if not os.listdir(MODEL_CACHE_DIR):
            print("⏳ Descargando modelo (primera ejecución)...", file=sys.stderr)
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer(
                MODEL_NAME,
                cache_folder=MODEL_CACHE_DIR,
                device='cpu',
                trust_remote_code=False
            )
            # Liberar memoria inmediatamente
            del model
            gc.collect()
            print("✅ Modelo descargado y cacheado", file=sys.stderr)
    except Exception as e:
        print(f"❌ Error descargando modelo: {traceback.format_exc()}", file=sys.stderr)
        raise

def initialize_models():
    """Inicializar modelos con singleton pattern"""
    global _embedding_model, _pymupdf4llm
    
    if _embedding_model is not None:
        return _pymupdf4llm, _embedding_model

    try:
        # 1. Descargar modelo si no existe
        download_model()

        # 2. Cargar bibliotecas
        import pymupdf4llm
        from sentence_transformers import SentenceTransformer

        # 3. Configurar para bajo consumo de RAM
        import torch
        torch.set_num_threads(1)

        # 4. Cargar modelo desde caché local
        _embedding_model = SentenceTransformer(
            MODEL_CACHE_DIR,
            device='cpu',
            trust_remote_code=False
        )
        
        _pymupdf4llm = pymupdf4llm
        return _pymupdf4llm, _embedding_model

    except Exception as e:
        print(f"❌ Error inicializando modelos: {traceback.format_exc()}", file=sys.stderr)
        cleanup_model()
        return None, None

def cleanup_model():
    """Limpiar modelo de memoria"""
    global _embedding_model
    if _embedding_model is not None:
        del _embedding_model
        _embedding_model = None
    gc.collect()

def download_pdf(url, temp_path, max_retries=3):
    """Descargar PDF desde URL a archivo temporal con reintentos"""
    for attempt in range(max_retries):
        try:
            print(f"Descargando PDF desde: {url} (intento {attempt + 1}/{max_retries})", file=sys.stderr)
            
            response = requests.get(url, stream=True, timeout=60)  # Aumentar timeout
            response.raise_for_status()
            
            with open(temp_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            file_size = os.path.getsize(temp_path)
            print(f"PDF descargado: {file_size} bytes", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Error en intento {attempt + 1}: {e}", file=sys.stderr)
            if attempt == max_retries - 1:
                print(f"Error descargando PDF después de {max_retries} intentos: {e}", file=sys.stderr)
                return False
            time.sleep(2)  # Esperar antes del siguiente intento
    
    return False

def process_pdf_to_embeddings(pdf_url, pdf_filename, pymupdf4llm, embedding_model):
    """Procesar PDF y generar embeddings"""
    temp_path = None
    try:
        # 1. Descargar PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_path = temp_file.name
        
        if not download_pdf(pdf_url, temp_path):
            return None

        # 2. Extraer texto
        md_text = pymupdf4llm.to_markdown(temp_path)
        if not md_text or len(md_text.strip()) < 10:
            return []

        # 3. Dividir texto
        text_chunks = simple_text_splitter(md_text)
        if not text_chunks:
            return []

        # 4. Generar embeddings por lotes pequeños
        embeddings = []
        for i in range(0, len(text_chunks), EMBEDDING_BATCH_SIZE):
            batch = text_chunks[i:i + EMBEDDING_BATCH_SIZE]
            try:
                batch_embeddings = embedding_model.encode(
                    batch,
                    show_progress_bar=False,
                    batch_size=2  # Más pequeño para Railway
                )
                embeddings.extend(batch_embeddings)
            except Exception as e:
                print(f"Error en lote {i//EMBEDDING_BATCH_SIZE}: {str(e)}", file=sys.stderr)
                continue
        return [
            {"id": f"{pdf_filename}-{i}", "text": chunk, "embedding": emb.tolist()}
            for i, (chunk, emb) in enumerate(zip(text_chunks, embeddings))
        ]
    except Exception as e:
        print(f"Error procesando PDF: {traceback.format_exc()}", file=sys.stderr)
        return None
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

def simple_text_splitter(text, chunk_size=500, overlap=125):
    """Dividir texto en chunks de manera simple y robusta"""
    if not text or len(text.strip()) < 10:
        return []
    
    # Limpiar texto
    text = re.sub(r'\s+', ' ', text.strip())
    
    chunks = []
    start = 0
    
    while start < len(text):
        # Calcular el final del chunk
        end = min(start + chunk_size, len(text))
        
        # Si no estamos al final del texto, buscar un punto de corte natural
        if end < len(text):
            # Buscar el último espacio, punto o salto de línea en los últimos 100 caracteres
            search_start = max(end - 100, start)
            last_break = max(
                text.rfind(' ', search_start, end),
                text.rfind('.', search_start, end),
                text.rfind('\n', search_start, end)
            )
            
            if last_break > start:
                end = last_break + 1
        
        chunk = text[start:end].strip()
        if len(chunk) > 50:  # Solo agregar chunks con contenido significativo
            chunks.append(chunk)
        
        # Calcular el siguiente punto de inicio con overlap
        start = max(start + 1, end - overlap)
        
        # Evitar bucles infinitos
        if start >= len(text):
            break
    
    return chunks

def initialize_models():
    """Inicializar modelos con manejo de errores y singleton pattern"""
    global _embedding_model, _pymupdf4llm
    
    try:
        # Si ya están inicializados, devolverlos
        if _embedding_model is not None and _pymupdf4llm is not None:
            return _pymupdf4llm, _embedding_model
        
        print("Inicializando modelos...", file=sys.stderr)
        
        # Importar después de verificar que estamos en el entorno correcto
        import pymupdf4llm
        from sentence_transformers import SentenceTransformer
        
        _pymupdf4llm = pymupdf4llm
        
        print("Cargando modelo de embeddings...", file=sys.stderr)
        
        # Configurar directorio de caché para evitar problemas
        cache_dir = os.path.join(os.path.dirname(__file__), "model_cache")
        os.makedirs(cache_dir, exist_ok=True)
        
        # Configuraciones específicas para evitar problemas de memoria en Windows
        import torch
        torch.set_num_threads(1)  # Limitar threads
        
        # Cargar modelo con configuración específica para evitar problemas de memoria
        _embedding_model = SentenceTransformer(
            "multi-qa-mpnet-base-dot-v1",
            cache_folder=cache_dir,
            device='cpu',  # Forzar CPU para evitar problemas con CUDA
            trust_remote_code=False  # Seguridad adicional
        )
        
        print("Modelo cargado exitosamente", file=sys.stderr)
        
        return _pymupdf4llm, _embedding_model
        
    except Exception as e:
        print(f"Error inicializando modelos: {e}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        cleanup_model()
        return None, None

def process_pdf_to_embeddings(pdf_url, pdf_filename, pymupdf4llm, embedding_model):
    """Procesar un PDF desde URL y generar embeddings"""
    temp_path = None
    try:
        print(f"Procesando PDF: {pdf_filename}", file=sys.stderr)
        
        # Crear archivo temporal para el PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_path = temp_file.name
        
        # Descargar PDF con reintentos
        if not download_pdf(pdf_url, temp_path):
            return None
        
        print("Extrayendo texto del PDF...", file=sys.stderr)
        
        # Redirigir stderr temporalmente para capturar mensajes de MuPDF
        original_stderr = sys.stderr
        temp_stderr = tempfile.NamedTemporaryFile(mode='w+', delete=False)
        sys.stderr = temp_stderr
        
        try:
            # Extraer texto usando pymupdf4llm
            md_text = pymupdf4llm.to_markdown(temp_path)
        except Exception as extract_error:
            # Restaurar stderr para mostrar el error
            sys.stderr = original_stderr
            temp_stderr.close()
            if os.path.exists(temp_stderr.name):
                os.unlink(temp_stderr.name)
            
            print(f"Error extrayendo texto de {pdf_filename}: {extract_error}", file=sys.stderr)
            return None
        finally:
            # Restaurar stderr
            sys.stderr = original_stderr
            temp_stderr.close()
            # Limpiar archivo temporal de stderr
            if os.path.exists(temp_stderr.name):
                os.unlink(temp_stderr.name)
        
        if not md_text or len(md_text.strip()) < 10:
            print(f"Advertencia: PDF {pdf_filename} parece estar vacío o no contiene texto extraíble", file=sys.stderr)
            return []
        
        print(f"Texto extraído: {len(md_text)} caracteres", file=sys.stderr)
        
        # Dividir texto en chunks usando nuestro splitter simple
        print("Dividiendo texto en chunks...", file=sys.stderr)
        text_chunks = simple_text_splitter(md_text, chunk_size=500, overlap=125)
        
        print(f"Texto dividido en {len(text_chunks)} chunks", file=sys.stderr)
        
        if len(text_chunks) == 0:
            print(f"Advertencia: No se generaron chunks de texto para {pdf_filename}", file=sys.stderr)
            return []
        
        # Crear chunks con IDs
        file_chunks = [
            {"id": f"{pdf_filename}-{i+1}", "text": chunk} 
            for i, chunk in enumerate(text_chunks)
        ]
        
        # Generar embeddings
        print("Generando embeddings...", file=sys.stderr)
        texts_to_embed = [chunk["text"] for chunk in file_chunks]
        
        # Procesar en lotes más pequeños para múltiples PDFs
        batch_size = 6  # Reducido aún más para mejor manejo de memoria
        all_embeddings = []
        
        for i in range(0, len(texts_to_embed), batch_size):
            batch = texts_to_embed[i:i+batch_size]
            batch_num = i//batch_size + 1
            total_batches = (len(texts_to_embed)-1)//batch_size + 1
            
            print(f"Procesando lote {batch_num}/{total_batches}", file=sys.stderr)
            
            try:
                batch_embeddings = embedding_model.encode(
                    batch, 
                    show_progress_bar=False,
                    convert_to_numpy=True,
                    batch_size=min(4, len(batch))  # Lotes aún más pequeños internamente
                )
                all_embeddings.extend(batch_embeddings)
                
                # Limpieza de memoria más agresiva
                if batch_num % 3 == 0:  # Cada 3 lotes
                    gc.collect()
                    
            except Exception as embed_error:
                print(f"Error generando embeddings para lote {batch_num}: {embed_error}", file=sys.stderr)
                # Continuar con el siguiente lote en lugar de fallar completamente
                continue
        
        if len(all_embeddings) == 0:
            print(f"Error: No se pudieron generar embeddings para {pdf_filename}", file=sys.stderr)
            return None
        
        # Agregar embeddings a los chunks (solo a los que tienen embedding)
        final_chunks = []
        for i, (chunk, emb) in enumerate(zip(file_chunks[:len(all_embeddings)], all_embeddings)):
            chunk["embedding"] = emb.tolist()
            final_chunks.append(chunk)
        
        print(f"Embeddings generados para {len(final_chunks)} chunks", file=sys.stderr)
        
        # Limpiar variables grandes de memoria
        del md_text, text_chunks, texts_to_embed, all_embeddings
        gc.collect()
        
        return final_chunks
        
    except Exception as e:
        print(f"Error procesando PDF {pdf_filename}: {e}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        return None
    finally:
        # Limpiar archivo temporal
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass

def main():
    """Función principal que procesa múltiples PDFs"""
    try:
        if len(sys.argv) < 2:
            print("Uso: python generate_embeddings.py <pdf_data_file>", file=sys.stderr)
            sys.exit(1)
        
        print("Iniciando procesamiento de embeddings...", file=sys.stderr)
        
        # Inicializar modelos UNA SOLA VEZ
        pymupdf4llm, embedding_model = initialize_models()
        
        if not all([pymupdf4llm, embedding_model]):
            raise Exception("Error inicializando modelos")
        
        # Leer datos de PDFs desde archivo
        pdf_data_file = sys.argv[1]
        print(f"Leyendo datos desde: {pdf_data_file}", file=sys.stderr)
        
        try:
            with open(pdf_data_file, 'r', encoding='utf-8') as f:
                pdf_data = json.load(f)
        except FileNotFoundError:
            raise Exception(f"Archivo de datos no encontrado: {pdf_data_file}")
        except json.JSONDecodeError as e:
            raise Exception(f"Error parseando archivo JSON: {e}")
        
        print(f"Procesando {len(pdf_data)} PDFs", file=sys.stderr)
        
        all_chunks = []
        successful_pdfs = 0
        failed_pdfs = 0
        
        for i, pdf_info in enumerate(pdf_data, 1):
            pdf_url = pdf_info.get('url')
            pdf_filename = pdf_info.get('filename')
            
            if not pdf_url or not pdf_filename:
                print(f"Datos incompletos para PDF: {pdf_info}", file=sys.stderr)
                failed_pdfs += 1
                continue
            
            print(f"📄 Procesando PDF {i}/{len(pdf_data)}: {pdf_filename}", file=sys.stderr)
            
            chunks = process_pdf_to_embeddings(
                pdf_url, pdf_filename, 
                pymupdf4llm, embedding_model
            )
            
            if chunks is not None and len(chunks) > 0:
                all_chunks.extend(chunks)
                successful_pdfs += 1
                print(f"✅ {pdf_filename}: {len(chunks)} chunks generados", file=sys.stderr)
            else:
                failed_pdfs += 1
                print(f"❌ Error procesando {pdf_filename}", file=sys.stderr)
            
            print(f"📊 Progreso: {i}/{len(pdf_data)} PDFs procesados, {len(all_chunks)} chunks totales", file=sys.stderr)
            
            # Limpieza de memoria después de cada PDF
            gc.collect()
        
        # Retornar resultado como JSON - SOLO en stdout
        result = {
            "success": True,
            "total_chunks": len(all_chunks),
            "successful_pdfs": successful_pdfs,
            "failed_pdfs": failed_pdfs,
            "embeddings": all_chunks
        }
        
        print(f"Procesamiento completado: {len(all_chunks)} chunks totales", file=sys.stderr)
        print(f"PDFs exitosos: {successful_pdfs}, PDFs fallidos: {failed_pdfs}", file=sys.stderr)
        
        # IMPORTANTE: Solo imprimir JSON en stdout, sin texto adicional
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error general: {e}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        
        error_result = {
            "success": False,
            "error": str(e)
        }
        # Imprimir error también solo en stdout como JSON válido
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
    finally:
        # Limpiar modelo al final
        cleanup_model()

if __name__ == "__main__":
    main()
