import pandas as pd
from jarvis.core.atoms import Atoms
from jarvis.db.figshare import data

d = data("dft_2d")
print(d[0].keys())
print(len(d))

a = Atoms.from_dict(d[0]["atoms"])
print(a)

df = pd.DataFrame(d)
print(df)

df.to_csv("dft_2d_completo.csv", index=False, encoding="utf-8")