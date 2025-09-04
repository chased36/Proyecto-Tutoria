#!/usr/bin/env python3
import json
import os
import sys
import tempfile
import requests
from pathlib import Path
import traceback
import re
import gc
import signal
import time

MODEL_NAME = "sentence-transformers/multi-qa-mpnet-base-dot-v1"

# 🔑 NUEVO: Cache configurable por variable de entorno
MODEL_CACHE_DIR = os.getenv(
    "MODEL_CACHE_DIR",  # variable de entorno
    os.path.join(os.path.dirname(__file__), "model_cache")  # valor por defecto
)

EMBEDDING_BATCH_SIZE = 4

_embedding_model = None
_pymupdf4llm = None

# ------------------ Señales ------------------
def signal_handler(signum, frame):
    print(f"Recibida señal {signum}, terminando limpiamente...", file=sys.stderr)
    cleanup_model()
    sys.exit(1)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# ------------------ Modelo ------------------
def download_model():
    """Descargar modelo solo si no existe en caché"""
    try:
        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
        
        if not os.listdir(MODEL_CACHE_DIR):
            print(f"⏳ Descargando modelo en {MODEL_CACHE_DIR}...", file=sys.stderr)
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer(
                MODEL_NAME,
                cache_folder=MODEL_CACHE_DIR,
                device='cpu',
                trust_remote_code=False
            )
            del model
            gc.collect()
            print("✅ Modelo descargado y cacheado", file=sys.stderr)
    except Exception as e:
        print(f"❌ Error descargando modelo: {traceback.format_exc()}", file=sys.stderr)
        raise

def initialize_models():
    """Inicializar modelos con manejo de errores y singleton pattern"""
    global _embedding_model, _pymupdf4llm
    
    try:
        if _embedding_model is not None and _pymupdf4llm is not None:
            return _pymupdf4llm, _embedding_model
        
        print("Inicializando modelos...", file=sys.stderr)
        
        # Descargar si es necesario
        download_model()

        import pymupdf4llm
        from sentence_transformers import SentenceTransformer
        import torch

        torch.set_num_threads(1)  # limitar hilos

        _pymupdf4llm = pymupdf4llm
        _embedding_model = SentenceTransformer(
            MODEL_CACHE_DIR,
            device='cpu',
            trust_remote_code=False
        )

        print("✅ Modelo cargado desde caché", file=sys.stderr)
        return _pymupdf4llm, _embedding_model
        
    except Exception as e:
        print(f"❌ Error inicializando modelos: {e}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        cleanup_model()
        return None, None

def cleanup_model():
    """Liberar memoria del modelo"""
    global _embedding_model
    if _embedding_model is not None:
        del _embedding_model
        _embedding_model = None
    gc.collect()
