# Factory Studio — audit motor și model

Data: 12 octombrie 2026. Bază locală: `228a8583579895cfdc9006744d6f10633f1a4e0b`.
Versiunea inspectată este **0.5.0**, schema JSON **2**. Cererea descrie v0.4; nu am revenit la versiunea veche. Auditul caracterizează sursa locală, nu certifică identitatea unui deployment public sau performanța unei fabrici reale.

Livrare strict fără modificări funcționale: raport, fixture-uri, teste și textul paginii „Metodă și limite”. Nicio schimbare în algoritmul de simulare, schemă, parametri impliciți, API sau stocare. Nicio migrare nouă necesară. Caracterizarea unui comportament nedorit îl face vizibil, nu îl aprobă pentru utilizare industrială.

## 1. Hartă de arhitectură

| Modul | Responsabilitate / traseu |
|---|---|
| `dist/core/model.js` | Constructori, tipuri, parametri, unități, variabile, `effective`, `validateModel`, migrare v1 → v2 |
| `dist/core/mbse.js` | Normalizare și validare MBSE, porturi și relații, `expandedNeeds` pentru resurse directe și personal moștenit prin `staffedBy` |
| `dist/core/phases.js` | Profil manual/automat; fără profil, operație manuală implicită |
| `dist/core/network.js` | DES activ: `simulateNetwork(model, settings=model.settings)`; orchestrare replicări prin `replicate(model)` |
| `dist/core/statistics.js` | Zece KPI agregate; medii, min/max, n și semilățime IC95 Student |
| `dist/model.js`, `dist/network.js`, `dist/mbse.js` | Reexporturi de compatibilitate către modulele core |
| `dist/engine.js` | Motor legacy, testat separat; nu este motorul rețelei canonice curente |
| `dist/studio.js` | Controller UI, mutații validate, undo, import/export, rulare și baseline; modulele `dist/features/*` prezintă modelul și rezultatele |
| `dist/services/client.js` | Detectează browser/Docker, pornește Worker sau POST `/api/simulations`; anulare |
| `dist/network-worker.js` | Web Worker public: invocă același `replicate` |
| `services/simulation/server.mjs`, `worker.mjs` | API și worker thread Node; maximum două simulări simultane, timeout 60 s, heap worker 256 MB |
| `services/models/server.mjs` | Snapshot-uri JSON, revizii optimiste, conflict HTTP 409, scriere atomică prin fișier temporar și rename |
| `services/catalog/*`, `server.mjs`, `compose.yaml` | Catalog, gateway/static app și patru servicii Docker: app, catalog, simulation, models |

Fluxul efectiv:

```text
editare / import JSON → migrate (la import) → normalize/validate → model canonic
model clonat la Run → Worker browser sau API Docker → replicate
→ validate → effective(params + bindings) → expandedNeeds + faze
→ runtime tranzitoriu (cozi, stocuri, resurse, canale, calendar de evenimente)
→ simulateNetwork × N → first + runs + summary → UI / export JSON
```

Pozițiile și selecția unei diagrame nu sunt intrări fizice ale motorului. Elementele referite în mai multe diagrame rămân aceleași obiecte. `flow`, `requires`, `staffedBy`, `consumes`, `produces` afectează execuția; conectorii UML/SysML, porturile, ierarhia și trasabilitatea nu devin automat fluxuri executabile.

## 2. Schema și transformarea modelului

Obiectul rădăcină conține `version`, `name`, `nodes`, `edges`, `variables`, `diagrams`, `library`, `settings`. Setările sunt ore, seed și număr de replicări. Nodurile au ID stabil, tip, nume, parent, params, bindings și metadate MBSE (stereotipuri, porturi, proprietăți, atribute, behavior, MOFLT). O diagramă conține referințe `nodeId` și coordonate, nu copii independente de utilaje.

`effective` substituie valorile variabilelor în parametrii legați. Validatorul verifică unitatea variabilei față de câmp, referințele, valorile, ierarhia, capacitatea și conectivitatea către sink. Timpii sunt în secunde, puterea în kW, energia în kWh, costurile în EUR (ratele în EUR/h), debitul în buc/h. `weight` este pondere de rutare normalizată, `quantity` necesar de resurse/material, `delay` timp pe legătură.

Necesarul direct și cel moștenit se **adună**; aceeași persoană indicată pe ambele căi poate fi cerută de două ori. Procesarea nu mută datele modelului; creează obiecte runtime separate. Subansamblele sunt descriptive dacă nu există relații BOM/flux executabile.

