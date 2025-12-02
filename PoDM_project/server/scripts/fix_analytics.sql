-- Function to increment content view count
create or replace function increment_content_view_count(content_id_to_update uuid)
returns void as $$
begin
  update content
  set stats = jsonb_set(
    coalesce(stats, '{}'::jsonb),
    '{views}',
    (coalesce((stats->>'views')::int, 0) + 1)::text::jsonb
  )
  where id = content_id_to_update;
end;
$$ language plpgsql;

-- Function to increment tip count and amount
create or replace function increment_tip_count(content_id_to_update uuid, tip_amount int)
returns void as $$
begin
  update content
  set stats = jsonb_set(
    jsonb_set(
      coalesce(stats, '{}'::jsonb),
      '{tips}',
      (coalesce((stats->>'tips')::int, 0) + tip_amount)::text::jsonb
    ),
    '{tipCount}',
    (coalesce((stats->>'tipCount')::int, 0) + 1)::text::jsonb
  )
  where id = content_id_to_update;
end;
$$ language plpgsql;

-- Function to increment gallery add count
create or replace function increment_gallery_count(content_id_to_update uuid)
returns void as $$
begin
  update content
  set stats = jsonb_set(
    coalesce(stats, '{}'::jsonb),
    '{galleryAdds}',
    (coalesce((stats->>'galleryAdds')::int, 0) + 1)::text::jsonb
  )
  where id = content_id_to_update;
end;
$$ language plpgsql;
