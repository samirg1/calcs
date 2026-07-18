export type ValueFormat = 'number' | 'currency' | 'percent';

export type CalculatorVariable = {
  id: string;
  name: string;
  key: string;
  format: ValueFormat;
  decimals: number;
};

export type CalculatorFormula = {
  id: string;
  name: string;
  key: string;
  expression: string;
  format: ValueFormat;
  decimals: number;
};

export type Calculator = {
  id: string;
  name: string;
  variables: CalculatorVariable[];
  formulas: CalculatorFormula[];
};

export type CalculatorValues = Record<string, Record<string, string>>;

export type PersistedState = {
  schemaVersion?: number;
  calculators: Calculator[];
  values: CalculatorValues;
};
