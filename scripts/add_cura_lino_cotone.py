#!/usr/bin/env python3
"""Add lino + cotone care sections to all 7 locale files."""
import json
from pathlib import Path

ROOT = Path('/Users/md/silkincom_claude/messages')

LINO = {
    'it': {
        'lino': 'Lino',
        'linoItems': [
            'Lavaggio in lavatrice 30°C ciclo delicato con detergente neutro',
            'In alternativa, lavaggio a mano in acqua fredda',
            'Asciugare in piano o appendere all\'ombra senza strizzare',
            'Stirare a temperatura alta da umido per esaltare la mano fluida',
        ],
        'cotone': 'Cotone',
        'cotoneItems': [
            'Lavaggio in lavatrice 30-40°C con detergente neutro per fibre naturali',
            'Non usare candeggina né ammorbidenti aggressivi',
            'Asciugare in piano o appendere; evitare asciugatrice a calore alto',
            'Stirare a temperatura media-alta, sul rovescio per le stampe',
        ],
    },
    'en': {
        'lino': 'Linen',
        'linoItems': [
            'Machine wash 30°C delicate cycle with neutral detergent',
            'Alternatively hand wash in cold water',
            'Dry flat or hang in shade without wringing',
            'Iron hot while damp to bring out the fluid hand',
        ],
        'cotone': 'Cotton',
        'cotoneItems': [
            'Machine wash 30-40°C with neutral detergent for natural fibers',
            'Do not use bleach or harsh fabric softeners',
            'Dry flat or hang; avoid high-heat tumble dry',
            'Iron medium-high, on the reverse side for prints',
        ],
    },
    'es': {
        'lino': 'Lino',
        'linoItems': [
            'Lavado en lavadora 30°C ciclo delicado con detergente neutro',
            'Alternativa: lavado a mano en agua fría',
            'Secar en plano o colgar a la sombra sin retorcer',
            'Planchar a temperatura alta en húmedo para realzar el tacto fluido',
        ],
        'cotone': 'Algodón',
        'cotoneItems': [
            'Lavado en lavadora 30-40°C con detergente neutro para fibras naturales',
            'No usar lejía ni suavizantes agresivos',
            'Secar en plano o colgar; evitar secadora a calor alto',
            'Planchar temperatura media-alta, del revés para los estampados',
        ],
    },
    'fr': {
        'lino': 'Lin',
        'linoItems': [
            'Lavage en machine 30°C cycle délicat avec lessive neutre',
            'Alternative : lavage à la main en eau froide',
            'Sécher à plat ou suspendre à l\'ombre sans essorer',
            'Repasser à haute température sur tissu humide pour révéler la main fluide',
        ],
        'cotone': 'Coton',
        'cotoneItems': [
            'Lavage en machine 30-40°C avec lessive neutre pour fibres naturelles',
            'Ne pas utiliser d\'eau de Javel ni d\'adoucissants agressifs',
            'Sécher à plat ou suspendre ; éviter le sèche-linge à haute température',
            'Repasser température moyenne-haute, sur l\'envers pour les imprimés',
        ],
    },
    'de': {
        'lino': 'Leinen',
        'linoItems': [
            'Maschinenwäsche 30°C Schonprogramm mit neutralem Waschmittel',
            'Alternativ: Handwäsche in kaltem Wasser',
            'Liegend trocknen oder im Schatten aufhängen, nicht auswringen',
            'Heiß auf feuchtem Stoff bügeln, um den fließenden Griff hervorzuheben',
        ],
        'cotone': 'Baumwolle',
        'cotoneItems': [
            'Maschinenwäsche 30-40°C mit neutralem Waschmittel für Naturfasern',
            'Keine Bleichmittel oder aggressiven Weichspüler verwenden',
            'Liegend trocknen oder aufhängen; hohen Trocknerheizmodus vermeiden',
            'Mittelhoch bügeln, bei Drucken auf links',
        ],
    },
    'pt': {
        'lino': 'Linho',
        'linoItems': [
            'Lavagem na máquina 30°C ciclo delicado com detergente neutro',
            'Alternativa: lavagem à mão em água fria',
            'Secar plano ou pendurar à sombra sem torcer',
            'Engomar a temperatura alta húmido para realçar o toque fluido',
        ],
        'cotone': 'Algodão',
        'cotoneItems': [
            'Lavagem na máquina 30-40°C com detergente neutro para fibras naturais',
            'Não usar lixívia nem amaciadores agressivos',
            'Secar plano ou pendurar; evitar secador a calor alto',
            'Engomar temperatura média-alta, do avesso para as estampas',
        ],
    },
    'nl': {
        'lino': 'Linnen',
        'linoItems': [
            'Machinewas 30°C fijnwasprogramma met neutraal wasmiddel',
            'Alternatief: handwas in koud water',
            'Plat drogen of in de schaduw hangen zonder uitwringen',
            'Strijk heet op vochtig weefsel voor de vloeiende val',
        ],
        'cotone': 'Katoen',
        'cotoneItems': [
            'Machinewas 30-40°C met neutraal wasmiddel voor natuurlijke vezels',
            'Geen bleekmiddel of agressieve wasverzachters gebruiken',
            'Plat drogen of hangen; vermijd droger op hoge hitte',
            'Strijk middelhoog, bij prints op de achterkant',
        ],
    },
}


def main():
    for lang, additions in LINO.items():
        path = ROOT / f'{lang}.json'
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        cura = data.setdefault('cura', {})
        cura.update(additions)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'{lang}: added lino + cotone ({len(additions["linoItems"])} + {len(additions["cotoneItems"])} items)')


if __name__ == '__main__':
    main()
