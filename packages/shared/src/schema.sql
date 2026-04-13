-- Sources: Raw files uploaded to R2
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL, -- R2 object key
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wiki Pages: Synthesized markdown documents
CREATE TABLE IF NOT EXISTS wiki_pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_key TEXT UNIQUE NOT NULL, -- R2 object key for the markdown file
  slug TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mapping: Which raw sources contributed to which wiki page
CREATE TABLE IF NOT EXISTS source_wiki_mapping (
  source_id TEXT REFERENCES sources(id),
  wiki_page_id TEXT REFERENCES wiki_pages(id),
  PRIMARY KEY (source_id, wiki_page_id)
);

-- Wiki Links: Graph of interlinked pages
CREATE TABLE IF NOT EXISTS wiki_links (
  from_page_id TEXT REFERENCES wiki_pages(id),
  to_page_id TEXT REFERENCES wiki_pages(id),
  PRIMARY KEY (from_page_id, to_page_id)
);
