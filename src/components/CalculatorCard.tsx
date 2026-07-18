import { memo, useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { calculateScope, editableNumber, solveForSourceValue, sourceVariablesForFormula } from '../calculatorEngine';
import { formatResult } from '../formula';
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
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [preferredSourceKey, setPreferredSourceKey] = useState(calculator.variables[0]?.key ?? '');
  const calculated = useMemo(() => calculateScope(calculator, values), [calculator, values]);

  const toggleCollapsed = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((current) => !current);
    void Haptics.selectionAsync();
  };

  const changeCalculatedValue = (formulaKey: string, text: string) => {
    setDraftValues((current) => ({ ...current, [formulaKey]: text }));
    const numericText = text.replace(/[^0-9eE+.-]/g, '');
    if (!numericText || numericText === '-' || numericText === '+' || numericText === '.') return;
    const target = Number(numericText);
    if (!Number.isFinite(target) || !calculated.complete || calculated.error) return;

    const sources = sourceVariablesForFormula(calculator, formulaKey);
    const sourceKey = sources.includes(preferredSourceKey) ? preferredSourceKey : sources[0];
    if (!sourceKey) return;
    const solution = solveForSourceValue(calculator, calculated.scope, formulaKey, target, sourceKey);
    if (solution === null) return;
    setPreferredSourceKey(sourceKey);
    onChangeValue(sourceKey, editableNumber(solution, 8));
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Pressable
          accessibilityLabel={`${collapsed ? 'Expand' : 'Collapse'} ${calculator.name}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={toggleCollapsed}
          style={({ pressed }) => [styles.titleGroup, pressed && styles.pressed]}
        >
          <Text style={[styles.chevron, !collapsed && styles.chevronExpanded]}>›</Text>
          <Text style={styles.title}>{calculator.name}</Text>
        </Pressable>
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

      {!collapsed && (
        <View style={styles.valueSection}>
          {calculator.variables.map((variable, index) => (
            <View key={variable.id} style={[styles.valueRow, index > 0 && styles.valueDivider]}>
              <Text style={styles.valueLabel}>{variable.name}</Text>
              <TextInput
                accessibilityLabel={variable.name}
                keyboardType="decimal-pad"
                onBlur={() => setActiveKey(null)}
                onChangeText={(value) => {
                  setDraftValues((current) => ({ ...current, [variable.key]: value }));
                  setPreferredSourceKey(variable.key);
                  onChangeValue(variable.key, value);
                }}
                onFocus={() => {
                  setActiveKey(variable.key);
                  setDraftValues((current) => ({ ...current, [variable.key]: values[variable.key] ?? '' }));
                }}
                placeholder="0"
                placeholderTextColor="#636366"
                selectTextOnFocus
                selectionColor="#0A84FF"
                style={styles.input}
                value={
                  activeKey === variable.key
                    ? draftValues[variable.key] ?? ''
                    : values[variable.key]?.trim()
                      ? formatResult(
                          Number(values[variable.key].replace(/[^0-9eE+.-]/g, '')),
                          variable.format ?? 'number',
                          variable.decimals ?? 2,
                        )
                      : ''
                }
              />
            </View>
          ))}
          {calculator.formulas.map((formula) => {
            const result = calculated.scope[formula.key];
            const displayValue = calculated.error
              ? 'Check formula'
              : calculated.complete && result !== undefined
                ? formatResult(result, formula.format, formula.decimals)
                : '';
            return (
              <View key={formula.id} style={[styles.valueRow, styles.valueDivider]}>
                <Text style={styles.valueLabel}>{formula.name}</Text>
                <TextInput
                  accessibilityLabel={formula.name}
                  keyboardType="decimal-pad"
                  onBlur={() => setActiveKey(null)}
                  onChangeText={(text) => changeCalculatedValue(formula.key, text)}
                  onFocus={() => {
                    setActiveKey(formula.key);
                    setDraftValues((current) => ({
                      ...current,
                      [formula.key]: result === undefined ? '' : editableNumber(result, Math.max(formula.decimals, 6)),
                    }));
                  }}
                  placeholder="0"
                  placeholderTextColor="#636366"
                  selectTextOnFocus
                  selectionColor="#0A84FF"
                  style={styles.input}
                  value={activeKey === formula.key ? draftValues[formula.key] ?? '' : displayValue}
                />
              </View>
            );
          })}
        </View>
      )}
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
  titleGroup: { alignItems: 'center', flexDirection: 'row', flex: 1, minHeight: 44 },
  chevron: { color: '#8E8E93', fontSize: 28, lineHeight: 30, marginLeft: -2, marginRight: 9, transform: [{ rotate: '0deg' }] },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingLeft: 14,
  },
  editGlyph: { color: '#0A84FF', fontSize: 16 },
  pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
  valueSection: { borderTopColor: '#38383A', borderTopWidth: StyleSheet.hairlineWidth },
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    paddingHorizontal: 16,
  },
  valueDivider: { borderTopColor: '#38383A', borderTopWidth: StyleSheet.hairlineWidth, marginLeft: 16 },
  valueLabel: { color: '#FFFFFF', flex: 1, fontSize: 16 },
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
});
