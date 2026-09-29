"""Generate PWA PNG icons for Pages; keeps binary assets out of text-only GitHub edits."""
from pathlib import Path
from PIL import Image, ImageDraw

def build(output=Path('docs/assets')):
    output.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        image = Image.new('RGB', (size, size), '#071426')
        draw = ImageDraw.Draw(image)
        x = y = size // 2
        for fraction in (.34, .25, .16):
            r = round(size * fraction)
            draw.ellipse((x-r, y-r, x+r, y+r), outline='#73e6ce', width=max(3, size//70))
        r = size // 32
        draw.ellipse((x-r,y-r,x+r,y+r),fill='#73e6ce')
        draw.arc((size*.25,size*.25,size*.75,size*.75),-90,60,fill='#2f92e5',width=max(4,size//35))
        image.save(output / f'icon-{size}.png')

if __name__ == '__main__':
    build()
