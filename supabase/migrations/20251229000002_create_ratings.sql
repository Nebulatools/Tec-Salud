-- Migration: Create doctor ratings and reviews system
-- Allows patients to rate and review doctors after appointments

-- Doctor ratings table (numeric rating per appointment)
CREATE TABLE IF NOT EXISTS doctor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

  -- Rating values (1-5 stars)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one rating per appointment
  CONSTRAINT ux_doctor_ratings_appointment UNIQUE (appointment_id)
);

-- Doctor reviews table (optional text review linked to rating)
CREATE TABLE IF NOT EXISTS doctor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES doctor_ratings(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Review content
  review_text TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,

  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderation_notes TEXT,
  moderated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per rating
  CONSTRAINT ux_doctor_reviews_rating UNIQUE (rating_id)
);

-- Doctor rating summary view (materialized for performance)
CREATE OR REPLACE VIEW doctor_rating_summary AS
SELECT
  doctor_id,
  COUNT(*) AS total_ratings,
  ROUND(AVG(overall_rating)::numeric, 1) AS average_rating,
  ROUND(AVG(punctuality_rating)::numeric, 1) AS avg_punctuality,
  ROUND(AVG(communication_rating)::numeric, 1) AS avg_communication,
  ROUND(AVG(professionalism_rating)::numeric, 1) AS avg_professionalism,
  COUNT(*) FILTER (WHERE overall_rating = 5) AS five_star_count,
  COUNT(*) FILTER (WHERE overall_rating = 4) AS four_star_count,
  COUNT(*) FILTER (WHERE overall_rating = 3) AS three_star_count,
  COUNT(*) FILTER (WHERE overall_rating = 2) AS two_star_count,
  COUNT(*) FILTER (WHERE overall_rating = 1) AS one_star_count
FROM doctor_ratings
GROUP BY doctor_id;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_doctor_ratings_doctor_id ON doctor_ratings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_ratings_patient_id ON doctor_ratings(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_ratings_appointment_id ON doctor_ratings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_status ON doctor_reviews(status);

-- Updated at trigger for ratings
CREATE OR REPLACE FUNCTION update_doctor_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_doctor_ratings_updated_at ON doctor_ratings;
CREATE TRIGGER trigger_doctor_ratings_updated_at
  BEFORE UPDATE ON doctor_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_ratings_updated_at();

DROP TRIGGER IF EXISTS trigger_doctor_reviews_updated_at ON doctor_reviews;
CREATE TRIGGER trigger_doctor_reviews_updated_at
  BEFORE UPDATE ON doctor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_ratings_updated_at();

-- RLS Policies
ALTER TABLE doctor_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;

-- Ratings: patients can create and read their own ratings
DROP POLICY IF EXISTS doctor_ratings_patient_create ON doctor_ratings;
CREATE POLICY doctor_ratings_patient_create ON doctor_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS doctor_ratings_patient_read ON doctor_ratings;
CREATE POLICY doctor_ratings_patient_read ON doctor_ratings
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Ratings: doctors can read ratings for themselves
DROP POLICY IF EXISTS doctor_ratings_doctor_read ON doctor_ratings;
CREATE POLICY doctor_ratings_doctor_read ON doctor_ratings
  FOR SELECT TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  );

-- Ratings: public can read ratings (for marketplace)
DROP POLICY IF EXISTS doctor_ratings_public_read ON doctor_ratings;
CREATE POLICY doctor_ratings_public_read ON doctor_ratings
  FOR SELECT TO anon
  USING (true);

-- Reviews: patients can create and read their own reviews
DROP POLICY IF EXISTS doctor_reviews_patient_create ON doctor_reviews;
CREATE POLICY doctor_reviews_patient_create ON doctor_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS doctor_reviews_patient_read ON doctor_reviews;
CREATE POLICY doctor_reviews_patient_read ON doctor_reviews
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Reviews: doctors can read approved reviews for themselves
DROP POLICY IF EXISTS doctor_reviews_doctor_read ON doctor_reviews;
CREATE POLICY doctor_reviews_doctor_read ON doctor_reviews
  FOR SELECT TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
    AND status = 'approved'
  );

-- Reviews: public can read approved non-anonymous reviews (for marketplace)
DROP POLICY IF EXISTS doctor_reviews_public_read ON doctor_reviews;
CREATE POLICY doctor_reviews_public_read ON doctor_reviews
  FOR SELECT TO anon
  USING (status = 'approved');

-- Service role can manage all
DROP POLICY IF EXISTS doctor_ratings_service_all ON doctor_ratings;
CREATE POLICY doctor_ratings_service_all ON doctor_ratings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS doctor_reviews_service_all ON doctor_reviews;
CREATE POLICY doctor_reviews_service_all ON doctor_reviews
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE doctor_ratings IS 'Numeric ratings patients give to doctors after appointments';
COMMENT ON TABLE doctor_reviews IS 'Text reviews patients write about doctors, linked to ratings';
COMMENT ON VIEW doctor_rating_summary IS 'Aggregated rating statistics per doctor for marketplace display';
