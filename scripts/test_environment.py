#!/usr/bin/env python3
"""
Script para probar que el entorno esté configurado correctamente
"""

import sys
import traceback

def test_imports():
    """Probar todas las importaciones necesarias"""
    print("🧪 Probando importaciones...")
    
    try:
        import torch
        print(f"✅ PyTorch {torch.__version__} - OK")
        print(f"   CPU disponible: {torch.cuda.is_available() == False}")
    except ImportError as e:
        print(f"❌ PyTorch - FALTA: {e}")
        return False
    
    try:
        import transformers
        print(f"✅ Transformers {transformers.__version__} - OK")
    except ImportError as e:
        print(f"❌ Transformers - FALTA: {e}")
        return False
    
    try:
        import sentence_transformers
        print(f"✅ Sentence Transformers {sentence_transformers.__version__} - OK")
    except ImportError as e:
        print(f"❌ Sentence Transformers - FALTA: {e}")
        return False
    
    try:
        import pymupdf4llm
        print("✅ PyMuPDF4LLM - OK")
    except ImportError as e:
        print(f"❌ PyMuPDF4LLM - FALTA: {e}")
        return False
    
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        print("✅ LangChain Text Splitters - OK")
    except ImportError as e:
        print(f"❌ LangChain Text Splitters - FALTA: {e}")
        return False
    
    try:
        import requests
        print("✅ Requests - OK")
    except ImportError as e:
        print(f"❌ Requests - FALTA: {e}")
        return False
    
    return True

def test_model_loading():
    """Probar carga del modelo de embeddings"""
    print("\n🤖 Probando carga del modelo...")
    
    try:
        from sentence_transformers import SentenceTransformer
        import os
        
        # Configurar directorio de caché
        cache_dir = os.path.join(os.path.dirname(__file__), "model_cache")
        os.makedirs(cache_dir, exist_ok=True)
        
        print("📥 Descargando/cargando modelo (esto puede tomar varios minutos la primera vez)...")
        
        model = SentenceTransformer(
            "multi-qa-mpnet-base-dot-v1",
            cache_folder=cache_dir,
            device='cpu'
        )
        
        print("✅ Modelo cargado exitosamente")
        
        # Probar embedding simple
        print("🧪 Probando generación de embedding...")
        test_text = "Este es un texto de prueba"
        embedding = model.encode([test_text])
        
        print(f"✅ Embedding generado: dimensión {len(embedding[0])}")
        return True
        
    except Exception as e:
        print(f"❌ Error cargando modelo: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_pdf_processing():
    """Probar procesamiento básico de texto"""
    print("\n📄 Probando procesamiento de texto...")
    
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        
        # Texto de prueba
        test_text = """
        Este es un documento de prueba para verificar que el procesamiento de texto funciona correctamente.
        
        Capítulo 1: Introducción
        En este capítulo introducimos los conceptos básicos.
        
        Capítulo 2: Desarrollo
        Aquí desarrollamos los temas principales con ejemplos.
        
        Capítulo 3: Conclusiones
        Finalmente presentamos las conclusiones del estudio.
        """
        
        # Dividir en chunks
        text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            model_name="gpt-4o", 
            chunk_size=200, 
            chunk_overlap=50
        )
        
        chunks = text_splitter.create_documents([test_text])
        print(f"✅ Texto dividido en {len(chunks)} chunks")
        
        for i, chunk in enumerate(chunks[:2]):  # Mostrar solo los primeros 2
            print(f"   Chunk {i+1}: {chunk.page_content[:50]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Error procesando texto: {e}")
        return False

def main():
    print("🚀 Probando configuración del entorno Python...")
    print("=" * 60)
    
    # Probar importaciones
    if not test_imports():
        print("\n❌ Faltan dependencias. Ejecuta el script de configuración.")
        sys.exit(1)
    
    # Probar carga del modelo
    if not test_model_loading():
        print("\n❌ Error con el modelo. Verifica tu conexión a internet.")
        sys.exit(1)
    
    # Probar procesamiento de texto
    if not test_pdf_processing():
        print("\n❌ Error en procesamiento de texto.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("🎉 ¡Entorno configurado correctamente!")
    print("✅ Todas las pruebas pasaron exitosamente")
    print("💡 El sistema de embeddings está listo para usar")

if __name__ == "__main__":
    main()
