ART / BACKGROUNDS
=================

Drop background images and other art here. Nothing is wired up yet —
just tell Claude which screen to hook a file into when you're ready.

Recommended specs
-----------------
- Design at a 16:9 retro base resolution (pick one):
    320 x 180   chunky / very retro
    480 x 270   balanced  <- recommended starting point
    640 x 360   finer detail
- Draw at 1x (a literal 480x270 file). Don't pre-scale; CSS scales it up
  crisply with image-rendering: pixelated.
- Export as PNG (lossless, supports transparency).

Aspect-ratio note
-----------------
The game fills the whole browser window, which isn't always 16:9.
Backgrounds will be shown with background-size: cover (fills the window,
crops the overflow), so:
  - Keep important content in the centered ~80% "safe zone."
  - Let the outer edges be bleed (wall, floor, sky) that can be cropped.
