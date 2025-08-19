#!/usr/bin/env python3
"""
Script para probar el procesamiento de JSON y argumentos
"""

import json
import sys
import tempfile
import os

def test_json_from_file():
    """Probar lectura de JSON desde archivo"""
    print("🧪 Probando lectura de JSON desde archivo...")
    
    # Datos de prueba
    test_data = [
        {
            "url": "https://example.com/test.pdf",
            "filename": "test.pdf",
            "id": "test-id-123"
        }
    ]
    
    # Crear archivo temporal
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(test_data, f, indent=2)
        temp_file = f.name
    
    try:
        # Leer archivo
        with open(temp_file, 'r', encoding='utf-8') as f:
            loaded_data = json.load(f)
        
        print(f"✅ JSON leído correctamente: {len(loaded_data)} elementos")
        print(f"   Primer elemento: {loaded_data[0]['filename']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error leyendo JSON: {e}")
        return False
        
    finally:
        # Limpiar archivo temporal
        if os.path.exists(temp_file):
            os.unlink(temp_file)

def main():
    print("🚀 Probando procesamiento de JSON...")
    print("=" * 50)
    
    if test_json_from_file():
        print("✅ Procesamiento de JSON funciona correctamente")
    else:
        print("❌ Error en procesamiento de JSON")
        sys.exit(1)

if __name__ == "__main__":
    main()
