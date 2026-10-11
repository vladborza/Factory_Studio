# Factory Studio v0.4 — ghid de utilizare

## Pornire

În folderul proiectului: `docker compose up --build -d`, apoi http://localhost:4173. Cele patru servicii sunt interfața/gateway, catalogul, motorul de simulare și stocarea modelelor. Nu sunt necesare pachete npm. Node 22+ este necesar numai pentru dezvoltare/teste în afara Docker.

Site public: https://factory-studio-orastie.tastycrab4.chatgpt.site/. Acesta execută simularea într-un Web Worker și salvează local în browser. Containerele de pe calculator nu sunt expuse prin publicarea site-ului. Datele de la localhost, 127.0.0.1 și site-ul public sunt separate; transferul se face prin export/import JSON.

## Spații de lucru

- **Operator:** alege o operație, consultă resursele și înregistrează timpi măsurați. Probe separate prin punct și virgulă sau rând nou; zecimale cu punct. Media actualizează parametrul de ciclu și păstrează probele și condițiile. Legătura locală la o variabilă de ciclu este înlocuită, fără a schimba variabila comună.
- **Inginer:** construiește diagrame, configurează utilaje și personal, verifică proveniența datelor și compară scenarii.
- **Management:** consultă producția simulată, WIP, costurile și motivele de așteptare. Rezultatele sunt estimări ale modelului, nu telemetrie live.

Spațiile de lucru adaptează navigarea; nu sunt roluri de autentificare sau control acces.

## Prima celulă documentată

1. Deschide **Bibliotecă**. Filtrul inițial arată modelele comerciale documentate.
2. Alege utilajul și **Configurează & adaugă** pentru un singur obiect, sau **+ Celulă** pentru sursă, operație, ieșire, utilaj și operator opțional.
3. Verifică producătorul, configurația, unitățile și linkul sursei. Poți edita fiecare specificație; valoarea originală rămâne vizibilă ca referință.
4. Pentru celulă, introdu ciclul procesului tău și intervalul sosirilor. Alege dacă timpul este măsurat sau ipoteză și explică referința/condițiile.
5. Alege personal dedicat dacă operatorul este ocupat pe întreg ciclul. Pentru supraveghere/intervenții parțiale modelează operații separate care rezervă operatorul numai în acele faze.
6. În inspector, ajustează capacitatea, calendarul periodic, costurile și ceilalți parametri. În **Calibrare date**, completează proveniența.

Catalogul are 15 modele comerciale: Haas VF-2, UMC-500, ST-20, TM-1, DT-1; FANUC M-20iD/25; Universal Robots UR10e; Epson LS6-B 600; ABB IRB 360-1/1130; MiR250; ZEISS DuraMax; ATEQ F620; HIOKI RM3545-01; Siemens CPU 1214C; Robotiq 2F-85. Datele și sursele sunt în `dist/features/library/references.js`, verificate la 9 octombrie 2026. Sunt incluse separat 49 de șabloane generice de procese, echipamente și roluri, fără promisiunea unor performanțe comerciale documentate.

**O turație maximă sau o sarcină utilă nu determină timpul de ciclu al piesei.** Specificațiile comerciale sunt descriptive; parametrii expliciți ai procesului alimentează simularea. Puterea nominală a arborelui nu este consum mediu. Timpii, rebutul, MTBF/MTTR, costurile și performanța operatorilor necesită date locale. Nu există o productivitate universală reală pentru un operator generic.

## Conexiuni directe

1. Deschide **Diagrame & fluxuri** și alege vederea.
2. Selectează tipul din **Conexiune**: flux de produs, necesită resursă, deservită de operator etc.; opțiunile depind de vedere.
3. Activează **Conectare**, apoi selectează sursa și destinația. Alternativ, începe de la semnul **+** al obiectului și selectează destinația; poți trage de acest mâner spre alt obiect.
4. Escape anulează. **Selectare** revine la editarea/poziționarea obiectelor.
5. Selectează legătura pentru pondere, transport, cantitate sau metadate. Conexiunile invalide sunt respinse. Modificările semantice invalidează rezultatul anterior.
6. Pentru interfețe, adaugă porturi tipizate, apoi alege portul sursă și destinație. Direcțiile, payload-ul și identitatea interfeței sunt validate.

Fluxurile de produs conectează surse/operații/ieșiri. Operațiile solicită resurse prin «Necesită resursă». Utilajele solicită operatori prin «Deservită de operator». Relațiile descriptive UML/SysML/MOFLT nu capătă implicit semnificație numerică.

## Analiză și comparație

1. Verifică traseul sursă–operații–ieșire și alocările de personal/HW/SW/materiale.
2. Configurează orizontul și replicările; rulează simularea. Parametrii necalibrați sunt semnalați, dar explorarea este permisă.
3. Examinează cozile și timpul de blocare, de așteptare a resurselor/materialelor și indisponibilitatea. Utilizarea ridicată singură nu dovedește un bottleneck.
4. Salvează un baseline în **Scenarii**, modifică o ipoteză și rulează din nou cu aceleași condiții.
5. Compară debitul, WIP și costurile. Verifică ipotezele cu măsurători înainte de o decizie de investiție.

## Salvare și colaborare

Editările sunt salvate automat în browser. În Docker, **Salvează în Docker** creează/actualizează explicit un snapshot central. **Modele salvate** încarcă un snapshot. Reviziile detectează conflictele și împiedică suprascrierea unei revizii mai noi; nu există merge automat sau editare live simultană. Exportă local modificările proprii înainte de a încărca o revizie concurentă. Undo/Redo decuplează salvarea de revizia centrală pentru a evita suprascrierea accidentală a altui snapshot.

Stocarea Docker persistă în volumul `factory-models`. Nu utiliza `docker compose down -v` dacă vrei să păstrezi modelele. Păstrează exporturi JSON pentru backup.

## Limite

Nu este un înlocuitor certificat Cameo sau o implementare completă a standardelor SysML/UAF/TOGAF. Profilul MOFLT este o organizare generică a misiunii, operațiilor, funcțiilor, structurii logice și tehnice. Nu include materiale proprietare Airbus. Expresiile MBSE și codul SW nu sunt executate. Modelul nu comandă utilaje.

Motorul folosește evenimente discrete, resurse comune și calendare periodice. Nu include scheduling optim, geometrie CAD, setup dependent de secvență, loturi sau fork/join Petri. Limitele de intrare sunt 500 elemente, 2.000 relații, 50 diagrame și 20 replicări, nu o garanție de performanță pentru orice fabrică. Vezi pagina **Metodă & limite** pentru semantica exactă.


Bibliografia completă: [BIBLIOGRAFIE.md](BIBLIOGRAFIE.md), disponibilă și în aplicație la **Bibliografie & surse**. Documentele publice se regenerează cu `node scripts/build-documentation.mjs`; sursa comună este `dist/features/documentation/references.js`.
