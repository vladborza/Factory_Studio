# Arhitectură v0.5

Module noi: `dist/core/phases.js` (schema fazelor), `dist/core/statistics.js` (sumare), `dist/features/diagrams/phases.js` (editor), `dist/features/simulation/statistics.js` (raport). Motorul comun rulează aceleași faze în Web Worker și serviciul Docker. Ghid: [GHID_V05.md](GHID_V05.md).

# Arhitectură v0.4

## Cod

| Director | Responsabilitate |
|---|---|
| `dist/core` | Schema, validarea, proveniența, semantica MBSE, motorul de simulare |
| `dist/features/diagrams` | Editor vizual, renderer, inspector, validarea conexiunilor |
| `dist/features/library` | Catalog, date comerciale și surse, instanțiere, configurare |
| `dist/features/operator` | Introducere măsurători la post |
| `dist/features/overview` | Tablou de bord |
| `dist/features/calibration` | Proveniența parametrilor |
| `dist/features/simulation`, `scenarios` | Rezultate și comparații |
| `dist/features/staffing`, `engineering`, `repository`, `variables`, `help` | Personal, MBSE, repository, variabile, metodologie |
| `dist/ui` | Navigare, stiluri comune și formatare sigură |
| `dist/services/client.js` | Detectare browser/Docker, API și lansare simulare |
| `dist/studio.js` | Starea aplicației și orchestrarea acțiunilor UI |
| `services` | API-uri Node și gateway |

Fișierele vechi `model.js`, `network.js`, `mbse.js`, `catalog.js`, `diagram-renderer.js` sunt re-exporturi pentru compatibilitate. Motorul este comun ambelor moduri: nu există o formulă diferită pe server.

## Containere

| Serviciu | API | Persistență |
|---|---|---|
| app | Interfața statică, `/api/config`, proxy către servicii | Browser |
| catalog | `GET /api/catalog` | Catalog din sursă |
| simulation | `POST /api/simulations`, corp `{model}` | Worker per execuție, fără joburi persistente |
| models | `GET /api/models`, `GET/PUT /api/models/:id` | Fișiere JSON în `/data`, volum Docker |

Toate au `/healthz`. PUT model primește `{model, expectedRevision}`. Revizia inițială este 0, răspunsul include revizia nouă; 409 indică un conflict. Scrierile sunt serializate per model și înlocuiesc atomic fișierul. Aceasta este o implementare single-writer; nu scala serviciul models în mai multe replici fără o bază de date/tranzacții distribuite.

Simularea acceptă maximum două joburi simultan, 60 secunde/job, 256 MB heap/worker; anularea închide workerul. Requesturile JSON sunt limitate la 10 MB. Simularea publică folosește Web Worker local. Specificațiile comerciale descriptive nu sunt convertite automat în parametri de simulare.

## Modificări uzuale

- Adaugă un model comercial în `references.js`, cu configurație exactă, unități, `referenceValue`, URL producător și data verificării. Adaugă date documentate, nu estimări mascate ca fișă tehnică.
- Un nou parametru numeric necesită schema/limitele în core, semantica în motor, interfața și teste cu rezultate calculate independent.
- Un nou tip de diagramă necesită tipuri/relații permise în MBSE, renderer și teste de validare. Descrie explicit dacă este descriptiv sau executabil.
- Pentru aspect folosește `ui/workspace.css`; pentru o pagină folosește modulul ei `features/.../view.js`.
- Rulează `npm test`, apoi `docker compose up --build -d`. Testele API pornesc servere temporare pe loopback; datele lor sunt într-un director temporar separat.

## Publicare și acces

Sites găzduiește directorul `dist` declarat în `.openai/hosting.json`; nu rulează acest Docker Compose. Sursa și configurația Docker sunt păstrate în proiectul Sites, dar API-urile Docker rulează pe calculatorul local. Pentru o instalare centrală online a containerelor sunt necesare o gazdă, domeniu/TLS, autentificare, permisiuni pe proiect, backup și monitorizare. Nu sunt implementate în v0.4.

Compose expune numai gateway-ul la `127.0.0.1:4173`; backendul folosește o rețea internă. Containerele rulează fără root și cu filesystem read-only, cu excepția volumului models. Acest mod nu oferă încă acces în echipă prin internet și nu trebuie prezentat drept SaaS multi-tenant.

## Tema profesională și culorile diagramelor

Tema vizuală este definită în `dist/ui/professional.css`; paleta semantică comună bibliotecii și diagramelor este în `dist/ui/semantics.js`. Modifică aici culorile familiilor de obiecte și nivelurilor MOFLT. Interiorul obiectelor rămâne deschis, cu accent, pictogramă și stereotip; culoarea nu este singurul identificator.

În bara diagramei, **Culori** comută între familii de obiecte și nivel MOFLT. **Legendă** explică paleta și stilurile liniilor. **Izolează vecinii selecției** estompează obiectele neconectate direct la selecție; nu șterge sau filtrează datele modelului. Aceste opțiuni sunt vizuale și nu schimbă rezultatele simulării. Roșul și portocaliul sunt rezervate erorilor/avertizărilor din interfață, nu culorii implicite a utilajului.


Bibliografia completă: [BIBLIOGRAFIE.md](BIBLIOGRAFIE.md), disponibilă și în aplicație la **Bibliografie & surse**. Documentele publice se regenerează cu `node scripts/build-documentation.mjs`; sursa comună este `dist/features/documentation/references.js`.
