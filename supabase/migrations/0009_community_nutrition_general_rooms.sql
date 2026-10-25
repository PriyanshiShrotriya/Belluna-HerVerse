insert into public.chat_rooms (slug, title_en, title_hi, is_active)
values
  ('nutrition', 'Nutrition', 'पोषण', true),
  ('general', 'General', 'सामान्य', true)
on conflict (slug) do update
set title_en = excluded.title_en,
    title_hi = excluded.title_hi,
    is_active = true;
