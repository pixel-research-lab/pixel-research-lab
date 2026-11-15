"""Draw the extra 16px desk icons from editable pixel primitives; stdlib only.

The seven original PNGs are deliberately not rewritten. Run from any directory.
Every shape is snapped to the same pixel grid, with a shared muted room palette.
"""
from pathlib import Path
import math
import struct
import zlib

INK='#424b40'; DARK='#65725c'; CREAM='#f4e4bb'; WHITE='#fff4d8'
GREEN='#7d9a67'; LEAF='#aac17c'; TEAL='#60928e'; BLUE='#84b0bd'
WOOD='#ac7551'; TAN='#d4a46a'; GOLD='#e1bd68'; ORANGE='#d88851'
ROSE='#ca8586'; RED='#b66755'; PURPLE='#9486a8'
ROOT=Path(__file__).resolve().parents[1]/'assets/images/items'

class Sprite:
    def __init__(self): self.pixels=[[(0,0,0,0) for _ in range(16)] for _ in range(16)]
    def dot(self,x,y,c):
        if 0<=x<16 and 0<=y<16:self.pixels[y][x]=tuple(bytes.fromhex(c[1:]))+(255,)
    def rect(self,x,y,w,h,c):
        for j in range(y,y+h):
            for i in range(x,x+w):self.dot(i,j,c)
    def line(self,x,y,xx,yy,c=INK):
        steps=max(abs(xx-x),abs(yy-y))
        for k in range(steps+1):
            t=k/max(steps,1);self.dot(round(x+(xx-x)*t),round(y+(yy-y)*t),c)
    def poly(self,points,c,edge=INK):
        for y in range(16):
            for x in range(16):
                inside=False
                for (ax,ay),(bx,by) in zip(points,points[1:]+points[:1]):
                    if (ay>y+.1)!=(by>y+.1) and x+.1<(bx-ax)*(y+.1-ay)/(by-ay)+ax:inside=not inside
                if inside:self.dot(x,y,c)
        if edge:
            for a,b in zip(points,points[1:]+points[:1]):self.line(*a,*b,edge)
    def oval(self,x,y,w,h,c,edge=INK):
        rx,ry=w/2,h/2
        for j in range(h):
            for i in range(w):
                dx,dy=i+.5-rx,j+.5-ry
                if (dx/rx)**2+(dy/ry)**2<=1:
                    inner=rx>1 and ry>1 and (dx/(rx-1))**2+(dy/(ry-1))**2<=1
                    self.dot(x+i,y+j,c if inner or not edge else edge)
    def box(self,x,y,w,h,c,edge=INK):
        self.rect(x,y,w,h,edge);self.rect(x+1,y+1,w-2,h-2,c)
    def pot(self,x=4,y=11,w=8):
        self.poly([(x,y),(x+w-1,y),(x+w-2,15),(x+1,15)],WOOD)
        self.rect(x,y,w,2,TAN);self.rect(x+2,y+3,2,1,ORANGE)
    def save(self,name):
        raw=b''.join(b'\x00'+bytes(v for px in row for v in px) for row in self.pixels)
        def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d))
        data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',16,16,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
        (ROOT/(name+'.png')).write_bytes(data)

sprites={}
def icon(name):
    s=Sprite();sprites[name]=s;return s

