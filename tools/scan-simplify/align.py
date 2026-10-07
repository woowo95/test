"""Steg 1: läs skanning, räta upp (golv/väggar) och rapportera mått."""
import numpy as np, trimesh

def load_points(path):
    s = trimesh.load(path)
    geoms = list(s.geometry.values()) if hasattr(s, "geometry") else [s]
    return np.vstack([g.vertices for g in geoms])

def ransac_plane(p, normal_hint, tol=0.02, iters=3000, min_dot=0.9, rng=None):
    rng = rng or np.random.default_rng(0)
    best, best_n = None, 0
    for _ in range(iters):
        i = rng.choice(len(p), 3, replace=False)
        n = np.cross(p[i[1]] - p[i[0]], p[i[2]] - p[i[0]])
        l = np.linalg.norm(n)
        if l < 1e-9: continue
        n /= l
        if abs(n @ normal_hint) < min_dot: continue
        if n @ normal_hint < 0: n = -n
        d = -n @ p[i[0]]
        cnt = int((np.abs(p @ n + d) < tol).sum())
        if cnt > best_n: best, best_n = (n, d), cnt
    n, d = best
    inl = p[np.abs(p @ n + d) < tol]
    # förfina med SVD
    c = inl.mean(0); u, s_, vt = np.linalg.svd(inl - c)
    n2 = vt[2] if vt[2] @ n > 0 else -vt[2]
    return n2, -n2 @ c, len(inl)

def rot_to(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v = np.cross(a, b); c = a @ b
    if np.linalg.norm(v) < 1e-12: return np.eye(3)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


def align_van(P):
    """Returnerar punkter i bilens koordinatsystem (meter):
    x = längd från främre väggen (hytt) mot bakdörrar, z = upp från golv,
    y = från vänster vägg (färdriktning) mot höger. Högerhänt, ingen spegling."""
    up = np.array([0, 1, 0.])
    low = P[P[:, 1] < np.percentile(P[:, 1], 30)]
    n, d, _ = ransac_plane(low, up)
    R1 = rot_to(n, np.array([0, 0, 1.]))
    Q = P @ R1.T
    fl = Q[(Q[:, 2] > np.percentile(Q[:, 2], 2)) & (Q[:, 2] < np.percentile(Q[:, 2], 2) + 0.12)]
    # golvets nivå = tätaste höjden i nedre delen
    h, e = np.histogram(Q[:, 2], bins=np.arange(Q[:, 2].min(), Q[:, 2].min() + 1.0, 0.01))
    Q[:, 2] -= e[np.argmax(h)] + 0.005
    # yaw: maximera "väggighet" i höjdband mitt i lasten
    mid = Q[(Q[:, 2] > 0.5) & (Q[:, 2] < 1.5)]
    best = (-1, 0)
    for ang in np.arange(-90, 90, 0.25):
        a = np.radians(ang); c, s = np.cos(a), np.sin(a)
        hu, _ = np.histogram(mid[:, 0] * c + mid[:, 1] * s, bins=150)
        hv, _ = np.histogram(-mid[:, 0] * s + mid[:, 1] * c, bins=150)
        sc = (hu.astype(float) ** 2).sum() + (hv.astype(float) ** 2).sum()
        if sc > best[0]: best = (sc, ang)
    a = np.radians(best[1])
    Rz = np.array([[np.cos(a), np.sin(a), 0], [-np.sin(a), np.cos(a), 0], [0, 0, 1]])
    Q = Q @ Rz.T
    # längdaxel = den längre utsträckningen (robust)
    ex = np.percentile(Q[:, 0], 98) - np.percentile(Q[:, 0], 2)
    ey = np.percentile(Q[:, 1], 98) - np.percentile(Q[:, 1], 2)
    if ey > ex:  # rotera 90° om z
        Q = Q @ np.array([[0, 1, 0], [-1, 0, 0], [0, 0, 1]]).T
    return Q
