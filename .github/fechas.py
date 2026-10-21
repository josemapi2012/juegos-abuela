# Lee el calendario de Google de la abuela (dirección secreta iCal, guardada como secreto CALENDARIO)
# y publica fechas.json con los días especiales del próximo año. Los juegos lo descargan al abrirse.
# Título del evento = felicitación que verá (si empieza por un emoji, ese es el dibujo). Descripción = mensaje.
import os, re, json, datetime, urllib.request
import icalendar, recurring_ical_events

url = os.environ.get('CALENDARIO', '').strip()
if not url:
    print('Falta el secreto CALENDARIO'); raise SystemExit(0)
cal = icalendar.Calendar.from_ical(urllib.request.urlopen(url, timeout=30).read())
hoy = datetime.date.today()
dias = {}
for ev in recurring_ical_events.of(cal).between(hoy - datetime.timedelta(days=1), hoy + datetime.timedelta(days=400)):
    ini = ev['DTSTART'].dt
    fin = ev['DTEND'].dt if ev.get('DTEND') else None
    if isinstance(ini, datetime.datetime):  # evento con hora: cuenta solo su día
        ini, fin = ini.date(), None
    n = max(1, (fin - ini).days) if fin else 1  # en los de día entero, el final no se incluye
    titulo = str(ev.get('SUMMARY', '')).strip()
    nota = re.sub(r'<[^>]+>', ' ', str(ev.get('DESCRIPTION', ''))).strip()
    emoji = '🎉'
    m = re.match(r'^(\S+)\s+(.*)$', titulo)
    if m and not re.match(r'[\w¡¿"\'(]', m.group(1)):
        emoji, titulo = m.group(1), m.group(2)
    if not titulo:
        continue
    for k in range(min(n, 31)):
        d = (ini + datetime.timedelta(days=k)).isoformat()
        dias.setdefault(d, {'fecha': d, 'texto': titulo[:60], 'emoji': emoji, 'nota': nota[:140]})
out = {'dias': sorted(dias.values(), key=lambda x: x['fecha'])}
viejo = json.load(open('fechas.json')) if os.path.exists('fechas.json') else {}
if viejo.get('dias') == out['dias']:
    print('sin cambios')
else:
    out['actualizado'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    json.dump(out, open('fechas.json', 'w'), ensure_ascii=False, indent=1)
    print(len(out['dias']), 'días especiales')