s=icon('cactus');s.box(6,2,4,10,GREEN);s.box(2,5,3,5,GREEN);s.rect(4,8,3,2,GREEN);s.box(11,4,3,4,GREEN);s.rect(9,6,3,2,GREEN);s.line(7,4,7,10,LEAF);s.dot(4,6,CREAM);s.dot(12,5,CREAM);s.pot();s.oval(7,0,4,3,ROSE,RED)
s=icon('bonsai');s.pot(2,13,12);s.line(7,13,9,6,WOOD);s.line(8,10,3,7,WOOD);s.line(8,9,13,5,WOOD);s.oval(0,5,7,4,GREEN);s.oval(8,2,8,5,GREEN);s.oval(3,0,8,5,LEAF);s.rect(4,2,4,1,GREEN)
s=icon('terrarium');s.poly([(5,1),(10,1),(10,5),(13,8),(13,14),(2,14),(2,8),(5,5)],BLUE);s.rect(3,10,10,4,WOOD);s.rect(3,10,10,2,GREEN);s.line(5,9,5,6,LEAF);s.dot(4,7,LEAF);s.dot(6,6,LEAF);s.line(9,9,9,7,LEAF);s.rect(5,0,6,2,TAN);s.line(3,7,3,9,WHITE);s.dot(11,8,WHITE)
s=icon('sunflower');s.line(7,7,7,12,GREEN);s.poly([(7,10),(3,8),(3,10),(6,12)],LEAF,GREEN);s.poly([(8,9),(12,7),(12,9),(8,11)],GREEN,DARK);s.oval(2,0,11,9,GOLD,ORANGE);s.oval(5,2,5,5,WOOD);s.dot(7,3,GOLD);s.pot()
s=icon('mushroom');s.oval(1,13,14,3,GREEN,DARK);s.box(6,7,4,7,CREAM);s.poly([(1,7),(2,4),(5,1),(10,1),(13,4),(14,7)],RED);s.rect(2,7,12,2,ROSE);s.rect(4,3,2,2,WHITE);s.rect(9,4,3,2,WHITE);s.dot(7,2,WHITE);s.box(11,11,2,3,CREAM);s.oval(9,9,6,3,TAN,WOOD)
s=icon('seashell');s.poly([(1,5),(3,2),(7,1),(11,2),(14,5),(14,8),(9,14),(5,14),(1,8)],CREAM,WOOD)
for a,b in [((3,4),(6,12)),((6,3),(7,12)),((10,3),(8,12)),((12,5),(9,11))]:s.line(*a,*b,ROSE)
s.rect(5,13,5,2,TAN)
s=icon('butterfly');s.box(0,1,16,14,WOOD);s.box(2,3,12,10,CREAM,TAN);s.poly([(6,7),(3,4),(3,8),(6,9)],BLUE,TEAL);s.poly([(8,7),(11,4),(12,8),(8,9)],ROSE,RED);s.poly([(6,9),(3,10),(5,12),(7,10)],PURPLE);s.poly([(8,9),(11,10),(10,12),(7,10)],GOLD);s.line(7,6,7,11);s.dot(6,5,INK);s.dot(8,5,INK)
s=icon('aquarium');s.box(0,3,16,12,BLUE);s.rect(1,4,14,1,CREAM);s.rect(1,13,14,1,TAN);s.line(3,12,3,7,GREEN);s.dot(2,9,LEAF);s.dot(4,8,LEAF);s.oval(7,7,5,4,ORANGE,RED);s.poly([(11,8),(14,7),(14,10)],GOLD,ORANGE);s.dot(8,8,INK);s.dot(9,5,WHITE);s.rect(0,2,16,2,DARK)

s=icon('notebook');s.box(3,1,11,14,TEAL);s.rect(4,2,2,12,BLUE);s.box(7,4,5,4,CREAM,CREAM);s.rect(8,5,3,1,TAN);s.rect(9,11,2,5,RED)
for y in [3,6,9,12]:s.rect(1,y,4,1,INK);s.dot(2,y,CREAM)
s=icon('books');s.box(1,11,14,4,RED);s.rect(3,12,10,2,CREAM);s.box(3,7,12,4,TEAL);s.rect(4,8,9,2,WHITE);s.box(0,3,13,4,TAN);s.rect(2,4,9,2,CREAM);s.rect(7,5,2,4,ROSE)
s=icon('pencil');s.line(4,2,5,10,GOLD);s.dot(4,1,INK);s.line(8,1,8,10,RED);s.dot(8,0,INK);s.line(12,3,10,10,BLUE);s.dot(12,2,INK);s.box(3,8,10,7,TEAL);s.rect(5,9,2,5,BLUE);s.rect(10,9,1,5,DARK)
s=icon('ruler');s.poly([(1,11),(11,1),(14,4),(4,14)],GOLD,WOOD)
for x,y in [(4,10),(6,8),(8,6),(10,4)]:s.line(x,y,x+1,y+1,WOOD)
s.poly([(1,2),(3,0),(14,11),(15,15),(11,14)],RED);s.line(3,3,11,11,ROSE);s.poly([(11,14),(15,15),(14,11)],CREAM,WOOD);s.dot(14,14,INK)
s=icon('abacus');s.box(1,2,14,13,WOOD);s.rect(3,4,10,9,CREAM)
for y in [5,8,11]:
 s.line(3,y,12,y,TAN)
 for x in ([4,7,10] if y!=8 else [5,8,11]):s.rect(x,y-1,2,3,TEAL if y==8 else RED);s.dot(x,y-1,BLUE if y==8 else ORANGE)
