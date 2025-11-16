CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  learning_style VARCHAR(50) 
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  name VARCHAR(255) NOT NULL, 
  description TEXT,
  difficulty_level INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topic_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id),
  prerequisite_id UUID REFERENCES topics(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  topic_id UUID REFERENCES topics(id),
  score DECIMAL(5, 2), -- this will store the score of the quiz
  total_questions INT,
  correct_answers INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answers_given JSONB -- this will store the specific answers given by the user for analysis
);

CREATE TABLE IF NOT EXISTS user_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  topic_id UUID REFERENCES topics(id),
  mastery_level DECIMAL(3, 2) DEFAULT 0.0,\
  last_reviewed TIMESTAMP,
  UNIQUE(user_id, topic_id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  topic_id UUID REFERENCES topics(id),
  llm_used VARCHAR(100), 
  feedback_generated TEXT,
  follow_up_problems JSONB, 
  session_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_ended TIMESTAMP,
  adaptation_decision VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic ON quiz_attempts(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_user_mastery_user ON user_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_prerequisites_topic ON topic_prerequisites(topic_id);