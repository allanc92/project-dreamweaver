import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8787';

const INITIAL_FORM = {
  hero: '',
  setting: '',
  goal: '',
  mood: '',
  ageBand: '4-6'
};

export default function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [story, setStory] = useState(null);

  const canSubmit = useMemo(() => !isLoading, [isLoading]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const generateStory = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/v1/story/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to generate story');
      }

      setStory(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>DreamWeaver ✨</Text>
        <Text style={styles.subheader}>Create a story together in minutes.</Text>

        {['hero', 'setting', 'goal', 'mood'].map((field) => (
          <View key={field} style={styles.inputGroup}>
            <Text style={styles.label}>{field.toUpperCase()}</Text>
            <TextInput
              style={styles.input}
              value={form[field]}
              onChangeText={(value) => update(field, value)}
              placeholder={`Enter ${field}`}
              placeholderTextColor="#9aa3b2"
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={generateStory}
          disabled={!canSubmit}
        >
          <Text style={styles.buttonText}>{isLoading ? 'Generating...' : 'Generate Story'}</Text>
        </TouchableOpacity>

        {isLoading && <ActivityIndicator size="large" color="#3d63ff" style={styles.loader} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {story ? (
          <View style={styles.storyCard}>
            <Text style={styles.storyTitle}>Story Map ({story.wordCount} words)</Text>
            {story.storyMap.map((beat) => (
              <Text key={beat.beat} style={styles.beatLine}>
                {beat.beat}. {beat.title}: {beat.summary}
              </Text>
            ))}
            <Text style={styles.storyBody}>{story.storyText}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f9ff' },
  container: { padding: 20, gap: 12 },
  header: { fontSize: 32, fontWeight: '700', color: '#1f2a44' },
  subheader: { fontSize: 16, color: '#44516d', marginBottom: 8 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, color: '#44516d', fontWeight: '700' },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d4dcf5',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  button: {
    marginTop: 8,
    backgroundColor: '#3d63ff',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center'
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loader: { marginTop: 8 },
  error: { color: '#b42318', fontWeight: '600' },
  storyCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d4dcf5',
    gap: 8
  },
  storyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2a44' },
  beatLine: { fontSize: 14, color: '#334155' },
  storyBody: { marginTop: 8, fontSize: 15, lineHeight: 22, color: '#0f172a' }
});
