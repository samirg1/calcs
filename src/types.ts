export type ValueFormat = 'number' | 'currency' | 'percent';

export type CalculatorVariable = {
  id: string;
  name: string;
  key: string;
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
  calculators: Calculator[];
  values: CalculatorValues;
};
