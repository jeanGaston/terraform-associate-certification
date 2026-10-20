#!/usr/bin/env python3
"""Local lab server for the training website: do the labs (TP) in your browser.

Serves site/ and gives each lab a real shell (PTY) plus a file editor, running in a
sandbox copy of the lab under .lab-workspace/<lesson>/ so the course files stay pristine.

    python3 scripts/lab-server.py            # then open http://localhost:8000
    python3 scripts/lab-server.py --port 9000

Stdlib only. Needs Linux, macOS or WSL (uses pty), or run it in Docker (see compose.yaml).
Listens on 127.0.0.1 by default, rejects non-localhost Host headers, and every API call
needs a per-run token, so other websites can't drive your shell.
"""
import argparse
import codecs
import fcntl
import json
import mimetypes
import os
import pty
import re
import secrets
import shutil
import signal
import struct
import subprocess
import sys
import termios
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
WORKSPACE = ROOT / ".lab-workspace"
TOKEN = secrets.token_urlsafe(24)
EPOCH_FILE = WORKSPACE / ".progress-epoch"  # bumped by --reset; browsers then clear their saved progress
MAX_TERMS = 12
SCROLLBACK = 256 * 1024
MAX_FILE = 1024 * 1024
SKIP_DIRS = {".terraform"}


def lab_ids():
    return sorted(p.parent.name for p in (ROOT / "lessons").glob("*/lab") if p.is_dir())


def workspace(lab, create=True):
    if lab not in lab_ids():
        raise KeyError(lab)
    ws = WORKSPACE / lab
    if create and not ws.exists():
        shutil.copytree(
            ROOT / "lessons" / lab / "lab", ws,
            ignore=shutil.ignore_patterns(".terraform", ".terraform.lock.hcl", "*.tfstate*", "output", "*.log"),
        )
    return ws


def safe_path(ws, rel):
    p = (ws / rel).resolve()
    if p != ws.resolve() and ws.resolve() not in p.parents:
        raise PermissionError(rel)
    return p


# ---------------------------------------------------------------- lab checks
CHECK_RE = re.compile(r"^```check\n(.*?)^```$", re.M | re.S)
CHECK_TIMEOUT = 120


def lab_check(lab, check_id):
    """The `run` command of a ```check block, read from the ORIGINAL lab guide (never from the
    sandbox copy or the request), so only commands that ship with the course can be executed."""
    workspace(lab, create=False)  # validates the lab id
    guide = (ROOT / "lessons" / lab / "lab" / "LAB.md").read_text(encoding="utf-8")
    for body in CHECK_RE.findall(guide):
        fields = dict(line.split(":", 1) for line in body.splitlines() if ":" in line)
        fields = {k.strip().lower(): v.strip() for k, v in fields.items()}
        if fields.get("id") == check_id and fields.get("run"):
            return fields["run"]
    raise KeyError(check_id)


def run_check(lab, check_id):
    cmd = lab_check(lab, check_id)
    env = dict(os.environ, TF_IN_AUTOMATION="1", TF_INPUT="0", NO_COLOR="1")
    try:
        r = subprocess.run(["bash", "-c", cmd], cwd=workspace(lab), env=env, capture_output=True,
                           text=True, timeout=CHECK_TIMEOUT, stdin=subprocess.DEVNULL)
        output = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout + r.stderr)  # Terraform ignores NO_COLOR
        return {"ok": r.returncode == 0, "output": output[-2000:]}
    except subprocess.TimeoutExpired:
        return {"ok": False, "output": f"check timed out after {CHECK_TIMEOUT}s"}


# ---------------------------------------------------------------- terminals
class Terminal:
    def __init__(self, tid, lab, cwd):
        self.id, self.lab, self.created = tid, lab, time.time()
        self.buf, self.offset = bytearray(), 0  # offset = bytes dropped from the front
        self.cond = threading.Condition()
        self.alive = True
        env = dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor", LAB=lab,
                   PS1=f"\\[\\e[1;35m\\]lab {lab[:2]}\\[\\e[0m\\] \\[\\e[36m\\]\\W\\[\\e[0m\\] $ ",
                   HISTFILE=str(cwd.parent / f".history-{lab}"))
        env.pop("PROMPT_COMMAND", None)
        pid, fd = pty.fork()
        if pid == 0:  # child
            try:
                os.chdir(cwd)
                os.execvpe("bash", ["bash", "--noprofile", "--norc", "-i"], env)
            finally:
                os._exit(127)
        self.pid, self.fd = pid, fd
        threading.Thread(target=self._pump, daemon=True).start()

    def _pump(self):
        while True:
            try:
                data = os.read(self.fd, 65536)
            except OSError:
                data = b""
            with self.cond:
                if not data:
                    self.alive = False
                    self.cond.notify_all()
                    break
                self.buf += data
                if len(self.buf) > SCROLLBACK:
                    drop = len(self.buf) - SCROLLBACK
                    del self.buf[:drop]
                    self.offset += drop
                self.cond.notify_all()
        try:
            os.waitpid(self.pid, 0)
        except ChildProcessError:
            pass
        os.close(self.fd)

    def write(self, data: bytes):
        if self.alive:
            os.write(self.fd, data)

    def resize(self, cols, rows):
        if self.alive:
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

    def kill(self):
        if self.alive:
            try:
                os.killpg(os.getpgid(self.pid), signal.SIGHUP)
            except (ProcessLookupError, PermissionError):
                pass


