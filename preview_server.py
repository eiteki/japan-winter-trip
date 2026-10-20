"""Local preview: python3 preview_server.py [port]."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def end_headers(self):
        if self.path.split('?', 1)[0].endswith(('.html', '.js', '.webmanifest')) or self.path.split('?', 1)[0] == '/':
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
    server = ThreadingHTTPServer(('127.0.0.1', port), PreviewHandler)
    print(f'Preview: http://localhost:{port}/index.html?view=map', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
