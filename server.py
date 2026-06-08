import json
import os
import socket
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data.json"
PORT = int(os.environ.get("PORT", "4173"))
DB_LOCK = threading.Lock()


class HanziVaultHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path in ("/", "/hanzi-vault.html", "/api/db"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/api/db":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(DATA_PATH.read_bytes())
            return
        if self.path == "/":
            self.path = "/hanzi-vault.html"
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
