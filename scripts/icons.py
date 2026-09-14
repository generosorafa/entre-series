from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1] / 'public' / 'icons'
root.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 108)
im = Image.new('RGB', (512,512), '#f5f5f7')
d = ImageDraw.Draw(im)
d.arc((112,154,400,442),180,360,fill='#e2e2e8',width=30)
d.arc((112,154,400,442),180,318,fill='#bd3150',width=30)
d.ellipse((112,283,142,313),fill='#bd3150')
d.text((256,290),'3S',font=font,fill='#1c1c20',anchor='mm')
for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:
    im.resize((size,size),Image.Resampling.LANCZOS).save(root/name,optimize=True)
print('Ícones 192, 512 e 180 gerados.')
