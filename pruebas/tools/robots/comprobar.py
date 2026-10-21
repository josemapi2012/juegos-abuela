# Falla (código 1) si en la pasada hay errores, robots atascados o excepciones en la página
import json, os, sys
D = os.path.join(os.path.dirname(__file__), 'resultados')
mal = []
for j in ['cubos', 'dulces', 'mascotas', 'burbujas']:
    f = os.path.join(D, j + '.json')
    if not os.path.exists(f): continue  # en CI cada trabajo prueba un solo juego
    d = json.load(open(f))
    errs = [r['n'] for r in d['res'] if r.get('err') or r.get('stuck')]
    if errs or d.get('errores'):
        mal.append(f"{j}: niveles con error/atasco {errs[:20]}, excepciones {len(d.get('errores', []))}")
print('\n'.join(mal) if mal else 'Todo bien')
sys.exit(1 if mal else 0)
