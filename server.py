import json
import gzip
import os
import re
import socket
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data.json"
CEDICT_PATH = ROOT / "cedict_1_0_ts_utf-8_mdbg.txt.gz"
PORT = int(os.environ.get("PORT", "4173"))
DB_LOCK = threading.Lock()
CEDICT_LOCK = threading.Lock()
CEDICT_INDEX = None

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


def load_cedict():
    global CEDICT_INDEX
    if CEDICT_INDEX is not None:
        return CEDICT_INDEX
    with CEDICT_LOCK:
        if CEDICT_INDEX is not None:
            return CEDICT_INDEX
        index = {}
        if CEDICT_PATH.exists():
            pattern = re.compile(r"^(\S+) (\S+) \[([^]]+)\] /(.*)/$")
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
        CEDICT_INDEX = index
        return CEDICT_INDEX


class HanziVaultHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path in ("/", "/index.html", "/api/db") or self.path.startswith("/api/dictionary"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/db":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(DATA_PATH.read_bytes())
            return
        if parsed.path == "/api/dictionary":
            query = normalize_pinyin(parse_qs(parsed.query).get("q", [""])[0])
            index = load_cedict()
            exact = list(index.get(query, [])) if query else []
            prefix = []
            if query:
                for key in sorted(index, key=lambda item: (len(item), item)):
                    if key != query and key.startswith(query):
                        prefix.extend(index[key])
                        if len(prefix) >= 200:
                            break
            payload = {
                "query": query,
                "exactCount": len(exact),
                "results": exact + prefix[:200],
                "source": "CC-CEDICT",
            }
            body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_PUT(self):
        if self.path != "/api/db":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 10_000_000:
                self.send_error(413, "Payload demasiado grande")
                return
            data = json.loads(self.rfile.read(length))
            if not all(isinstance(data.get(key), list) for key in ("words", "grammar", "categories")):
                self.send_error(400, "Base de datos no valida")
                return
            with DB_LOCK:
                fd, temp_path = tempfile.mkstemp(dir=ROOT, prefix="hanzivault-", suffix=".tmp")
                with os.fdopen(fd, "w", encoding="utf-8") as temp_file:
                    json.dump(data, temp_file, ensure_ascii=False, separators=(",", ":"))
                os.replace(temp_path, DATA_PATH)
            self.send_response(204)
            self.end_headers()
        except (ValueError, json.JSONDecodeError):
            self.send_error(400, "JSON no valido")


def local_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "IP-DE-ESTE-EQUIPO"
    finally:
        sock.close()


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), HanziVaultHandler)
    print(f"Hanzi Vault: http://localhost:{PORT}")
    print(f"Otro dispositivo: http://{local_ip()}:{PORT}")
    print("Pulsa Ctrl+C para cerrar.")
    server.serve_forever()
