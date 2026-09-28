#!/usr/bin/env python3
"""Легенда поля — сервер комнат для мультиплеера.

Лобби: создать комнату, войти по коду, настроить игрока, «Готов».
Когда все готовы (минимум двое) или хост жмёт «Начать», комната получает общий сид мира.
Во время игры клиенты присылают прогресс после каждого сезона и короткие строки для ленты.

Только стандартная библиотека. Слушает 127.0.0.1:8095, наружу через nginx (/api/) и Caddy.
"""
import json
import os
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST, PORT = "127.0.0.1", int(os.environ.get("PORT", "8095"))
DATA = os.environ.get("DATA", "/var/lib/legenda-polya/rooms.json")
ORIGINS = {"https://l3thily.github.io", "https://legenda-polya.88-218-121-40.sslip.io"}
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
MAX_ROOMS, MAX_PLAYERS, MAX_BODY, MAX_FEED = 500, 8, 60_000, 120
ROOM_TTL = 30 * 24 * 3600
RUS_MODES = {"random", "off", "on"}

lock = threading.Lock()
rooms: dict = {}


def load():
    global rooms
    try:
        with open(DATA, encoding="utf-8") as f:
            rooms = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        rooms = {}


def persist():
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    tmp = DATA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(rooms, f, ensure_ascii=False)
    os.replace(tmp, DATA)


def cleanup(now):
    for code in [c for c, r in rooms.items() if now - r["updated"] > ROOM_TTL]:
        del rooms[code]


def new_code(n=5):
    while True:
        code = "".join(secrets.choice(ALPHABET) for _ in range(n))
        if code not in rooms:
            return code


def clip(value, n):
    return str(value or "").strip()[:n]


def clean_setup(s):
    s = s if isinstance(s, dict) else {}
    return {k: clip(s.get(k), 40) for k in ("nat", "nat2", "pos", "lg", "club", "num")}


def public(room):
    return {
        "code": room["code"], "status": room["status"], "seed": room.get("seed"), "rus": room["rus"],
        "host": room["host"], "started": room.get("started"),
        "players": [{**{k: p[k] for k in ("id", "name", "ready", "setup", "progress")},
                     "year": p.get("year"), "readyYear": p.get("readyYear")} for p in room["players"].values()],
        "feed": room["feed"][-60:],
        "awards": {y: a for y, a in sorted(room.get("awards", {}).items())[-3:]},
    }


def maybe_start(room, force=False):
    players = list(room["players"].values())
    if room["status"] != "lobby" or not players:
        return
    if force or (len(players) >= 2 and all(p["ready"] for p in players)):
        room["status"] = "started"
        room["seed"] = "ROOM-" + room["code"] + "-" + "".join(secrets.choice(ALPHABET) for _ in range(4))
        room["started"] = int(time.time())
        room["feed"].append({"t": int(time.time()), "pid": None, "text": "Мир создан. Карьеры начались!"})


def add_player(room, name):
    pid = secrets.token_hex(4)
    token = secrets.token_urlsafe(18)
    room["players"][pid] = {"id": pid, "name": clip(name, 24) or "Игрок", "token": token,
                            "ready": False, "setup": {}, "progress": None, "joined": int(time.time())}
    return pid, token


