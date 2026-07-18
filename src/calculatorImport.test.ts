import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateScope } from './calculatorEngine';
import { AGENT_EXAMPLE_JSON, CalculatorImportError, buildAgentInstructions, parseCalculatorImport } from './calculatorImport';

function ids() {
  let value = 0;
  return () => `test-${++value}`;
}

test('creates a working calculator from the documented agent JSON', () => {
  const imported = parseCalculatorImport(AGENT_EXAMPLE_JSON, ids());
  assert.equal(imported.calculator.name, 'Yearly salary');
  assert.equal(imported.calculator.variables[0].format, 'currency');
  assert.deepEqual(imported.values, { annual_salary: '100000' });

  const calculated = calculateScope(imported.calculator, imported.values);
  assert.equal(calculated.complete, true);
  assert.equal(calculated.error, false);
  assert.ok(Math.abs(calculated.scope.hourly - 100000 / (38 * 52)) < 1e-10);
  assert.ok(Math.abs(calculated.scope.monthly - 100000 / 12) < 1e-10);
});

test('accepts JSON copied with a Markdown code fence', () => {
  const imported = parseCalculatorImport(`\`\`\`json\n${AGENT_EXAMPLE_JSON}\n\`\`\``, ids());
  assert.equal(imported.calculator.formulas.length, 3);
});

test('recovers JSON quotes changed by iOS smart punctuation', () => {
  const smartQuoted = AGENT_EXAMPLE_JSON.replace(/"/g, (quote, offset, source) => {
    const previous = source.slice(0, offset).trimEnd().slice(-1);
    return previous === ':' || previous === ',' || previous === '[' || previous === '{' ? '“' : '”';
  });
  const imported = parseCalculatorImport(smartQuoted, ids());
  assert.equal(imported.calculator.name, 'Yearly salary');
});

test('builds agent instructions containing the user request and JSON contract', () => {
  const instructions = buildAgentInstructions('Calculate paint needed for a room.');
  assert.match(instructions, /<calculator_request>\nCalculate paint needed for a room\.\n<\/calculator_request>/);
  assert.match(instructions, /version must be 1/);
  assert.match(instructions, /return ONLY one valid JSON object/i);
});

test('rejects malformed JSON', () => {
  assert.throws(() => parseCalculatorImport('{"version":1', ids()), /not valid JSON/);
});

test('rejects duplicate keys across variables and formulas', () => {
  const definition = JSON.parse(AGENT_EXAMPLE_JSON);
  definition.formulas[0].key = 'annual_salary';
  assert.throws(() => parseCalculatorImport(JSON.stringify(definition), ids()), /used more than once/);
});

test('rejects formulas that reference unknown or later values', () => {
  const definition = JSON.parse(AGENT_EXAMPLE_JSON);
  definition.formulas[0].expression = 'missing_value / 2';
  assert.throws(() => parseCalculatorImport(JSON.stringify(definition), ids()), /Unknown value/);
});

test('validates formats, decimals, and initial values', () => {
  const definition = JSON.parse(AGENT_EXAMPLE_JSON);
  definition.variables[0].format = 'dollars';
  assert.throws(() => parseCalculatorImport(JSON.stringify(definition), ids()), CalculatorImportError);

  definition.variables[0].format = 'currency';
  definition.variables[0].decimals = 12;
  assert.throws(() => parseCalculatorImport(JSON.stringify(definition), ids()), /0 to 8/);

  definition.variables[0].decimals = 2;
  definition.variables[0].initialValue = '$100,000';
  assert.throws(() => parseCalculatorImport(JSON.stringify(definition), ids()), /must be a number/);
});