s=icon('hourglass');s.rect(3,1,10,2,WOOD);s.rect(3,13,10,2,WOOD);s.poly([(4,3),(11,3),(10,6),(8,8),(10,10),(11,12),(4,12),(5,10),(7,8),(5,6)],BLUE);s.line(5,4,10,4,WHITE);s.poly([(5,5),(10,5),(8,7)],GOLD,GOLD);s.line(8,8,8,10,GOLD);s.poly([(5,12),(8,10),(10,12)],GOLD,GOLD)
s=icon('beaker');s.poly([(4,1),(11,1),(10,3),(10,6),(14,12),(13,15),(2,15),(1,12),(5,6),(5,3)],BLUE);s.poly([(4,8),(11,8),(13,13),(12,14),(3,14),(2,13)],TEAL,TEAL);s.line(3,11,3,13,WHITE);s.dot(7,10,LEAF);s.dot(10,12,LEAF);s.rect(4,0,8,2,CREAM)
s=icon('molecule')
for a,b in [((3,4),(8,8)),((8,8),(13,3)),((8,8),(4,13)),((8,8),(13,12))]:s.line(*a,*b,CREAM)
for x,y,c in [(0,1,RED),(5,5,TEAL),(10,0,GOLD),(1,10,BLUE),(10,10,PURPLE)]:s.oval(x,y,5,5,c);s.dot(x+1,y+1,WHITE)

s=icon('keyboard');s.poly([(2,5),(13,5),(15,13),(0,13)],DARK);s.rect(2,6,12,6,CREAM)
for y in [7,9]:
 for x in [3,5,7,9,11]:s.dot(x,y,TEAL)
s.rect(5,11,6,1,WOOD);s.line(7,4,7,1,DARK);s.line(7,1,11,1,DARK);s.rect(12,11,2,1,RED)
s=icon('mouse');s.line(8,4,8,1,DARK);s.line(8,1,12,1,DARK);s.line(12,1,12,3,DARK);s.oval(3,4,10,12,CREAM);s.rect(4,10,8,3,TAN);s.line(8,5,8,9,DARK);s.line(4,9,11,9,DARK);s.rect(7,6,2,2,TEAL);s.dot(5,11,WHITE)
s=icon('camera');s.box(1,5,14,9,TEAL);s.box(4,2,6,4,DARK);s.rect(5,3,4,2,CREAM);s.rect(11,4,3,2,RED);s.oval(5,6,8,7,INK);s.oval(7,7,4,4,BLUE,TEAL);s.dot(8,8,WHITE);s.rect(2,7,2,4,CREAM)
s=icon('cassette');s.box(1,3,14,11,PURPLE);s.box(3,5,10,5,CREAM);s.oval(4,6,3,3,WOOD);s.oval(9,6,3,3,WOOD);s.line(6,8,9,8,DARK);s.poly([(5,11),(10,11),(12,13),(3,13)],TAN);s.dot(2,4,WHITE);s.dot(13,12,WHITE)
s=icon('gamepad');s.poly([(3,5),(12,5),(14,7),(15,13),(12,14),(10,11),(5,11),(3,14),(0,13),(1,7)],CREAM);s.rect(3,7,1,4,DARK);s.rect(2,8,3,2,DARK);s.oval(10,7,3,3,RED,RED);s.dot(13,8,TEAL);s.rect(6,9,3,1,TAN);s.line(7,4,7,1,DARK)
s=icon('circuit');s.box(1,1,14,13,GREEN);s.box(5,4,6,6,DARK);s.rect(6,5,2,2,TEAL)
for i in [3,6,9,12]:s.rect(i,14,2,2,GOLD)
for a,b in [((3,3),(3,9)),((3,9),(5,9)),((10,2),(12,2)),((12,2),(12,11)),((3,11),(7,11))]:s.line(*a,*b,LEAF)
s.dot(3,3,GOLD);s.dot(12,11,GOLD);s.rect(6,2,3,1,CREAM)
s=icon('battery');s.rect(6,1,4,2,DARK);s.box(3,3,10,12,GREEN);s.rect(4,4,8,2,CREAM);s.rect(4,12,8,2,TEAL);s.poly([(8,6),(6,9),(8,9),(7,12),(10,8),(8,8)],GOLD,GOLD);s.rect(4,6,1,5,LEAF)
s=icon('server');s.box(3,0,10,16,DARK)
for y in [2,6,10]:
 s.box(4,y,8,3,TEAL);s.rect(5,y+1,4,1,BLUE);s.dot(10,y+1,LEAF)