Limite de intrare: 500 noduri, 2.000 relații, 50 diagrame, 1.000 variabile, 20 replicări, 168 h; maximum 100 canale per operație. Garda motorului: două milioane de evenimente, WIP 250.000 și limită pentru trezirile de calendar. Acestea nu demonstrează scalabilitate industrială.

Compatibilitate: v2 se clonează și normalizează; migrarea v1 transformă linii/stații în noduri/relații și păstrează ID-uri. Aceasta nu promite identitate numerică cu fizica motorului legacy. Testele existente de migrare rămân intacte.

## 3. Semantica motorului

- Coada de evenimente ordonează după timp și apoi după ordinea inserării. Sursa emite la t=0; evenimentele la limita orizontului sunt incluse. La interval 60 s și 8 h rezultă 481 sosiri, nu 480.
- Rutare probabilistică pe o singură ieșire; fără fork/join, loturi, tipuri de produs sau genealogie individuală. RNG per nod derivat din seed și ID; schimbarea ID-urilor, ordinii muchiilor sau structurii poate schimba traseul aleator. Seed-ul nu garantează comparații pereche între modele diferite.
- Coada de intrare plus rezervările în tranzit ocupă bufferul. Piesa în procesare nu ocupă un loc din buffer. Backlog-ul extern al sursei intră în WIP și nu are aceeași limită finită.
- Servire FIFO în fiecare coadă; competiția între operații folosește ordinea nodurilor. Este posibilă înfometarea unei linii. Nu există un scheduler echitabil sau optimizator.
- Resursele inițiale și BOM se verifică înaintea pornirii; componentele sunt consumate atunci. Rework consumă BOM din nou. Producția în stoc se face numai după finalizare fără rebut. Stocurile nu modelează asamblarea sincronizată a unor piese individuale.
- Fără faze, operatorul rămâne rezervat pe tot ciclul, inclusiv în reparații. Cu faze, personalul se eliberează la automat și se reobține la manual; resursele tehnice rămân rezervate, inclusiv în așteptarea dintre faze. Reparația reține resursele fazei active, fără echipă separată de mentenanță.
- Setup se plătește la fiecare piesă, în prima fază. Variația uniformă este comună fazelor piesei. Vitezele resurselor active se înmulțesc; latențele se adaugă conform rezervărilor. Nu sunt modele de control CNC/PLC sau execuție software.
- ON/OFF periodic pornește la t=0 și blochează pornirile noi; nu întrerupe operațiile deja începute. MTBF/MTTR sunt exponențiale, per canal de procesare, nu model complet al defectării unei mașini comune.
- După procesare, resursele sunt eliberate **înainte** de așteptarea unui buffer aval liber. Canalul operației rămâne blocat, dar pool-ul poate fi folosit în altă parte. Acest lucru poate supraestima disponibilitatea unui utilaj pe care piesa rămâne fizic blocată.
- Conservare verificată de motor: `arrived = good + scrap + wip`. Toate sink-urile contribuie la `good`; un sink intermediar nu este automat diferențiat de produsul final.

## 4. Rezultate, statistici și persistență

`simulateNetwork` întoarce totaluri, ieșiri, operații, resurse, stocuri, serie temporală și trace. Ocupările sunt fracții din orizont × capacitate. WIP este **final**, nu media temporală a WIP. Lead time privește numai piesele finalizate; cele rămase nu intră în medie sau P95. `resourceWait`/`materialWait` sunt intervale de așteptare ale operației eligibile, nu suma timpilor tuturor pieselor. Trace este limitat la 2.000 intervale, UI afișează un subset; trunchierea trace-ului nu trunchiază KPI.

Energia include numai procesarea; nu include consumul idle/down/blocked. Costul operației include busy/down/phaseWait, nu blocked; costul resurselor urmează ocuparea rezervată. Costul materialelor urmează consumul, inclusiv rework. Folosirea simultană a tarifelor operației și utilajului poate dubla contabilizarea. Nu sunt costuri totale de fabrică, cash-flow sau ROI.

`replicate` păstrează `first` complet, `runs` cu zece KPI scalare și `summary` pe KPI. Seed-urile diferă cu 100003. Cele zece KPI sunt good, wip, scrap, throughput, leadMean, energy și patru costuri. IC95 reprezintă **semilățimea** unui interval Student pentru medie; la n=1 este null. Valori absente sunt excluse, astfel încât n pentru lead time poate fi mai mic decât numărul rulărilor. Intervalul nu acoperă incertitudinea parametrilor sau eroarea de model.

