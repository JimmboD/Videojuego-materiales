"""
Crystal Dash - Pipeline de datos
================================
Genera ../docs/data/materials_db.json y ../docs/data/materials_db.js
(el .js permite abrir el juego con doble clic, sin servidor).

Fuentes:
  * Materiales 2D: se leen del CSV local de JARVIS-DFT (dft_2d_completo.csv):
    jid, spg_symbol, bandgap (MBJ si existe, si no OptB88vdW), magmom y
    energía de exfoliación (usada como "ehull" respecto al bulk laminar).
  * Materiales bulk: semilla curada con valores de referencia/experimentales.
    Con --jarvis3d se refrescan densidad, B, G, bandgap, magmom/átomo y ehull
    desde JARVIS dft_3d (requiere red y jarvis-tools; descarga ~ cientos de MB).
  * κ, Tm, Tc y T_Curie no existen (o son escasos) en JARVIS: siempre curados.

Uso:
  python build_materials_db.py            # offline (CSV local + semilla)
  python build_materials_db.py --jarvis3d # además consulta JARVIS dft_3d
"""
import argparse
import ast
import json
import math
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CSV_2D = HERE / "dft_2d_completo.csv"
OUT_DIR = HERE.parent / "docs" / "data"

RHO_REF = 5.0   # g/cm3 -> gravity_scale = 1
ALPHA = 0.45    # exponente de gravedad efectiva
KAPPA_REF = 400.0

