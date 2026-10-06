-- seed_demo.sql
-- Demo data for one customer: 3 jobs and a spread of candidates across stages.
-- Run as postgres in the SQL Editor AFTER creating the customer account in the
-- app. Change the email below to that customer's email.
-- CVs are not seeded: upload a few PDFs in the app to demo the AI assessment.

do $$
declare
  customer uuid;
  job_fe uuid;
  job_be uuid;
  job_design uuid;
begin
  select id into customer from public.profiles where email = 'demo@acme.se';
  if customer is null then
    raise exception 'No profile with that email. Create the customer in the app first.';
  end if;

  insert into public.jobs (owner_id, title, description) values
    (customer, 'Frontend Developer',
     'React + TypeScript developer for our customer-facing web app. 3+ years of React, experience with design systems and accessibility. Nice to have: Next.js, testing (Vitest/Playwright).')
    returning id into job_fe;

  insert into public.jobs (owner_id, title, description) values
    (customer, 'Backend Engineer',
     'Build and run our APIs. Node.js or Go, PostgreSQL, REST and event-driven systems. Experience with cloud (AWS/GCP), observability and on-call.')
    returning id into job_be;

  insert into public.jobs (owner_id, title, description, status) values
    (customer, 'Product Designer',
     'End-to-end product design in Figma, user research and prototyping. Portfolio required.', 'closed')
    returning id into job_design;

  insert into public.candidates (owner_id, job_id, full_name, email, linkedin_url, stage, notes) values
    (customer, job_fe, 'Anna Lindqvist', 'anna.lindqvist@example.com', 'https://www.linkedin.com/in/example-anna', 'applied', null),
    (customer, job_fe, 'Erik Johansson', 'erik.j@example.com', 'https://www.linkedin.com/in/example-erik', 'screening', 'Strong portfolio, asked about remote work.'),
    (customer, job_fe, 'Sara Ahmed', 'sara.ahmed@example.com', null, 'interview', 'First interview went well, tech case next week.'),
    (customer, job_fe, 'Johan Berg', 'johan.berg@example.com', 'https://www.linkedin.com/in/example-johan', 'rejected', 'Mostly backend experience.'),
    (customer, job_be, 'Maria Nilsson', 'maria.n@example.com', 'https://www.linkedin.com/in/example-maria', 'applied', null),
    (customer, job_be, 'Ali Hassan', 'ali.hassan@example.com', null, 'interview', 'Go + Postgres, 5 years.'),
    (customer, job_be, 'Lisa Karlsson', 'lisa.k@example.com', 'https://www.linkedin.com/in/example-lisa', 'offer', 'Offer sent, answer by Friday.'),
    (customer, job_design, 'Oskar Persson', 'oskar.p@example.com', null, 'hired', 'Starts in November.');
end $$;
