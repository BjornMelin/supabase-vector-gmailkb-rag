-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Hierarchical metadata columns for Crawl4AI
alter table link_docs add column if not exists crawl_session_id uuid default uuid_generate_v4();
alter table link_docs add column if not exists parent_doc_id uuid references link_docs(link_id);
alter table link_docs add column if not exists root_url text;
alter table link_docs add column if not exists depth int generated always as (nlevel(path)) stored;

-- Ensure ltree extension and path column
create extension if not exists ltree;
alter table link_docs add column if not exists path ltree;

-- Add direct email reference for traceability
alter table link_docs add column if not exists source_email_id uuid references emails(email_id);

-- Index for hierarchical path queries
create index if not exists link_docs_path_gist_idx on link_docs using gist(path);