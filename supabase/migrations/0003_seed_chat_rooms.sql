insert into public.chat_rooms (slug, title_en, title_hi, is_active)
values
  (
    'menstrual-health',
    'Menstrual Health',
    'मासिक धर्म स्वास्थ्य',
    true
  ),
  (
    'pcos',
    'PCOS Support',
    'पीसीओएस सहायता',
    true
  ),
  (
    'reproductive-health',
    'Reproductive Health',
    'प्रजनन स्वास्थ्य',
    true
  ),
  (
    'sexual-health',
    'Sexual Health',
    'यौन स्वास्थ्य',
    true
  ),
  (
    'emotional-wellbeing',
    'Emotional Wellbeing',
    'भावनात्मक स्वास्थ्य',
    true
  )
on conflict (slug) do nothing;
