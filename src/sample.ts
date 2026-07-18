import { Calculator } from './types';

export const starterCalculator: Calculator = {
  id: 'salary-starter',
  name: 'Yearly salary',
  variables: [{ id: 'annual-input', name: 'Annual salary', key: 'annual_salary', format: 'currency', decimals: 2 }],
  formulas: [
    {
      id: 'hourly-result',
      name: 'Hourly',
      key: 'hourly',
      expression: 'annual_salary / (38 * 52)',
      format: 'currency',
      decimals: 2,
    },
    {
      id: 'fortnightly-result',
      name: 'Fortnightly',
      key: 'fortnightly',
      expression: 'annual_salary / 26',
      format: 'currency',
      decimals: 2,
    },
    {
      id: 'monthly-result',
      name: 'Monthly',
      key: 'monthly',
      expression: 'annual_salary / 12',
      format: 'currency',
      decimals: 2,
    },
  ],
};