# --------------------------------------------------------------------------
# Semilla curada (bulk). Unidades: rho g/cm3, B/G GPa, Eg eV, kappa W/mK,
# magmom uB/atomo, Tc K, ehull eV/atomo, Tm K, curie K.
# tier: 0 = inicial, 1..4 coste creciente. hidden = solo producto de decaimiento.
# --------------------------------------------------------------------------
SEED = [
    # id, formula, nombre, spg, rho, B, G, Eg, kappa, magmom, Tc, ehull, Tm, curie, tier, color, extra
    ("C-diamond", "C", "Diamante", "Fd-3m", 3.51, 442, 535, 5.47, 2000, 0, 0, 0.13, 3823, 0, 0, "#bff3ff", {"decay_to": "C-graphite"}),
    ("Fe", "Fe", "Hierro α", "Im-3m", 7.87, 170, 82, 0, 80, 2.22, 0, 0, 1811, 1043, 0, "#9aa4ad", {}),
    ("Cu", "Cu", "Cobre", "Fm-3m", 8.96, 140, 48, 0, 401, 0, 0, 0, 1358, 0, 0, "#e08a4f", {}),
    ("Pb", "Pb", "Plomo", "Fm-3m", 11.34, 46, 5.6, 0, 35, 0, 7.2, 0, 600, 0, 0, "#7d8aa3", {}),
    ("C-graphite", "C", "Grafito", "P6_3/mmc", 2.26, 34, 5, 0, 150, 0, 0, 0, 3900, 0, 9, "#4a4f57", {"hidden": True}),
    ("S", "S", "Azufre α", "Fddd", 2.07, 8, 3, 2.6, 0.27, 0, 0, 0, 388, 0, 9, "#e6d34a", {"hidden": True}),
    ("Al", "Al", "Aluminio", "Fm-3m", 2.70, 76, 26, 0, 237, 0, 1.18, 0, 933, 0, 1, "#c9d1d9", {}),
    ("Li", "Li", "Litio", "Im-3m", 0.534, 11, 4.2, 0, 85, 0, 0, 0, 454, 0, 1, "#d9c6f0", {}),
    ("Mg", "Mg", "Magnesio", "P6_3/mmc", 1.74, 45, 17, 0, 156, 0, 0, 0, 923, 0, 1, "#b8c4b0", {}),
    ("Si", "Si", "Silicio", "Fd-3m", 2.33, 98, 66, 1.12, 149, 0, 0, 0, 1687, 0, 1, "#5b6ea8", {}),
    ("Ni", "Ni", "Níquel", "Fm-3m", 8.91, 180, 76, 0, 91, 0.62, 0, 0, 1728, 627, 1, "#a7b59a", {}),
    ("SiO2", "SiO2", "Cuarzo α", "P3_221", 2.65, 37.5, 44.3, 9.0, 8, 0, 0, 0, 1986, 0, 1, "#f2f2ff", {}),
    ("Ti", "Ti", "Titanio", "P6_3/mmc", 4.51, 110, 44, 0, 22, 0, 0.39, 0, 1941, 0, 2, "#8f97a8", {}),
    ("Ge", "Ge", "Germanio", "Fd-3m", 5.32, 75, 55, 0.66, 60, 0, 0, 0, 1211, 0, 2, "#7f8fa0", {}),
    ("GaAs", "GaAs", "Arseniuro de galio", "F-43m", 5.32, 75, 46, 1.42, 55, 0, 0, 0, 1511, 0, 2, "#5e7f6b", {}),
    ("Ag", "Ag", "Plata", "Fm-3m", 10.49, 100, 30, 0, 429, 0, 0, 0, 1235, 0, 2, "#e8eef5", {}),
    ("Co", "Co", "Cobalto", "P6_3/mmc", 8.90, 180, 75, 0, 100, 1.72, 0, 0, 1768, 1388, 2, "#5c7fb8", {}),
    ("Al2O3", "Al2O3", "Alúmina (zafiro)", "R-3c", 3.99, 252, 163, 8.8, 30, 0, 0, 0, 2345, 0, 2, "#7fb3ff", {}),
    ("ZrO2", "ZrO2", "Zirconia (YSZ)", "Fm-3m", 6.05, 175, 76, 5.8, 2.0, 0, 0, 0, 2988, 0, 2, "#f5efe0", {}),
    ("Au", "Au", "Oro", "Fm-3m", 19.30, 180, 27, 0, 318, 0, 0, 0, 1337, 0, 3, "#f2c94c", {}),
    ("W", "W", "Tungsteno", "Im-3m", 19.25, 310, 161, 0, 173, 0, 0.015, 0, 3695, 0, 3, "#6d7480", {}),
    ("Gd", "Gd", "Gadolinio", "P6_3/mmc", 7.90, 38, 22, 0, 10.6, 7.6, 0, 0, 1585, 293, 3, "#b0c4c8", {}),
    ("SiC", "SiC", "Carburo de silicio 3C", "F-43m", 3.21, 225, 192, 2.36, 360, 0, 0, 0, 3003, 0, 3, "#3d5a4a", {}),
    ("Inconel718", "Ni-Cr-Fe", "Inconel 718", "Fm-3m", 8.19, 159, 77, 0, 11.4, 0, 0, 0, 1609, 0, 3, "#9c8f7a", {"alloy": True}),
    ("MgB2", "MgB2", "Diboruro de magnesio", "P6/mmm", 2.57, 151, 118, 0, 25, 0, 39, 0, 1100, 0, 3, "#3fa7a0", {}),
    ("Nd2Fe14B", "Nd2Fe14B", "Imán de neodimio", "P4_2/mnm", 7.60, 110, 64, 0, 9, 2.2, 0, 0, 1458, 585, 3, "#c0c6cf", {"anisotropy": 1.5}),
    ("Os", "Os", "Osmio", "P6_3/mmc", 22.59, 405, 222, 0, 87, 0, 0.66, 0, 3306, 0, 4, "#4d6a8a", {}),
    ("BN-cubic", "BN", "Nitruro de boro cúbico", "F-43m", 3.48, 376, 401, 6.4, 740, 0, 0, 0.0, 3246, 0, 4, "#ffd9a8", {}),
    ("YBCO", "YBa2Cu3O7", "YBCO (cuprato)", "Pmmm", 6.38, 110, 50, 0, 5, 0, 92, 0, 1300, 0, 4, "#2b2b3a", {}),
    ("H3S", "H3S", "Sulfuro de hidrógeno (H3S)", "Im-3m", 2.10, 90, 60, 0, 10, 0, 203, 0.50, 600, 0, 4, "#c8ff6a",
     {"decay_to": "S", "note": "Superconductor real solo a ~150 GPa; aquí metaestable a presión ambiente."}),
]

