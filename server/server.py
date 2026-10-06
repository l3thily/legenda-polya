#!/usr/bin/env python3
"""Легенда поля — сервер комнат для мультиплеера.

Лобби: создать комнату, войти по коду, настроить игрока, «Готов».
Когда все готовы (минимум двое) или хост жмёт «Начать», комната получает общий сид мира.
Во время игры клиенты присылают прогресс после каждого сезона и короткие строки для ленты.

Только стандартная библиотека. Слушает 127.0.0.1:8095, наружу через nginx (/api/) и Caddy.
"""
import json
import re
import os
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST, PORT = "127.0.0.1", int(os.environ.get("PORT", "8095"))
DATA = os.environ.get("DATA", "/var/lib/legenda-polya/rooms.json")
ORIGINS = {"https://legendapolya.com", "https://l3thily.github.io", "https://legenda-polya.88-218-121-40.sslip.io"}
# Yandex Games serves the build from its own CDN domains
YG_ORIGIN = re.compile(r"^https://([a-z0-9-]+\.)*(games\.s3\.yandex\.net|yandex\.(ru|com|by|kz|uz|com\.tr)|playhop\.com)$")
ORIGINS |= set(filter(None, os.environ.get("EXTRA_ORIGINS", "").split(",")))  # local testing
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
MAX_ROOMS, MAX_PLAYERS, MAX_BODY, MAX_FEED, MAX_CHAT = 500, 8, 120_000, 120, 80
# inactive rooms are removed: lobby nobody started, finished games, abandoned games
LOBBY_TTL = 12 * 3600
DONE_TTL = 2 * 24 * 3600
ROOM_TTL = 14 * 24 * 3600
CLEAN_EVERY = 30 * 60
RUS_MODES = {"random", "off", "on"}

lock = threading.Lock()
STATS_FILE = os.path.join(os.path.dirname(DATA), "stats.json")
stats: dict = {}  # day (Moscow) -> counters; nothing about people: no IP, no ids
online: dict = {}  # throwaway tab token -> last ping time, memory only, forgotten after ONLINE_TTL
ONLINE_TTL = 150
STATS_KEY = os.environ.get("STATS_KEY", "")
TG_TOKEN, TG_CHAT = os.environ.get("TG_TOKEN", ""), os.environ.get("TG_CHAT", "")
SCORES_FILE = os.path.join(os.path.dirname(DATA), "scores.json")
scores: dict = {}  # board -> [entries], best first: global hall of fame, daily challenge, scenarios
changed = threading.Condition(lock)  # long-poll: GET ?v=<version>&wait=<s> returns as soon as the room changes
rooms: dict = {}


def load():
    global rooms
    try:
        with open(DATA, encoding="utf-8") as f:
            rooms = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        rooms = {}


def load_scores():
    global scores
    try:
        with open(SCORES_FILE, encoding="utf-8") as f:
            scores = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        scores = {}


def persist_scores():
    os.makedirs(os.path.dirname(SCORES_FILE), exist_ok=True)
    tmp = SCORES_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(scores, f, ensure_ascii=False)
    os.replace(tmp, SCORES_FILE)


def msk_day(t=None):
    return time.strftime("%Y-%m-%d", time.gmtime((t or time.time()) + 3 * 3600))


def load_stats():
    global stats
    try:
        with open(STATS_FILE, encoding="utf-8") as f:
            stats = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        stats = {}


def persist_stats():
    tmp = STATS_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(stats, f)
    os.replace(tmp, STATS_FILE)


def online_now(now):
    for k in [k for k, t in online.items() if now - t > ONLINE_TTL]:
        del online[k]
    return len(online)


def day_stats(day):
    return stats.setdefault(day, {"visitors": 0, "visits": 0, "careers": 0, "seasons": 0, "rooms": 0, "en": 0, "peak": 0})


