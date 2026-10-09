CREATE OR REPLACE FUNCTION openpeeps_posts_search_vector(p_body jsonb) RETURNS tsvector
LANGUAGE sql
STABLE
AS $$
  SELECT to_tsvector('english', trim(
    coalesce(p_body->>'content', '') || ' ' ||
    coalesce(p_body->>'title', '') || ' ' ||
    coalesce(p_body->>'name', '') || ' ' ||
    coalesce(p_body->'physicalLocation'->>'text', '') || ' ' ||
    coalesce(p_body->>'url', '') || ' ' ||
    coalesce((
      SELECT string_agg(tag, ' ')
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(p_body->'tags') = 'array' THEN p_body->'tags'
          ELSE '[]'::jsonb
        END
      ) AS tag
    ), '') || ' ' ||
    coalesce((
      SELECT string_agg(segment, ' ')
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(p_body->'categoryPath') = 'array'
            THEN p_body->'categoryPath'
          ELSE '[]'::jsonb
        END
      ) AS segment
    ), '') || ' ' ||
    coalesce((
      SELECT string_agg(o->>'content', ' ')
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p_body->'options') = 'array' THEN p_body->'options'
          ELSE '[]'::jsonb
        END
      ) AS o
    ), '') || ' ' ||
    coalesce((
      SELECT string_agg(
        coalesce(a->>'description', '') || ' ' || coalesce(a->>'filename', ''),
        ' '
      )
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p_body->'attachments') = 'array' THEN p_body->'attachments'
          ELSE '[]'::jsonb
        END
      ) AS a
    ), '')
  ));
$$;
--> statement-breakpoint
UPDATE "posts" SET "search_vector" = openpeeps_posts_search_vector("body");