# Materiales 2D tomados del CSV local de JARVIS dft_2d (jid real).
# Se completan con valores de literatura (densidad del bulk laminar,
# B/G equivalentes 3D, kappa, Tm, Tc) que JARVIS 2D no provee.
TWO_D = [
    # jid, id, nombre, rho, B, G, kappa, Tm, Tc, tier, color, decay_to
    ("JVASP-667", "graphene", "Grafeno", 2.26, 420, 430, 3000, 3900, 0, 4, "#1f2a30", "C-graphite"),
    ("JVASP-688", "hBN", "Nitruro de boro hexagonal 2D", 2.10, 250, 230, 400, 3246, 0, 3, "#f0f4ff", None),
    ("JVASP-664", "MoS2", "Disulfuro de molibdeno 2D", 5.06, 120, 70, 35, 2648, 0, 2, "#5a6e8c", None),
    ("JVASP-655", "NbSe2", "Diseleniuro de niobio 2D", 6.30, 60, 30, 15, 1500, 3.0, 3, "#6b5a8c", None),
    ("JVASP-60235", "phosphorene", "Fosforeno (P negro 2D)", 2.69, 36, 20, 30, 883, 0, 2, "#30343a", None),
]


def num(v):
    """Convierte a float; 'na', vacío o NaN -> None."""
    try:
        f = float(v)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def lattice_from_spg(spg, formula):
    s = spg.replace(" ", "")
    if s == "Fd-3m":
        return "diamond"
    if s == "F-43m":
        return "zincblende"
    if s.startswith("F") and ("-3" in s or "m3" in s):
        return "fcc"
    if s.startswith("I") and ("-3" in s or "m3" in s):
        return "bcc"
    if s.startswith("P") and "-3m" in s and s[1] in "mn":
        return "sc"
    if "6_3" in s:
        return "hcp"
    if "6" in s:
        return "hex"
    if s.startswith("R") or "3" in s:
        return "trigonal"
    if "4" in s:
        return "tetragonal"
    return "orthorhombic"


def engine_constants(m):
    rho, B, G = m["density"], m["bulk_modulus"], m["shear_modulus"]
    kappa, eg, ehull = m["thermal_conductivity"], m["bandgap"], m["ehull"]
    young = 9 * B * G / (3 * B + G) if (3 * B + G) > 0 else 0
    pugh = B / G if G > 0 else 99
    if eg < 0.1:
        elec = "metal"
    elif eg < 3.0:
        elec = "semiconductor"
    else:
        elec = "insulator"
    metastable = ehull > 0.05
    return {
        "gravity_scale": round(min(2.2, max(0.45, (rho / RHO_REF) ** ALPHA)), 3),
        "break_threshold": B,
        "shear_threshold": G,
        "young_modulus": round(young, 1),
        "pugh_ratio": round(pugh, 2),
        "ductile": pugh > 1.75,
        "heat_rate": round(min(2.5, max(0.05, math.sqrt(kappa / KAPPA_REF))), 3),
        "elec_class": elec,
        "arc_activation_T": round(300 + 300 * eg) if elec == "semiconductor" else None,
        "mag_strength": round(m["magmom"] * m.get("anisotropy", 1.0), 3),
        "metastable": metastable,
        "decay_time": round(14 / math.sqrt(ehull / 0.05), 1) if metastable else None,
    }


def from_seed(row):
    (mid, formula, name, spg, rho, B, G, eg, kappa, mag, tc, ehull, tm, curie, tier, color, extra) = row
    m = {
        "id": mid, "jid": None, "formula": formula, "name": name, "spg_symbol": spg,
        "density": rho, "bulk_modulus": B, "shear_modulus": G, "bandgap": eg,
        "thermal_conductivity": kappa, "magmom": mag, "tc_supercon": tc, "ehull": ehull,
        "melting_point": tm, "curie_T": curie, "tier": tier, "color": color,
        "source": "Referencia experimental / literatura (curado)",
    }
    m.update(extra)
    return m