s.rect(5,14,2,1,INK);s.rect(10,14,1,1,GOLD)

s=icon('teapot');s.oval(10,6,6,7,TAN);s.oval(11,7,3,4,CREAM,CREAM);s.poly([(4,8),(0,5),(1,10),(5,13)],TEAL);s.oval(3,5,10,10,TEAL);s.rect(5,4,6,2,CREAM);s.box(7,2,2,3,GOLD);s.line(5,8,5,11,BLUE);s.rect(5,14,7,1,DARK)
s=icon('coffee');s.rect(2,14,13,2,WOOD);s.box(3,0,2,14,TAN);s.rect(3,1,11,2,WOOD);s.poly([(7,3),(13,3),(10,8)],CREAM,WOOD);s.rect(9,8,2,2,WOOD);s.box(7,10,7,4,CREAM);s.rect(14,10,2,3,INK);s.rect(8,11,5,1,WOOD);s.dot(8,12,WHITE)
s=icon('croissant');s.oval(0,12,16,3,CREAM,TEAL);s.poly([(1,9),(4,5),(7,3),(10,4),(14,8),(13,11),(11,10),(10,8),(6,8),(4,11),(2,11)],GOLD,WOOD);s.line(5,5,6,8,ORANGE);s.line(9,4,9,7,ORANGE);s.line(11,6,12,8,TAN);s.dot(7,4,WHITE)
s=icon('cookie');s.box(3,3,11,12,BLUE);s.rect(2,1,13,3,WOOD);s.rect(4,2,8,1,TAN);s.rect(4,5,9,9,CREAM)
for x,y in [(5,6),(9,7),(6,10),(10,11)]:s.oval(x-1,y-1,4,4,TAN,WOOD);s.dot(x,y,INK)
s.line(3,5,3,10,WHITE);s.dot(12,5,WHITE)
s=icon('donut');s.oval(0,12,16,3,CREAM,TEAL);s.oval(1,3,14,11,TAN,WOOD);s.oval(2,3,12,8,ROSE,RED);s.oval(6,5,4,4,WOOD);s.rect(7,6,2,2,CREAM)
for x,y,c in [(4,5,WHITE),(10,4,GOLD),(11,8,BLUE),(4,9,GOLD)]:s.rect(x,y,2,1,c)
s=icon('candle');s.oval(2,13,12,3,WOOD);s.box(4,6,8,9,CREAM);s.rect(5,8,2,6,WHITE);s.rect(9,7,2,3,TAN);s.line(8,4,8,6,DARK);s.poly([(8,0),(10,3),(9,5),(7,5),(6,3)],ORANGE,RED);s.rect(8,2,1,3,GOLD)
s=icon('headphones');s.oval(1,1,14,13,DARK);s.oval(3,3,10,10,TEAL,None);s.rect(4,6,8,9,'#000000')
# Open center is transparent, not black.
for y in range(6,16):
 for x in range(4,12):s.pixels[y][x]=(0,0,0,0)
s.box(1,7,4,8,TAN);s.box(11,7,4,8,TAN);s.rect(2,9,1,4,CREAM);s.rect(12,9,1,4,CREAM)
s=icon('radio');s.line(9,5,14,0,DARK);s.box(0,5,16,10,WOOD);s.rect(1,6,14,8,TAN);s.box(2,7,7,6,DARK)
for x in [3,5,7]:s.line(x,8,x,11,TEAL)
s.box(10,7,4,3,CREAM);s.dot(12,8,RED);s.oval(11,11,3,3,GOLD)
s=icon('catlamp');s.poly([(3,6),(2,1),(6,3),(10,3),(13,1),(13,7),(14,10),(12,13),(3,13),(1,10)],CREAM,WOOD);s.dot(4,8,INK);s.dot(10,8,INK);s.dot(7,10,ROSE);s.rect(3,9,2,1,ROSE);s.rect(10,9,2,1,ROSE);s.box(3,13,10,3,TAN)

