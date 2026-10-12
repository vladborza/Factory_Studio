import {esc,fmt} from '../../ui/format.js';
export function phaseSummary(n, cycle) {
  if (!['operation','inspection','transport'].includes(n.type)) return '';
  return `<section class="phase-summary"><h3>Faze om–mașină</h3>${n.phases ? `<ol>${n.phases.map(p=>`<li><b>${esc(p.name)}</b> · ${p.kind==='manual'?'Manual':'Automat'} · ${fmt(cycle*p.fraction)} s</li>`).join('')}</ol><p class="small muted">Ciclul și variabila sa scalează proporțional fazele. Utilajul rămâne rezervat; personalul este eliberat în fazele automate.</p>` : '<p class="small">Ciclu unic: toate resursele sunt rezervate pe întregul ciclu.</p>'}<button type="button" data-action="edit-phases">Configurează fazele</button>${n.phases?'<button type="button" data-action="clear-phases">Revino la ciclu unic</button>':''}</section>`;
}
export function phaseRow(p, index) {
  return `<fieldset data-phase-row="${index}"><legend>Fază</legend><label>Nume<input name="phase-name-${index}" value="${esc(p.name)}" maxlength="100" required></label><label>Mod de lucru<select name="phase-kind-${index}"><option value="manual" ${p.kind==='manual'?'selected':''}>Manual · necesită personalul alocat</option><option value="automatic" ${p.kind==='automatic'?'selected':''}>Automat · eliberează personalul</option></select></label><label>Durată nominală (s)<input name="phase-seconds-${index}" type="number" min="0.01" max="86400" step="any" value="${p.seconds}" required></label><div class="row"><button type="button" data-phase-up>↑ Mută înainte</button><button type="button" data-phase-remove>Elimină faza</button></div></fieldset>`;
}
