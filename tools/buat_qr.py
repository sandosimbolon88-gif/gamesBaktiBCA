"""Membuat ulang games/penyu/js/qr.js dari sebuah URL.

Pemakaian:
    pip install qrcode
    python tools/buat_qr.py "https://alamat-tujuan"

QR disimpan sebagai matriks 0/1 sehingga game tetap bisa menampilkannya
tanpa internet dan tanpa library tambahan.
"""
import json
import pathlib
import sys

import qrcode

DEFAULT_URL = "https://www.bca.co.id/id/tentang-bca/CSR/Bakti-BCA/bakti-lingkungan/konservasi-penyu"


def main() -> None:
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    qr.add_data(url)
    qr.make(fit=True)
    rows = ["".join("1" if cell else "0" for cell in row) for row in qr.get_matrix()]
    out = pathlib.Path(__file__).resolve().parent.parent / "games" / "penyu" / "js" / "qr.js"
    out.write_text(
        "/* Dibuat otomatis oleh tools/buat_qr.py. Jangan diedit manual. */\n"
        "window.PB_QR = " + json.dumps({"url": url, "rows": rows}) + ";\n",
        encoding="utf-8",
    )
    print(f"QR {len(rows)}x{len(rows)} untuk {url} -> {out}")


if __name__ == "__main__":
    main()
