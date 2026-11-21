"""21/11/2026 (quota Supabase « Egress » : 3,3 Go sur 5 en 10 jours) : les scripts de pages lisaient toutes les annonces
sans compression, toutes les 30 min (≈ 10 Mo par passage). Ce module demande les réponses compressées (gzip) à toutes
les lectures urllib des scripts, et les décompresse de façon transparente. Si le serveur ne compresse pas, rien ne change."""
import gzip
import io
import urllib.request

_orig_urlopen = urllib.request.urlopen


class _Resp(io.BytesIO):
    def __init__(self, data, resp):
        super().__init__(data)
        self.headers = resp.headers
        self.status = getattr(resp, "status", 200)

    def getcode(self):
        return self.status


def _urlopen(req, *args, **kwargs):
    if isinstance(req, str):
        req = urllib.request.Request(req)
    if not req.has_header("Accept-encoding"):
        req.add_header("Accept-Encoding", "gzip")
    resp = _orig_urlopen(req, *args, **kwargs)
    if (resp.headers.get("Content-Encoding") or "").lower() != "gzip":
        return resp
    with resp:
        data = gzip.decompress(resp.read())
    return _Resp(data, resp)


if urllib.request.urlopen is _orig_urlopen:
    urllib.request.urlopen = _urlopen
