# Factory Studio v0.5 - baza simulării om-mașină

12 octombrie 2026. Extinde v0.4 fără să schimbe automat modelele existente.

## Configurează o operație pe faze

1. Deschide **Diagrame & fluxuri** și selectează o operație, inspecție sau transport.
2. În inspector, deschide **Configurează fazele**. Nu modifica mașina: fazele aparțin operației executate pe ea.
3. Editează numele, modul manual/automat și durata în secunde; **+ Adaugă fază** extinde secvența. **Mută înainte** schimbă ordinea; **Elimină faza** elimină rândul.
4. De exemplu, introdu Încărcare manuală 20 s, Prelucrare automată 100 s, Descărcare manuală 10 s. Acestea sunt valori didactice, nu timpi de catalog.
5. Documentează sursa/ipoteza și aplică. Suma devine ciclul total. Legătura locală la o variabilă de ciclu este eliminată explicit. Poți ulterior lega totalul la o variabilă.
6. Leagă Operația de Mașină prin **Necesită resursă**, apoi Mașina de Operator prin **Deservită de operator**. Poți aloca personalul direct operației; nu dubla aceeași nevoie pe ambele căi.
7. Rulează simularea. În **Rezultate**, urmărește starea **fază în așteptare**, timpul de așteptare dintre faze și **Jurnal om-mașină**.

**Revino la ciclu unic** elimină profilul după confirmarea din dialog, păstrând ciclul total; Undo poate restaura profilul.

## Semantica exactă

- Între 1 și 20 de faze; fiecare are nume, tip și proporție pozitivă din ciclu. Editorul acceptă durate de minimum 0,01 s și ciclu total de maximum 86400 s.
- Utilajele și toate resursele non-umane sunt rezervate continuu de la pornire până la finalizarea procesării, inclusiv așteptarea între faze și reparația.
- Resursele de tip Operator/Echipă sunt rezervate în fazele manuale și eliberate în automat. Fazele manuale consecutive păstrează personalul rezervat.
- O fază manuală poate aștepta personalul sau disponibilitatea sa periodică. Piesa și utilajul rămân în operație. Începerea fazelor automate ale unei operații deja pornite nu revalidează calendarul operației.
- Un proces deja pornit continuă peste intervalul OFF, conform semanticii anterioare. Reparația păstrează resursele fazei active; nu alocă implicit un tehnician de mentenanță.
- Setupul per piesă se adaugă numai primei faze. Factorul uniform de variație este comun tuturor fazelor aceleiași piese. Nu sunt distribuții independente pe fază.
- Factorul de viteză este produsul resurselor active în fază; personalul nu accelerează faza automată. Latențele non-umane se aplică la început, cele umane la fiecare nouă rezervare a personalului.
- Modificarea ciclului total (inclusiv prin variabilă sau măsurare Operator) scalează proporțional fazele. Modifică profilul dacă raportul dintre timpi se schimbă.
- Consumurile de materiale sunt efectuate o singură dată la pornirea operației, iar producția/rebutul/rutarea la sfârșitul ultimei faze. Rework-ul reia operația și consumul.
- La final, resursele sunt eliberate înaintea blocării la ieșire, ca în v0.4.
- Costul operației include procesarea, reparația și așteptarea dintre faze. Costul resurselor urmărește ocuparea rezervată. Energia include doar procesarea.

Fără profil de faze, comportamentul rămâne cel al ciclului unic. Manual fără personal alocat produce avertizare, nu inventează automat un operator. Competiția se rezolvă determinist în ordinea operațiilor; nu este un algoritm optim sau o regulă de echitate garantată.

## Rezultate și experimente

Jurnalul conține operație, canal, fază, stare, început/sfârșit și ID-urile resurselor rezervate. Interfața afișează primele 100 intervale; raportul JSON include până la 2000. Trunchierea este declarată și nu limitează calculele KPI. Jurnalul poate fi filtrat offline; nu reprezintă încă un Gantt interactiv.

Statisticile includ producție, WIP, rebut, debit, lead time, energie și costuri. Fiecare indicator are media, semilățimea IC 95% aproximativ, minimul, maximul și numărul replicărilor valide. Lead time exclude replicările fără ieșiri; absența acestora nu este un timp zero. O replicare nu are interval estimat.

Scenariile folosesc medii din toate replicările pentru WIP, cost, debit și energie. Diferența mediilor nu este un test statistic al diferenței. Tabelele de operații/resurse și jurnalul rămân ale primei replicări. Nu există eliminare automată de warm-up, independență statistică demonstrată sau validare industrială implicită.

Raportul include versiunea motorului 0.5.0. Modelul și rezultatele se exportă în JSON; baseline-ul nu are încă registru persistent. Nu redeschide modelele cu faze într-o versiune mai veche a aplicației, care nu cunoaște această semantică.

## Verificare și operare

`npm test` verifică regresiile și cazurile noi. Caz de referință: două CNC-uri identice, câte o piesă, un operator, faze 20/100/10 s, fără variație sau defectări: finalizări la 130 și 150 s; ocuparea operatorului este 60 s. Alt caz verifică 90 s de așteptare între faze cu mașina rezervată.

Publicarea statică rulează în browser. Pentru actualizarea instalării Docker locale după sincronizarea sursei: `docker compose up --build -d`. Nu șterge volumul de modele. Securitatea de echipă, calendarele industriale și optimizarea sunt etape viitoare, descrise în ROADMAP.md.

Validare runtime: suita completă trece pe Node 22.18.0 (Docker folosește node:22-alpine). În runtime-ul auxiliar Node 24.19.0, testul de repetabilitate al motorului arhivat v0.1 a avut eșec intermitent; același test trece cu JIT dezactivat. Cauza nu a fost stabilită. Folosește Node 22 pentru verificarea acestei versiuni. Motorul activ este dist/core/network.js, nu motorul arhivat dist/engine.js.
