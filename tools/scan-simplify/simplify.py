#!/usr/bin/env python3
"""Förenkla en 3D-skanning av en skåpbil till fordonsmodell (JSON, cm).

Användning:  python3 -I simplify.py skanning.glb --mått mått.json --ut bil.json --bild förhandsvisning.png

Koordinater i JSON (cm): x = längd från främre väggen (hytt) bakåt,
y = bredd från vänster vägg i färdriktningen, z = höjd från golv.
Skanningen används för att rätta upp bilen, kontrollera måtten och hitta hjulhus.
Handmätta mått (--mått) har företräde framför skanningen.
"""
import argparse, json, sys
import numpy as np
from align import load_points, align_van


def measure(Q):
    """Mät innerrummet i skanningen (meter). Returnerar dict och punkter flyttade så front/vänster/golv = 0."""
    hx, ex = np.histogram(Q[:, 0], bins=np.arange(Q[:, 0].min(), Q[:, 0].max(), 0.02))
    # bakre ände: sista täta skiktet (ramp/dörr). Främre vägg: kraftigaste toppen i första halvan
    dense = hx > 0.5 * np.percentile(hx[hx > 0], 90)
    centers = ex[:-1] + 0.01
    rear_candidates = centers[(hx > 0.45 * hx.max())]
    front = centers[:len(centers) // 2][np.argmax(hx[:len(centers) // 2])]
    rear = rear_candidates.max()
    C = Q[(Q[:, 0] > front + 0.3) & (Q[:, 0] < front + 2.8)]
    mid = C[(C[:, 2] > 0.3) & (C[:, 2] < 1.0)]
    left = np.percentile(mid[:, 1], 3)
    right = np.percentile(mid[:, 1], 97)
    top = np.percentile(C[:, 2], 98)
    return dict(front=front, rear=rear, left=left, right=right, top=top, floor=0.0), (front, left)


def build_model(m, args):
    """Sätt ihop modellen: grundlåda + kilar + hjulhus + blockerade zoner + fästpunkter."""
    W = m["bredd_mitten"]; H = m["hojd"]; L = m["djup_till_ramp"]
    roof_w = m["bredd_tak"]
    wedge = (W - roof_w) / 2            # inåt per sida i taknivå
    z0 = m["kil_start_hojd"]
    arch_in = (W - m["bredd_mellan_hjulhus"]) / 2
    a = m["hjulhus"]
    tillagg = []
    for side in ("vanster", "hoger"):
        y_in = 0 if side == "vanster" else W - wedge
        tillagg.append({"namn": f"takkil_{side}", "form": "kil_tak", "sida": side,
                        "x": [0, L], "z": [z0, H], "inat_vid_tak_cm": round(wedge, 1),
                        "kalla": "mätt bredd mitten/tak + skanning (start på höjd)"})
        tillagg.append({"namn": f"hjulhus_{side}", "form": "lada", "sida": side,
                        "x": [a["x_fran"], a["x_till"]], "z": [0, a["hojd"]],
                        "inat_cm": round(arch_in, 1), "kalla": "mätt avstånd mellan hjulhus + skanning (läge/höjd)"})
    ramp = m["ramp"]
    zoner = [{"namn": "ramp_utstick_nere", "x": [L, L + ramp["utstick_djup"]],
              "y": [(W - ramp["utstick_bredd"]) / 2, (W + ramp["utstick_bredd"]) / 2],
              "z": [0, ramp["utstick_hojd"]], "status": "ANTAGANDE – bekräfta"},
             {"namn": "rampräcken_sidor", "bredd_cm": ramp["racke_bredd"], "status": "ANTAGANDE – bekräfta"}]
    return W, H, L, tillagg, zoner


def fastpunkter(W, L):
    P = []
    def add(x, y, z, typ, not_=""): P.append({"x": round(x, 1), "y": round(y, 1), "z": round(z, 1), "typ": typ, **({"not": not_} if not_ else {})})
    # Framvägg (kortsida mot hytt)
    add(0, 10, 10, "fast"); add(0, W - 10, 10, "fast")
    add(0, W - 14, 158, "fast", "endast höger sida i färdriktningen")
    add(0, W - 7, 80, "fast", "ANTAGANDE: höger sida (mening följde på 158 cm-fästet)")
    # Golvfästen 12 cm från sidovägg, avstånd från främre väggen (ANTAGANDE)
    for x in (110, 145, 188):
        add(x, 12, 0, "golv", "ANTAGANDE: avstånd mätt från främre väggen")
        add(x, W - 12, 0, "golv", "ANTAGANDE: avstånd mätt från främre väggen")
    # Höjd 161 cm
    for x in (23, 112, 199, 281): add(x, 0, 161, "vagg")
    for x in (199, 281): add(x, W, 161, "vagg")
    return P


def lister():
    """Kontinuerliga fästlister på höjd 80,5 cm (fäste var 2,5 cm)."""
    return [
        {"sida": "vanster", "z": 80.5, "pitch": 2.5, "segment": [[12, 139], [156.5, 307.5]]},
        {"sida": "hoger", "z": 80.5, "pitch": 2.5, "segment": [[157, 307.5]]},
    ]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("skanning"); ap.add_argument("--mått", required=True); ap.add_argument("--ut", default="bil.json")
    ap.add_argument("--bild", default="forhandsvisning.png"); ap.add_argument("--namn", default="Bil")
    args = ap.parse_args()
    m = json.load(open(args.mått))
    Q = align_van(load_points(args.skanning))
    s, _ = measure(Q)
    scan = {"lengd_front_till_ramp_cm": round((s["rear"] - s["front"]) * 100, 1),
            "bredd_cm": round((s["right"] - s["left"]) * 100, 1), "hojd_cm": round(s["top"] * 100, 1)}
    W, H, L, tillagg, zoner = build_model(m, args)
    model = {"namn": args.namn, "typ": "bil", "enhet": "cm",
             "koordinater": "x=längd från främre vägg bakåt, y=bredd från vänster vägg (färdriktning), z=höjd från golv",
             "grundlada": {"l": L, "b": W, "h": H},
             "djup_till_stangd_dorr": m["djup_till_dorr"], "maxLast": m.get("maxLast"),
             "tillagg": tillagg, "blockeradeZoner": zoner, "fastlister": lister(),
             "surrningspunkter": fastpunkter(W, L),
             "kontroll_skanning_vs_mått": {"skanning": scan,
                 "matt": {"lengd_front_till_ramp_cm": L, "bredd_cm": W, "hojd_cm": H}}}
    json.dump(model, open(args.ut, "w"), ensure_ascii=False, indent=2)
    print(json.dumps(model["kontroll_skanning_vs_mått"], indent=1, ensure_ascii=False))
    from preview import draw
    draw(Q, s, model, args.bild)


if __name__ == "__main__":
    main()
