/*
  # Enhance assessments table for auto-save and mode support

  1. Changes to `assessments` table
    - Add `assessment_mode` column (comprehensive | abridged)
    - Add `focus_on_growth_areas` boolean flag
    - Add `current_domain` to track domain-by-domain progression
    - Add `is_completed` to distinguish saved-in-progress from completed
    - Add `last_saved_at` timestamp for auto-save tracking
    - Add `local_storage_key` for cross-device sync coordination

  2. Changes to `assessment_responses` table
    - Add `last_saved_at` for row-level save tracking
    - Add `requires_reflection` flag (for abridged mode filtering)

  3. Security
    - Maintain existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'assessment_mode'
  ) THEN
    ALTER TABLE assessments ADD COLUMN assessment_mode text DEFAULT 'comprehensive' CHECK (assessment_mode IN ('comprehensive', 'abridged'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'focus_on_growth_areas'
  ) THEN
    ALTER TABLE assessments ADD COLUMN focus_on_growth_areas boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'current_domain'
  ) THEN
    ALTER TABLE assessments ADD COLUMN current_domain text DEFAULT 'domain1';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE assessments ADD COLUMN is_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'last_saved_at'
  ) THEN
    ALTER TABLE assessments ADD COLUMN last_saved_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_responses' AND column_name = 'last_saved_at'
  ) THEN
    ALTER TABLE assessment_responses ADD COLUMN last_saved_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_responses' AND column_name = 'requires_reflection'
  ) THEN
    ALTER TABLE assessment_responses ADD COLUMN requires_reflection boolean DEFAULT true;
  END IF;
END $$;
