import pandas as pd
from jarvis.db.figshare import data

d = data("dft_2d")
df = pd.DataFrame(d)

print(f"Filas originales: {len(df)} | Columnas: {len(df.columns)}")

tipos_complejos = (dict, list, tuple, set)

for col in df.columns:
    serie_raw = df[col]

    # Detectar elementos no escalares (dict, list, tuple, set)
    es_complejo = serie_raw.map(lambda x: isinstance(x, tipos_complejos))
    n_complejos = int(es_complejo.sum())

    print("=" * 65)
    print(f"Columna: {col}")

    # Si la columna tiene elementos complejos (o todos lo son), clasificar como Estructurada / Compleja
    if n_complejos > 0:
        tipos_encontrados = (
            serie_raw[es_complejo]
            .map(lambda x: type(x).__name__)
            .value_counts()
            .to_dict()
        )
        n_otros = len(serie_raw) - n_complejos
        print(
            f"  Tipo: Estructurada / Compleja | Elementos complejos: {n_complejos} "
            f"| Otros/NaN: {n_otros}"
        )
        print(f"  Tipos de dato encontrados: {tipos_encontrados}")
        continue

    serie_filtrada = serie_raw

    # Detectar si la columna es numérica
    if pd.api.types.is_numeric_dtype(serie_filtrada):
        serie_num = pd.to_numeric(serie_filtrada, errors="coerce")
    else:
        converted = pd.to_numeric(serie_filtrada, errors="coerce")
        non_na_text = serie_filtrada.dropna().astype(str).str.strip().str.lower()
        non_na_text = non_na_text[non_na_text != "na"]
        num_validos = int(converted.notna().sum())
        es_numerica = (num_validos > 0) and (
            len(non_na_text) == 0 or (num_validos / max(len(non_na_text), 1)) > 0.5
        )
        serie_num = converted if es_numerica else None

    if serie_num is not None:
        validos = serie_num.dropna()
        n_na = int(serie_num.isna().sum())
        if len(validos) > 0:
            print(f"  Tipo: Numérica | Válidos: {len(validos)} | NaN/na: {n_na}")
            print(f"  Intervalo: [{validos.min():.6g}, {validos.max():.6g}]")
        else:
            print(f"  Tipo: Numérica (sin valores numéricos válidos) | NaN/na: {n_na}")
    else:
        cat_series = serie_filtrada.dropna().map(
            lambda x: str(x).strip() if not isinstance(x, str) else x.strip()
        )
        cat_series = cat_series[cat_series != ""]

        primeras_10 = list(dict.fromkeys(cat_series.tolist()))[:10]
        total_categorias = int(cat_series.nunique())

        print(f"  Tipo: Cualitativa | Categorías distintas: {total_categorias}")
        if total_categorias > 10:
            print(f"  Primeras 10 categorías encontradas: {primeras_10}")
        else:
            print(f"  Categorías encontradas: {primeras_10}")