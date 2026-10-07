import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon


def draw(Q, s, model, path):
    P = (Q - np.array([s["front"], s["left"], 0])) * 100  # cm
    W, H, L = model["grundlada"]["b"], model["grundlada"]["h"], model["grundlada"]["l"]
    inside = P[(P[:, 0] > -15) & (P[:, 0] < L + 25) & (P[:, 1] > -15) & (P[:, 1] < W + 15) & (P[:, 2] > -5) & (P[:, 2] < H + 10)]
    fig, ax = plt.subplots(1, 3, figsize=(20, 7))
    col = {"golv": "tab:orange", "fast": "tab:red", "vagg": "tab:red"}
    # Uppifrån (x längs, y tvärs)
    a = ax[0]; a.scatter(inside[:, 0], inside[:, 1], s=.2, c="0.7")
    a.add_patch(Rectangle((0, 0), L, W, fill=False, ec="k", lw=1.5))
    for t in model["tillagg"]:
        if t["form"] == "lada":
            y0 = 0 if t["sida"] == "vanster" else W - t["inat_cm"]
            a.add_patch(Rectangle((t["x"][0], y0), t["x"][1] - t["x"][0], t["inat_cm"], fc="tab:blue", alpha=.5))
    for z in model["blockeradeZoner"]:
        if "x" in z: a.add_patch(Rectangle((z["x"][0], z["y"][0]), z["x"][1] - z["x"][0], z["y"][1] - z["y"][0], fc="tab:red", alpha=.5))
    for p in model["surrningspunkter"]:
        a.plot(p["x"], p["y"], "o", c=col.get(p["typ"], "r"), ms=4)
    for l in model["fastlister"]:
        y = 0 if l["sida"] == "vanster" else W
        for x0, x1 in l["segment"]: a.plot([x0, x1], [y, y], c="tab:green", lw=3)
    a.set_title("Uppifrån (vänster vägg = y 0, hytt = x 0)"); a.set_aspect("equal"); a.invert_yaxis(); a.grid(alpha=.3)
    # Från sidan (x, z) – vänster vägg sedd
    a = ax[1]; a.scatter(inside[:, 0], inside[:, 2], s=.2, c="0.7")
    a.add_patch(Rectangle((0, 0), L, H, fill=False, ec="k", lw=1.5))
    for t in model["tillagg"]:
        if t["form"] == "lada" and t["sida"] == "vanster":
            a.add_patch(Rectangle((t["x"][0], 0), t["x"][1] - t["x"][0], t["z"][1], fc="tab:blue", alpha=.5))
    for p in model["surrningspunkter"]:
        a.plot(p["x"], p["z"], "o", c=col.get(p["typ"], "r"), ms=4)
    for l in model["fastlister"]:
        for x0, x1 in l["segment"]: a.plot([x0, x1], [l["z"]] * 2, c="tab:green", lw=3, alpha=.6)
    a.set_title("Från sidan (x, höjd)"); a.set_aspect("equal"); a.grid(alpha=.3)
    # Tvärsnitt bakifrån (y, z) vid x = 200 (bakom hjulhusen) med skanningens skiva
    a = ax[2]; sl = inside[(inside[:, 0] > 190) & (inside[:, 0] < 215)]
    a.scatter(sl[:, 1], sl[:, 2], s=1, c="0.6")
    t0 = next(t for t in model["tillagg"] if t["form"] == "kil_tak")
    z0 = t0["z"][0]; w = t0["inat_vid_tak_cm"]
    a.add_patch(Polygon([[0, 0], [W, 0], [W, z0], [W - w, H], [w, H], [0, z0]], fill=False, ec="k", lw=1.5))
    a.set_title("Tvärsnitt bakifrån (y, höjd) – modell mot skanning"); a.set_aspect("equal"); a.grid(alpha=.3)
    plt.tight_layout(); plt.savefig(path, dpi=80)
