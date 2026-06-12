#!/usr/bin/env python3
"""
Script para generar un índice JSON del diccionario CEDICT
para usarlo directamente en GitHub Pages sin necesidad de servidor.
"""

import json
import gzip
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CEDICT_PATH = ROOT / "cedict_1_0_ts_utf-8_mdbg.txt.gz"
OUTPUT_PATH = ROOT / "cedict-index.json"

TONE_MARKS = {
    "a": "āáǎà", "e": "ēéěè", "i": "īíǐì",
    "o": "ōóǒò", "u": "ūúǔù", "v": "ǖǘǚǜ",
}


def normalize_pinyin(value):
    value = value.lower().replace("u:", "v").replace("ü", "v")
    return re.sub(r"[^a-zv]", "", value)


def tone_mark_syllable(syllable):
    match = re.match(r"^(.+?)([1-5])$", syllable)
    if not match or match.group(2) == "5":
        return syllable.rstrip("12345").replace("v", "ü")
    base, tone = match.group(1).replace("u:", "v"), int(match.group(2)) - 1
    lower = base.lower()
    if "a" in lower:
        index = lower.index("a")
    elif "e" in lower:
        index = lower.index("e")
    elif "ou" in lower:
        index = lower.index("o")
    else:
        index = max((pos for pos, char in enumerate(lower) if char in "aeiouv"), default=-1)
    if index >= 0:
        marked = TONE_MARKS[lower[index]][tone]
        if base[index].isupper():
            marked = marked.upper()
        base = base[:index] + marked + base[index + 1:]
    return base.replace("v", "ü")


def display_pinyin(numbered):
    return " ".join(tone_mark_syllable(part) for part in numbered.split())


def build_index():
    print(f"Leyendo CEDICT desde: {CEDICT_PATH}")
    index = {}
    count = 0
    
    if not CEDICT_PATH.exists():
        print(f"ERROR: No se encontró {CEDICT_PATH}")
        return False
    
    pattern = re.compile(r"^(\S+) (\S+) \[([^]]+)\] /(.*)/$")
    
    try:
        with gzip.open(CEDICT_PATH, "rt", encoding="utf-8") as source:
            for line in source:
                if line.startswith("#"):
                    continue
                match = pattern.match(line.rstrip())
                if not match:
                    continue
                traditional, simplified, numbered, definitions = match.groups()
                key = normalize_pinyin(numbered)
                if not key:
                    continue
                meanings = [item for item in definitions.split("/") if item]
                entry = {
                    "zh": simplified,
                    "traditional": traditional if traditional != simplified else "",
                    "pinyin": display_pinyin(numbered),
                    "translation": "; ".join(meanings[:4]),
                    "source": "CC-CEDICT",
                }
                index.setdefault(key, []).append(entry)
                count += 1
                if count % 10000 == 0:
                    print(f"  Procesados: {count} entradas...")
        
        print(f"Total de entradas procesadas: {count}")
        print(f"Total de claves únicas: {len(index)}")
        
        # Guardar como JSON comprimido
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
        
        file_size = OUTPUT_PATH.stat().st_size / (1024 * 1024)
        print(f"Índice guardado en: {OUTPUT_PATH}")
        print(f"Tamaño del archivo: {file_size:.2f} MB")
        return True
    
    except Exception as e:
        print(f"ERROR: {e}")
        return False


if __name__ == "__main__":
    success = build_index()
    exit(0 if success else 1)
