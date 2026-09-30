from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
from pathlib import Path
import json
ROOT=Path('/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/release/android/launch-2026-09-13')
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory='/tmp/strength-save-play-demo-20260913/dist',**k)
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
 def do_GET(self):
  u=urlparse(self.path)
  if u.path=='/__demo/control':
   self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write((ROOT/'control.json').read_bytes());return
  if u.path=='/__demo/ready':
   data={k:v[0] for k,v in parse_qs(u.query).items()}
   (ROOT/('ready-'+data.get('device','unknown')+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2));self.send_response(200);self.end_headers();self.wfile.write(b'ok');return
  return super().do_GET()
print('Serving compiled native demo on 4193',flush=True)
ThreadingHTTPServer(('127.0.0.1',4193),Handler).serve_forever()
