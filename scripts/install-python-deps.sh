#!/bin/bash

echo "🐍 Instalando dependencias de Python para embeddings..."

# Verificar si Python está instalado
if ! command -v python &> /dev/null; then
    echo "❌ Python no está instalado. Por favor, instala Python 3.8 o superior."
    exit 1
fi

# Crear entorno virtual si no existe
if [ ! -d "scripts/venv" ]; then
    echo "📦 Creando entorno virtual..."
    python -m venv scripts/venv
fi

# Activar entorno virtual
source scripts/venv/bin/activate

# Instalar dependencias
echo "📥 Instalando dependencias..."
pip install -r scripts/requirements.txt

echo "✅ Dependencias de Python instaladas correctamente"
echo "💡 Para usar los embeddings, asegúrate de que Python esté disponible en el PATH del servidor"
