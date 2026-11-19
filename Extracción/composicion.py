import re
import pandas as pd
from jarvis.db.figshare import data

d = data("dft_2d")
df = pd.DataFrame(d)

no_metales = {"O", "N", "C", "B", "Si", "S", "Se", "Te", "F", "Cl", "Br", "I", "P", "As"}

def extraer_elementos(formula):
    if not isinstance(formula, str):
        return set()
    return set(re.findall(r"[A-Z][a-z]?", formula))

def clasificar_con_semiconductor(row):
    gap = pd.to_numeric(row.get("optb88vdw_bandgap"), errors="coerce")
    elems = extraer_elementos(row.get("formula", ""))

    if pd.isna(gap):
        return "Sin dato de bandgap"
    if gap <= 0.05:
        return "Metálico"
    if gap <= 2.5:
        return "Semiconductor"
    if elems & no_metales:
        return "Cerámico"
    return "Aislante / Otro"

df["clase_juego"] = df.apply(clasificar_con_semiconductor, axis=1)
print(df["clase_juego"].value_counts())