# School Database Design

## Overview

The School Database is designed to store information about students, courses and enrolments. An enrolment represents the relationship between a student and a course and also stores the student's grade for that course.

## Students Table

The `students` table stores information about each student.

### Columns

- `id` - INTEGER PRIMARY KEY
- `name` - TEXT NOT NULL
- `email` - TEXT NOT NULL UNIQUE

The `id` column is the primary key and uniquely identifies each student.

The `email` column is marked as UNIQUE so that two students cannot register using the same email address.

## Courses Table

The `courses` table stores information about the courses offered by the school.

### Columns

- `id` - INTEGER PRIMARY KEY
- `name` - TEXT NOT NULL
- `code` - TEXT NOT NULL UNIQUE

The `id` column is the primary key and uniquely identifies each course.

The `code` column is UNIQUE so that every course has a distinct course code.

## Enrolments Table

The `enrolments` table stores the fact that a student is enrolled in a particular course.

### Columns

- `id` - INTEGER PRIMARY KEY
- `student_id` - INTEGER NOT NULL
- `course_id` - INTEGER NOT NULL
- `grade` - TEXT

The `id` column is the primary key for the enrolment.

The `student_id` column is a foreign key that references `students.id`.

The `course_id` column is a foreign key that references `courses.id`.

The `grade` column stores the grade that the student receives for that course.

The combination of `student_id` and `course_id` must be unique. This prevents the same student from being enrolled in the same course more than once.

## Relationships

### Students to Enrolments

This is a one-to-many relationship.

One student can have many enrolments because a student can take multiple courses.

### Courses to Enrolments

This is also a one-to-many relationship.

One course can have many enrolments because many students can take the same course.

### Students to Courses

Students and courses have a many-to-many relationship.

A student can enrol in many courses, and a course can have many students.

The `enrolments` table is therefore used as a join table to connect students and courses.

The join table is necessary because a many-to-many relationship cannot be represented directly using only one foreign key in either the students or courses table.

The `enrolments` table also stores the `grade` because the grade belongs to a specific student's enrolment in a specific course.

## Index

One useful index would be an index on `enrolments.student_id`.

Example:

    CREATE INDEX idx_enrolments_student_id
    ON enrolments(student_id);

This index would make queries that search for all enrolments belonging to a particular student faster.

Indexes can improve read performance, although they require additional storage and can add some overhead when data is inserted or updated.

## SQL or NoSQL?

I would choose SQL for this school system because the data has clear relationships between students, courses and enrolments. Students and courses have structured information, while the enrolments table represents the many-to-many relationship between them. SQL provides primary keys, foreign keys, UNIQUE constraints and other rules that help maintain data integrity. SQL is therefore a good fit for a system where the relationships between the entities are important and clearly defined.