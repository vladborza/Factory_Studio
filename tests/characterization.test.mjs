import {test} from 'node:test';
import assert from 'node:assert/strict';
import {node} from '../dist/core/model.js';
import {simulateNetwork, replicate} from '../dist/core/network.js';
import {edge, line, sharedOperator, finiteBuffer, rework, materialConsumption, section8} from './fixtures/audit-models.mjs';

function conserved(r) { assert.equal(r.arrived, r.good + r.scrap + r.wip); }
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`); }

test('audit: deterministic serial line agrees with hand calculation and inclusive arrivals', () => {
  const r = simulateNetwork(line([60, 90, 45]));
  // First completion 195 s; subsequent completions every 90 s.
  assert.equal(r.good, 1 + Math.floor((3600 - 195) / 90));
  assert.equal(r.arrived, 3601); // arrivals at both t=0 and t=3600
  assert.equal(r.wip, 3563); // includes unbounded source-side backlog
  conserved(r);
});

test('audit: shared operator capacity is respected but node order can starve another line', () => {
  const m = sharedOperator();
  const r = simulateNetwork(m);
  assert.deepEqual(r.outputs.map(x => x.good), [60, 0]);
  close(r.resources[0].utilization, 1);
  assert.equal(r.operations.find(x => x.id === 'opB').resourceWait, 3600);
  conserved(r);
});

test('audit: finite buffer blocks upstream; blocked channel has already released its pool', () => {
  const m = finiteBuffer();
  m.nodes.push(node('machine', 'Upstream machine', 'machine'));
  m.edges.push(edge('requires', 'op0', 'machine'));
  const r = simulateNetwork(m);
  assert.equal(r.good, 1 + Math.floor((3600 - 110) / 100));
  assert.equal(r.operations[0].count, 38);
  close(r.operations[0].blocked, 3220 / 3600);
  assert.ok(r.operations.every(x => x.maxQueue <= 1));
  const blocked = r.trace.filter(x => x.operation === 'op0' && x.state === 'blocked' && x.end > x.start);
  assert.ok(blocked.length > 0);
  assert.ok(blocked.every(x => !x.resources.includes('machine')));
  conserved(r);
});

test('audit: seeded rework locks routing behavior and repeats BOM consumption', () => {
  const m = rework();
  const material = node('material', 'Consumable', 'kit');
  Object.assign(material.params, {stock: 100, unitCost: 2});
  m.nodes.push(material);
  m.edges.push(edge('consumes', 'op0', 'kit'));
  const before = JSON.stringify(m);
  const r = simulateNetwork(m);
  assert.deepEqual(r, simulateNetwork(m));
  assert.equal(JSON.stringify(m), before);
  assert.equal(r.good, 4);
  assert.equal(r.operations[0].count, 17); // seed/IDs/edge order specific, not an analytical expectation
  assert.equal(r.materials[0].consumed, 17);
  assert.equal(r.materialCost, 34);
  assert.equal(r.wip, 0);
  conserved(r);
});

test('audit: material shortage stops processing with exact stock and purchase cost accounting', () => {
  const r = simulateNetwork(materialConsumption());
  assert.equal(r.good, 3);
  assert.equal(r.materials[0].remaining, 0);
  assert.equal(r.materials[0].consumed, 6);
  assert.equal(r.materialCost, 30);
  assert.equal(r.operations[0].materialWait, 3570);
  conserved(r);
});

test('audit: legacy operations hold the operator throughout repair', () => {
  const m = line([60]);
  Object.assign(m.nodes[1].params, {mtbf: 20, mttr: 60});
  m.nodes.push(node('person', 'Operator', 'operator'));
  m.edges.push(edge('requires', 'op0', 'operator'));
  const r = simulateNetwork(m);
  const repairs = r.trace.filter(x => x.state === 'down' && x.end > x.start);
  assert.ok(repairs.length > 0);
  assert.ok(repairs.every(x => x.resources.includes('operator')));
  close(r.resources[0].utilization, r.operations[0].busy + r.operations[0].down);
  conserved(r);
});

test('audit: setup is paid for every part, not once per batch', () => {
  const m = line([10], {limit: 5});
  m.nodes[1].params.setup = 10;
  const r = simulateNetwork(m);
  assert.equal(r.good, 5);
  close(r.operations[0].busy * 3600, 5 * (10 + 10));
});

test('audit: ON/OFF gates starts but does not interrupt work crossing the boundary', () => {
  const m = line([90], {limit: 1});
  Object.assign(m.nodes[1].params, {on: 60, off: 60});
  const r = simulateNetwork(m);
  assert.equal(r.good, 1);
  assert.equal(r.leadMean, 90);
});

test('audit: Section 8, 90 s test bench, 8 h and one replication', () => {
  const result = replicate(section8());
  const r = result.first;
  const ceiling = Math.min(3600 / 60, 3600 / (30 + 45), 3600 / 90);
  assert.equal(ceiling, 40);
  // First product at 165 s, test bench continuously fed thereafter.
  assert.equal(r.good, 1 + Math.floor((8 * 3600 - 165) / 90));
  assert.equal(r.good, 319);
  assert.ok(ceiling * 8 - r.good <= 1); // one piece startup/horizon loss
  assert.equal(result.runs.length, 1);
  assert.equal(result.ci95, null); // one deterministic run does not estimate uncertainty
  assert.equal(r.arrived, 481);
  conserved(r);
});

test('audit: Section 8, 60 s test shifts bound to shared operator, terminal WIP explains loss', () => {
  const result = replicate(section8(60));
  const r = result.first;
  const ceiling = Math.min(3600 / 60, 3600 / (30 + 45), 3600 / 60);
  assert.equal(ceiling, 48);
  assert.equal(r.good, 379); // scheduling/terminal WIP, not simply 384 or a startup-only correction
  assert.equal(r.operations[0].count, 390);
  assert.equal(r.operations[1].count, 380);
  close(r.resources.find(x => x.id === 'operator').utilization, 1);
  // 10 prepared-only pieces and one assembled piece still at Test:
  assert.equal(r.good * 75 + 10 * 30 + 1 * 75, 8 * 3600);
  // Fixture-specific allowance from that work balance, not a universal bound
  // for other schedules: 375 s / 75 s per final piece = five pieces.
  assert.ok(r.good <= ceiling * 8 && ceiling * 8 - r.good <= 5);
  assert.equal(result.summary.wip.mean, r.wip);
  assert.equal(result.summary.totalCost.mean, r.totalCost);
  assert.equal(result.ci95, null);
  conserved(r);
});
