# Factory Studio — v0.4

Interfețe pentru operator, inginer și management; 15 modele comerciale documentate și 49 de șabloane generice; conexiuni directe în diagrame; patru servicii Docker.

- [Ghid curent](GHID_V04.md)
- [Arhitectură și modificări](ARCHITECTURE.md)
- [Docker](DOCKER.md)

Pornire: `docker compose up --build -d`, apoi http://localhost:4173. Teste: `npm test`. Site-ul public rulează în browser; API-urile și stocarea centrală rulează local în Docker. Nu este un înlocuitor certificat Cameo sau o implementare completă SysML/UAF/TOGAF.

---

## Arhivă: documentația v0.1 de mai jos descrie versiunea anterioară

Prototip web funcțional pentru modelarea și simularea liniilor de producție. Date fictive. Nu este o implementare completă Cameo, SysML, UAF sau TOGAF.

## Pornire pe Windows

Deschide PowerShell în acest director și rulează `node server.mjs`, apoi accesează http://127.0.0.1:4173. Node.js este deja disponibil pe calculatorul verificat. Nu sunt necesare pachete npm suplimentare. Nu deschide index.html prin file://: Web Worker-ul necesită HTTP. Serverul local ascultă doar pe loopback.

## Utilizare

1. Rulează simularea fabricii demonstrative (12 stații, trei linii).
2. În Simulare & bottleneck selectează linia și examinează timpii de procesare, blocare, cozile și sensibilitatea.
3. În Scenarii fixează baseline-ul după simulare.
4. În Editor modifică timpul unei stații, capacitatea sau bufferul; orice modificare invalidează rezultatele anterioare.
5. Rulează din nou cu același seed și orizont. Compară producția și WIP. Exportă comparația.
6. Modelează elemente MOFLT și leagă-le de stații; adaugă cerințe cu alocări și hazarduri calitative.
7. Exportă periodic modelul JSON. Importul este validat; Undo permite revenirea după import.

## Model matematic

Simulare cu evenimente discrete, linii seriale independente, resurse paralele identice per stație, timpi uniformi între ciclu*(1-variație) și ciclu*(1+variație), buffere de intrare finite (minimum 1) și blocking-after-service. La prima stație coada externă este nelimitată. Sosirile sunt periodice, începând la t=0. O sosire la limita orizontului este inclusă în WIP. Procesul începe gol. Nu există rebut, rework, defectări, schimburi, transport sau operatori partajați în această versiune.

Sensibilitatea reduce timpul fiecărei stații cu 20% separat și compară numărul de produse finalizate la același seed. Din cauza ordinii evenimentelor, același seed nu garantează asocierea acelorași numere aleatoare cu fiecare operație din două scenarii. Rezultatele sunt dintr-o replicare și nu au intervale de încredere. Lead time include așteptarea externă și este raportat numai pentru piesele finalizate; piesele neterminate pot introduce bias la orizont scurt. Nu utiliza rezultatele necalibrate ca justificare unică pentru investiții.

## Date și colaborare

Modelul se salvează în localStorage pe originea și browserul curent. Nu există backend de echipă, conturi proprii aplicației, sincronizare între colegi, audit central sau backup server. Publicarea privată asigură accesul la site pentru proprietar; nu implementează colaborarea din specificația finală. JSON este mecanismul de transfer. Rezultatele și baseline-ul sunt în memoria sesiunii; comparațiile se exportă separat.

Frameworkurile sunt surse metodologice. MOFLT este profil propriu, fără compatibilitate Airbus certificată. Nu sunt implementate toate viewpoint-urile UAF, TOGAF ADM, import Cameo, SysML, ReqIF, FTA sau calcul FMEA. Registrul de hazarduri este doar calitativ.

## Teste

`node --test tests/*.test.mjs`

Acoperă cazurile seriale calculabile manual, capacități paralele, blocare la buffer finit, conservare, reproductibilitate, validare și sensibilitate. Interfața folosește un Worker dedicat, anulabil; protecție de maximum 2 milioane de pași per execuție de linie. Limitele configurabile nu reprezintă benchmark industrial.

## Următoarele incrementări

Backend PostgreSQL/OIDC și control de revizii; rutări ramificate și BOM; calendare, setup și defectări; resurse partajate; replicări și calibrare; integrare MES/OPC UA; scheduling OR-Tools; profiluri semantice UAF/TOGAF și schimb de modele. Motorul actual este JavaScript original, fără SimPy/OR-Tools încă.


Bibliografia completă: [BIBLIOGRAFIE.md](BIBLIOGRAFIE.md), disponibilă și în aplicație la **Bibliografie & surse**. Documentele publice se regenerează cu `node scripts/build-documentation.mjs`; sursa comună este `dist/features/documentation/references.js`.
