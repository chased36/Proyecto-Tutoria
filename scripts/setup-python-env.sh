#!/bin/bash

echo "🐍 Configurando entorno Python para embeddings..."

# Verificar si Python está instalado
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ Python no está instalado. Por favor, instala Python 3.8 o superior."
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

echo "✅ Python encontrado"
$PYTHON_CMD --version

# Crear entorno virtual si no existe
if [ ! -d "scripts/venv" ]; then
    echo "📦 Creando entorno virtual..."
    $PYTHON_CMD -m venv scripts/venv
fi

# Activar entorno virtual
echo "🔄 Activando entorno virtual..."
source scripts/venv/bin/activate

# Actualizar pip
echo "📥 Actualizando pip..."
pip install --upgrade pip

# Instalar dependencias con versiones actualizadas y compatibles
echo "📦 Instalando PyTorch (CPU)..."
pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

echo "📦 Instalando transformers..."
pip install --no-cache-dir transformers

echo "📦 Instalando sentence-transformers..."
pip install --no-cache-dir sentence-transformers

echo "📦 Instalando pymupdf4llm..."
pip install --no-cache-dir pymupdf4llm

echo "📦 Instalando langchain-text-splitters..."
pip install --no-cache-dir langchain-text-splitters

echo "📦 Instalando tiktoken..."
pip install --no-cache-dir tiktoken

echo "📦 Instalando requests..."
pip install --no-cache-dir requests

echo 📦 Instalando psycopg2-binary...
pip install --no-cache-dir psycopg2-binary

# Limpiar caché de transformers
echo "🧹 Configurando caché de transformers..."
python scripts/clear_transformers_cache.py

# Crear directorio de caché del proyecto
mkdir -p scripts/model_cache

echo "✅ Dependencias instaladas correctamente"
echo "💡 Entorno configurado en: scripts/venv"
echo "📁 Caché de modelos en: scripts/model_cache"

# Mostrar versiones instaladas
echo ""
echo "📋 Versiones instaladas:"
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "import transformers; print(f'Transformers: {transformers.__version__}')"
python -c "import sentence_transformers; print(f'Sentence Transformers: {sentence_transformers.__version__}')"
python -c "import tiktoken; print(f'Tiktoken: {tiktoken.__version__}')"
