import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { evaluateFormula, formatResult } from '../formula';
import { Calculator } from '../types';

type Props = {
  calculator: Calculator;
  values: Record<string, string>;
  onChangeValue: (key: string, value: string) => void;
  onEdit: () => void;
};

export const CalculatorCard = memo(function CalculatorCard({
  calculator,
  values,
  onChangeValue,
  onEdit,
}: Props) {
  const results = useMemo(() => {
    const hasAllInputs = calculator.variables.every((variable) => values[variable.key]?.trim());
    if (!hasAllInputs) return calculator.formulas.map(() => '—');

    const scope: Record<string, number> = {};
    for (const variable of calculator.variables) {
      const parsed = Number(values[variable.key].replace(/,/g, ''));
      if (!Number.isFinite(parsed)) return calculator.formulas.map(() => 'Invalid input');
      scope[variable.key] = parsed;
    }

    return calculator.formulas.map((formula) => {
      try {
        const result = evaluateFormula(formula.expression, scope);
        scope[formula.key] = result;
        return formatResult(result, formula.format, formula.decimals);
      } catch {
        return 'Check formula';
      }
    });
  }, [calculator, values]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{calculator.name}</Text>
        </View>
        <Pressable
          accessibilityLabel={`Edit ${calculator.name}`}
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            onEdit();
          }}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
        >
          <Text style={styles.editGlyph}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.inputSection}>
        {calculator.variables.map((variable, index) => (
          <View key={variable.id} style={[styles.inputRow, index > 0 && styles.inputDivider]}>
            <Text style={styles.inputLabel}>{variable.name}</Text>
            <TextInput
              accessibilityLabel={variable.name}
              keyboardType="decimal-pad"
              onChangeText={(value) => onChangeValue(variable.key, value)}
              placeholder="0"
              placeholderTextColor="#636366"
              selectionColor="#0A84FF"
              style={styles.input}
              value={values[variable.key] ?? ''}
            />
          </View>
        ))}
      </View>

      <View style={styles.resultSection}>
        {calculator.formulas.map((formula, index) => (
          <View key={formula.id} style={[styles.resultRow, index > 0 && styles.resultDivider]}>
            <Text style={styles.resultLabel}>{formula.name}</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={[styles.resultValue, results[index] === '—' && styles.emptyValue]}
            >
              {results[index]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 16,
  },
  titleGroup: { alignItems: 'center', flexDirection: 'row', flex: 1 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingLeft: 14,
  },
  editGlyph: { color: '#0A84FF', fontSize: 16 },
  pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
  inputSection: { borderTopColor: '#38383A', borderTopWidth: StyleSheet.hairlineWidth },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    paddingHorizontal: 16,
  },
  inputDivider: { borderTopColor: '#38383A', borderTopWidth: StyleSheet.hairlineWidth, marginLeft: 16 },
  inputLabel: { color: '#FFFFFF', flex: 1, fontSize: 16 },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 9,
    color: '#FFFFFF',
    fontSize: 19,
    minWidth: 128,
    paddingHorizontal: 12,
    paddingVertical: 9,
    textAlign: 'right',
  },
  resultSection: { borderTopColor: '#38383A', borderTopWidth: StyleSheet.hairlineWidth, paddingLeft: 16 },
  resultRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 54, paddingRight: 16 },
  resultDivider: { borderTopColor: '#38383A', borderTopWidth: StyleSheet.hairlineWidth },
  resultLabel: { color: '#FFFFFF', flex: 1, fontSize: 16 },
  resultValue: { color: '#FFFFFF', flex: 1.35, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '500', textAlign: 'right' },
  emptyValue: { color: '#636366' },
});