def load_2d():
    out = []
    if not CSV_2D.exists():
        print(f"[2D] No se encontró {CSV_2D.name}; se omiten materiales 2D.")
        return out
    import pandas as pd
    df = pd.read_csv(CSV_2D, low_memory=False).set_index("jid")
    for jid, mid, name, rho, B, G, kappa, tm, tc, tier, color, decay in TWO_D:
        if jid not in df.index:
            print(f"[2D] {jid} no está en el CSV, omitido.")
            continue
        r = df.loc[jid]
        eg = num(r.get("mbj_bandgap"))
        if eg is None:
            eg = num(r.get("optb88vdw_bandgap")) or 0.0
        exf = num(r.get("exfoliation_energy"))  # meV/atomo
        try:
            nat = len(ast.literal_eval(r["atoms"])["elements"])
        except Exception:
            nat = 1
        mag = (num(r.get("magmom_oszicar")) or 0.0) / max(1, nat)
        m = {
            "id": mid, "jid": jid, "formula": r["formula"], "name": name,
            "spg_symbol": r["spg_symbol"], "density": rho, "bulk_modulus": B,
            "shear_modulus": G, "bandgap": round(eg, 3), "thermal_conductivity": kappa,
            "magmom": round(mag, 3), "tc_supercon": tc,
            "ehull": round(exf / 1000.0, 4) if exf else 0.0,
            "melting_point": tm, "curie_T": 0, "tier": tier, "color": color,
            "two_d": True,
            "source": "JARVIS-DFT 2D (CSV local): jid, spg, Eg, magmom, E_exf→ehull; resto literatura",
        }
        if decay:
            m["decay_to"] = decay
        out.append(m)
        print(f"[2D] {jid:12s} {m['formula']:8s} Eg={m['bandgap']:.2f} eV  ehull(exf)={m['ehull']:.3f}")
    return out


def refresh_from_jarvis3d(materials):
    from jarvis.db.figshare import data
    print("[3D] Descargando/leyendo JARVIS dft_3d (puede tardar)...")
    d3 = data("dft_3d")
    idx = {}
    for e in d3:
        idx.setdefault((e.get("formula"), e.get("spg_symbol")), []).append(e)
    for m in materials:
        if m.get("two_d") or m.get("alloy"):
            continue
        cands = idx.get((m["formula"], m["spg_symbol"]), [])
        cands = [c for c in cands if num(c.get("ehull")) is not None]
        if not cands:
            print(f"[3D] sin coincidencia para {m['formula']} {m['spg_symbol']}")
            continue
        best = min(cands, key=lambda c: num(c["ehull"]))
        nat = len(best["atoms"]["elements"]) or 1
        m["jid"] = best["jid"]
        for key, src in (("density", "density"), ("bulk_modulus", "bulk_modulus_kv"),
                         ("shear_modulus", "shear_modulus_gv"), ("ehull", "ehull")):
            v = num(best.get(src))
            if v is not None and v > 0 or key == "ehull" and v is not None:
                m[key] = round(v, 3)
        eg = num(best.get("mbj_bandgap"))
        if eg is None:
            eg = num(best.get("optb88vdw_bandgap"))
        if eg is not None:
            m["bandgap"] = round(eg, 3)
        mag = num(best.get("magmom_oszicar"))
        if mag is not None:
            m["magmom"] = round(abs(mag) / nat, 3)
        m["source"] = "JARVIS-DFT 3D (ρ, B, G, Eg, magmom, ehull) + literatura (κ, Tm, Tc, T_Curie)"
        print(f"[3D] {m['formula']:10s} -> {m['jid']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jarvis3d", action="store_true", help="refrescar bulk desde JARVIS dft_3d")
    args = ap.parse_args()

    materials = [from_seed(r) for r in SEED]
    if args.jarvis3d:
        refresh_from_jarvis3d(materials)
    materials += load_2d()

    for m in materials:
        m["lattice"] = lattice_from_spg(m["spg_symbol"], m["formula"])
        m["engine"] = engine_constants(m)
        m["cost"] = [0, 400, 1200, 3000, 6500][m["tier"]] if m["tier"] <= 4 else 0

    db = {
        "version": 1,
        "constants": {"rho_ref": RHO_REF, "alpha": ALPHA, "kappa_ref": KAPPA_REF},
        "materials": materials,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = json.dumps(db, ensure_ascii=False, indent=1)
    (OUT_DIR / "materials_db.json").write_text(text, encoding="utf-8")
    (OUT_DIR / "materials_db.js").write_text("window.MATERIALS_DB = " + text + ";\n", encoding="utf-8")
    print(f"OK: {len(materials)} materiales -> {OUT_DIR}")


if __name__ == "__main__":
    main()
