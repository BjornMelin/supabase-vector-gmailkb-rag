-- Install ltree extension for hierarchical document structure
CREATE EXTENSION IF NOT EXISTS ltree;

-- Add path column to link_docs table
ALTER TABLE link_docs ADD COLUMN IF NOT EXISTS path ltree;

-- Create index on path column for efficient hierarchical queries
CREATE INDEX link_docs_path_idx ON link_docs USING GIST (path);

-- Add parent_link_id column for explicit parent-child relationships
ALTER TABLE link_docs ADD COLUMN IF NOT EXISTS parent_link_id uuid REFERENCES link_docs(link_id);

-- Create function to update path when parent changes
CREATE OR REPLACE FUNCTION update_link_doc_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_link_id IS NULL THEN
    NEW.path = text2ltree(NEW.link_id::text);
  ELSE
    SELECT path || text2ltree(NEW.link_id::text) INTO NEW.path
    FROM link_docs
    WHERE link_id = NEW.parent_link_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain paths
CREATE TRIGGER link_doc_path_trigger
BEFORE INSERT OR UPDATE OF parent_link_id ON link_docs
FOR EACH ROW EXECUTE FUNCTION update_link_doc_path();
