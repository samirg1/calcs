import { evaluateFormula } from './formula';
import { Calculator } from './types';

export type CalculatedScope = {
  complete: boolean;
  error: boolean;
  scope: Record<string, number>;
};

function parseNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(/[^0-9eE+.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateScope(calculator: Calculator, values: Record<string, string>): CalculatedScope {
  const scope: Record<string, number> = {};

  for (const variable of calculator.variables) {
    const parsed = parseNumber(values[variable.key]);
    if (parsed === null) return { complete: false, error: false, scope };
    scope[variable.key] = parsed;
  }

  try {
    for (const formula of calculator.formulas) {
      scope[formula.key] = evaluateFormula(formula.expression, scope);
    }
    return { complete: true, error: false, scope };
  } catch {
    return { complete: true, error: true, scope };
  }
}

function identifiers(expression: string): string[] {
  const normalized = expression.toLowerCase();
  const pattern = /[a-z_][a-z0-9_]*/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalized))) {
    const followedByParenthesis = /^\s*\(/.test(normalized.slice(pattern.lastIndex));
    if (!followedByParenthesis) matches.push(match[0]);
  }
  return [...new Set(matches)];
}

export function sourceVariablesForFormula(calculator: Calculator, formulaKey: string): string[] {
  const variableKeys = new Set(calculator.variables.map((variable) => variable.key));
  const formulas = new Map(calculator.formulas.map((formula) => [formula.key, formula]));
  const found = new Set<string>();
  const visited = new Set<string>();

  const visit = (key: string) => {
    if (variableKeys.has(key)) {
      found.add(key);
      return;
    }
    if (visited.has(key)) return;
    visited.add(key);
    const formula = formulas.get(key);
    if (formula) identifiers(formula.expression).forEach(visit);
  };

  visit(formulaKey);
  return calculator.variables.map((variable) => variable.key).filter((key) => found.has(key));
}

function outputForVariable(
  calculator: Calculator,
  baseScope: Record<string, number>,
  variableKey: string,
  variableValue: number,
  targetKey: string,
): number {
  const scope = { ...baseScope, [variableKey]: variableValue };
  for (const formula of calculator.formulas) {
    scope[formula.key] = evaluateFormula(formula.expression, scope);
    if (formula.key === targetKey) return scope[formula.key];
  }
  throw new Error('Unknown calculated value');
}

export function solveForSourceValue(
  calculator: Calculator,
  scope: Record<string, number>,
  targetKey: string,
  targetValue: number,
  variableKey: string,
): number | null {
  let guess = scope[variableKey] ?? 0;
  const tolerance = Math.max(1e-10, Math.abs(targetValue) * 1e-12);

  for (let iteration = 0; iteration < 36; iteration += 1) {
    let output: number;
    try {
      output = outputForVariable(calculator, scope, variableKey, guess, targetKey);
    } catch {
      return null;
    }

    const error = output - targetValue;
    if (Math.abs(error) <= tolerance) return guess;

    const step = Math.max(Math.abs(guess) * 1e-6, 1e-4);
    let upper: number;
    let lower: number;
    try {
      upper = outputForVariable(calculator, scope, variableKey, guess + step, targetKey);
      lower = outputForVariable(calculator, scope, variableKey, guess - step, targetKey);
    } catch {
      return null;
    }
    const derivative = (upper - lower) / (step * 2);
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) return null;

    const next = guess - error / derivative;
    if (!Number.isFinite(next)) return null;
    guess = next;
  }

  try {
    const finalOutput = outputForVariable(calculator, scope, variableKey, guess, targetKey);
    return Math.abs(finalOutput - targetValue) <= tolerance * 10 ? guess : null;
  } catch {
    return null;
  }
}

export function editableNumber(value: number, decimals = 8): string {
  if (!Number.isFinite(value)) return '';
  const nearestInteger = Math.round(value);
  if (Math.abs(value - nearestInteger) <= Math.max(1e-9, Math.abs(value) * 1e-10)) {
    return nearestInteger.toString();
  }
  return Number(value.toFixed(decimals)).toString();
}