WIP/costurile comparației de scenarii sunt deja agregate în v0.5. Detaliile operațiilor, resurselor, trace-ul și P95 nu sunt agregate între replicări. Diferența mediilor baseline/current nu are IC al diferenței; nu justifică singură o recomandare. Nu există warm-up, criteriu de precizie, experiment design sau test de semnificație implementat.

În browser, modelul se salvează în `localStorage` (`factory-studio-v2`), cu migrare din cheia veche. Rezultatul și baseline sunt în memoria sesiunii; exporturile pot include model+rezultat/comparație, dar nu există arhivă persistentă de experimente. JSON import recreează modelul, nu o bază de rezultate verificabilă.

În Docker, modelul se salvează explicit ca `{id, revision, updatedAt, model}` în volumul models. Reviziile previn suprascrieri concurente, cu serializare per model în procesul serverului. Nu este o bază distribuită cu tranzacții între mai multe instanțe. API-ul de simulare nu persistă joburi sau rezultate. Rolurile sunt navigare, nu autorizare; fără autentificare/RBAC sau colaborare live. Site-ul public nu se sincronizează automat cu volumul Docker.

## 5. Modele de referință și calcule independente

Fixture-uri: `tests/fixtures/audit-models.mjs`. Toate valorile sunt **ASSUMPTION**, sintetice pentru verificare, nu MEASURED sau SPEC comercial. Teste: `tests/characterization.test.mjs`. Seed 42, variație/rebut/defectări zero dacă nu sunt menționate explicit.

| Referință | Calcul / rezultat caracterizat | Slăbiciune fixată explicit în test |
|---|---|---|
| Linie 60 → 90 → 45 s, sursă 1 s, 1 h | Prima piesă la 195 s, apoi la 90 s: `1+floor((3600−195)/90)=38`; 3.601 sosiri | WIP 3.563 include backlog extern |
| Două operații 60 s, un operator comun | 60 piese total într-o oră; utilizare operator 100% | Prima linie produce 60, a doua 0; lipsă de echitate |
| Linie 10 → 100 s, buffer 1 | Prima piesă 110 s; 35 produse; upstream 38 procesări și 3.220 s blocare | Pool-ul utilajului deja eliberat în blocked |
| Rework 10 s, patru piese, ieșire/buclă ponderi 1:1 | 4 produse, 17 procesări pentru seed/ID/ordine fixe; 17 consumabile × 2 EUR | Consum repetat; 17 este snapshot stocastic, nu media teoretică |
| Material: stoc 6, necesar 2, 5 EUR/unitate | 3 produse, stoc final 0, cost 30 EUR | 3.570 s așteptare material, fără reaprovizionare |

Teste suplimentare: rezervarea operatorului în reparații; setup 10 s pentru fiecare dintre cinci piese cu ciclu 10 s (100 s procesare totală); ON60/OFF60 cu operație 90 s care se termină la t=90; două variante Section 8. Conservarea, reproductibilitatea și nemodificarea modelului sunt verificate în cazurile relevante.

### Exercițiul Section 8 — 8 ore, o replicare

Configurație: sursă 60 s → Preparation 30 s → Assembly 45 s → Test 90 s → Final product. Capacități 1, buffere de operații 10, operator comun cap1 pentru Preparation și Assembly, test bench cap1 pentru Test. Fără faze explicite, setup, pierderi sau întârzieri de transfer.

Limitele independente sunt: sursă `3600/60=60 buc/h`; operator `3600/(30+45)=48 buc/h`; banc `3600/90=40 buc/h`. Minimul este **40 buc/h**. Primul produs apare la `30+45+90=165 s`; bancul rămâne alimentat. Rezultat așteptat: `1+floor((28800−165)/90)=319`, adică **39,875 buc/h**, cu WIP final 162. Toleranța față de plafonul 320 este **o piesă** pentru pornire și orizont finit, nu eroare numerică. Testul cere exact 319.

La Test=60 s, plafonul devine **48 buc/h**, adică 384 echivalente de piese în 8 h. Motorul curent produce **379**, adică **47,375 buc/h**, WIP final 102. Nu este corect să numim toată diferența „startup”. Operatorul este ocupat integral: 390 pregătiri și 380 asamblări consumă `390×30 + 380×45 = 28800 s`. Zece piese sunt pregătite dar neasamblate, iar una este asamblată și încă la test. Bilanțul este `379×75 + 10×30 + 1×75 = 28800 s`.

