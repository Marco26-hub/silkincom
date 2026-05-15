#!/usr/bin/env python3
"""Add 3 entry-tier (€85-€95) products to fill pricing gap identified in audit."""
import json
from pathlib import Path

ROOT = Path('/Users/md/silkincom_claude')
PATH = ROOT / 'src/data/products.json'

NEW_PRODUCTS = [
    {
        "slug": "como-prestige",
        "name": "Como Prestige",
        "sku": "CP1",
        "price": 85,
        "description": "Composizione: 100% seta comasca Dimensioni: 130 x 8 cm Finitura: orlo arrotolato a mano Stampa esclusiva ispirata al lago di Como Confezione regalo inclusa Prodotto interamente in Italia. Il twilly Como Prestige rappresenta il primo passo nel mondo della seta comasca: una piccola firma di stile che eleva ogni look con la qualità di una maison del distretto serico più antico d'Europa.",
        "composition": "100% seta",
        "dimensions": "130 x 8 cm",
        "images": [
            "https://static.wixstatic.com/media/b58e91_6e113b7ba95f4d81854d2300b10860e8~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg",
            "https://static.wixstatic.com/media/b58e91_d9136bfd40e645f7a29a40572dacbd6c~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg"
        ]
    },
    {
        "slug": "como-firenze",
        "name": "Como Firenze",
        "sku": "CF1",
        "price": 95,
        "description": "Composizione: 100% seta comasca Dimensioni: 140 x 9 cm Finitura: orlo arrotolato a mano Motivo geometrico ispirato all'eredità tessile rinascimentale Confezione regalo inclusa Prodotto interamente in Italia. Il twilly Como Firenze unisce la lavorazione comasca all'estetica della tradizione fiorentina: motivo grafico raffinato, tonalità calde, ideale per accessoriare borsa, polso o collo.",
        "composition": "100% seta",
        "dimensions": "140 x 9 cm",
        "images": [
            "https://static.wixstatic.com/media/b58e91_877d263e0d3d403585e5cd050d50f8d9~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg",
            "https://static.wixstatic.com/media/b58e91_b47c2176cf494c6d9ebbffebd8a155e1~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg"
        ]
    },
    {
        "slug": "darsena-grande",
        "name": "Darsena Grande",
        "sku": "DG1",
        "price": 90,
        "description": "Composizione: 100% cotone fibra extra-lunga Dimensioni: 90 x 90 cm Finitura: orlo a giorno Stampa esclusiva — vista del Lario Confezione regalo inclusa Prodotto interamente in Italia. Il foulard quadrato Darsena Grande celebra il lago in versione estiva: cotone egiziano fibra extra-lunga (oltre 35mm), mano fresca, ideale come pareo, foulard o accento decorativo.",
        "composition": "100% cotone fibra extra-lunga",
        "dimensions": "90 x 90 cm",
        "images": [
            "https://static.wixstatic.com/media/a34b56_4cdb7894efaa4a128d5fb0714b80e743~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg",
            "https://static.wixstatic.com/media/a34b56_88c331613a2942d6bf9ac51c2f3f641c~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg"
        ]
    }
]


def main():
    with open(PATH, encoding='utf-8') as f:
        products = json.load(f)
    existing_slugs = {p['slug'] for p in products}
    added = []
    for p in NEW_PRODUCTS:
        if p['slug'] in existing_slugs:
            print(f'SKIP {p["slug"]} (exists)')
            continue
        products.append(p)
        added.append(p['slug'])
    with open(PATH, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    print(f'Added {len(added)} products: {added}')
    print(f'Total products: {len(products)}')


if __name__ == '__main__':
    main()
