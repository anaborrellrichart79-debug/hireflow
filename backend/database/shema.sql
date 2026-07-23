CREATE database hireflow
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
USE hireflow;

CREATE table users (
	id int auto_increment PRIMARY KEY,
    name varchar(100) NOT null,
    email varchar(150) NOT null unique,
    password_hash varchar(250) NOT null,
    role enum('candidate', 'recruiter') NOT null,
    sector varchar(100),
    phone varchar(30),
    location varchar(120),
    profile_visible boolean default true,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
    );

CREATE table user_profiles (
    id int auto_increment PRIMARY KEY,
    user_id int not null,
    education text,
    work_experience text,
    skills text,
    resume_url varchar(255),
    about text,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,

constraint fk_user_profile
	foreign key (user_id)
	references users(id)
	on delete cascade
);

CREATE table companies (
    id int auto_increment PRIMARY KEY,
    name varchar(150) not null,
    email varchar(150) not null unique,
    description text,
    industry varchar(120),
    location varchar(120),
    phone varchar(30),
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
    );

CREATE table job_offers (
    id int auto_increment primary key,
    company_id int not null,
    title varchar(150) not null,
    description TEXT,
    salary varchar(100),
    location varchar(120),
    employment_type varchar(50),
    skills_required TEXT,
    source enum('internal','linkedln','api') default 'internal',
    external_url varchar(255),
    created_by_user int,
    created_at timestamp default current_timestamp,
    update_at timestamp default current_timestamp on update current_timestamp,

constraint fk_job_company
	foreign key (created_by_user)
    references companies(id)
    on delete cascade,
    
constraint fk_job_creator
	foreign key (created_by_user)
    references users(id)
    on delete set null
);

CREATE table applications (
    id int auto_increment primary key,
    user_id int not null,
    job_offer_id int null,
    status enum('wishlist','applied','interview','offer','rejected') default 'wishlist',
    applied_date date,
    notes Text,
    created_at timestamp default current_timestamp,
    update_at timestamp default current_timestamp on update current_timestamp,

constraint fk_application_user
	foreign key (user_id)
    references users(id)
    on delete cascade,
    
constraint fk_application_job
	foreign key (job_offer_id)
    references job_offers(id)
    on delete cascade
);

CREATE table application_notes (
    id int auto_increment primary key,
    application_id int not null,
    user_id int not null,
    note_text TEXT not null,
    created_at timestamp default current_timestamp,

constraint fk_note_application
	foreign key (application_id)
    references applications(id)
    on delete cascade,
    
constraint fk_notes_user
	foreign key (user_id)
    references users(id)
    on delete cascade
);

CREATE table interview_types (
    id int auto_increment primary key,
    name_interview_types enum('structured','unstructured','semistructured','technique','telephone','online','in_person','group_dynamics','competency_based','behavioral','follow-up','tension',) default 'in_person',
    description_interview_types text,
    created_at timestamp default current_timestamp 
);

CREATE table interviews (
    id int auto_increment primary key,
    application_id int not null,
    interview_type_id int,
    scheduled_date datetime not null,
    location varchar(150),
    notes text,
    created_at timestamp default current_timestamp,
    update_at timestamp default current_timestamp on update current_timestamp,

constraint fk_interview_application
	foreign key (application_id)
    references applications(id)
    on delete cascade,

constraint fk_interview_type
	foreign key (interview_type_id)
    references interview_types(id)
    on delete set null
);

CREATE table calendar_events (
    id int auto_increment primary key,
    user_id int not null,
    title varchar(150) not null,
    description text,
    event_type enum('interview','job_search','reminder','meeting') default 'reminder',
    related_application int,
    created_at timestamp default current_timestamp,
    update_at timestamp default current_timestamp on update current_timestamp,

constraint fk_calendar_user
	foreign key (user_id)
    references users(id)
    on delete cascade,
    
constraint fk_calendar_application
	foreign key (related_application)
    references applications(id)
    on delete set null
);

CREATE table contacts(
    id int auto_increment primary key,
    user_id int not null,
    name varchar(150) not null,
    company varchar(150),
    email varchar(150),
    phone varchar(30),
    notes text,
    created_at timestamp default current_timestamp,
    update_at timestamp default current_timestamp on update current_timestamp,

constraint fk_contact_user
	foreign key (user_id)
    references users(id)
    on delete cascade
);

CREATE table ai_interview_questions (
    id int auto_increment primary key,
    question text not null,
    category enum('personal','technical','behavioral','stress','culture_fit') not null,
    difficulty enum('basic','intermediate','advanced') default 'basic',
    example_answer text,
    created_at timestamp default current_timestamp
);

CREATE table ai_resume_guides (
    id int auto_increment primary key,
    industry varchar(120) not null,
    company_type varchar(120),
    recomendations text,
    created_at timestamp default current_timestamp
);

CREATE table ai_skill_improvement(
    id int auto_increment primary key,
    skill_name varchar(150) not null,
    description text,
    improvement_methods text,
    resources text,
    created_at timestamp default current_timestamp
);
