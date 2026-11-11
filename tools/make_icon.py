import sys
from PIL import Image, ImageDraw

out = sys.argv[1] if len(sys.argv) > 1 else "icon.png"
S = 1024
img = Image.new("RGB", (S, S), "#ffd23f")
d = ImageDraw.Draw(img)
ink, pink = "#1d1b26", "#ff6b9d"
w = 38

def line(pts, col=ink, width=w):
    d.line(pts, fill=col, width=width, joint="curve")
    for p in (pts[0], pts[-1]):
        d.ellipse([p[0]-width//2, p[1]-width//2, p[0]+width//2, p[1]+width//2], fill=col)

# dancer (centre safe-zone me)
d.ellipse([430, 250, 594, 414], fill=pink, outline=ink, width=14)   # head
line([(512, 414), (512, 620)])                                        # body
line([(512, 470), (390, 400)])                                        # left arm up
line([(512, 470), (640, 540)])                                        # right arm
line([(512, 620), (430, 780)])                                        # left leg
line([(512, 620), (610, 740), (660, 800)])                            # right leg
# music notes
d.ellipse([700, 330, 750, 370], fill=ink); d.line([(745, 350), (745, 250)], fill=ink, width=12)
d.ellipse([280, 600, 330, 640], fill=ink); d.line([(325, 620), (325, 520)], fill=ink, width=12)
img.save(out)
