"""Menggabungkan game penyu menjadi SATU file HTML (CSS & JS ikut di dalamnya).

File hasilnya mudah dikirim lewat WhatsApp, Google Drive, atau flashdisk,
lalu dibuka dengan klik dua kali di laptop/PC tanpa internet.

Pemakaian:
    python tools/buat_satu_file.py [lokasi-output.html]
Default output: dist/pulang-ke-banyuwangi.html
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = ROOT / "games" / "penyu"


def main() -> None:
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "pulang-ke-banyuwangi.html"
    html = (GAME / "index.html").read_text(encoding="utf-8")

    css = (GAME / "style.css").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>")

    icon = base64.b64encode((GAME / "icon.svg").read_bytes()).decode("ascii")
    html = html.replace('href="icon.svg"', 'href="data:image/svg+xml;base64,' + icon + '"')
    html = html.replace('  <link rel="manifest" href="manifest.webmanifest">\n', "")

    def inline(match: re.Match) -> str:
        js = (GAME / match.group(1)).read_text(encoding="utf-8")
        if "</script" in js.lower():
            raise SystemExit(f"{match.group(1)} berisi '</script', tidak bisa digabung")
        return "<script>\n" + js + "\n</script>"

    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    if 'src="js/' in html or 'href="style.css"' in html:
        raise SystemExit("Masih ada file yang belum tergabung")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"Selesai: {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