TERMS: dict[str, Terminal] = {}
TERMS_LOCK = threading.Lock()


def terms_for(lab):
    with TERMS_LOCK:
        for tid in [t for t, term in TERMS.items() if not term.alive]:
            del TERMS[tid]
        return [t for t in TERMS.values() if t.lab == lab]


def reset_all():
    """Close every shell, delete all lab sandboxes and start a new progress epoch."""
    with TERMS_LOCK:
        for t in TERMS.values():
            t.kill()
    shutil.rmtree(WORKSPACE, ignore_errors=True)
    WORKSPACE.mkdir()
    EPOCH_FILE.write_text(str(int(time.time() * 1000)))


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "LabServer/1"

    def log_message(self, fmt, *args):  # quiet; errors still go to stderr via send_error
        pass

    # -- helpers
    def _host_ok(self):
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0]
        return host in ("localhost", "127.0.0.1", "[::1]")

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_FILE * 2:
            raise ValueError("body too large")
        return self.rfile.read(n)

    def _authorized(self, query):
        tok = self.headers.get("X-Lab-Token") or query.get("token", [""])[0]
        return secrets.compare_digest(tok, TOKEN)

    def _route(self, method):
        if not self._host_ok():  # blocks DNS-rebinding
            return self.send_error(403, "Bad Host header")
        url = urlparse(self.path)
        parts = [p for p in url.path.split("/") if p]
        query = parse_qs(url.query)
        if not parts or parts[0] != "api":
            return self._static(url.path) if method in ("GET", "HEAD") else self.send_error(405)
        if parts == ["api", "session"] and method == "GET":
            tf = shutil.which("terraform")
            version = None
            if tf:
                try:
                    version = subprocess.run([tf, "version"], capture_output=True, text=True, timeout=10).stdout.splitlines()[0]
                except Exception:  # noqa: BLE001
                    version = "terraform (version unknown)"
            epoch = EPOCH_FILE.read_text().strip() if EPOCH_FILE.exists() else None
            return self._json({"token": TOKEN, "terraform": version, "workspace": str(WORKSPACE.relative_to(ROOT)), "progressEpoch": epoch})
        if not self._authorized(query):
            return self.send_error(401, "Missing or bad token")
        try:
            return self._api(method, parts[1:], query)
        except KeyError as e:
            return self._json({"error": f"not found: {e}"}, 404)
        except PermissionError as e:
            return self._json({"error": f"path outside lab: {e}"}, 403)
        except (ValueError, json.JSONDecodeError) as e:
            return self._json({"error": str(e)}, 400)

    def _api(self, method, parts, query):
        # /api/labs/<lab>/...
        if parts[0] == "labs" and len(parts) >= 3:
            lab, action = parts[1], parts[2]
            ws = workspace(lab)
            if action == "files" and method == "GET":
                files = []
                for p in sorted(ws.rglob("*")):
                    rel = p.relative_to(ws)
                    if any(part in SKIP_DIRS for part in rel.parts) or not p.is_file():
                        continue
                    files.append({"path": rel.as_posix(), "size": p.stat().st_size, "mtime": p.stat().st_mtime})
                return self._json({"files": files, "dir": str(ws.relative_to(ROOT))})
            if action == "file":
                path = safe_path(ws, query.get("path", [""])[0])
                if method == "GET":
                    if not path.is_file():
                        raise KeyError(path.name)
                    if path.stat().st_size > MAX_FILE:
                        raise ValueError("file too large to edit here")
                    return self._json({"content": path.read_text(encoding="utf-8", errors="replace"), "mtime": path.stat().st_mtime})
                if method == "PUT":
                    data = json.loads(self._body())
                    if path.exists() and data.get("mtime") is not None and not data.get("force") \
                            and abs(path.stat().st_mtime - data["mtime"]) > 1e-6:
                        return self._json({"error": "changed on disk", "mtime": path.stat().st_mtime}, 409)
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_text(data["content"], encoding="utf-8")
                    return self._json({"ok": True, "mtime": path.stat().st_mtime})
                if method == "DELETE":
                    path.unlink()
                    return self._json({"ok": True})
            if action == "checks" and len(parts) == 4 and method == "POST":
                return self._json(run_check(lab, parts[3]))
            if action == "reset" and method == "POST":
                for t in terms_for(lab):
                    t.kill()
                shutil.rmtree(ws, ignore_errors=True)
                workspace(lab)
                return self._json({"ok": True})
            if action == "terms" and method == "GET":
                return self._json({"terms": [{"id": t.id, "created": t.created} for t in sorted(terms_for(lab), key=lambda t: t.created)]})
            if action == "terms" and method == "POST":
                with TERMS_LOCK:
                    if sum(t.alive for t in TERMS.values()) >= MAX_TERMS:
                        raise ValueError(f"too many terminals open (max {MAX_TERMS}); close some first")
                    tid = secrets.token_hex(6)
                    TERMS[tid] = Terminal(tid, lab, ws)
                return self._json({"id": tid})
        if parts == ["reset-all"] and method == "POST":
            reset_all()
            return self._json({"ok": True, "progressEpoch": EPOCH_FILE.read_text().strip()})
        # /api/terms/<id>/...
        if parts[0] == "terms" and len(parts) == 3:
            term = TERMS.get(parts[1])
            if not term:
                raise KeyError(parts[1])
            action = parts[2]
            if action == "stream" and method == "GET":
                # EventSource sends Last-Event-ID on auto-reconnect: resume instead of replaying
                pos = self.headers.get("Last-Event-ID") or query.get("from", ["0"])[0]
                return self._stream(term, int(pos))
            if action == "input" and method == "POST":
                term.write(self._body())
                return self._json({"ok": True})
            if action == "resize" and method == "POST":
                d = json.loads(self._body())
                term.resize(max(10, int(d["cols"])), max(4, int(d["rows"])))
                return self._json({"ok": True})
            if action == "kill" and method == "POST":
                term.kill()
                return self._json({"ok": True})
        raise KeyError("/".join(parts))

    def _stream(self, term, pos):
        """Server-sent events: replays scrollback from `pos`, then follows live output."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        decoder = codecs.getincrementaldecoder("utf-8")("replace")
        try:
            while True:
                with term.cond:
                    end = term.offset + len(term.buf)
                    if pos >= end and term.alive:
                        term.cond.wait(timeout=15)
                        end = term.offset + len(term.buf)
                    start = max(pos, term.offset)
                    chunk = bytes(term.buf[start - term.offset:])
                    alive = term.alive
                if chunk:
                    pos = end
                    text = decoder.decode(chunk)
                    self.wfile.write(f"id: {pos}\ndata: {json.dumps(text)}\n\n".encode())
                elif alive:
                    self.wfile.write(b": keep-alive\n\n")
                if not alive and pos >= end:
                    self.wfile.write(b"event: exit\ndata: {}\n\n")
                    self.wfile.flush()
                    return
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            return

    def _static(self, path):
        rel = path.lstrip("/") or "index.html"
        try:
            f = safe_path(SITE, rel)
        except PermissionError:
            return self.send_error(403)
        if f.is_dir():
            f = f / "index.html"
        if not f.is_file():
            return self.send_error(404)
        body = f.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(f.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_GET(self): self._route("GET")
    def do_HEAD(self): self._route("HEAD")
    def do_POST(self): self._route("POST")
    def do_PUT(self): self._route("PUT")
    def do_DELETE(self): self._route("DELETE")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default="127.0.0.1",
                    help="interface to listen on (default 127.0.0.1; the container uses 0.0.0.0 behind a localhost-only port mapping)")
    ap.add_argument("--no-build", action="store_true", help="skip regenerating site/content.js")
    ap.add_argument("--reset", action="store_true",
                    help="start over: delete all lab sandboxes and clear saved progress in browsers that open the site")
    args = ap.parse_args()
    if not args.no_build:
        subprocess.run([sys.executable, str(ROOT / "scripts" / "build-site.py")], check=True)
    WORKSPACE.mkdir(exist_ok=True)
    # Terraform warns on every command if the configured provider cache directory is missing.
    if cache := os.environ.get("TF_PLUGIN_CACHE_DIR"):
        Path(cache).mkdir(parents=True, exist_ok=True)
    if args.reset:
        reset_all()
        print("  All lab sandboxes deleted; saved progress will be cleared in your browser on next visit.")
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    srv.daemon_threads = True
    tf = shutil.which("terraform")
    print(f"\n  Lab server running:  http://localhost:{args.port}")
    print(f"  Lab sandboxes:       {WORKSPACE.relative_to(ROOT)}/<lesson>  (use 'Reset lab' in the site to start over)")
    print(f"  Terraform:           {tf or 'NOT FOUND on PATH - install it: https://developer.hashicorp.com/terraform/install'}")
    print("  Stop with Ctrl+C\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        for t in list(TERMS.values()):
            t.kill()
        srv.server_close()


if __name__ == "__main__":
    main()
