# Roadmap de competitivitate - fără 3D

## Livrat în v0.5

- Faze manuale/automate editabile în operație, fără fragmentarea artificială a piesei în operații independente.
- Rezervare continuă a utilajului și rezervare selectivă a personalului.
- Așteptarea dintre faze, jurnal exportabil și costurile aferente.
- Statistică între replicări pentru KPI; comparații corectate pentru WIP/cost.
- Compatibilitate cu ciclurile existente și cazuri de referință verificabile.

## Următorul increment: experimente reproductibile

Snapshot model, date, versiune motor, setări și rezultate; salvarea/încărcarea experimentelor; identificarea rezultatelor devenite neactuale. Criteriu: un experiment exportat poate fi reprodus fără modificarea modelului curent. Persistența locală trebuie deosebită de aprobarea și auditul de echipă.

## Calendare și realism operațional

Schimburi/pauze definite, competențe și substituție explicită, ordine și variante, setup dependent de tranziție, loturi și sincronizare BOM. Fiecare extensie necesită semantică scrisă și test calculabil independent înainte de UI/pilot.

## Echilibrare și UX industrial

Yamazumi, Gantt om-mașină interactiv, takt, precedențe și constrângeri ergonomice documentate; import CSV/Excel cu mapare, unități și validare. Demonstrație pe date pilot ținute separat de calibrare.

## Acces în echipă înainte de SaaS

Autentificare, permisiuni pe proiect, versiuni persistente și audit, backup/restaurare, execuții de simulare persistente și izolare. Modurile UI existente nu sunt roluri de securitate.

## Trasabilitate și optimizare

Cerință - operație - resursă - măsurătoare - experiment - decizie. Analiza impactului modificărilor și validarea variantelor. Ulterior, căutare sub constrângeri și front Pareto, cu verificarea fezabilității și a incertitudinii.

3D, CAD geometric, cinematică și OLP sunt în afara acestei etape și necesită o discuție separată.
