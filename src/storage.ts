import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedState } from './types';

const storageKey = 'calcs-state-v1';

export async function loadState(): Promise<PersistedState | null> {
  const value = await AsyncStorage.getItem(storageKey);
  if (!value) return null;

  try {
    return JSON.parse(value) as PersistedState;
  } catch {
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(state));
}
