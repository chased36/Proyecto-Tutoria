#!/usr/bin/env python3
"""
Script para limpiar y migrar el caché de transformers
"""

import os
import shutil
import sys
from pathlib import Path

def clear_transformers_cache():
    """Limpiar caché de transformers"""
    try:
        # Importar transformers para acceder a las utilidades de caché
        import transformers
        from transformers.utils import move_cache
        
        print("🧹 Limpiando caché de transformers...")
        
        # Obtener directorio de caché
        cache_dir = transformers.utils.TRANSFORMERS_CACHE
        print(f"Directorio de caché: {cache_dir}")
        
        # Migrar caché si es necesario
        print("🔄 Migrando caché...")
        move_cache()
        
        print("✅ Caché migrado exitosamente")
        
        # Crear directorio de caché local para el proyecto
        project_cache = os.path.join(os.path.dirname(__file__), "model_cache")
        os.makedirs(project_cache, exist_ok=True)
        print(f"📁 Directorio de caché del proyecto: {project_cache}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error limpiando caché: {e}")
        return False

def main():
    print("🚀 Configurando caché de transformers...")
    
    if clear_transformers_cache():
        print("🎉 Configuración completada")
    else:
        print("❌ Error en la configuración")
        sys.exit(1)

if __name__ == "__main__":
    main()