s=icon('globe');s.line(7,10,7,14,WOOD);s.rect(4,14,9,2,WOOD);s.oval(2,0,12,12,TAN);s.oval(3,1,10,10,BLUE,TEAL);s.poly([(5,2),(8,2),(8,4),(6,6),(4,5)],LEAF,GREEN);s.poly([(9,6),(11,7),(9,9),(8,9),(8,7)],GREEN,GREEN);s.dot(5,8,CREAM)
s=icon('telescope');s.line(7,8,7,14,WOOD);s.line(7,10,2,15,WOOD);s.line(7,10,13,15,WOOD);s.poly([(2,7),(11,1),(14,5),(5,11)],TAN);s.line(3,7,10,3,CREAM);s.poly([(11,1),(13,0),(15,4),(14,5)],TEAL);s.rect(2,9,3,2,DARK)
s=icon('rocket');s.poly([(5,10),(4,14),(7,13),(8,15),(10,13),(11,14),(10,10)],GOLD,ORANGE);s.poly([(5,6),(2,11),(2,14),(6,11)],RED);s.poly([(10,6),(13,11),(13,14),(9,11)],RED);s.poly([(5,4),(7,1),(8,0),(10,4),(10,11),(5,11)],CREAM);s.rect(6,10,4,2,RED);s.oval(6,4,4,4,BLUE,TEAL);s.dot(7,5,WHITE)
s=icon('satellite');s.box(0,4,5,7,BLUE);s.box(11,4,5,7,BLUE);s.line(2,5,2,9,TEAL);s.line(13,5,13,9,TEAL);s.line(1,7,14,7,TAN);s.box(5,5,6,7,CREAM);s.rect(6,6,2,4,TAN);s.line(8,4,9,1,DARK);s.oval(6,0,6,3,BLUE,TEAL);s.dot(8,13,ORANGE)
s=icon('moon');s.box(4,13,8,3,WOOD);s.line(8,10,8,13,TAN);s.poly([(9,0),(5,1),(2,5),(2,8),(4,11),(9,12),(13,9),(9,10),(6,7),(6,4)],GOLD,WOOD);s.line(4,4,3,7,CREAM);s.dot(11,2,GOLD);s.dot(13,4,CREAM)
s=icon('meteor');s.box(1,13,14,3,WOOD);s.rect(3,14,6,1,CREAM);s.poly([(3,11),(2,8),(4,4),(8,2),(12,4),(14,9),(11,12),(6,13)],DARK);s.poly([(4,6),(8,3),(10,5),(7,7)],PURPLE,PURPLE);s.oval(8,7,4,3,INK,INK);s.dot(5,9,TAN);s.line(3,11,7,12,TEAL)
s=icon('planet');s.oval(3,2,10,11,GOLD,WOOD);s.rect(5,5,6,1,ORANGE);s.rect(4,8,8,1,TAN);s.poly([(1,10),(3,7),(3,9),(6,10),(12,6),(13,4),(15,5),(15,7),(10,11),(4,13),(1,12)],PURPLE);s.line(3,11,6,11,CREAM);s.line(10,9,13,7,CREAM)
s=icon('crystal');s.oval(1,13,14,3,DARK);s.poly([(3,13),(1,8),(3,5),(6,9),(6,14)],TEAL);s.poly([(5,12),(5,4),(8,0),(11,4),(11,12),(8,15)],PURPLE);s.line(8,2,8,13,CREAM);s.line(6,5,8,3,BLUE);s.poly([(10,14),(10,8),(13,5),(15,9),(13,14)],BLUE,TEAL)
s=icon('compass');s.oval(5,0,6,4,TAN);s.oval(1,2,14,14,TAN,WOOD);s.oval(3,4,10,10,CREAM);s.poly([(8,4),(5,10),(8,9)],RED,RED);s.poly([(8,9),(10,10),(7,13)],TEAL,TEAL);s.dot(8,5,INK);s.dot(4,9,INK);s.dot(12,9,INK)
s=icon('trophy');s.oval(0,2,6,7,GOLD,WOOD);s.oval(10,2,6,7,GOLD,WOOD);s.poly([(3,1),(12,1),(11,8),(8,10),(5,8)],GOLD,WOOD);s.rect(5,2,2,5,CREAM);s.rect(7,10,2,3,TAN);s.box(3,13,10,3,WOOD);s.rect(6,14,4,1,GOLD)

if __name__=='__main__':
    assert len(sprites)==43
    for name,s in sprites.items():s.save(name)
    print('Wrote 43 new icons; kept the 7 original icons unchanged.')
