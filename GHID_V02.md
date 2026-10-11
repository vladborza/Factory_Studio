# Factory Studio 0.2 — ghid de modelare integrată

## De unde începi

În aplicație, deschide **Diagrame & model**. Modelul v0.1 din browser se migrează automat cu aceleași ID-uri pentru stații și cerințe; copia v0.1 rămâne intactă. Exportă modelul înainte de schimbări majore. Pentru demonstrația nouă folosește **Model nou → Exemplu integrat cu personal, HW, SW și rework**. Modelul gol este disponibil în același dialog. Înlocuirea este reversibilă prin Undo în sesiunea curentă.

## Construiește procesul

1. Din paletă creează o Sursă/comenzi, două sau mai multe Operații și un Produs final. Poți folosi Inspecție/test și Transport ca operații specializate.
2. Selectează sursa, alege relația Flux de produs, apasă Conectează 2 elemente și selectează destinația. Repetă până la produsul final.
3. Selectează relația pentru editarea ponderii și întârzierii de transport. Mai multe ieșiri sunt rute alternative probabilistice, cu ponderi normalizate. Pentru 95% bun și 5% rework setează ponderile 95 și 5, cu bucla către operația de reluare.
4. Trage elementele pe suprafață. Poziția nu modifică timpul de transport: acesta se introduce explicit pe relație, în secunde.
5. Selectează operația și configurează ciclu, capacitate, buffer, variație, setup, rebut, putere, cost, MTBF, MTTR și disponibilitate.

## Adaugă oamenii și echipamentele

Creează Operator/Echipă, Mașină/Robot/Dispozitiv, Hardware/PLC, Senzor, Software/serviciu sau Utilitate. Toate sunt pool-uri de resurse cu capacitate, disponibilitate, viteză, latență și cost. Relația **Necesită resursă** pleacă de la operație către resursă. Cantitatea este necesarul simultan pentru fiecare piesă în procesare.

Aceeași resursă poate servi operații din linii diferite. Un operator cu capacitate 1 nu poate lucra simultan în două locuri. O echipă cu capacitate 3 reprezintă trei unități echivalente, nu trei persoane nominale cu competențe distincte. Necesarele multiple se rezervă atomic; nu există rezervare parțială. O alocare care depășește capacitatea este respinsă înainte de simulare.

Durata unei operații este `(ciclu variabil + setup per piesă) / produsul factorilor de viteză + suma latențelor resurselor`. Factorii se aplică o dată per pool, nu per unitate rezervată. Recomandare: păstrează factorul 1 pentru resursele care nu modifică viteza și atribuie parametrul numai unde există justificare. Software-ul este modelat ca disponibilitate/capacitate/latență, nu prin executarea codului său.

Resursele sunt păstrate pe durata reparației și eliberate la finalul procesării, înaintea eventualei blocări la ieșire. Ordinea de alocare între operații este ordinea lor din repository; aceasta poate favoriza operațiile anterioare și nu este un scheduler optim. În fiecare coadă ordinea este FIFO.

## Modelează materialele și compoziția

Creează Material/componentă cu stoc inițial și cost unitar; conectează operația prin **Consumă material**. Cantitatea se consumă la începerea fiecărei piese. Stocul insuficient blochează începerea lucrului. Relația **Produce componentă în stoc**, de la operație la material, adaugă cantitatea numai la finalizarea fără rebut. Alte operații așteaptă până când toate componentele consumate sunt disponibile simultan. Stocul este comun tuturor liniilor. Materialele produse intern pot avea cost unitar 0 pentru a evita numărarea din nou a costului de fabricație.

Fabrică, Hală, Linie, Celulă, Ansamblu și Subansamblu pot fi părinți structurali. Selectează **Părinte în structură** în inspector. Diagrama de structură afișează ierarhia. Structura nu creează automat o rută, un stoc sau un mecanism de asamblare. Relațiile Conține, Alocare, Date, Controlează, Satisface și Reduce hazardul sunt descriptive. Sunt păstrate în același repository, fără efect numeric implicit.

Sincronizarea între linii se modelează prin stocuri de componente produse/consumate. Ansamblul structural singur nu execută asamblarea: trebuie definită o operație cu BOM. Nu există potrivire după serie, lot sau configurație. Producția în stoc are loc la finalul procesării, înainte de evacuarea tokenului de flux; materialele și tokenurile/comenzile sunt contabilități distincte. O buclă de rework produce din nou componente la fiecare finalizare conformă, deci alocă relația de producție numai operației potrivite.

## Creează mai multe diagrame

**+ Diagramă** oferă Proces & simulare, Structură/compoziție, Alocare resurse și HW/SW/funcții. Poți porni cu o vedere goală sau toate elementele. **Element existent** creează o reprezentare a aceluiași ID, fără duplicare. Editarea unui element se reflectă peste tot.

