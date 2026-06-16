-- ============================================================
-- Gentlemanly MVP — Supabase Migration (idempotent)
-- Safe to run multiple times
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ── Outfits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outfits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  flatlay_url TEXT,
  occasion    TEXT,
  notes       TEXT,
  item_count  INT DEFAULT 0,
  logged_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS outfits_user_id_logged_at_idx ON outfits (user_id, logged_at DESC);

ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own outfits" ON outfits;
CREATE POLICY "Users can manage own outfits"
  ON outfits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Wardrobe Items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wardrobe_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('tops','bottoms','outerwear','footwear','accessories')),
  subcategory TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  wear_count  INT DEFAULT 1,
  last_worn   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, name, category)
);

CREATE INDEX IF NOT EXISTS wardrobe_items_user_id_idx ON wardrobe_items (user_id);
CREATE INDEX IF NOT EXISTS wardrobe_items_category_idx ON wardrobe_items (user_id, category);

ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own wardrobe items" ON wardrobe_items;
CREATE POLICY "Users can manage own wardrobe items"
  ON wardrobe_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Outfit Items (junction) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS outfit_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id        UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  wardrobe_item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
  UNIQUE (outfit_id, wardrobe_item_id)
);

CREATE INDEX IF NOT EXISTS outfit_items_outfit_id_idx ON outfit_items (outfit_id);
CREATE INDEX IF NOT EXISTS outfit_items_wardrobe_item_id_idx ON outfit_items (wardrobe_item_id);

ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own outfit items" ON outfit_items;
CREATE POLICY "Users can manage own outfit items"
  ON outfit_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
  );


-- ── Storage Buckets ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('outfit-photos', 'outfit-photos', false)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('flatlay-images', 'flatlay-images', false)
ON CONFLICT DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own outfit photos" ON storage.objects;
CREATE POLICY "Users can upload own outfit photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'outfit-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own outfit photos" ON storage.objects;
CREATE POLICY "Users can read own outfit photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'outfit-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload own flatlay images" ON storage.objects;
CREATE POLICY "Users can upload own flatlay images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'flatlay-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own flatlay images" ON storage.objects;
CREATE POLICY "Users can read own flatlay images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'flatlay-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Service role can write flatlay images" ON storage.objects;
CREATE POLICY "Service role can write flatlay images"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'flatlay-images');

DROP POLICY IF EXISTS "Service role can update flatlay images" ON storage.objects;
CREATE POLICY "Service role can update flatlay images"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'flatlay-images');


-- ── Outfit items (jsonb) — v2.1 Journal-First ────────────────
-- Stores detected clothing items directly on the outfit row.
-- Run this after the initial schema if the column doesn't exist yet.
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS items jsonb;

-- ── Wardrobe item images ──────────────────────────────────────
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe-images', 'wardrobe-images', false)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Users can read own wardrobe images" ON storage.objects;
CREATE POLICY "Users can read own wardrobe images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'wardrobe-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Service role can write wardrobe images" ON storage.objects;
CREATE POLICY "Service role can write wardrobe images"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'wardrobe-images');

DROP POLICY IF EXISTS "Service role can update wardrobe images" ON storage.objects;
CREATE POLICY "Service role can update wardrobe images"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'wardrobe-images');
