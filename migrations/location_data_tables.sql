
-- Create countries table
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create states table
CREATE TABLE IF NOT EXISTS public.states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id),
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(country_id, code)
);

-- Create cities table
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL REFERENCES public.states(id),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(state_id, name)
);

-- Insert United States
INSERT INTO public.countries (code, name) VALUES ('US', 'United States')
ON CONFLICT (code) DO NOTHING;

-- Insert US States
WITH us_country AS (SELECT id FROM public.countries WHERE code = 'US')
INSERT INTO public.states (country_id, code, name)
SELECT 
  (SELECT id FROM us_country),
  code,
  name
FROM (VALUES
  ('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
  ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
  ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'),
  ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'), ('KS', 'Kansas'),
  ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
  ('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'),
  ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'),
  ('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'),
  ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
  ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
  ('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'),
  ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'),
  ('WI', 'Wisconsin'), ('WY', 'Wyoming')
) AS t(code, name)
ON CONFLICT (country_id, code) DO NOTHING;

-- Add major cities for popular states (example: Oklahoma)
WITH ok_state AS (SELECT id FROM public.states WHERE code = 'OK')
INSERT INTO public.cities (state_id, name)
SELECT 
  (SELECT id FROM ok_state),
  name
FROM (VALUES
  ('Oklahoma City'), ('Tulsa'), ('Norman'), ('Broken Arrow'), ('Edmond'),
  ('Lawton'), ('Moore'), ('Midwest City'), ('Enid'), ('Stillwater')
) AS t(name)
ON CONFLICT (state_id, name) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_states_country_id ON public.states(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_state_id ON public.cities(state_id);

-- Add RLS policies
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are viewable by everyone" ON public.countries FOR SELECT USING (true);
CREATE POLICY "States are viewable by everyone" ON public.states FOR SELECT USING (true);
CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);
