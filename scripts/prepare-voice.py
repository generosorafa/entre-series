"""Build the small offline English sample bank from Wikimedia Commons recordings.
Development only: soundfile + numpy in work/voice-tools; no runtime dependencies.
Attribution and CC BY-SA terms are in public/audio-credits.html.
"""
import sys, pathlib, urllib.request, hashlib, base64, json
sys.path.insert(0, str(pathlib.Path('work/voice-tools').resolve()))
import soundfile as sf
import numpy as np

samples = {}
for number, word in enumerate(['one', 'two', 'three', 'four', 'five'], 1):
    name = f'En-us-{word}.ogg'
    digest = hashlib.md5(name.encode()).hexdigest()
    url = f'https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{name}'
    source = pathlib.Path('work/voice') / name
    if not source.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'EntreSeries/1.0 (offline countdown audio; github.com/generosorafa/entre-series)'})
        source.write_bytes(urllib.request.urlopen(request, timeout=30).read())
    data, rate = sf.read(source)
    if data.ndim > 1:
        data = data.mean(axis=1)
    # Trim only near-silent edges, retaining consonants and a 20 ms margin.
    active = np.flatnonzero(np.abs(data) > .009)
    data = data[max(0, active[0]-int(rate*.02)):min(len(data), active[-1]+int(rate*.025))]
    # Average source samples in each 8 kHz bin to reduce high-frequency aliases.
    bounds = np.linspace(0, len(data), round(len(data)*8000/rate)+1).astype(int)
    data = np.array([data[bounds[i]:max(bounds[i]+1,bounds[i+1])].mean() for i in range(len(bounds)-1)])
    if len(data) > 7200:
        raise ValueError(f'{word}: sample is too long for a one-second countdown')
    data = data * (.65 / max(abs(data)))
    pcm = np.round(data*32767).astype('<i2')
    samples[number] = base64.b64encode(pcm.tobytes()).decode()
    sf.write(f'work/voice/{word}-prepared.wav', pcm, 8000, subtype='PCM_16')
    print(word, round(len(pcm)/8000,3), 'seconds')
pathlib.Path('public/voice-en.js').write_text('// Audio: Dvortygirl / Wikimedia Commons. Adapted samples: CC BY-SA 3.0. See audio-credits.html.\nexport const voiceData='+json.dumps(samples,separators=(',',':'))+';\n', encoding='utf-8')
