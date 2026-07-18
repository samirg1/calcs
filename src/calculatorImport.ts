import { evaluateFormula, keyFromName } from './formula';
import { Calculator, ValueFormat } from './types';

type JsonRecord = Record<string, unknown>;
type IdFactory = () => string;

export type CalculatorImportResult = {
  calculator: Calculator;
  values: Record<string, string>;
};

export class CalculatorImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculatorImportError';
  }
}

const formats: ValueFormat[] = ['number', 'currency', 'percent'];
const keyPattern = /^[a-z_][a-z0-9_]*$/;

const example = {
  version: 1,
  name: 'Yearly salary',
  variables: [
    { name: 'Annual salary', key: 'annual_salary', format: 'currency', decimals: 2, initialValue: 100000 },
  ],
  formulas: [
    { name: 'Hourly', key: 'hourly', expression: 'annual_salary / (38 * 52)', format: 'currency', decimals: 2 },
    { name: 'Fortnightly', key: 'fortnightly', expression: 'annual_salary / 26', format: 'currency', decimals: 2 },
    { name: 'Monthly', key: 'monthly', expression: 'annual_salary / 12', format: 'currency', decimals: 2 },
  ],
};

export const AGENT_EXAMPLE_JSON = JSON.stringify(example, null, 2);

const agentContract = `You create calculator definitions for an iOS app named Calcs.

Use the calculator request below. Return ONLY one valid JSON object with no Markdown, code fences, explanation, or trailing text. Make reasonable assumptions when details are omitted.

JSON contract:
- version must be 1.
- name is the calculator name.
- variables is a non-empty array of independent/base values.
- formulas is a non-empty array of calculated values, evaluated from top to bottom.
- Every variable and formula needs name, key, format, and decimals.
- key must use lowercase letters, numbers, and underscores, start with a letter or underscore, and be unique across the entire calculator.
- format must be "number", "currency", or "percent". Currency displays as AUD.
- decimals must be an integer from 0 to 8.
- A variable may include an optional numeric initialValue.
- Formula expressions may reference variables and formulas listed earlier in the array.
- Supported operators: +, -, *, /, %, ^, and parentheses.
- Supported functions: round, min, max, abs, ceil, floor, sqrt, and pow.
- All values in Calcs are editable. When a calculated value is changed, Calcs numerically solves backward for the most recently edited relevant base value. Prefer continuous, invertible formulas where bidirectional editing is expected.
- Do not use JavaScript syntax, assignments, units, currency symbols, comments, or commas inside expressions.

Example output:
${AGENT_EXAMPLE_JSON}`;

export function buildAgentInstructions(request: string): string {
  return `${agentContract}

CALCULATOR REQUEST
<calculator_request>
${request.trim()}
</calculator_request>`;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function requiredText(record: JsonRecord, field: string, context: string): string {
  const value = record[field];
  if (typeof value !== 'string' || !value.trim()) throw new CalculatorImportError(`${context} needs a ${field}.`);
  return value.trim();
}

function readKey(record: JsonRecord, name: string, context: string): string {
  const supplied = record.key;
  const key = supplied === undefined ? keyFromName(name) : requiredText(record, 'key', context).toLowerCase();
  if (!keyPattern.test(key)) {
    throw new CalculatorImportError(`${context} key “${key}” must use lowercase letters, numbers, and underscores.`);
  }
  return key;
}

function readFormat(record: JsonRecord, context: string): ValueFormat {
  const format = record.format ?? 'number';
  if (typeof format !== 'string' || !formats.includes(format as ValueFormat)) {
    throw new CalculatorImportError(`${context} format must be number, currency, or percent.`);
  }
  return format as ValueFormat;
}

function readDecimals(record: JsonRecord, context: string): number {
  const decimals = record.decimals ?? 2;
  if (!Number.isInteger(decimals) || (decimals as number) < 0 || (decimals as number) > 8) {
    throw new CalculatorImportError(`${context} decimals must be a whole number from 0 to 8.`);
  }
  return decimals as number;
}

function cleanJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

export function parseCalculatorImport(text: string, idFactory: IdFactory = makeId): CalculatorImportResult {
  if (!text.trim()) throw new CalculatorImportError('Paste the calculator JSON first.');

  let raw: unknown;
  const cleaned = cleanJson(text);
  try {
    raw = JSON.parse(cleaned);
  } catch {
    try {
      raw = JSON.parse(cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"));
    } catch {
      throw new CalculatorImportError('This is not valid JSON. Check for missing quotes, commas, or brackets.');
    }
  }
  if (!isRecord(raw)) throw new CalculatorImportError('The JSON must contain one calculator object.');
  if (raw.version !== 1) throw new CalculatorImportError('Version must be 1.');

  const name = requiredText(raw, 'name', 'Calculator');
  if (name.length > 80) throw new CalculatorImportError('Calculator name must be 80 characters or fewer.');
  if (!Array.isArray(raw.variables) || raw.variables.length === 0) {
    throw new CalculatorImportError('Add at least one base value to variables.');
  }
  if (!Array.isArray(raw.formulas) || raw.formulas.length === 0) {
    throw new CalculatorImportError('Add at least one calculated value to formulas.');
  }

  const keys = new Set<string>();
  const values: Record<string, string> = {};
  const variables = raw.variables.map((item, index) => {
    const context = `Variable ${index + 1}`;
    if (!isRecord(item)) throw new CalculatorImportError(`${context} must be an object.`);
    const variableName = requiredText(item, 'name', context);
    const key = readKey(item, variableName, context);
    if (keys.has(key)) throw new CalculatorImportError(`The key “${key}” is used more than once.`);
    keys.add(key);
    if (item.initialValue !== undefined) {
      if (typeof item.initialValue !== 'number' || !Number.isFinite(item.initialValue)) {
        throw new CalculatorImportError(`${context} initialValue must be a number.`);
      }
      values[key] = item.initialValue.toString();
    }
    return {
      id: idFactory(),
      name: variableName,
      key,
      format: readFormat(item, context),
      decimals: readDecimals(item, context),
    };
  });

  const scope: Record<string, number> = Object.fromEntries(variables.map((variable, index) => [variable.key, index + 2.5]));
  const formulas = raw.formulas.map((item, index) => {
    const context = `Formula ${index + 1}`;
    if (!isRecord(item)) throw new CalculatorImportError(`${context} must be an object.`);
    const formulaName = requiredText(item, 'name', context);
    const key = readKey(item, formulaName, context);
    if (keys.has(key)) throw new CalculatorImportError(`The key “${key}” is used more than once.`);
    const expression = requiredText(item, 'expression', context);
    try {
      scope[key] = evaluateFormula(expression, scope);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid formula.';
      if (message === 'Cannot divide by zero' || message === 'Result is not a finite number') {
        scope[key] = 1;
      } else {
        throw new CalculatorImportError(`${context} “${formulaName}”: ${message}`);
      }
    }
    keys.add(key);
    return {
      id: idFactory(),
      name: formulaName,
      key,
      expression,
      format: readFormat(item, context),
      decimals: readDecimals(item, context),
    };
  });

  return { calculator: { id: idFactory(), name, variables, formulas }, values };
}
