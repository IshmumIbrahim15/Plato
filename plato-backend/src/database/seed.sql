INSERT INTO subjects (id, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Math'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Science'),
  ('550e8400-e29b-41d4-a716-446655440003', 'History')
ON CONFLICT DO NOTHING;

-- Insert Math topics
INSERT INTO topics (id, subject_id, name, description, difficulty_level) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 'Arithmetic', 'Basic arithmetic operations: addition, subtraction, multiplication, division', 1),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Fractions', 'Working with fractions, simplification, operations', 2),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Algebra Basics', 'Variables, equations, solving for unknowns', 2),
  ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'Linear Equations', 'Solving linear equations in one and two variables', 3),
  ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'Quadratic Equations', 'Solving quadratic equations, factoring, quadratic formula', 3),
  ('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440001', 'Geometry Basics', 'Points, lines, angles, basic shapes', 2),
  ('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440001', 'Trigonometry', 'Sine, cosine, tangent, right triangles', 4),
  ('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440001', 'Calculus Basics', 'Limits, derivatives, rates of change', 5)
ON CONFLICT DO NOTHING;

-- Insert topic prerequisites (the graph structure)
INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES
  -- Fractions needs Arithmetic
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440010'),
  
  -- Algebra Basics needs Arithmetic and Fractions
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440010'),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440011'),
  
  -- Linear Equations needs Algebra Basics
  ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440012'),
  
  -- Quadratic Equations needs Algebra Basics and Linear Equations
  ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440012'),
  ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440013'),
  
  -- Geometry Basics needs Arithmetic
  ('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440010'),
  
  -- Trigonometry needs Geometry and Algebra
  ('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440015'),
  ('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440013'),
  
  -- Calculus needs Algebra and Trigonometry
  ('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440013'),
  ('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440016')
ON CONFLICT DO NOTHING;

-- Sample test user
INSERT INTO users (id, username) VALUES
  ('550e8400-e29b-41d4-a716-446655440099', 'demo_student')
ON CONFLICT DO NOTHING;