import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AgentCalculatorImporter } from './src/components/AgentCalculatorImporter';
import { CalculatorCard } from './src/components/CalculatorCard';
import { CalculatorEditor } from './src/components/CalculatorEditor';
import { CalculatorImportResult } from './src/calculatorImport';
import { starterCalculator } from './src/sample';
import { loadState, saveState } from './src/storage';
import { Calculator, CalculatorValues } from './src/types';

export default function App() {
  const [calculators, setCalculators] = useState<Calculator[]>([]);
  const [values, setValues] = useState<CalculatorValues>({});
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState<Calculator | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const [agentImporterVisible, setAgentImporterVisible] = useState(false);

  useEffect(() => {
    void loadState().then((stored) => {
      setCalculators(stored ? stored.calculators : [starterCalculator]);
      setValues(stored?.values ?? {});
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) void saveState({ schemaVersion: 2, calculators, values });
  }, [calculators, hydrated, values]);

  const openEditor = (calculator: Calculator | null) => {
    setEditing(calculator);
    setEditorSession((session) => session + 1);
    setEditorVisible(true);
  };

  const saveCalculator = (calculator: Calculator) => {
    setCalculators((current) => {
      const exists = current.some((item) => item.id === calculator.id);
      return exists ? current.map((item) => (item.id === calculator.id ? calculator : item)) : [...current, calculator];
    });
    setEditorVisible(false);
  };

  const importCalculator = ({ calculator, values: importedValues }: CalculatorImportResult) => {
    setCalculators((current) => [...current, calculator]);
    setValues((current) => ({ ...current, [calculator.id]: importedValues }));
    setAgentImporterVisible(false);
  };

  const showCreationOptions = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('New calculator', 'Choose how you want to create it.', [
      { text: 'Manual', onPress: () => openEditor(null) },
      { text: 'With Agent', onPress: () => setAgentImporterVisible(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const deleteCalculator = (id: string) => {
    setCalculators((current) => current.filter((item) => item.id !== id));
    setValues((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setEditorVisible(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0A84FF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar style="light" />
        <NativeStatusBar barStyle="light-content" />
        <View style={styles.backgroundAccent} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Calculators</Text>
          </View>

          {calculators.map((calculator) => (
            <CalculatorCard
              calculator={calculator}
              key={calculator.id}
              onChangeValue={(key, value) =>
                setValues((current) => ({
                  ...current,
                  [calculator.id]: { ...current[calculator.id], [key]: value },
                }))
              }
              onEdit={() => openEditor(calculator)}
              values={values[calculator.id] ?? {}}
            />
          ))}

          {!calculators.length && (
            <View style={styles.emptyState}>
              <Text style={styles.emptySymbol}>+</Text>
              <Text style={styles.emptyTitle}>No Calculators</Text>
              <Text style={styles.emptyCopy}>Tap the add button to create one.</Text>
            </View>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>

        <View pointerEvents="box-none" style={styles.addDock}>
          <Pressable
            accessibilityLabel="Add calculator"
            onPress={showCreationOptions}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <Text style={styles.plus}>+</Text>
          </Pressable>
        </View>

        {editorVisible && (
          <CalculatorEditor
            calculator={editing}
            key={editorSession}
            onClose={() => setEditorVisible(false)}
            onDelete={editing ? deleteCalculator : null}
            onSave={saveCalculator}
            visible={editorVisible}
          />
        )}

        {agentImporterVisible && (
          <AgentCalculatorImporter
            onClose={() => setAgentImporterVisible(false)}
            onImport={importCalculator}
            visible={agentImporterVisible}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#000000', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#000000', flex: 1, justifyContent: 'center' },
  backgroundAccent: { display: 'none' },
  scrollContent: { paddingHorizontal: 16 },
  header: { paddingBottom: 18, paddingHorizontal: 4, paddingTop: 24 },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: 0.2 },
  emptyState: {
    alignItems: 'center',
    borderColor: '#38383A',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: 30,
    paddingVertical: 42,
  },
  emptySymbol: { color: '#0A84FF', fontSize: 36, fontWeight: '300' },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginTop: 10 },
  emptyCopy: { color: '#8E8E93', fontSize: 15, lineHeight: 21, marginTop: 7, textAlign: 'center' },
  bottomSpace: { height: 105 },
  addDock: { alignItems: 'center', bottom: 20, left: 0, position: 'absolute', right: 0 },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#0A84FF',
    borderRadius: 29,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  addButtonPressed: { opacity: 0.9, transform: [{ scale: 0.94 }] },
  plus: { color: '#FFFFFF', fontSize: 36, fontWeight: '300', lineHeight: 40, marginTop: -2 },
});
