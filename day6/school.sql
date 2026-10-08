PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE enrolments (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,

  UNIQUE (student_id, course_id),

  FOREIGN KEY (student_id)
    REFERENCES students(id),

  FOREIGN KEY (course_id)
    REFERENCES courses(id)
);

INSERT INTO students (id, name, email) VALUES
  (1, 'Amina Hassan', 'amina@example.com'),
  (2, 'Brian Otieno', 'brian@example.com'),
  (3, 'Chloe Mwangi', 'chloe@example.com'),
  (4, 'David Kamau', 'david@example.com');


INSERT INTO courses (id, name, code) VALUES
  (1, 'Database Systems', 'DBS101'),
  (2, 'Web Development', 'WEB102'),
  (3, 'Computer Networks', 'NET103');


INSERT INTO enrolments (id, student_id, course_id, grade) VALUES
  (1, 1, 1, 'A'),
  (2, 1, 2, 'B+'),
  (3, 2, 1, 'B'),
  (4, 2, 3, 'A-'),
  (5, 3, 2, 'A');


-- 1. All courses for one student, by name

SELECT courses.name, courses.code, enrolments.grade
FROM courses
JOIN enrolments
  ON enrolments.course_id = courses.id
JOIN students
  ON students.id = enrolments.student_id
WHERE students.name = 'Amina Hassan';

-- 2. All students on one course

SELECT students.name, students.email, enrolments.grade
FROM students
JOIN enrolments
  ON enrolments.student_id = students.id
JOIN courses
  ON courses.id = enrolments.course_id
WHERE courses.name = 'Database Systems';

-- 3. Number of students per course

SELECT courses.name,
       COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
  ON enrolments.course_id = courses.id
GROUP BY courses.id, courses.name;

-- 4. Students who have no enrolments

SELECT students.name, students.email
FROM students
LEFT JOIN enrolments
  ON enrolments.student_id = students.id
WHERE enrolments.id IS NULL;

-- 5. Update one enrolment's grade

UPDATE enrolments
SET grade = 'A-'
WHERE student_id = 1
  AND course_id = 2;