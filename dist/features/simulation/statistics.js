import {METRICS} from '../../core/statistics.js';
import {fmt} from '../../ui/format.js';
export function statisticsView(result){
 if(!result.summary)return '';
 return `<section class="panel tablewrap"><h2>Statistici între replicări</h2><p class="small muted">Medie și semilățimea intervalului de încredere de 95% (Student t, aproximativ). O singură replicare nu estimează incertitudinea. IC nu reprezintă intervalul tuturor rezultatelor viitoare. Fără warm-up automat. Lead time exclude replicările fără produse finalizate; N indică numărul utilizat.</p><table><thead><tr><th>Indicator</th><th>Medie</th><th>± IC 95%</th><th>Min–max replicări</th><th>N</th></tr></thead><tbody>${Object.entries(METRICS).map(([k,[label,unit]])=>{const s=result.summary[k];return `<tr><td>${label} (${unit})</td><td>${fmt(s.mean)}</td><td>${fmt(s.ci95)}</td><td>${fmt(s.min)} – ${fmt(s.max)}</td><td>${s.n}</td></tr>`}).join('')}</tbody></table></section>`;
}
