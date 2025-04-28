create extension if not exists vector;
create table emails(
  email_id uuid primary key,
  from_addr text,
  to_addr text[],
  subject text,
  received_at timestamptz,
  labels text[],
  clean_text text,
  links text[],
  embedding vector(1536)
);
create table link_docs(
  link_id uuid primary key,
  email_id uuid references emails(email_id),
  url text,
  mime_type text,
  title text,
  content text,
  embedding vector(1536)
);
create table tasks(
  task_id uuid primary key,
  email_id uuid references emails(email_id),
  link_id uuid references link_docs(link_id),
  task text,
  status text default 'todo',
  priority int2 default 3,
  due_date date,
  created_at timestamptz default now()
);
create index on emails using ivfflat (embedding vector_l2_ops) with (lists=100);
create index on link_docs using ivfflat (embedding vector_l2_ops) with (lists=100);
