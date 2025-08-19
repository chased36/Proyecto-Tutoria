#!/usr/bin/env python3
"""
Script para verificar que todas las dependencias estén instaladas correctamente
"""

import sys
import importlib

def check_module(module_name, package_name=None):
    """Verificar si un módulo está disponible"""
    try:
        importlib.import_module(module_name)
        print(f"✅ {package_name or module_name} - OK")
        return True
    except ImportError as e:
        print(f"❌ {package_name or module_name} - FALTA")
        print(f"   Error: {e}")
        return False

def main():
    print("🔍 Verificando dependencias de Python para embeddings...")
    print("=" * 50)
    
    dependencies = [
        ("sentence_transformers", "sentence-transformers"),
        ("pymupdf4llm", "pymupdf4llm"),
        ("langchain_text_splitters", "langchain-text-splitters"),
        ("requests", "requests"),
        ("torch", "torch"),
        ("transformers", "transformers"),
        ("tiktoken", "tiktoken"),
    ]
    
    all_ok = True
    
    for module_name, package_name in dependencies:
        if not check_module(module_name, package_name):
            all_ok = False
    
    print("=" * 50)
    
    if all_ok:
        print("🎉 ¡Todas las dependencias están instaladas correctamente!")
        
        # Probar importación del modelo
        try:
            from sentence_transformers import SentenceTransformer
            print("🧠 Probando carga del modelo de embeddings...")
            model = SentenceTransformer("multi-qa-mpnet-base-dot-v1")
            print("✅ Modelo cargado correctamente")
        except Exception as e:
            print(f"⚠️ Error cargando modelo: {e}")
            
    else:
        print("❌ Faltan dependencias. Ejecuta el script de configuración:")
        print("   Windows: scripts/setup-python-env.bat")
        print("   Linux/Mac: bash scripts/setup-python-env.sh")
        sys.exit(1)

if __name__ == "__main__":
    main()
