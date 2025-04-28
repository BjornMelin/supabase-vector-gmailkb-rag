-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create pg_cron schedule for daily email processing
SELECT cron.schedule(
  'daily-email-ingest',
  '0 1 * * *', -- Run at 1 AM every day
  $$
  SELECT
    supabase_edge.http_request(
      'POST',
      (SELECT value FROM supabase_edge.config WHERE name = 'EDGE_FUNCTION_BASE_URL') || '/ingest_gmail',
      '{"since_hours": 24}',
      'application/json',
      60000
    );
  $$
);

-- Create pg_cron schedule for link crawling
SELECT cron.schedule(
  'hourly-link-crawl',
  '30 * * * *', -- Run at 30 minutes past every hour
  $$
  SELECT
    supabase_edge.http_request(
      'POST',
      (SELECT value FROM supabase_edge.config WHERE name = 'EDGE_FUNCTION_BASE_URL') || '/crawl_links',
      '{"max_links": 50, "older_than_minutes": 60}',
      'application/json',
      180000
    );
  $$
);
