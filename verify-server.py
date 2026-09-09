import threading
import urllib.error
import urllib.request
import server

httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.HanziVaultHandler)
thread = threading.Thread(target=httpd.serve_forever, daemon=True)
thread.start()
try:
    for path in ['/supabase-access-token.txt', '/SUPABASE-ACCESS-TOKEN.TXT', '/.git/config']:
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{httpd.server_port}{path}')
            raise AssertionError('Credential route exposed')
        except urllib.error.HTTPError as error:
            assert error.code == 404
    print('PASS: credential paths inaccessible over HTTP')
finally:
    httpd.shutdown()
    httpd.server_close()
