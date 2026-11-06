import {emptyModel, node} from '../../dist/core/model.js';

// Synthetic reference values, not manufacturer specifications. Times are seconds,
// stocks/quantities are pieces, capacity is concurrent units, costs are EUR/unit.
export function edge(type, from, to, quantity = 1) {
  return {id: `${type}-${from}-${to}`, type, from, to, quantity, weight: 1, delay: 0};
}
export function line(cycles, {interval = 1, hours = 1, buffer = 10, limit = 0} = {}) {
  const m = emptyModel();
  m.settings = {hours, seed: 42, replications: 1};
  const source = node('source', 'Source', 'source');
  Object.assign(source.params, {interval, limit});
  m.nodes.push(source);
  let previous = source.id;
  cycles.forEach((cycle, i) => {
    const op = node('operation', `Operation ${i}`, `op${i}`);
    Object.assign(op.params, {cycle, buffer, capacity: 1});
    m.nodes.push(op);
    m.edges.push(edge('flow', previous, op.id));
    previous = op.id;
  });
  m.nodes.push(node('sink', 'Final product', 'sink'));
  m.edges.push(edge('flow', previous, 'sink'));
  return m;
}
export function sharedOperator() {
  const m = line([60]);
  const source = node('source', 'Second source', 'source2');
  source.params.interval = 1;
  m.nodes.push(source, node('operation', 'Second operation', 'opB'),
    node('sink', 'Second output', 'sink2'), node('person', 'Shared operator', 'operator'));
  m.edges.push(edge('flow', 'source2', 'opB'), edge('flow', 'opB', 'sink2'),
    edge('requires', 'op0', 'operator'), edge('requires', 'opB', 'operator'));
  return m;
}
export function finiteBuffer() { return line([10, 100], {buffer: 1}); }
export function rework() {
  const m = line([10], {limit: 4});
  m.edges.push(edge('flow', 'op0', 'op0'));
  return m;
}
export function materialConsumption() {
  const m = line([10]);
  const material = node('material', 'Kit', 'kit');
  Object.assign(material.params, {stock: 6, unitCost: 5});
  m.nodes.push(material);
  m.edges.push(edge('consumes', 'op0', 'kit', 2));
  return m;
}
export function section8(testCycle = 90) {
  const m = line([30, 45, testCycle], {interval: 60, hours: 8, buffer: 10});
  ['Preparation', 'Assembly', 'Test'].forEach((name, i) => { m.nodes[i + 1].name = name; });
  m.nodes.push(node('person', 'Operator', 'operator'), node('machine', 'Test bench', 'bench'));
  m.edges.push(edge('requires', 'op0', 'operator'), edge('requires', 'op1', 'operator'),
    edge('requires', 'op2', 'bench'));
  return m;
}
