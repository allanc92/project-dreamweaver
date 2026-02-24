import React, { useMemo, useRef, useState } from 'react';
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

const FIELD_CONFIG = {
  hero:    { label: "Who's the hero?",       placeholder: 'e.g. Milo the koala' },
  setting: { label: 'Where does it happen?', placeholder: 'e.g. a moonlit beach' },
  goal:    { label: "What's their mission?", placeholder: 'e.g. return a glowing shell' }
};

const MOOD_OPTIONS = ['silly', 'adventurous', 'cozy', 'magical', 'brave'];

const AGE_BANDS = [
  { value: '2-3', label: 'Little ones (2–3)' },
  { value: '4-6', label: 'Growing readers (4–6)' }
];

export default function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [story, setStory] = useState(null);

  const settingRef = useRef(null);
  const goalRef = useRef(null);

  const canSubmit = useMemo(
    () => !isLoading && ['hero', 'setting', 'goal', 'mood'].every((k) => form[k].trim()),
    [isLoading, form]
  );

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

  const startOver = () => {
    setStory(null);
    setForm(INITIAL_FORM);
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>DreamWeaver ✨</Text>
        <Text style={styles.subheader}>Create a story together in minutes.</Text>

        {/* Age band picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Who's the story for?</Text>
          <View style={styles.ageBandRow}>
            {AGE_BANDS.map(({ value, label }) => {
              const active = form.ageBand === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.ageBandPill, active && styles.ageBandPillActive]}
                  onPress={() => update('ageBand', value)}
                  accessibilityLabel={label}
                  accessibilityRole="button"
                >
                  <Text style={[styles.ageBandPillText, active && styles.ageBandPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Text fields: hero, setting, goal */}
        {Object.entries(FIELD_CONFIG).map(([field, { label, placeholder }], index) => {
          const refs = [null, settingRef, goalRef];
          const nextRef = refs[index];
          const isLast = index === Object.keys(FIELD_CONFIG).length - 1;
          return (
            <View key={field} style={styles.inputGroup}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                ref={index === 1 ? settingRef : index === 2 ? goalRef : null}
                style={styles.input}
                value={form[field]}
                onChangeText={(value) => update(field, value)}
                placeholder={placeholder}
                placeholderTextColor="#9aa3b2"
                returnKeyType={isLast ? 'done' : 'next'}
                onSubmitEditing={() => {
                  if (!isLast && nextRef?.current) nextRef.current.focus();
                }}
                blurOnSubmit={isLast}
                accessibilityLabel={label}
              />
            </View>
          );
        })}

        {/* Mood chip picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>What's the mood?</Text>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((mood) => {
              const active = form.mood === mood;
              return (
                <TouchableOpacity
                  key={mood}
                  style={[styles.moodChip, active && styles.moodChipActive]}
                  onPress={() => update('mood', mood)}
                  accessibilityLabel={`Mood: ${mood}`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.moodChipText, active && styles.moodChipTextActive]}>
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={generateStory}
          disabled={!canSubmit}
          accessibilityLabel="Generate Story"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Generate Story</Text>
        </TouchableOpacity>

        {isLoading && <ActivityIndicator size="large" color="#3d63ff" style={styles.loader} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {story ? (
          <>
            <View style={styles.storyCard}>
              <Text style={styles.sectionHeader}>Story Blueprint</Text>
              {story.storyMap.map((beat) => (
                <Text key={beat.beat} style={styles.beatLine}>
                  {beat.beat}. {beat.title}: {beat.summary}
                </Text>
              ))}
              <View style={styles.divider} />
              <Text style={styles.sectionHeader}>
                Your Story{story.wordCount ? `  ·  ${story.wordCount} words` : ''}
              </Text>
              <Text style={styles.storyBody}>{story.storyText}</Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={startOver}
              accessibilityLabel="Start Over"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Start Over</Text>
            </TouchableOpacity>
          </>
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
  // Age band toggle
  ageBandRow: { flexDirection: 'row', gap: 8 },
  ageBandPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3d63ff',
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center'
  },
  ageBandPillActive: { backgroundColor: '#3d63ff' },
  ageBandPillText: { fontSize: 14, fontWeight: '600', color: '#3d63ff' },
  ageBandPillTextActive: { color: '#fff' },
  // Mood chips
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip: {
    borderWidth: 1,
    borderColor: '#3d63ff',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 14
  },
  moodChipActive: { backgroundColor: '#3d63ff' },
  moodChipText: { fontSize: 14, fontWeight: '600', color: '#3d63ff' },
  moodChipTextActive: { color: '#fff' },
  // Generate button
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
  // Story output
  storyCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d4dcf5',
    gap: 8
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#44516d',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  divider: { height: 1, backgroundColor: '#d4dcf5', marginVertical: 4 },
  beatLine: { fontSize: 14, color: '#334155' },
  storyBody: { fontSize: 15, lineHeight: 22, color: '#0f172a' },
  // Start Over button
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#3d63ff',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryButtonText: { color: '#3d63ff', fontSize: 17, fontWeight: '700' }
});
