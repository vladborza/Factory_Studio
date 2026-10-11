# Factory Studio 0.3 — Producție și MBSE

Versiune locală: http://localhost:4173 (Docker Desktop pornit). Această livrare nu confirmă actualizarea site-ului găzduit. Datele sunt salvate în browser, separat pentru fiecare origine. Exportă din site modelul JSON și importă-l local pentru a continua aceeași analiză.

## 1. Prima celulă simulabilă

1. Exportă modelul existent pentru backup. Alege **Model nou → Model gol** dacă dorești un exemplu independent.
2. Deschide **Bibliotecă industrială** și caută „CNC”.
3. La „Centru CNC vertical · 3 axe”, apasă **Celulă simulabilă**. Aplicația creează sursa, operația, ieșirea, utilajul, operatorul și relațiile dintre ele în vederea de proces activă.
4. Selectează operația. Introdu timpul real de procesare, setup per piesă, buffer, probabilitatea de rebut, variația și, dacă ai date, MTBF/MTTR. Salvează.
5. Selectează sursa. Configurează intervalul comenzilor și numărul maxim de piese; zero înseamnă sosiri nelimitate în orizontul ales.
6. Selectează utilajul și operatorul. Configurează capacitatea, costul pe oră ocupată și disponibilitatea periodică ON/OFF, în secunde. O persoană are de regulă capacitate 1; o echipă poate avea capacitate mai mare.
7. Rulează 8 ore. Verifică ieșirea, WIP, cozile, timpul de așteptare pentru resurse și ocuparea personalului.
8. Fixează baseline-ul în **Scenarii**, schimbă un singur factor și simulează din nou cu aceleași setări. Exportă comparația.

Celulele adăugate în același model sunt toate simulate, chiar dacă nu sunt vizibile în vederea curentă. Crearea unei celule nu conectează automat fluxul său la alte celule; modifică sursele/ieșirile și relațiile dacă vrei o linie comună.

## 2. Biblioteca industrială

49 de profile generice: CNC 3/5 axe, strung, freză convențională, găurire, rectificare, EDM, laser, presă, injecție, sudare, înșurubare; roboți articulați, SCARA, Delta, cartezieni, coboți, paletizare și AGV/AMR; transportor și stivuitor; CMM, vision, etanșeitate, HiPot, continuitate, ICT, EOL, HIL, teste termice/vibrații, NDT și duritate; PLC, Safety PLC, MES, gateway OPC UA, personal, dispozitive, utilități și materiale.

**În diagramă** creează un element independent. Pentru un utilaj, timpul de ciclu se configurează în operația care îl folosește; utilajul reprezintă capacitatea disponibilă. O inspecție este ea însăși o operație simulabilă, dar trebuie conectată în flux și poate necesita banc, fixture, operator și software.

Profilele nu sunt date certificate de producător. Timpii, payload-ul, turația și celelalte valori sunt exemple, nu recomandări de dimensionare. Atributele tehnice descriptive nu modifică automat timpul de ciclu. Folosește măsurători, CAM, documentația echipamentului și procedura de test pentru calibrare.

## 3. Operatori per utilaj

1. În **Utilaje & operatori**, apasă **Alocă operator** pentru utilaj.
2. Alege o persoană/echipă existentă pentru partajare între mașini sau creează una nouă.
3. Introdu numărul de persoane necesare pentru fiecare unitate de utilaj rezervată.
4. Operația se leagă la utilaj prin **Necesită resursă**; utilajul se leagă la personal prin **Deservită de operator**.
5. Tabelul **Necesar efectiv per operație** afișează resursele directe și personalul moștenit.

Exemplu: o operație necesită două utilaje, fiecare cu doi operatori. Necesarul moștenit este patru persoane. O alocare suplimentară directă a aceleiași echipe se adună, deci nu dubla accidental personalul.

Personalul este rezervat pe întreg ciclul, inclusiv întreruperile pentru reparații. Pentru un CNC automat, modelează separat **Încărcare → Prelucrare automată → Descărcare**, alocând persoana numai etapelor manuale. Modelul actual eliberează utilajul între operații; nu modelează o rezervare continuă a aceleiași mașini pe toate cele trei faze. Aceasta este o aproximare importantă când mai multe piese concurează pentru același utilaj. Competențele și mentenanța sunt documentate, fără alocare automată după skill sau mobilizare de tehnicieni la defect.

## 4. Diagrame și obiecte MBSE

**+ Diagramă** oferă 20 de vederi editabile: patru industriale, BDD, IBD, Requirements, Parametric, Activity, Sequence, State machine, Use case, Package, Class, Object, Component, Composite structure, Deployment, Communication și Interaction overview. Timing și Profile sunt listate separat ca planificate și nu sunt prezentate ca implementate.

