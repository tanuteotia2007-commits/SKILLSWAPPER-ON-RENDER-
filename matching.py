"""Semantic skill matching: embeddings + cosine similarity + multi-factor ranking.
Uses sentence-transformers (all-MiniLM-L6-v2) if USE_ST=1 and installed, else a built-in
hashed n-gram + synonym embedding (no downloads needed)."""
import os, re, math, hashlib
from functools import lru_cache

SYN = {"python": ["programming", "coding", "backend"], "backend": ["python", "programming", "server"],
       "development": ["programming", "coding"], "programming": ["coding", "development"],
       "ml": ["machine", "learning", "ai"], "machine": ["ml", "ai", "learning"], "deep": ["ml", "ai"],
       "data": ["analysis", "ml"], "ui": ["design", "ux", "interface"], "ux": ["design", "ui", "interface"],
       "figma": ["design", "ui", "ux"], "web": ["html", "css", "frontend"], "react": ["web", "frontend", "javascript"],
       "html": ["web", "frontend"], "css": ["web", "frontend"], "video": ["editing", "premiere"],
       "premiere": ["video", "editing"], "graphic": ["design", "canva"], "canva": ["design", "graphic"]}
_model = None


def _st():
    global _model
    if _model is None:
        _model = False
        if os.environ.get("USE_ST") == "1":
            try:
                from sentence_transformers import SentenceTransformer
                _model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception:
                _model = False
    return _model


def _h(tok, dim=512):
    return int(hashlib.md5(tok.encode()).hexdigest(), 16) % dim


@lru_cache(maxsize=4096)
def embed(text):
    m = _st()
    if m:
        return tuple(float(x) for x in m.encode(text, normalize_embeddings=True))
    v = [0.0] * 512
    words = re.findall(r"[a-z0-9]+", text.lower())
    for w in words:
        v[_h("w:" + w)] += 1.0
        for e in SYN.get(w, []): v[_h("w:" + e)] += 0.5
        p = f" {w} "
        for i in range(len(p) - 2): v[_h("c:" + p[i:i + 3])] += 0.3
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return tuple(x / n for x in v)


def cos(a, b):
    return sum(x * y for x, y in zip(a, b))


def directional(learn, teach):
    """How well `teach` covers everything in `learn`. Returns (0..1 score, pairs sorted best first)."""
    if not learn or not teach: return 0.0, []
    pairs = []
    for l in learn:
        best = max(teach, key=lambda t: cos(embed(l), embed(t)))
        pairs.append((l, best, cos(embed(l), embed(best))))
    pairs.sort(key=lambda p: -p[2])
    raw = sum(p[2] for p in pairs) / len(pairs)
    return max(0.0, min(1.0, (raw - 0.1) / 0.6)), pairs


def compare(me, other):
    a, ap = directional(me["learn"], other["teach"])   # what they teach me
    b, bp = directional(other["learn"], me["teach"])   # what I teach them
    mutual = (a + b) / 2
    level = 1 - abs(me["level"] - other["level"]) * 0.25
    common = sorted(set(me["slots"]) & set(other["slots"]))
    avail = min(1.0, len(common) / max(1, min(len(me["slots"]), len(other["slots"]))))
    score = min(1.0, 0.6 * mutual + 0.2 * level + 0.2 * avail + 0.05 * other["trust"] / 100)
    why = []
    if ap: why.append(f"They can teach {ap[0][1]}, which you want to learn ({ap[0][0]}).")
    if bp: why.append(f"You can teach {bp[0][1]}, which they want ({bp[0][0]}).")
    return {"score": round(score, 3), "mutual": round(mutual, 3), "level": round(level, 3), "availability": round(avail, 3),
            "common_slots": common, "why": " ".join(why), "learn_from": ap[0][1] if ap else None,
            "teach_to": bp[0][1] if bp else None}


def rank(me, others):
    out = []
    for o in others:
        r = compare(me, o)
        r["user"] = {k: o[k] for k in ("id", "name", "level", "teach", "learn", "slots", "trust")}
        out.append(r)
    return sorted(out, key=lambda r: -r["score"])
