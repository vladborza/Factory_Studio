// Phase fractions preserve the existing cycle parameter and its variable binding.
// Changing the total cycle scales the phase durations proportionally.
export const isHuman = n => ['person', 'team'].includes(n.type);
export function validatePhases(n) {
  if (n.phases === undefined) return;
  if (!['operation', 'inspection', 'transport'].includes(n.type) || !Array.isArray(n.phases) || !n.phases.length || n.phases.length > 20)
    throw Error(n.name + ': definește 1–20 faze numai pe operații.');
  let total = 0;
  for (const p of n.phases) {
    if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100 || !['manual', 'automatic'].includes(p.kind) || !Number.isFinite(p.fraction) || p.fraction <= 0 || p.fraction > 1)
      throw Error(n.name + ': fază invalidă (nume, tip sau proporție).');
    total += p.fraction;
  }
  if (Math.abs(total - 1) > 1e-9) throw Error(n.name + ': proporțiile fazelor trebuie să însumeze 1.');
}
export function phasePlan(n) {
  return n.phases || [{name: 'Ciclu complet', kind: 'manual', fraction: 1}];
}
export function setPhaseDurations(n, rows, note) {
  if (!rows.length || rows.length > 20 || rows.some(p => !Number.isFinite(p.seconds) || p.seconds < .01 || p.seconds > 86400))
    throw Error('Introdu 1–20 faze cu durate pozitive de minimum 0,01 s.');
  const cycle = rows.reduce((sum, p) => sum + p.seconds, 0);
  if (cycle > 86400) throw Error('Ciclul total nu poate depăși 86400 s.');
  const phases = rows.map(({name, kind, seconds}) => ({name: name.trim(), kind, fraction: seconds / cycle}));
  validatePhases({...n, phases});
  if (!note?.trim()) throw Error('Documentează sursa sau ipoteza duratelor.');
  n.phases = phases;
  n.params.cycle = cycle;
  delete n.bindings.cycle;
  n.calibration ??= {};
  n.calibration.cycle = {status: 'assumption', note: 'Faze: ' + note.trim()};
}
