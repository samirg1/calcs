import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calculator, PersistedState, ValueFormat } from './types';

const storageKey = 'calcs-state-v1';

const formats: ValueFormat[] = ['number', 'currency', 'percent'];

function normalizeCalculator(calculator: Calculator, migrateLegacyStarter: boolean): Calculator {
  return {
    ...calculator,
    variables: calculator.variables.map((variable) => ({
      ...variable,
      format: migrateLegacyStarter && calculator.id === 'salary-starter' && variable.key === 'annual_salary'
          ? 'currency'
          : formats.includes(variable.format)
            ? variable.format
            : 'number',
      decimals: Number.isInteger(variable.decimals) ? variable.decimals : 2,
    })),
  };
}

export async function loadState(): Promise<PersistedState | null> {
  const value = await AsyncStorage.getItem(storageKey);
  if (!value) return null;

  try {
    const state = JSON.parse(value) as PersistedState;
    const migrateLegacyStarter = state.schemaVersion !== 2;
    return {
      ...state,
      schemaVersion: 2,
      calculators: state.calculators.map((calculator) => normalizeCalculator(calculator, migrateLegacyStarter)),
    };
  } catch {
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(state));
}