Paleta prioritizează obiectele potrivite vederii. Relațiile afișate sunt cele relevante vederii. Același element poate apărea în mai multe diagrame fără a fi duplicat în model.

- BDD: blocks, interface blocks, value properties, constraint blocks, generalizare și compoziție.
- IBD / componente: parts, interfețe și porturi, conectori și item flows.
- Requirements: cerințe, test cases, satisfy, verify, deriveReqt, refine, trace și copy.
- Activity: acțiuni, obiecte, decizii, fork/join, noduri inițiale/finale și fluxuri de control/obiecte. Fork/join sunt descriptive, nu executabile în motorul DES.
- State machine: stări și tranziții cu trigger, guard și effect documentate.
- Sequence: lifelines și mesaje ordonate; ordinea determină poziția verticală. Nu există încă fragmente combinate, durate de execuție sau execuție a mesajelor.
- Class / structură: proprietăți și relații cu multiplicități textuale. Notația este un subset simplificat, fără validarea întregului metamodel UML.

Inspectorul permite stereotipuri separate prin virgulă, nivel M/O/F/L/T, proprietăți `nume:tip=valoare` și text pentru comportament, constrângeri sau criterii de test. Stereotipurile sunt etichete, nu profile UML cu extensii de metamodel executabile. Parametric nu are solver de ecuații. MOFLT este implementat ca clasificare și trasabilitate a modelului, fără revendicarea profilului proprietar Airbus.

## 5. Conexiuni direct în diagramă

**Între obiecte:** selectează sursa, alege relația din paletă, apasă **Conectează 2 elemente**, apoi selectează destinația. Click pe conector pentru etichetă, cantitate, ponderi sau metadate, în funcție de tip.

**Între porturi:**

1. Creează o vedere IBD sau de componente/arhitectură și două elemente.
2. În inspector, folosește **Port tipizat** pe fiecare element: proxy/full/standard, direcție in/out/inout, tip de payload și opțional un Interface block / UML Interface existent.
3. Alege Connector, Item flow sau alt conector disponibil în paletă.
4. Click pe pătratul portului sursă și apoi pe portul destinație. Click repetat pe același port anulează.
5. Aplicația respinge porturile lipsă, direcțiile incompatibile, payload-uri diferite și referințe diferite la interfețe. Compararea tipurilor este exactă, fără subtipare UML sau conjugare SysML.
6. Pentru a șterge un port conectat, șterge întâi conectorii. Maximum opt porturi per element în această versiune.

Legăturile între porturi documentează arhitectura. Ele nu transportă automat piese în simulare; folosește relațiile industriale de flux și resurse pentru calcul.

## 6. Trasabilitate și bibliotecă personală

În **MBSE & trasabilitate** vezi cerințele și elementele care le satisfac/verifică. Auditul semnalează cerințe fără satisfy/verify și porturi neconectate. Absența constatărilor nu reprezintă certificarea sau validarea completă a sistemului.

Configurează un element și selectează **Salvează în biblioteca mea**. Instanțele ulterioare primesc ID-uri proprii, inclusiv porturile. Se copiază valorile efective; legăturile la variabile, relațiile și părintele nu se copiază. Interfețele referențiate de porturi rămân în același model. Biblioteca se păstrează în exportul JSON. Limita este 200 de șabloane personale.

## 7. Limite și validare

Simularea folosește fluxurile industriale, capacități, buffere, materiale, personal/HW/SW, costuri configurate, disponibilitate și defectări. Nu execută diagrame UML/SysML, cod PLC, OPC UA live, proceduri HIL sau calcul fizic. Nu include loturi reale, setup dependent de secvență, optimizare automată de scheduling ori calcul PL/SIL/FTA. Nu este o implementare completă Cameo, UAF, TOGAF sau SysML v2.

Salvarea rămâne locală în browser; colaborarea simultană și backend-ul central nu sunt implementate. Limite: 500 de elemente, 2000 de relații, 50 de diagrame și 20 de replicări. Exportă periodic JSON.

Testele automate acoperă calculul producției, conservarea pieselor, alocarea partajată a operatorilor, multiplicarea necesarului, compatibilitatea porturilor, trasabilitatea, migrarea, toate profilele industriale și serverul HTTP. Verificarea vizuală/interactivă completă a acestei versiuni în browser rămâne de efectuat.

Referințe de proiectare: [OMG SysML 1.7](https://www.omg.org/spec/SysML/1.7/) și [OMG UML 2.5.1](https://www.omg.org/spec/UML/2.5.1/). Lista funcțiilor implementate se află în registrul din aplicație; referințele nu implică certificare de conformitate.
