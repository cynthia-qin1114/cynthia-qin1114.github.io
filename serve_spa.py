#!/usr/bin/env python3
"""极简 SPA 静态服务器：支持 history 路由回退到 index.html，无 host 校验，配合 cloudflared 隧道。"""
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5180


class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def end_headers(self):
        # 允许跨域 & 禁用缓存，方便调试
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        # 请求的物理路径
        rel = self.path.split("?", 1)[0].lstrip("/")
        full = os.path.join(DIST, rel)
        # 若不是已存在的静态文件，且不带扩展名（即前端路由），回退到 index.html
        if rel and not os.path.isfile(full) and "." not in os.path.basename(rel):
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, fmt, *args):
        pass  # 静默日志


if __name__ == "__main__":
    httpd = HTTPServer(("0.0.0.0", PORT), SPAHandler)
    print(f"SPA server serving {DIST} on 0.0.0.0:{PORT}")
    httpd.serve_forever()