Prin urmare toleranța de caracterizare față de 384 este **cinci piese / 0,625 buc/h**, explicată exact de munca rămasă în WIP, pentru această ordine de noduri și aceste buffere. Nu este o toleranță universală pentru alte linii sau schedulere. Testul cere exact 379 și bilanțul de muncă, nu doar încadrarea într-un procent larg. Prima piesă ar apărea la 135 s; o simplă corecție de pornire cu cadență constantă 75 s ar prezice 383, nu comportamentul actual al schedulerului.

O replicare deterministică nu estimează incertitudine statistică: IC este null în ambele teste. Aceste limite sunt calcule de capacitate, nu recomandări de investiție validate.

## 6. Gap-uri față de cerere și principiile produsului

| Aspect cerut | Starea codului inspectat | Implicație |
|---|---|---|
| Operator rezervat pe operația întreagă, inclusiv repair | Încă adevărat pentru model fără faze; ameliorat în v0.5 prin manual/automat | Nu descrie corect intervenții parțiale fără profil explicit; repair nu are echipă proprie |
| Setup per piesă | Încă adevărat | Lipsesc setup inițial, per lot, familie și matrice de schimbare |
| Calendar doar ON/OFF | Încă adevărat | Lipsesc ture datate, pauze explicite, sărbători, preempție și competențe |
| Statistici limitate | Încă adevărat, dar zece KPI au agregate/IC în v0.5 | Lipsesc IC diferență, warm-up, percentili agregați, variația KPI per resursă |
| WIP/cost comparație neagregate | **Nu mai este adevărat în v0.5** pentru KPI scalare | WIP rămâne final; detaliile operațiilor rămân prima replicare |
| Fiecare număr cu unitate și proveniență | Unități validate pentru bindings; proveniență/calibrare parțială | Modele fără calibration acceptate; setări, ponderi, fracții și variabile fără proveniență individuală obligatorie |
| Recomandare cu efect simulat și incertitudine | Se pot compara rezultate, dar nu există inferență verificată asupra diferenței | Nicio pretenție de optimizare garantată sau recomandare cu nivel de încredere |
| Model unic, relații descriptive distincte | Implementat ca structură și semantică de execuție | Porturile/UML nu trebuie prezentate ca logică executabilă; auditul nu certifică exhaustiv distincția vizuală în UI |

Alte gap-uri prioritare descoperite: starvation prin ordinea nodurilor; resurse eliberate înainte de blocarea fizică; lipsă de tipuri de produse/rute condiționale/fork-join; WIP extern amestecat cu intern; defectarea per canal în loc de activ comun; rezultate detaliate nepersistate. Prin inspecție, parametrul opțional `settings` al `simulateNetwork` nu este validat separat de `model.settings`; clienții direcți pot ocoli unele verificări. Acest punct nu a fost corectat și nu este un test eșuat.

Prioritatea unei etape viitoare ar trebui să fie contractul semantic pentru aceste cazuri și oracole independente, înainte de noi funcții/UI/3D. Modificarea lor va necesita versiune de motor, note de compatibilitate și actualizarea intenționată a caracterizărilor, nu ajustarea tacită a rezultatelor.

## 7. Verificare și limite ale auditului

Runtime: Node.js 22.18.0 pe Windows. Baseline: **45/45** teste existente trecute. Suita nouă: **10/10** trecute. Comanda completă: `node --test --test-reporter=spec tests/*.test.mjs`; verificarea integrată finală: **55 teste trecute, 0 eșuate, 0 omise**, inclusiv integrarea API catalog/simulation/models și conflictele de revizie. Niciun test de corectitudine nu a eșuat în această etapă. Testele HTTP locale necesită acces loopback; nu necesită acces la fabrica utilizatorului.

Nu sunt benchmark-uri, validare cu date măsurate, certificare INCOSE/SysML, verificare independentă prin FlexSim, testare multi-browser sau un test de deployment Docker complet. Core/API sunt acoperite de testele existente, iar noua suită invocă direct motorul canonic. Nu s-a modificat niciun test vechi. Nu s-a publicat acest audit pe site și nu s-a făcut push în GitHub în această etapă.

Fișiere livrate: acest raport; `tests/fixtures/audit-models.mjs`; `tests/characterization.test.mjs`; text actualizat în `dist/features/help/view.js`. Toate schimbările sunt de documentație sau testare.
