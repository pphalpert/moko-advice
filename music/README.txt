MUSIC
=====
All files are optional — anything missing just stays silent.

    title.mp3            title & menu music (already here)
    intro.mp3            plays during the opening cutscene
    ending_normal.mp3    plays over the Normal Ending
    ending_secret.mp3    plays over the Secret Ending

characters/
-----------
Per-character themes that play while that character is in the castle
booth. Name the file exactly after the character:

    characters/Keira.mp3
    characters/Rachel George.mp3      (spaces are fine)
    characters/Zaara-Zoeya.mp3

No wiring needed — the game looks the file up by character name.
To point a character somewhere else, add a music field in script.js:
    music: 'music/whatever.mp3'

Volume follows the Sound slider; the Music toggle silences themes too.
