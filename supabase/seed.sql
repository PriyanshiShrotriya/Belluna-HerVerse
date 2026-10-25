insert into public.symptom_catalog (code, category, label_en, label_hi)
values
  ('cramps', 'pain', 'Cramps', 'ऐंठन'),
  ('headache', 'pain', 'Headache', 'सिरदर्द'),
  ('back_pain', 'pain', 'Back pain', 'पीठ दर्द'),
  ('bloating', 'digestive', 'Bloating', 'पेट फूलना'),
  ('nausea', 'digestive', 'Nausea', 'मतली'),
  ('fatigue', 'general', 'Fatigue', 'थकान'),
  ('breast_tenderness', 'general', 'Breast tenderness', 'स्तनों में संवेदनशीलता'),
  ('mood_changes', 'mood', 'Mood changes', 'मूड में बदलाव')
on conflict (code) do nothing;
