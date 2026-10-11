# Docker Desktop — v0.4

Din folderul proiectului, cu Linux containers active:

```powershell
docker compose up --build -d
docker compose ps
```

Deschide http://localhost:4173. Cele patru containere trebuie să fie healthy: app, catalog, simulation, models. `/api/config` indică `mode: docker`.

```powershell
docker compose logs --tail 100 app catalog simulation models
docker compose down
```

`down` oprește serviciile și păstrează volumul de modele. Nu adăuga `-v` dacă vrei păstrarea lui. Modificările locale se aplică prin `docker compose up --build -d`, apoi reîncarcă pagina.

## Date

Modelul de lucru se salvează automat în browser. Butonul **Salvează în Docker** păstrează explicit un snapshot în serviciul models, volumul `factory-models`. Reviziile previn suprascrierea unei salvări concurente. Nu există colaborare live sau merge. Folosește export/import JSON pentru backup și transfer între site-ul public și localhost; originile au stocări independente.

Gateway-ul este expus numai pe calculatorul local; catalog/simulation/models sunt în rețea internă. Nu există autentificare/permisiuni pe proiect. Publicarea site-ului Sites nu publică aceste containere pe internet.

Vezi [GHID_V04.md](GHID_V04.md) pentru utilizare și [ARCHITECTURE.md](ARCHITECTURE.md) pentru cod/API-uri și limite.
