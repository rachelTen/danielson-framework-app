/*
  # Add rating column to assessment responses

  1. Changes
    - Add `rating` column to `assessment_responses` table to store Danielson framework ratings
    - Ratings: "unsatisfactory", "basic", "proficient", "distinguished"
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_responses' AND column_name = 'rating'
  ) THEN
    ALTER TABLE assessment_responses ADD COLUMN rating text;
  END IF;
END $$;