Ascunde din diagramă elimină doar reprezentarea. Șterge din model elimină elementul, relațiile și reprezentările după un dialog care arată impactul; Undo permite revenirea. Ștergerea unei vederi nu șterge elementele. Simularea folosește întregul model, inclusiv fluxurile ascunse în vederea curentă. Exportul SVG păstrează diagrama, iar exportul JSON păstrează semantica și toate vederile.

## Variabile

În **Variabile**, creează o valoare numerică cu unitatea s, buc, ratio, kW, EUR/h sau EUR/buc. În inspector, la parametrul dorit selectează variabila compatibilă. Aceeași variabilă poate alimenta mai multe elemente. Schimbarea valorii modifică efectiv calculul și invalidează rezultatele precedente. O unitate incompatibilă sau o valoare în afara limitelor este respinsă.

**Atributele personalizate** acceptă nume, valoare și unitate liberă pentru documentare. Nu sunt formule și nu au efect în simulare. Nu se execută expresii introduse de utilizator.

## Simulare, defectări și calendar

Ore: 0,01–168; replicări: 1–20; seed întreg. Modelul începe gol. Sosirile sunt periodice de la t=0; limita 0 înseamnă nelimitat. Sosirile la limita orizontului sunt incluse în WIP. Bufferele proceselor includ rezervările pentru piesele în transport; coada externă a sursei este nelimitată până la pragul de protecție WIP.

Timpii de procesare sunt uniformi în intervalul ± variația aleasă. MTBF este timpul mediu de funcționare până la defectare pe canal ocupat, exponențial; MTTR este timpul mediu de reparație, exponențial. Procesarea este întreruptă și continuată după reparație. Nu se modelează defectări în idle sau defectarea comună a mai multor canale.

Disponibilitatea ON/OFF este periodică, începând cu ON la t=0. Nu încep operații noi în intervalul OFF; operațiile începute continuă. Nu este un calendar cu ture nominale, pauze individuale sau sărbători. Setup este per piesă, nu dependent de familie/secvență.

## Interpretarea rezultatelor

Se verifică `intrări = produse bune + rebut + WIP`, inclusiv piese în transport. Pentru fiecare material: stoc inițial + produs − consumat = stoc rămas. Ieșirile sunt raportate separat; totalul agregat include subansamble și produse finale, deci nu reprezintă exclusiv sisteme vandabile. Tabelele de stare și cost reprezintă prima replicare. Media produselor bune și intervalul Student t aproximativ de 95% sunt calculate între replicări. Pentru o singură replicare nu se afișează interval. Lead time include numai piesele finalizate și poate fi optimist la un orizont scurt cu mult WIP.

Ocuparea personalului/resurselor este raportată la întregul orizont și capacitatea nominală, nu numai la programul ON. Așteptarea de resursă/material/calendar se măsoară ca timp al operației cu coadă și cel puțin un canal liber, nu ca sumă a timpilor individuali ai pieselor. Prioritatea cauzelor este calendar, resursă, material. Blocarea înseamnă piesă procesată care nu poate fi evacuată.

Costurile resurselor sunt calculate pe ocupare rezervată, inclusiv reparație. Costul operației include procesare și reparație. Energia este numai puterea în procesare × timp de procesare. Nu dubla același cost în operație și resursă. Nu sunt incluse automat salarii fixe, amortizare, energie în idle sau tarife energetice.

## Scenarii și limite

După o simulare, fixează baseline-ul, schimbă o singură variabilă/resursă și simulează din nou. Păstrează același orizont, seed și număr de replicări. Compară throughput, WIP și cost, nu doar utilizarea. Baseline-ul rămâne în memoria sesiunii; exportă comparația pentru arhivare.

Nu sunt încă implementate: sincronizare multiutilizator/backend central, optimizare automată a schedulingului, integrare MES/OPC UA, fork/join, potrivire de subansamble după lot/serie, loturi și replenishment extern, competențe substituibile, modele fizice HW/SW, formule arbitrare, CAD 3D, toate viewpoint-urile UAF/TOGAF, SysML/ReqIF/Cameo și calcul FTA/FMEA. Diagramele actuale sunt vederi proprii ale unui model semantic, nu conformitate cu aceste standarde.

Limitele de intrare sunt 500 elemente, 2000 relații, 50 diagrame, 20 replicări. Există praguri pentru numărul de evenimente, schimbările de calendar și WIP. Nu constituie validare de performanță pentru o fabrică imensă. Modelul trebuie calibrat pe date reale înaintea deciziilor industriale.

## Testare și rulare

Din directorul proiectului: `node --test tests/*.test.mjs`. Pornire locală: `node server.mjs`, apoi http://127.0.0.1:4173. Versiunea găzduită folosește doar browserul; nu sunt necesare instalări suplimentare.