def stats_text(days=7):
    keys = sorted(stats)[-days:]
    if not keys:
        return "Легенда поля: статистики пока нет."
    now = int(time.time())
    lines = [f"⚽ Легенда поля · онлайн сейчас: {online_now(now)}", ""]
    for d in reversed(keys):
        x = stats[d]
        lines.append(f"{d[8:10]}.{d[5:7]}: {x['visitors']} уникальных · {x['visits']} визитов · пик онлайн {x['peak']} · "
                     f"{x['careers']} карьер · {x['seasons']} сезонов · {x['rooms']} в комнатах · EN {x['en']}")
    week = [stats[d] for d in keys]
    lines += ["", f"За {len(week)} дн.: {sum(x['visitors'] for x in week)} уникальных за день (сумма), {sum(x['visits'] for x in week)} визитов"]
    return "\n".join(lines)


def tg_send(text):
    if not TG_TOKEN or not TG_CHAT:
        return False
    import urllib.request
    body = json.dumps({"chat_id": TG_CHAT, "text": text, "disable_web_page_preview": True}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage", data=body, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=20).read()
        return True
    except Exception as e:  # noqa: BLE001 — report failures in the journal, never crash the server
        print("telegram: " + str(e)[:200], flush=True)
        return False


def reporter():
    # every day at 09:00 Moscow time: yesterday and the week before
    sent = None
    while True:
        time.sleep(60)
        now = time.time()
        msk = time.gmtime(now + 3 * 3600)
        today = msk_day(now)
        if msk.tm_hour == 9 and sent != today:
            with lock:
                text = stats_text(8)
            if tg_send(text):
                sent = today


def board_ok(b):
    if b == "all" or (b.startswith("sc-") and 3 < len(b) <= 24 and b[3:].isalnum()):
        return True
    if b.startswith("day-") and len(b) == 12 and b[4:].isdigit():
        today = time.strftime("%Y%m%d", time.gmtime())
        yday = time.strftime("%Y%m%d", time.gmtime(time.time() - 86400))
        tmrw = time.strftime("%Y%m%d", time.gmtime(time.time() + 86400))
        return b[4:] in (today, yday, tmrw)
    return False


def num(v, lo, hi):
    try:
        return max(lo, min(hi, float(v)))
    except (TypeError, ValueError):
        return lo


def persist():
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    tmp = DATA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(rooms, f, ensure_ascii=False)
    os.replace(tmp, DATA)


def room_ttl(room):
    players = list(room["players"].values())
    if not players:
        return 0
    if room["status"] == "lobby":
        return LOBBY_TTL
    if all((p.get("progress") or {}).get("retired") for p in players):
        return DONE_TTL
    return ROOM_TTL


def cleanup(now):
    dead = [c for c, r in rooms.items() if not r["players"] or now - r["updated"] > room_ttl(r)]
    for code in dead:
        del rooms[code]
    return dead


def janitor():
    while True:
        time.sleep(CLEAN_EVERY)
        with lock:
            dead = cleanup(int(time.time()))
            if dead:
                persist()
                print("cleanup: " + " ".join(dead), flush=True)


def bump(room):
    room["v"] = room.get("v", 0) + 1
    changed.notify_all()


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


# room achievements: the first player whose feed line matches wins it for the whole room
FIRSTS = [
    ("trophy", "трофей: "),
    ("ucl", "трофей: Лига чемпионов"),
    ("wc", "трофей: Чемпионат мира"),
    ("bdo", "награда: Золотой мяч"),
    ("boot", "награда: Золотая бутса"),
    ("record", "рекорд: "),
    ("move", "Переход в "),
]


def note_firsts(room, me, line, now):
    firsts = room.setdefault("firsts", {})
    for key, prefix in FIRSTS:
        if key in firsts or not line.startswith(prefix):
            continue
        firsts[key] = {"pid": me["id"], "name": me["name"], "t": now, "text": clip(line, 120)}


def public(room):
    return {
        "code": room["code"], "v": room.get("v", 0), "status": room["status"], "seed": room.get("seed"), "rus": room["rus"],
        "host": room["host"], "started": room.get("started"),
        "players": [{**{k: p[k] for k in ("id", "name", "ready", "setup", "progress")},
                     "year": p.get("year"), "readyYear": p.get("readyYear")} for p in room["players"].values()],
        "feed": room["feed"][-60:],
        "chat": room.get("chat", [])[-50:],
        "firsts": room.get("firsts", {}),
        "public": bool(room.get("public")),
        "awards": {y: a for y, a in sorted(room.get("awards", {}).items())[-3:]},
        "matches": dict(list(room.get("matches", {}).items())[-150:]),
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
        if origin in ORIGINS or (origin and YG_ORIGIN.match(origin)):
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
        if parts == ["api", "online"]:
            with lock:
                return self.reply(200, {"online": online_now(int(time.time()))})
        if parts == ["api", "stats"]:
            q = dict(kv.split("=", 1) for kv in (self.path.split("?", 1)[1] if "?" in self.path else "").split("&") if "=" in kv)
            if not STATS_KEY or not secrets.compare_digest(q.get("key", ""), STATS_KEY):
                return self.reply(403, {"error": "forbidden"})
            with lock:
                return self.reply(200, {"text": stats_text(int(q.get("days", "7") or 7)), "days": dict(sorted(stats.items())[-30:]), "online": online_now(int(time.time()))})
        if parts == ["api", "scores"]:
            q = dict(kv.split("=", 1) for kv in (self.path.split("?", 1)[1] if "?" in self.path else "").split("&") if "=" in kv)
            b = q.get("board", "all")
            with lock:
                return self.reply(200, {"board": b, "scores": scores.get(b, [])[:20]})
        if parts == ["api", "rooms"]:
            # open lobbies anyone can join: newest first
            with lock:
                lst = [{"code": r["code"], "host": (r["players"].get(r["host"]) or {}).get("name", ""),
                        "players": len(r["players"]), "rus": r["rus"], "updated": r["updated"]}
                       for r in rooms.values()
                       if r.get("public") and r["status"] == "lobby" and 0 < len(r["players"]) < MAX_PLAYERS]
            lst.sort(key=lambda x: -x["updated"])
            return self.reply(200, {"rooms": lst[:20]})
        if len(parts) == 3 and parts[:2] == ["api", "rooms"]:
            q = dict(kv.split("=", 1) for kv in (self.path.split("?", 1)[1] if "?" in self.path else "").split("&") if "=" in kv)
            try:
                since, wait = int(q.get("v", "-1")), min(max(float(q.get("wait", "0")), 0), 25)
            except ValueError:
                since, wait = -1, 0
            code = parts[2].upper()
            with lock:
                deadline = time.time() + wait
                while True:
                    room = rooms.get(code)
                    if not room:
                        return self.reply(404, {"error": "Комната не найдена"})
                    left = deadline - time.time()
                    if room.get("v", 0) != since or left <= 0:
                        return self.reply(200, public(room))
                    changed.wait(left)
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
            if parts == ["api", "ping"]:
                # anonymous counters: a browser says "first visit today" itself; the tab token only keeps the online count
                tab = clip(data.get("tab"), 32)
                d = day_stats(msk_day(now))
                if tab:
                    if tab not in online:
                        d["visits"] += 1
                    online[tab] = now
                if data.get("new"):
                    d["visitors"] += 1
                    if data.get("lang") == "en":
                        d["en"] += 1
                ev = data.get("ev")
                if ev in ("careers", "seasons", "rooms"):
                    d[ev] += 1
                d["peak"] = max(d["peak"], online_now(now))
                for old in sorted(stats)[:-120]:
                    del stats[old]
                persist_stats()
                return self.reply(200, {"online": len(online)})
            if parts == ["api", "scores"]:
                board, sid = clip(data.get("board"), 24), clip(data.get("id"), 24)
                if not board_ok(board) or not sid:
                    return self.reply(400, {"error": "неверная таблица"})
                e = {"id": sid, "nick": clip(data.get("nick"), 24) or "Игрок", "score": round(num(data.get("score"), 0, 3000), 1),
                     "tier": clip(data.get("tier"), 40), "pos": clip(data.get("pos"), 6), "tro": int(num(data.get("tro"), 0, 500)),
                     "bdo": int(num(data.get("bdo"), 0, 50)), "goal": bool(data.get("goal")), "hard": bool(data.get("hard")), "t": now}
                lst = [x for x in scores.get(board, []) if x["id"] != sid] + [e]
                lst.sort(key=lambda x: -x["score"])
                scores[board] = lst[:100]
                days = sorted(k for k in scores if k.startswith("day-"))
                for old in days[:-14]:
                    del scores[old]
                persist_scores()
                rank = next((i + 1 for i, x in enumerate(scores[board]) if x["id"] == sid), None)
                return self.reply(200, {"board": board, "rank": rank, "scores": scores[board][:20]})
            if parts == ["api", "rooms"]:
                if len(rooms) >= MAX_ROOMS:
                    return self.reply(503, {"error": "Слишком много комнат, попробуйте позже"})
                code = new_code()
                room = {"code": code, "created": now, "updated": now, "status": "lobby", "seed": None,
                        "rus": data.get("rus") if data.get("rus") in RUS_MODES else "random",
                        "host": None, "players": {}, "feed": [], "public": bool(data.get("public"))}
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
                bump(room)
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
                if "public" in data and me["id"] == room["host"]:
                    room["public"] = bool(data["public"])
                maybe_start(room)
            elif action == "chat":
                text = clip(data.get("text"), 200)
                if not text:
                    return self.reply(400, {"error": "пустое сообщение"})
                if now - me.get("lastChat", 0) < 1:
                    return self.reply(429, {"error": "Не так быстро"})
                me["lastChat"] = now
                chat = room.setdefault("chat", [])
                chat.append({"t": now, "pid": me["id"], "name": me["name"], "text": text})
                room["chat"] = chat[-MAX_CHAT:]
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
                    note_firsts(room, me, clip(line, 200), now)
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
            elif action == "match":
                # head-to-head barrier and canonical results of finals that involve room players
                key = clip(data.get("key"), 160)
                if not key:
                    return self.reply(400, {"error": "нужен ключ матча"})
                mt = room.setdefault("matches", {}).setdefault(key, {"ready": [], "res": None})
                if data.get("ready") and me["id"] not in mt["ready"]:
                    mt["ready"].append(me["id"])
                res = data.get("res")
                if isinstance(res, dict) and mt["res"] is None:
                    mt["res"] = {k: res.get(k) for k in ("ga", "gb", "et", "pens")}
                if len(room["matches"]) > 400:
                    for old in list(room["matches"])[:-300]:
                        del room["matches"][old]
            elif action == "world":
                # canonical world per room season: the first snapshot posted for a year wins, everyone continues from it
                year = data.get("year")
                snap = data.get("snap")
                if not isinstance(year, int) or not isinstance(snap, dict):
                    return self.reply(400, {"error": "нужны год и мир"})
                worlds = room.setdefault("worlds", {})
                if str(year) not in worlds:
                    worlds[str(year)] = snap
                    for old in sorted(worlds)[:-3]:
                        del worlds[old]
                    room["updated"] = now
                    bump(room)
                    persist()
                return self.reply(200, {"year": year, "snap": worlds[str(year)]})
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
            bump(room)
            persist()
            return self.reply(200, public(room))


def main():
    load()
    load_scores()
    load_stats()
    with lock:
        if cleanup(int(time.time())):
            persist()
    threading.Thread(target=janitor, daemon=True).start()
    threading.Thread(target=reporter, daemon=True).start()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"legenda-polya api on {HOST}:{PORT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
