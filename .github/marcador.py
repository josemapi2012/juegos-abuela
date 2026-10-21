# Lee del repositorio privado lo que envía la tablet y publica solo el nivel y las estrellas de cada juego
import json, os, base64, urllib.request, datetime
TOKEN = os.environ['DATOS_TOKEN']
REPO = 'josemapi2012/juegos-abuela-datos'
out = {'actualizado': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'juegos': {}}
for j in ['cubos', 'dulces', 'mascotas', 'burbujas']:
    req = urllib.request.Request(f'https://api.github.com/repos/{REPO}/contents/{j}.json', headers={'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/vnd.github.raw', 'User-Agent': 'marcador'})
    try:
        save = json.loads(urllib.request.urlopen(req, timeout=30).read())['save']
    except Exception as e:
        print(j, 'sin datos:', e)
        continue
    out['juegos'][j] = {'nivel': save.get('level', 1), 'estrellas': sum((save.get('stars') or {}).values())}
viejo = json.load(open('marcador.json')) if os.path.exists('marcador.json') else {}
if viejo.get('juegos') == out['juegos']:
    print('sin cambios')
else:
    json.dump(out, open('marcador.json', 'w'), indent=1)
    print('marcador actualizado', out['juegos'])
