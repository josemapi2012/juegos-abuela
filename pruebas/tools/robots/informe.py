# Resume los resultados de la pasada larga (tools/robots/resultados/<juego>.json)
import json, os, sys, collections
D = os.path.join(os.path.dirname(__file__), 'resultados')
TOPE = {'cubos': 60, 'dulces': 50, 'mascotas': 80, 'burbujas': 55}
for juego in ['cubos', 'dulces', 'mascotas', 'burbujas']:
    f = os.path.join(D, juego + '.json')
    if not os.path.exists(f):
        continue
    data = json.load(open(f))
    res = data['res']
    print('=' * 70)
    gan = [r for r in res if r.get('win')]
    print(f"{juego}: {len(res)} niveles, gana {len(gan)} ({100 * len(gan) // max(1, len(res))}%)")
    tramos = collections.defaultdict(lambda: [0, 0])
    for r in res:
        t = (r['n'] - 1) // 50
        tramos[t][1] += 1
        tramos[t][0] += 1 if r.get('win') else 0
    print('  Por tramos: ' + '  '.join(f"{t * 50 + 1}-{t * 50 + 50}: {g * 100 // n}%" for t, (g, n) in sorted(tramos.items())))
    errs = [r for r in res if r.get('err')]
    stuck = [r for r in res if r.get('stuck')]
    print(f"  Errores: {len(errs)}  ·  robot atascado: {len(stuck)}  ·  excepciones en la página: {len(data.get('errores', []))}")
    for r in errs[:8]:
        print(f"    nivel {r['n']}: {r['err'][:160]}")
    for e in list(dict.fromkeys(data.get('errores', [])))[:6]:
        print(f"    excepción: {e[:160]}")
    for r in stuck[:6]:
        print(f"    atascado en {r['n']}: {json.dumps({k: v for k, v in r.items() if k not in ('goals',)})[:160]}")
    tope = [r for r in res if r.get('specMoves') and r['specMoves'] >= TOPE[juego]]
    print(f"  Niveles con el tope de movimientos ({TOPE[juego]}): {len(tope)} → el robot gana {sum(1 for r in tope if r.get('win'))}  [{', '.join(str(r['n']) for r in tope[:25])}]")
    gens = sorted(r.get('gen', 0) for r in res)
    if gens:
        print(f"  Generar un nivel (ordenador): mediana {gens[len(gens) // 2]} ms, p90 {gens[int(len(gens) * 0.9)]} ms, máx {gens[-1]} ms")
    mv = sorted(r['specMoves'] for r in res if r.get('specMoves'))
    if mv:
        print(f"  Movimientos dados: mediana {mv[len(mv) // 2]}, mín {mv[0]}, máx {mv[-1]}")
    sob = sorted(r['left'] for r in gan if isinstance(r.get('left'), (int, float)))
    if sob:
        print(f"  Movimientos que le sobran al ganar: mediana {sob[len(sob) // 2]}, p90 {sob[int(len(sob) * 0.9)]}")
    obj = collections.Counter()
    for r in res:
        if r.get('win') is False:
            for g in (r.get('goals') or '').split():
                obj[g.split(':')[0]] += 1
    tot = collections.Counter(g.split(':')[0] for r in res for g in (r.get('goals') or '').split())
    malos = sorted(((k, obj[k] / tot[k], tot[k]) for k in obj if tot[k] >= 5), key=lambda x: -x[1])[:8]
    if malos:
        print('  Objetivos con más derrotas: ' + ', '.join(f"{k} {int(p * 100)}% de {n}" for k, p, n in malos))
    perd = [r['n'] for r in res if r.get('win') is False]
    print(f"  Perdidos: {perd[:60]}")
    if data.get('registro'):
        print(f"  Registro de partidas: {data['registro'].get('total')} intentos apuntados; último {data['registro'].get('ultimos', [])[-1:]}")
