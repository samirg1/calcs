import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Host } from '@expo/ui';
import * as Haptics from 'expo-haptics';
import { evaluateFormula, keyFromName } from '../formula';
import { Calculator, CalculatorFormula, CalculatorVariable, ValueFormat } from '../types';

type Props = {
  calculator: Calculator | null;
  visible: boolean;
  onClose: () => void;
  onSave: (calculator: Calculator) => void;
  onDelete: ((id: string) => void) | null;
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function emptyVariable(): CalculatorVariable {
  return { id: makeId(), name: '', key: '', format: 'number', decimals: 2 };
}

function emptyFormula(): CalculatorFormula {
  return { id: makeId(), name: '', key: '', expression: '', format: 'number', decimals: 2 };
}

export function CalculatorEditor({ calculator, visible, onClose, onSave, onDelete }: Props) {
  const initial = useMemo<Calculator>(
    () =>
      calculator
        ? JSON.parse(JSON.stringify(calculator))
        : { id: makeId(), name: '', variables: [emptyVariable()], formulas: [emptyFormula()] },
    [calculator, visible],
  );
  const [draft, setDraft] = useState(initial);

  // A keyed child is used by the parent, so this state is recreated each time the sheet opens.
  const updateVariable = (index: number, patch: Partial<CalculatorVariable>) => {
    setDraft((current) => ({
      ...current,
      variables: current.variables.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, ...patch, ...(patch.name !== undefined ? { key: keyFromName(patch.name) } : {}) }
          : item,
      ),
    }));
  };

  const updateFormula = (index: number, patch: Partial<CalculatorFormula>) => {
    setDraft((current) => ({
      ...current,
      formulas: current.formulas.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, ...patch, ...(patch.name !== undefined ? { key: keyFromName(patch.name) } : {}) }
          : item,
      ),
    }));
  };

  const validateAndSave = () => {
    const name = draft.name.trim();
    if (!name) return Alert.alert('Name your calculator', 'Add a short name so you can find it later.');
    if (draft.variables.some((item) => !item.name.trim() || !item.key)) {
      return Alert.alert('Finish the base values', 'Every base value needs a name.');
    }
    if (draft.formulas.some((item) => !item.name.trim() || !item.key || !item.expression.trim())) {
      return Alert.alert('Finish the calculated values', 'Every calculated value needs a name and formula.');
    }

    const keys = [...draft.variables, ...draft.formulas].map((item) => item.key);
    if (new Set(keys).size !== keys.length) {
      return Alert.alert('Use unique names', 'Input and result names must create unique formula keys.');
    }

    const scope: Record<string, number> = Object.fromEntries(draft.variables.map((item) => [item.key, 1]));
    for (const formula of draft.formulas) {
      try {
        scope[formula.key] = evaluateFormula(formula.expression, scope);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'This formula is not valid.';
        return Alert.alert(`Check “${formula.name}”`, message);
      }
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      ...draft,
      name,
      variables: draft.variables.map((item) => ({ ...item, name: item.name.trim() })),
      formulas: draft.formulas.map((item) => ({
        ...item,
        name: item.name.trim(),
        expression: item.expression.trim(),
      })),
    });
  };

  const availableKeys = [...draft.variables.map((item) => item.key), ...draft.formulas.map((item) => item.key)].filter(Boolean);

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{calculator ? 'Edit calculator' : 'New calculator'}</Text>
          <Pressable hitSlop={10} onPress={validateAndSave}>
            <Text style={styles.save}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>Define the values and their relationships. Every value will be editable in the calculator.</Text>

          <FieldLabel label="Calculator name" />
          <TextInput
            autoCapitalize="words"
            autoFocus={!calculator}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="e.g. Yearly salary"
            placeholderTextColor="#636366"
            selectionColor="#0A84FF"
            style={styles.textField}
            value={draft.name}
          />

          <SectionHeader title="Base values" description="Independent values used by your formulas." />
          {draft.variables.map((variable, index) => (
            <View key={variable.id} style={styles.formulaCard}>
              <View style={styles.formulaHeader}>
                <Text style={styles.formulaCount}>VALUE {String(index + 1).padStart(2, '0')}</Text>
                {draft.variables.length > 1 && (
                  <Pressable
                    hitSlop={10}
                    onPress={() => setDraft((current) => ({ ...current, variables: current.variables.filter((_, i) => i !== index) }))}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                )}
              </View>
              <FieldLabel label="Value name" />
              <TextInput
                autoCapitalize="words"
                onChangeText={(name) => updateVariable(index, { name })}
                placeholder="e.g. Annual salary"
                placeholderTextColor="#636366"
                selectionColor="#0A84FF"
                style={styles.textField}
                value={variable.name}
              />
              <FieldLabel label="Display" />
              <FormatPicker value={variable.format ?? 'number'} onChange={(format) => updateVariable(index, { format })} />
            </View>
          ))}
          <NativeAction label="Add variable" onPress={() => setDraft((current) => ({ ...current, variables: [...current.variables, emptyVariable()] }))} />

          <SectionHeader title="Calculated values" description="Formula-driven values that remain directly editable." />
          {draft.formulas.map((formula, index) => (
            <View key={formula.id} style={styles.formulaCard}>
              <View style={styles.formulaHeader}>
                <Text style={styles.formulaCount}>RESULT {String(index + 1).padStart(2, '0')}</Text>
                {draft.formulas.length > 1 && (
                  <Pressable
                    hitSlop={10}
                    onPress={() => setDraft((current) => ({ ...current, formulas: current.formulas.filter((_, i) => i !== index) }))}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                )}
              </View>
              <FieldLabel label="Result name" />
              <TextInput
                autoCapitalize="words"
                onChangeText={(name) => updateFormula(index, { name })}
                placeholder="e.g. Hourly"
                placeholderTextColor="#636366"
                selectionColor="#0A84FF"
                style={styles.textField}
                value={formula.name}
              />
              <FieldLabel label="Formula" />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(expression) => updateFormula(index, { expression })}
                placeholder="annual_salary / (38 * 52)"
                placeholderTextColor="#636366"
                selectionColor="#0A84FF"
                style={[styles.textField, styles.formulaField]}
                value={formula.expression}
              />
              <Text style={styles.keysLabel}>AVAILABLE VALUES</Text>
              <View style={styles.keys}>
                {availableKeys.slice(0, draft.variables.length + index).map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => updateFormula(index, { expression: `${formula.expression}${formula.expression ? ' ' : ''}${key}` })}
                    style={({ pressed }) => [styles.keyPill, pressed && styles.pressed]}
                  >
                    <Text style={styles.keyPillText}>{key}</Text>
                  </Pressable>
                ))}
              </View>
              <FieldLabel label="Display" />
              <FormatPicker value={formula.format} onChange={(format) => updateFormula(index, { format })} />
            </View>
          ))}
          <NativeAction label="Add result" onPress={() => setDraft((current) => ({ ...current, formulas: [...current.formulas, emptyFormula()] }))} />

          <View style={styles.tip}>
            <Text style={styles.tipTitle}>Formula notes</Text>
            <Text style={styles.tipText}>Use +, −, *, /, %, ^ and parentheses. Functions: round, min, max, abs, ceil, floor, sqrt and pow.</Text>
          </View>

          {calculator && onDelete && (
            <Pressable
              onPress={() =>
                Alert.alert('Delete calculator?', `“${calculator.name}” and its saved values will be removed.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDelete(calculator.id) },
                ])
              }
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>Delete calculator</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function FormatPicker({ value, onChange }: { value: ValueFormat; onChange: (format: ValueFormat) => void }) {
  return (
    <View style={styles.segmented}>
      {(['number', 'currency', 'percent'] as ValueFormat[]).map((format) => (
        <Pressable
          accessibilityLabel={`Display as ${format}`}
          key={format}
          onPress={() => onChange(format)}
          style={[styles.segment, value === format && styles.segmentSelected]}
        >
          <Text style={[styles.segmentText, value === format && styles.segmentTextSelected]}>
            {format === 'number' ? '123' : format === 'currency' ? '$' : '%'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </View>
  );
}

function NativeAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.nativeActionWrap}>
      <Host matchContents>
        <Button label={label} onPress={onPress} variant="text" />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000000', flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderBottomColor: '#38383A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancel: { color: '#0A84FF', fontSize: 16, width: 58 },
  save: { color: '#0A84FF', fontSize: 16, fontWeight: '600', textAlign: 'right', width: 58 },
  content: { paddingBottom: 60, paddingHorizontal: 20, paddingTop: 28 },
  intro: { color: '#8E8E93', fontSize: 15, lineHeight: 21, marginBottom: 20 },
  fieldLabel: { color: '#8E8E93', fontSize: 13, marginBottom: 7, marginTop: 13 },
  textField: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  formulaField: { fontFamily: 'Menlo', fontSize: 14 },
  sectionHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 10, marginTop: 30 },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '600' },
  sectionDescription: { color: '#8E8E93', fontSize: 13, marginTop: 3 },
  nativeActionWrap: { alignItems: 'flex-start', marginTop: 12, minHeight: 42 },
  formulaCard: { backgroundColor: '#1C1C1E', borderRadius: 12, marginBottom: 12, padding: 16 },
  formulaHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  formulaCount: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  removeText: { color: '#FF453A', fontSize: 13 },
  keysLabel: { color: '#8E8E93', fontSize: 11, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  keyPill: { backgroundColor: '#2C2C2E', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
  keyPillText: { color: '#0A84FF', fontFamily: 'Menlo', fontSize: 11 },
  pressed: { opacity: 0.55 },
  segmented: { backgroundColor: '#2C2C2E', borderRadius: 9, flexDirection: 'row', padding: 2 },
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 8 },
  segmentSelected: { backgroundColor: '#636366' },
  segmentText: { color: '#8E8E93', fontSize: 14, fontWeight: '600' },
  segmentTextSelected: { color: '#FFFFFF' },
  tip: { backgroundColor: '#1C1C1E', borderRadius: 10, marginTop: 28, padding: 16 },
  tipTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  tipText: { color: '#8E8E93', fontSize: 13, lineHeight: 19, marginTop: 5 },
  deleteButton: { alignItems: 'center', marginTop: 28, paddingVertical: 14 },
  deleteText: { color: '#FF453A', fontSize: 15, fontWeight: '600' },
});
