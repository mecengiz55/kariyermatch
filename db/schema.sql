-- KariyerMatch Veritabanı Şeması
-- Neon PostgreSQL

-- Kullanıcılar (ortak tablo)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'employer')),
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Öğrenci Profilleri
CREATE TABLE IF NOT EXISTS student_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  university VARCHAR(255),
  department VARCHAR(255),
  graduation_year INT,
  gpa DECIMAL(3,2),
  bio TEXT,
  cv_url TEXT,
  linkedin_url VARCHAR(500),
  github_url VARCHAR(500),
  phone VARCHAR(20),
  city VARCHAR(100),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Beceriler (öğrenci)
CREATE TABLE IF NOT EXISTS student_skills (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES student_profiles(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  proficiency_level INT CHECK (proficiency_level BETWEEN 1 AND 5),
  UNIQUE(student_id, skill_name)
);

-- İşveren Profilleri
CREATE TABLE IF NOT EXISTS employer_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  company_size VARCHAR(50),
  website VARCHAR(500),
  description TEXT,
  logo_url TEXT,
  city VARCHAR(100),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- İş/Staj İlanları
CREATE TABLE IF NOT EXISTS job_listings (
  id SERIAL PRIMARY KEY,
  employer_id INT REFERENCES employer_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(20) CHECK (type IN ('job', 'internship')),
  location VARCHAR(100),
  is_remote BOOLEAN DEFAULT FALSE,
  salary_min INT,
  salary_max INT,
  deadline DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- İlan Gereksinimleri (beklenen beceriler)
CREATE TABLE IF NOT EXISTS job_requirements (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES job_listings(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  min_proficiency INT DEFAULT 1,
  is_required BOOLEAN DEFAULT TRUE,
  UNIQUE(job_id, skill_name)
);

-- Başvurular
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES job_listings(id) ON DELETE CASCADE,
  student_id INT REFERENCES student_profiles(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  cover_letter TEXT,
  applied_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);

-- İndeksler
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_student_skills_name ON student_skills(skill_name);
CREATE INDEX idx_job_requirements_skill ON job_requirements(skill_name);
CREATE INDEX idx_job_listings_active ON job_listings(is_active);
CREATE INDEX idx_job_listings_type ON job_listings(type);
CREATE INDEX idx_applications_status ON applications(status);
