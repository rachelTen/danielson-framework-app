/*
  # Create Danielson Framework Assessment Schema

  1. New Tables
    - `profiles` - teacher profiles and metadata
    - `assessments` - individual assessment sessions
    - `assessment_responses` - responses to framework components
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data

  3. Schema
    - teachers can create multiple assessments over time
    - each assessment captures responses to all 22 components across 4 domains
    - assessments are timestamped for tracking progress
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  school text,
  grade_level text,
  subject_area text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);


CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  domain_1_notes text,
  domain_2_notes text,
  domain_3_notes text,
  domain_4_notes text,
  overall_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  component_code text NOT NULL,
  component_name text NOT NULL,
  domain_number integer NOT NULL,
  response_text text,
  rating text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own assessment responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND assessments.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own assessment responses"
  ON assessment_responses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );
