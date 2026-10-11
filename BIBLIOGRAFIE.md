# Factory Studio — Bibliografie & surse

Trasabilitate documentară actualizată la 10 octombrie 2026. Fișele comerciale și referințele OMG erau deja în proiect. Motorul JavaScript este o implementare proprie: nu a fost portat dintr-o carte sau dintr-un simulator comercial și nu exista o bibliografie metodologică explicită în versiunea inițială. Referințele M1–M6 au fost consultate și adăugate la 10 octombrie 2026 pentru explicarea și evaluarea metodei; nu sunt prezentate drept surse consultate anterior implementării.

## Simulare, eficientizare și MBSE

### M1. Ricki G. Ingalls — Introduction to Simulation
Winter Simulation Conference, 2008, pp. 17–26

Statut: Referință metodologică adăugată ulterior.

[Deschide sursa](https://informs-sim.org/wsc08papers/005.pdf)

Utilizare: Cadru metodologic pentru entități, evenimente, cozi, resurse și calendar de evenimente.

Limită: Motor propriu în core/network.js; citarea tutorialului nu demonstrează validarea implementării.

### M2. NIST/SEMATECH — Confidence Limits for the Mean
e-Handbook of Statistical Methods, §1.3.5.2

Statut: Referință metodologică adăugată ulterior.

[Deschide sursa](https://itl.nist.gov/div898/handbook/eda/section3/eda352.htm)

Utilizare: Interpretarea intervalului mediei: media ± t × s / √n. În aplicație, n este numărul de replicări, iar rezultatul este producția bună.

Limită: Valorile t sunt rotunjite; o replicare nu are interval. Seeduri diferite nu demonstrează independența statistică. Puține replicări sau distribuții asimetrice reduc fiabilitatea aproximării.

### M3. NIST/SEMATECH — Exponential Distribution
e-Handbook of Statistical Methods, §1.3.6.6.7

Statut: Referință metodologică adăugată ulterior.

[Deschide sursa](https://itl.nist.gov/div898/handbook/eda/section3/eda3667.htm)

Utilizare: Distribuția utilizată pentru durate până la defectare și de reparație: −media × ln(1−U).

Limită: Exponențiala este o ipoteză de model, nu fiabilitatea certificată a utilajului. Nu modelează uzură sau reparații cu distribuții ajustate pe date.

### M4. John D. C. Little — A Proof for the Queuing Formula: L = λW
Operations Research 9(3), 1961, pp. 383–387; DOI 10.1287/opre.9.3.383

Statut: Referință de interpretare adăugată ulterior.

[Deschide sursa](https://pubsonline.informs.org/doi/abs/10.1287/opre.9.3.383)

Utilizare: Referință pentru relația dintre numărul mediu în sistem, debit și timpul mediu de traversare.

Limită: Legea lui Little nu este folosită drept motor sau verificare automată. WIP final și lead time doar pentru piesele finalizate nu sunt mediile staționare cerute pentru o aplicare directă.

### M5. Robert G. Sargent — Verification and Validation of Simulation Models
Winter Simulation Conference, 2011

Statut: Referință metodologică adăugată ulterior.

[Deschide sursa](https://www.informs-sim.org/wsc11papers/016.pdf)

Utilizare: Distincția dintre verificarea programului și validarea modelului față de sistemul real.

Limită: Testele de conservare, cazurile calculate manual și comparația browser/server verifică implementarea; nu înlocuiesc validarea cu măsurători din fabrică.

### M6. Lean Enterprise Institute — Value-Stream Mapping
Lean Lexicon, pagină de referință

Statut: Referință de îmbunătățire adăugată ulterior.

[Deschide sursa](https://www.lean.org/lexicon-terms/value-stream-mapping/)

Utilizare: Cadru pentru documentarea stării curente și compararea unei stări viitoare a fluxului.

Limită: Aplicația permite scenarii configurate manual; nu implementează un algoritm complet Lean, VSM sau de optimizare automată. Coada ori utilizarea mare nu demonstrează singure un bottleneck.

### S1. Object Management Group — Systems Modeling Language (SysML) 1.7
Specificație OMG; referință consemnată în GHID_V03.md

Statut: Referință de proiectare existentă; link reverificat 10.10.2026.

[Deschide sursa](https://www.omg.org/spec/SysML/1.7/)

Utilizare: Vocabular și notații pentru cerințe, blocuri, porturi și trasabilitate.

Limită: Subset propriu, fără certificare de conformitate și fără execuție completă SysML.

### S2. Object Management Group — Unified Modeling Language (UML) 2.5.1
Specificație OMG; referință consemnată în GHID_V03.md

Statut: Referință de proiectare existentă; link reverificat 10.10.2026.

[Deschide sursa](https://www.omg.org/spec/UML/2.5.1/)

Utilizare: Vocabular și notații pentru activități, stări, secvențe și relații.

Limită: Nu este o implementare completă UML. Diagramele descriptive nu se execută implicit în simularea industrială.

## Metoda și ipotezele implementării

### Calendar de evenimente
Evenimente ordonate temporal, cu ordine stabilă la egalitate; cod propriu.

Trasabilitate: dist/core/network.js · Heap, simulateNetwork · M1

### Ciclul operației
(ciclu × (1 + variație × (2U−1)) + setup) / produsul factorilor de viteză + suma latențelor; variație uniformă și setup per piesă sunt ipoteze proprii.

Trasabilitate: dist/core/network.js · start; nu derivă din fișele utilajelor

### Resurse și personal
Rezervare simultană la început. Operatorii alocați utilajului sunt ocupați pe întreg ciclul; necesarele directe și moștenite se adună. Nu există arbitraj optim de scheduling.

Trasabilitate: dist/core/mbse.js · expandedNeeds; dist/core/network.js · ready, start, release

### Rutare și buffere
Ponderile ieșirilor aleg o singură rută. Buffer finit și blocare după procesare; rework poate consuma din nou material. Nu este fork/join Petri.

Trasabilitate: dist/core/network.js · choose, transfer, pump

### Fiabilitate și calendar
Defectări/reparații exponențiale per canal ocupat; ON/OFF periodic. Nu există uzură sau calendar real de sărbători.

Trasabilitate: dist/core/network.js · scheduleSegment, isOn · M3

### Indicatori
Debit = produse bune / ore. WIP final = intrări − bune − rebut. Coada medie este integrala lungimii cozii / orizont. Lead time include numai piesele finalizate.

Trasabilitate: dist/core/network.js · integrate și rezultate · M4 doar pentru interpretare

### Incertitudine
Media producției și interval t aproximativ între replicări; seedul este schimbat între rulări. Nu se elimină automat perioada de încălzire.

Trasabilitate: dist/core/network.js · replicate · M2

### Cost și energie
Tarife introduse de utilizator; cost de ocupare, materiale și energie de proces. Nu sunt incluse implicit prețuri de achiziție, salarii, amortizare sau consum în repaus.

Trasabilitate: dist/core/network.js · totalCost, energy; fără sursă comercială pentru tarife

### Eficientizare
Comparare manuală cu baseline. Prioritizarea după coadă sugerează unde să investighezi; confirmarea cere un scenariu comparativ și date măsurate. Nu există optimizare matematică automată.

Trasabilitate: dist/features/overview și scenarios · M5, M6

### Date demonstrative și șabloane
Fabrica demonstrativă și cele 49 de șabloane generice sunt construcții de demonstrație, nu benchmarkuri industriale. Nu există o productivitate universală documentată a operatorului.

Trasabilitate: dist/core/model.js · example, FIELDS; dist/features/library/catalog.js

### MOFLT, UAF și TOGAF
MOFLT este organizarea M/O/F/L/T descrisă de utilizator. Nu s-a folosit un profil proprietar Airbus. Nu este declarată implementarea completă UAF/TOGAF și nu se atribuie motorului o certificare INCOSE.

Trasabilitate: Cerințe ale utilizatorului; S1/S2 numai pentru referințe de notație

## Toate fișele comerciale
Valorile originale din catalog, nu cele editate în instanțe. Data este verificarea consemnată inițial, nu o nouă verificare astăzi. Nu se arhivează copii ale fișelor.

### C1. Haas VF-2
Configurație standard, arbore 8.100 rpm; puterea arborelui nu este consum mediu.

[Sursa producătorului](https://www.haascnc.com/machines/vertical-mills/vf-series/models/small/vf-2.html) — verificare consemnată 2026-10-09.

- Turație maximă: 8100 rpm
- Cursă X: 762 mm
- Cursă Y: 406 mm
- Cursă Z: 508 mm
- Putere nominală arbore: 22.4 kW

### C2. Haas UMC-500
Model standard 5 axe, nu varianta SS.

[Sursa producătorului](https://haascnc.com/machines/vertical-mills/universal-machine/models/umc-500) — verificare consemnată 2026-10-09.

- Turație maximă: 8100 rpm
- Cursă X: 610 mm
- Cursă Y: 406 mm
- Cursă Z: 406 mm

### C3. Haas ST-20
Strung standard; configurația turelei și prinderea modifică anvelopa piesei.

[Sursa producătorului](https://www.haascnc.com/machines/lathes/st/models/standard/st-20.html) — verificare consemnată 2026-10-09.

- Turație maximă: 4000 rpm
- Cursă X: 213 mm
- Cursă Z: 572 mm
- Capacitate bară (rotunjire fișă metrică): 64 mm

### C4. Haas TM-1
Freză CNC Toolroom, configurație standard; nu freză manuală.

[Sursa producătorului](https://www.haascnc.com/machines/vertical-mills/toolroom-mills/models/tm-1.html) — verificare consemnată 2026-10-09.

- Turație maximă: 4000 rpm
- Cursă X: 762 mm
- Cursă Y: 406 mm
- Cursă Z: 406 mm

### C5. Haas DT-1
Centru găurire/tarodare, arbore standard BT30.

[Sursa producătorului](https://www.haascnc.com/mx/machines/vertical-mills/drill-tap-mill/models/dt-1.html) — verificare consemnată 2026-10-09.

- Turație maximă: 10000 rpm
- Cursă X: 508 mm
- Cursă Y: 406 mm
- Cursă Z: 394 mm

### C6. FANUC M-20iD/25
Versiune standard cu șase axe; sarcina include scula și piesa.

[Sursa producătorului](https://www.fanuc.eu/eu-en/product/robot/m-20id25) — verificare consemnată 2026-10-09.

- Payload maxim: 25 kg
- Rază de acțiune: 1831 mm
- Axe: 6 
- Repetabilitate ±: 0.02 mm

### C7. Universal Robots UR10e · 12,5 kg
Fișă mai 2025, varianta 12,5 kg. Nu se aplică automat variantelor vechi de 10 kg.

[Sursa producătorului](https://www.universal-robots.com/manuals/EN/TechSheets/UR10e_techsheet_pdf_online/UR10e_techsheet_en.pdf) — verificare consemnată 2026-10-09.

- Payload maxim: 12.5 kg
- Rază de acțiune: 1300 mm
- Axe: 6 
- Putere la regim moderat de referință: 350 W
- Putere maximă publicată: 615 W

### C8. Epson LS6-B · 600 mm
SCARA 600 mm. Ciclul standard de test al producătorului nu este ciclul piesei tale.

[Sursa producătorului](https://epson.com/For-Work/Robots/SCARA/Epson-LS6-B-SCARA-Robot---600mm/p/RLS6B602ST9B5) — verificare consemnată 2026-10-09.

- Payload maxim: 6 kg
- Payload nominal: 2 kg
- Rază de acțiune: 600 mm
- Ciclu de referință producător: 0.4 s
- Repetabilitate J1–J2 ±: 0.02 mm

### C9. ABB IRB 360-1/1130
Versiune 1 kg / diametru de lucru 1130 mm; nu rază.

[Sursa producătorului](https://www.abb.com/global/en/areas/robotics/products/robots/delta-robots/irb-360?country=DE) — verificare consemnată 2026-10-09.

- Payload maxim: 1 kg
- Diametru de lucru: 1130 mm

### C10. MiR MiR250
AMR standard; viteza reală depinde de rută, obstacole și configurația de siguranță.

[Sursa producătorului](https://mobile-industrial-robots.com/products/robots/mir250/specifications) — verificare consemnată 2026-10-09.

- Payload maxim: 250 kg
- Viteză maximă: 2 m/s
- Lungime: 800 mm
- Lățime: 580 mm
- Înălțime: 300 mm

### C11. ZEISS DuraMax
CMM standard, nu HTG. Se alocă drept resursă unei operații de inspecție.

[Sursa producătorului](https://www.zeiss.com/metrology/us/systems/cmms/shop-floor-cmms/duramax.html) — verificare consemnată 2026-10-09.

- Volum măsurare X: 500 mm
- Volum măsurare Y: 500 mm
- Volum măsurare Z: 500 mm
- Diametru palpator minim: 0.3 mm
- Diametru palpator maxim: 8 mm

### C12. ATEQ F620 · ΔP 500 Pa
Configurație măsurare diferențială 0–500 Pa. Presiunea de test se alege separat pentru piesă.

[Sursa producătorului](https://www.ateq-leaktesting.com/wp-content/uploads/2015/02/F620-U.pdf) — verificare consemnată 2026-10-09.

- Domeniu ΔP maxim: 500 Pa
- Rezoluție ΔP: 0.1 Pa
- Alimentare variantă DC: 24 V

### C13. HIOKI RM3545-01
Versiune GP-IB; rezoluție și curent maxime conform domeniului ales.

[Sursa producătorului](https://www.hioki.com/euro-en/products/resistance-meters/resistance/id_5876) — verificare consemnată 2026-10-09.

- Rezoluție maximă: 0.01 µΩ
- Curent maxim de test: 1 A
- Precizie de bază: 0.006 %

### C14. Siemens S7-1200 CPU 1214C
Cod exact 6ES7214-1AG40-0XB0 · DC/DC/DC.

[Sursa producătorului](https://sieportal.siemens.com/en-se/products-services/detail/6ES72141AG400XB0) — verificare consemnată 2026-10-09.

- Intrări digitale: 14 
- Ieșiri digitale: 10 
- Intrări analogice: 2 
- Alimentare DC minimă: 20.4 V
- Alimentare DC maximă: 28.8 V

### C15. Robotiq 2F-85
Gripper 85 mm; payload-ul admis depinde de prindere, accelerație și piesă.

[Sursa producătorului](https://robotiq.com/products/adaptive-grippers) — verificare consemnată 2026-10-09.

- Cursă: 85 mm
- Payload publicat: 5 kg
- Forță minimă: 20 N
- Forță maximă: 235 N

## Șabloane generice
Șabloane proprii fără performanțe comerciale documentate; nu există productivitate universală atribuită operatorilor.

- Centru CNC vertical · 3 axe — Prelucrare

- Centru CNC · 5 axe — Prelucrare

- Strung CNC — Prelucrare

- Freză convențională — Prelucrare

- Mașină de găurit — Prelucrare

- Rectificare plană — Prelucrare

- Electroeroziune EDM — Prelucrare

- Electroeroziune cu fir — Prelucrare

- Tăiere laser — Prelucrare

- Presă hidraulică — Formare & asamblare

- Injecție mase plastice — Formare & asamblare

- Celulă sudare — Formare & asamblare

- Înșurubare cu control cuplu — Formare & asamblare

- Robot articulat · 6 axe — Roboți

- Robot SCARA — Roboți

- Robot Delta — Roboți

- Robot cartezian / portal — Roboți

- Cobot · 6 axe — Roboți

- Robot paletizare — Roboți

- AGV / AMR — Logistică

- Transportor — Logistică

- Stivuitor — Logistică

- CMM · control dimensional — Teste & metrologie

- Inspecție vizuală automată — Teste & metrologie

- Test etanșeitate — Teste & metrologie

- Test dielectric / HiPot — Teste & metrologie

- Continuitate electrică — Teste & metrologie

- In-circuit test · ICT — Teste & metrologie

- End-of-line functional test — Teste & metrologie

- Hardware-in-the-loop — Teste & metrologie

- Ciclu termic — Teste & metrologie

- Test vibrații — Teste & metrologie

- Control nedistructiv · UT/PT/MT — Teste & metrologie

- Test duritate — Teste & metrologie

- PLC de celulă — Control & IT

- Safety PLC — Control & IT

- Serviciu MES — Control & IT

- Software machine vision — Control & IT

- Gateway OPC UA — Control & IT

- Operator producție — Personal

- Operator CNC — Personal

- Inspector calitate — Personal

- Tehnician mentenanță — Personal

- Fixture de test — Dispozitive

- Gripper robot — Dispozitive

- Aer comprimat — Utilități

- Stoc subansamble — Materiale

- Cerință de capacitate — MBSE

- Caz de verificare — MBSE