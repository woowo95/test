# scan-simplify

Fristående verktyg som förenklar en 3D-skanning av en bil (GLB/GLTF/OBJ/PLY/STL) till
fordonsmodellen i packplaneringsfliken: grundlåda + tillägg + blockerade zoner + fästpunkter.

    pip install -r requirements.txt
    python3 simplify.py skanning.glb --mått matt_bil1.json --ut bil1.json --bild forhandsvisning.png --namn "Bil 1"

* `align.py` – räter upp skanningen (golvplan, väggar, längdaxel) i bilens koordinatsystem.
* `simplify.py` – mäter skanningen, jämför mot handmätta mått (`--mått` har företräde) och skriver JSON.
* `preview.py` – förhandsvisning uppifrån, från sidan och tvärsnitt med modellen över skanningen.
* Koordinater (cm): x = längd från främre vägg bakåt, y = från vänster vägg i färdriktningen, z = höjd från golv.
* `matt_bil1.json` – handmätta mått för bil 1. Lägg en egen fil per bil.