class Handler(BaseHTTPRequestHandler):
    server_version = "legenda/1"

    def log_message(self, fmt, *args):  # keep journal quiet: one line per request
        print("%s %s" % (self.command, self.path.split("?")[0]), flush=True)

    def cors(self):
        origin = self.headers.get("Origin")
        if origin in ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "600")

    def reply(self, code, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("слишком большой запрос")
        data = json.loads(self.rfile.read(n) or b"{}")
        if not isinstance(data, dict):
            raise ValueError("ожидался объект")
        return data

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        parts = [p for p in self.path.split("?")[0].split("/") if p]
        if parts == ["api", "health"]:
            return self.reply(200, {"ok": True, "rooms": len(rooms)})
        if len(parts) == 3 and parts[:2] == ["api", "rooms"]:
            with lock:
                room = rooms.get(parts[2].upper())
                if not room:
                    return self.reply(404, {"error": "Комната не найдена"})
                return self.reply(200, public(room))
        self.reply(404, {"error": "not found"})

    def do_POST(self):
        parts = [p for p in self.path.split("?")[0].split("/") if p]
        try:
            data = self.body()
        except (ValueError, json.JSONDecodeError) as e:
            return self.reply(400, {"error": str(e)})
        now = int(time.time())
        with lock:
            cleanup(now)
            if parts == ["api", "rooms"]:
                if len(rooms) >= MAX_ROOMS:
                    return self.reply(503, {"error": "Слишком много комнат, попробуйте позже"})
                code = new_code()
                room = {"code": code, "created": now, "updated": now, "status": "lobby", "seed": None,
                        "rus": data.get("rus") if data.get("rus") in RUS_MODES else "random",
                        "host": None, "players": {}, "feed": []}
                pid, token = add_player(room, data.get("name"))
                room["host"] = pid
                rooms[code] = room
                persist()
                return self.reply(200, {"code": code, "pid": pid, "token": token, "room": public(room)})
            if len(parts) != 4 or parts[:2] != ["api", "rooms"]:
                return self.reply(404, {"error": "not found"})
            room = rooms.get(parts[2].upper())
            if not room:
                return self.reply(404, {"error": "Комната не найдена"})
            action = parts[3]
            if action == "join":
                if room["status"] == "started" and any((p.get("progress") or {}).get("season") not in (None, "старт") for p in room["players"].values()):
                    return self.reply(409, {"error": "Игра уже идёт: войти можно только до первого сыгранного сезона"})
                if len(room["players"]) >= MAX_PLAYERS:
                    return self.reply(409, {"error": "В комнате уже 8 игроков"})
                pid, token = add_player(room, data.get("name"))
                room["feed"].append({"t": now, "pid": pid, "text": f"{room['players'][pid]['name']} заходит в комнату"})
                room["updated"] = now
                persist()
                return self.reply(200, {"code": room["code"], "pid": pid, "token": token, "room": public(room)})
            me = room["players"].get(str(data.get("pid")))
            if not me or not secrets.compare_digest(me["token"], str(data.get("token", ""))):
                return self.reply(403, {"error": "Нет доступа к комнате"})
            if action == "update":
                if "name" in data:
                    me["name"] = clip(data["name"], 24) or me["name"]
                if "setup" in data:
                    me["setup"] = clean_setup(data["setup"])
                if "ready" in data:
                    me["ready"] = bool(data["ready"])
                if "rus" in data and me["id"] == room["host"] and data["rus"] in RUS_MODES and room["status"] == "lobby":
                    room["rus"] = data["rus"]
                maybe_start(room)
            elif action == "start":
                if me["id"] != room["host"]:
                    return self.reply(403, {"error": "Начать может только хост"})
                maybe_start(room, force=True)
            elif action == "progress":
                prog = data.get("progress")
                if isinstance(prog, dict) and len(json.dumps(prog)) < 4000:
                    me["progress"] = prog
                    if isinstance(prog.get("year"), int):
                        me["year"] = prog["year"]
                for line in (data.get("feed") or [])[:8]:
                    room["feed"].append({"t": now, "pid": me["id"], "text": f"{me['name']}: {clip(line, 200)}"})
                room["feed"] = room["feed"][-MAX_FEED:]
            elif action == "season":
                # "I want to play season <year>": clients start it once every active teammate is ready or ahead
                year = data.get("year")
                if not isinstance(year, int):
                    return self.reply(400, {"error": "нужен год сезона"})
                me["readyYear"] = year
                me["year"] = year
            elif action == "awards":
                # one jury per room: the first submitter's star list is canonical, every player adds own score
                year = data.get("year")
                sub = data.get("me")
                if not isinstance(year, int) or not isinstance(sub, dict):
                    return self.reply(400, {"error": "нужны год и результат"})
                aw = room.setdefault("awards", {}).setdefault(str(year), {"canon": None, "subs": {}})
                if aw["canon"] is None and isinstance(data.get("canon"), dict):
                    aw["canon"] = data["canon"]
                aw["subs"][me["id"]] = sub
                if len(room["awards"]) > 6:
                    for old in sorted(room["awards"])[:-6]:
                        del room["awards"][old]
            elif action == "leave":
                del room["players"][me["id"]]
                if not room["players"]:
                    del rooms[room["code"]]
                    persist()
                    return self.reply(200, {"ok": True})
                if room["host"] == me["id"]:
                    room["host"] = next(iter(room["players"]))
            else:
                return self.reply(404, {"error": "not found"})
            room["updated"] = now
            persist()
            return self.reply(200, public(room))


def main():
    load()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"legenda-polya api on {HOST}:{PORT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
