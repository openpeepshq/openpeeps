#!/usr/bin/env python3
"""Download OFL theme fonts from google/fonts and emit woff2 webfonts."""

from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

from fontTools.ttLib.woff2 import compress

ROOT = Path(__file__).resolve().parents[1] / 'src' / 'fonts'
REPO = 'https://raw.githubusercontent.com/google/fonts/main/'

FAMILIES = [
    {
        'dir': 'inter',
        'ofl': 'ofl/inter/OFL.txt',
        'files': [('ofl/inter/Inter[opsz,wght].ttf', 'Inter.woff2')],
    },
    {
        'dir': 'space-grotesk',
        'ofl': 'ofl/spacegrotesk/OFL.txt',
        'files': [('ofl/spacegrotesk/SpaceGrotesk[wght].ttf', 'SpaceGrotesk.woff2')],
    },
    {
        'dir': 'jetbrains-mono',
        'ofl': 'ofl/jetbrainsmono/OFL.txt',
        'files': [
            ('ofl/jetbrainsmono/JetBrainsMono[wght].ttf', 'JetBrainsMono.woff2'),
        ],
    },
    {
        'dir': 'playfair-display',
        'ofl': 'ofl/playfairdisplay/OFL.txt',
        'files': [
            (
                'ofl/playfairdisplay/PlayfairDisplay[wght].ttf',
                'PlayfairDisplay.woff2',
            ),
        ],
    },
    {
        'dir': 'fraunces',
        'ofl': 'ofl/fraunces/OFL.txt',
        'files': [
            (
                'ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf',
                'Fraunces.woff2',
            ),
        ],
    },
    {
        'dir': 'syne',
        'ofl': 'ofl/syne/OFL.txt',
        'files': [('ofl/syne/Syne[wght].ttf', 'Syne.woff2')],
    },
    {
        'dir': 'fredoka',
        'ofl': 'ofl/fredoka/OFL.txt',
        'files': [('ofl/fredoka/Fredoka[wdth,wght].ttf', 'Fredoka.woff2')],
    },
    {
        'dir': 'patrick-hand',
        'ofl': 'ofl/patrickhand/OFL.txt',
        'files': [
            (
                'ofl/patrickhand/PatrickHand-Regular.ttf',
                'PatrickHand-Regular.woff2',
            ),
        ],
    },
    {
        'dir': 'baloo-2',
        'ofl': 'ofl/baloo2/OFL.txt',
        'files': [('ofl/baloo2/Baloo2[wght].ttf', 'Baloo2.woff2')],
    },
    {
        'dir': 'amatic-sc',
        'ofl': 'ofl/amaticsc/OFL.txt',
        'files': [
            ('ofl/amaticsc/AmaticSC-Regular.ttf', 'AmaticSC-Regular.woff2'),
            ('ofl/amaticsc/AmaticSC-Bold.ttf', 'AmaticSC-Bold.woff2'),
        ],
    },
]


def fetch(path: str) -> bytes:
    url = REPO + quote(path, safe='/')
    print(f'  get {path}')
    with urlopen(url, timeout=60) as response:
        if response.status != 200:
            raise RuntimeError(f'{url} -> {response.status}')
        return response.read()


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for family in FAMILIES:
        dest = ROOT / family['dir']
        dest.mkdir(parents=True, exist_ok=True)
        print(family['dir'])
        (dest / 'OFL.txt').write_bytes(fetch(family['ofl']))
        for src, name in family['files']:
            ttf = dest / (Path(name).stem + '.ttf')
            woff2 = dest / name
            ttf.write_bytes(fetch(src))
            if woff2.exists():
                woff2.unlink()
            compress(str(ttf), str(woff2))
            ttf.unlink()
            print(f'  wrote {woff2.relative_to(ROOT)} ({woff2.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
