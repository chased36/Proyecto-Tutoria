@echo off
echo 🐍 Configurando entorno Python para embeddings...

REM Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python no está instalado. Por favor, instala Python 3.8 o superior.
    echo 💡 Descarga Python desde: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python encontrado
python --version

REM Crear directorio para entorno virtual si no existe
if not exist "scripts\venv" (
    echo 📦 Creando entorno virtual...
    python -m venv scripts\venv
)

REM Activar entorno virtual
echo 🔄 Activando entorno virtual...
call scripts\venv\Scripts\activate.bat

REM Actualizar pip
echo 📥 Actualizando pip...
python -m pip install --upgrade pip

REM Instalar dependencias con versiones actualizadas y compatibles
echo 📦 Instalando PyTorch (CPU)...
pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

echo 📦 Instalando transformers...
pip install --no-cache-dir transformers

echo 📦 Instalando sentence-transformers...
pip install --no-cache-dir sentence-transformers

echo 📦 Instalando pymupdf4llm...
pip install --no-cache-dir pymupdf4llm

echo 📦 Instalando langchain-text-splitters...
pip install --no-cache-dir langchain-text-splitters

echo 📦 Instalando tiktoken...
pip install --no-cache-dir tiktoken

echo 📦 Instalando requests...
pip install --no-cache-dir requests

echo 📦 Instalando psycopg2-binary...
pip install --no-cache-dir psycopg2-binary

REM Limpiar caché de transformers
echo 🧹 Configurando caché de transformers...
python scripts\clear_transformers_cache.py

REM Crear directorio de caché del proyecto
if not exist "scripts\model_cache" (
    mkdir scripts\model_cache
)

echo ✅ Dependencias instaladas correctamente
echo 💡 Entorno configurado en: scripts\venv
echo 📁 Caché de modelos en: scripts\model_cache

REM Mostrar versiones instaladas
echo.
echo 📋 Versiones instaladas:
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "import transformers; print(f'Transformers: {transformers.__version__}')"
python -c "import sentence_transformers; print(f'Sentence Transformers: {sentence_transformers.__version__}')"
python -c "import tiktoken; print(f'Tiktoken: {tiktoken.__version__}')"

pause
