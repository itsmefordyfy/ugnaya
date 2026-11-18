import { StyleSheet, View } from 'react-native';

import { CheckRow } from '@/components/check-row';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { FormSection } from '@/components/ui/form-section';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';

import { MONTHS, type ProfileDraft, type ProfileErrors } from '../profile-form';

const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: String(index + 1), label }));

export type ProfileFieldsProps = {
  draft: ProfileDraft;
  /** Only the fields that changed, merged by the form (so two quick edits never undo each other). */
  onChange: (changes: Partial<ProfileDraft>) => void;
  /** Shown after the first Save. */
  errors: ProfileErrors | null;
};

/** Name, birthday (optional: shops can send a birthday treat), city and the marketing choice. */
export function ProfileFields({ draft, onChange, errors }: ProfileFieldsProps) {
  const set = onChange;
  const hasBirthday = draft.month !== null || draft.day !== '';
  return (
    <View style={styles.root}>
      <FormSection title="About you">
        <TextField label="Your name" value={draft.name} onChangeText={(name) => set({ name })} autoCapitalize="words" textContentType="name" maxLength={80} error={errors?.name} />
        <TextField label="City (optional)" value={draft.city} onChangeText={(city) => set({ city })} autoCapitalize="words" textContentType="addressCity" maxLength={80} />
      </FormSection>
      <FormSection title="Birthday (optional)" footer="Only the month and day. Some shops give a treat on your birthday; we never show it to anyone.">
        <ChipSelect label="Month" options={MONTH_OPTIONS} value={draft.month === null ? null : String(draft.month)} onChange={(month) => set({ month: Number(month) })} />
        <TextField label="Day" numeric="integer" value={draft.day} onChangeText={(day) => set({ day })} maxLength={2} placeholder="1–31" error={errors?.birthday} />
        {hasBirthday && <Button title="Clear birthday" variant="ghost" size="small" onPress={() => set({ month: null, day: '' })} style={styles.clear} />}
      </FormSection>
      <CheckRow checked={draft.marketing} onChange={(marketing) => set({ marketing })} accessibilityLabel="Send me offers and news from UGNAYA">
        <ThemedText type="secondary">Send me offers and news from UGNAYA and its shops. You can change this any time.</ThemedText>
      </CheckRow>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.four,
  },
  clear: {
    alignSelf: 'flex-start',
  },
});
