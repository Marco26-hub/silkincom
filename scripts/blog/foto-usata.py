#!/usr/bin/env python3
"""Dice se una foto e' GIA' STATA PUBBLICATA sui social (Blotato) oppure e' libera.

Regola SILKinCOM: una foto si usa una volta sola. Prima di mettere un'immagine come hero di un
articolo o in un post, va confrontata con tutto lo storico pubblicato.

Flusso:

  1. Scarica dalla coda/storico Blotato gli URL delle immagini gia' pubblicate (tool MCP
     blotato_list_posts) e salvali uno per riga in un file di testo, es. urls.txt.
  2. Costruisci la cache degli hash:
         python3 scripts/blog/foto-usata.py cache urls.txt --dir ~/.cache/silkincom-foto
  3. Controlla una o piu' foto candidate:
         python3 scripts/blog/foto-usata.py check foto1.jpg foto2.png --dir ~/.cache/silkincom-foto

Lettura del risultato (distanza di Hamming su aHash 16x16, 0-256):
    0-25   -> stessa foto, GIA' USATA: non si pubblica
    26-50  -> dubbio (stesso scatto/ritaglio diverso): guardala con gli occhi prima di decidere
    >50    -> libera
"""

import argparse
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha1
from io import BytesIO
from urllib.request import urlopen

import numpy as np
from PIL import Image

USATA = 25
DUBBIO = 50


def ahash(img: Image.Image) -> np.ndarray:
    """aHash 16x16: media dei grigi, un bit per pixel."""
    g = np.asarray(img.convert('L').resize((16, 16), Image.LANCZOS), dtype=np.float32)
    return (g > g.mean()).flatten()


def hash_file(path: str) -> np.ndarray:
    with Image.open(path) as img:
        return ahash(img)


def dist(a: np.ndarray, b: np.ndarray) -> int:
    return int(np.count_nonzero(a != b))


def cache_path(d: str, url: str) -> str:
    return os.path.join(d, sha1(url.encode()).hexdigest() + '.npy')


def build_cache(urls_file: str, d: str, workers: int = 12) -> None:
    os.makedirs(d, exist_ok=True)
    urls = [u.strip() for u in open(urls_file) if u.strip() and not u.startswith('#')]
    todo = [u for u in urls if not os.path.exists(cache_path(d, u))]
    print(f'{len(urls)} url, {len(urls) - len(todo)} gia in cache, {len(todo)} da scaricare')

    def one(url: str) -> str:
        try:
            if url.startswith('/'):                 # path del sito: il file sta in public/
                src = os.path.join('public', url.lstrip('/'))
                with Image.open(src) as img:
                    np.save(cache_path(d, url), ahash(img))
                return ''
            with urlopen(url, timeout=60) as r:
                data = r.read()
            with Image.open(BytesIO(data)) as img:
                np.save(cache_path(d, url), ahash(img))
            return ''
        except Exception as e:                      # niente fallback silenzioso: ogni skip col motivo
            return f'SKIP {url}: {e}'

    with ThreadPoolExecutor(max_workers=workers) as pool:
        for msg in pool.map(one, todo):
            if msg:
                print(msg, file=sys.stderr)
    # la mappa url->file serve per dire QUALE post usava la foto
    with open(os.path.join(d, 'index.tsv'), 'w') as f:
        for u in urls:
            p = cache_path(d, u)
            if os.path.exists(p):
                f.write(f'{os.path.basename(p)}\t{u}\n')
    print('cache pronta in', d)


def load_cache(d: str):
    if not os.path.isdir(d):
        return []
    idx = {}
    index_file = os.path.join(d, 'index.tsv')
    if os.path.exists(index_file):
        for line in open(index_file):
            name, url = line.rstrip('\n').split('\t', 1)
            idx[name] = url
    out = []
    for name in sorted(os.listdir(d)):
        if name.endswith('.npy'):
            out.append((idx.get(name, name), np.load(os.path.join(d, name))))
    return out


def check(paths, d: str) -> int:
    cache = load_cache(d)
    if not cache:
        print(f'cache vuota in {d}: lancia prima il comando "cache"', file=sys.stderr)
        return 2
    print(f'confronto con {len(cache)} immagini pubblicate\n')
    worst = 0
    for p in paths:
        try:
            h = hash_file(p)
        except Exception as e:
            print(f'SKIP {p}: {e}', file=sys.stderr)
            worst = max(worst, 2)
            continue
        best_url, best = min(((u, dist(h, c)) for u, c in cache), key=lambda t: t[1])
        if best <= USATA:
            verdict, code = 'GIA USATA — non pubblicare', 1
        elif best <= DUBBIO:
            verdict, code = 'DUBBIO — controlla a occhio', 1
        else:
            verdict, code = 'LIBERA', 0
        worst = max(worst, code)
        print(f'{os.path.basename(p)}: dist={best} -> {verdict}')
        if code:
            print(f'   somiglia a: {best_url}')
    return worst


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('cache', help='scarica e indicizza le immagini pubblicate')
    c.add_argument('urls')
    c.add_argument('--dir', default=os.path.expanduser('~/.cache/silkincom-foto'))
    c.add_argument('--workers', type=int, default=12)
    k = sub.add_parser('check', help='confronta una o piu foto con la cache')
    k.add_argument('foto', nargs='+')
    k.add_argument('--dir', default=os.path.expanduser('~/.cache/silkincom-foto'))
    a = ap.parse_args()
    if a.cmd == 'cache':
        build_cache(a.urls, a.dir, a.workers)
        return 0
    return check(a.foto, a.dir)


if __name__ == '__main__':
    sys.exit(main())
