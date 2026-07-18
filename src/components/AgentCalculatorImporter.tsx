import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { buildAgentInstructions, CalculatorImportResult, parseCalculatorImport } from '../calculatorImport';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImport: (result: CalculatorImportResult) => void;
};

export function AgentCalculatorImporter({ visible, onClose, onImport }: Props) {
  const [json, setJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [request, setRequest] = useState('');
  const canAdd = copied && Boolean(json.trim());

  const copyInstructions = async () => {
    if (!request.trim()) {
      Alert.alert('Describe your calculator', 'Enter what you want the calculator to do first.');
      return;
    }
    await Clipboard.setStringAsync(buildAgentInstructions(request));
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCopied(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addCalculator = () => {
    try {
      const result = parseCalculatorImport(json);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onImport(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The calculator could not be imported.';
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Check the JSON', message);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>With Agent</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canAdd }} disabled={!canAdd} hitSlop={10} onPress={addCalculator}>
            <Text style={[styles.add, !canAdd && styles.addDisabled]}>Add</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Build it with any AI</Text>
          <Text style={styles.intro}>
            Describe what you need, then copy the ready-made prompt into a fresh AI chat. Paste its response back here to add the calculator.
          </Text>

          <Text style={styles.fieldLabel}>WHAT DO YOU WANT TO CALCULATE?</Text>
          <TextInput
            accessibilityLabel="Calculator request"
            autoCapitalize="sentences"
            multiline
            onChangeText={(text) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setRequest(text);
              setCopied(false);
              setJson('');
            }}
            placeholder="e.g. Convert annual, monthly, fortnightly and hourly salary using a 38-hour work week."
            placeholderTextColor="#636366"
            selectionColor="#0A84FF"
            style={styles.requestField}
            textAlignVertical="top"
            value={request}
          />

          <Pressable
            accessibilityLabel="Copy agent instructions"
            accessibilityRole="button"
            onPress={copyInstructions}
            style={({ pressed }) => [styles.copyCard, pressed && styles.pressed]}
          >
            <View style={styles.copyIcon}>
              <Text style={styles.copyIconText}>{'{ }'}</Text>
            </View>
            <View style={styles.copyText}>
              <Text style={styles.copyTitle}>Copy agent instructions</Text>
              <Text style={styles.copySubtitle}>Schema, formula rules, and an example</Text>
            </View>
            <Text style={styles.copyAction}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>

          {copied && (
            <View>
              <Text style={styles.responseTitle}>Paste the AI response</Text>
              <Text style={styles.responseIntro}>The copied prompt already includes your request and the exact Calcs JSON format.</Text>
              <Text style={styles.fieldLabel}>CALCULATOR JSON</Text>
              <TextInput
                accessibilityLabel="Calculator JSON"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                onChangeText={setJson}
                placeholder={'{\n  "version": 1,\n  "name": "…"\n}'}
                placeholderTextColor="#636366"
                selectionColor="#0A84FF"
                spellCheck={false}
                style={styles.jsonField}
                textAlignVertical="top"
                value={json}
              />

              <View style={styles.note}>
                <Text style={styles.noteTitle}>Validated before adding</Text>
                <Text style={styles.noteText}>
                  Calcs checks names, keys, display formats, decimal places, initial values, formula order, and every expression.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000000', flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: '#38383A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancel: { color: '#0A84FF', fontSize: 16, width: 58 },
  add: { color: '#0A84FF', fontSize: 16, fontWeight: '600', textAlign: 'right', width: 58 },
  addDisabled: { color: '#48484A' },
  content: { paddingBottom: 70, paddingHorizontal: 20, paddingTop: 28 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  intro: { color: '#8E8E93', fontSize: 15, lineHeight: 22, marginTop: 9 },
  requestField: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    minHeight: 126,
    padding: 14,
  },
  copyCard: {
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 14,
    minHeight: 76,
    paddingHorizontal: 14,
  },
  copyIcon: { alignItems: 'center', backgroundColor: '#0A84FF', borderRadius: 9, height: 42, justifyContent: 'center', width: 42 },
  copyIconText: { color: '#FFFFFF', fontFamily: 'Menlo', fontSize: 13, fontWeight: '600' },
  copyText: { flex: 1, marginLeft: 12 },
  copyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  copySubtitle: { color: '#8E8E93', fontSize: 12, marginTop: 4 },
  copyAction: { color: '#0A84FF', fontSize: 15, marginLeft: 8 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
  fieldLabel: { color: '#8E8E93', fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 30 },
  responseTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 34 },
  responseIntro: { color: '#8E8E93', fontSize: 14, lineHeight: 20, marginTop: 7 },
  jsonField: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    color: '#FFFFFF',
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 20,
    minHeight: 300,
    padding: 15,
  },
  note: { borderTopColor: '#38383A', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 22, paddingTop: 16 },
  noteTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  noteText: { color: '#8E8E93', fontSize: 13, lineHeight: 19, marginTop: 5 },
});
