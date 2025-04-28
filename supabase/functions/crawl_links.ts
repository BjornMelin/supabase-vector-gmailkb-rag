import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.39.7";
import { OpenAI } from "jsr:@anthropic-ai/sdk@0.19.0";

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY") || "",
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Crawl4AI API key
const CRAWL4AI_API_KEY = Deno.env.get("CRAWL4AI_API_KEY") || "";

interface LinkDoc {
  link_id: string;
  email_id: string;
  url: string;
  mime_type: string;
  title: string;
  content: string;
  embedding: number[];
  crawl_session_id?: string;
  parent_doc_id?: string;
  root_url?: string;
  source_email_id?: string;
}

Deno.serve(async (req: Request) => {
  try {
    const { max_links = 50, older_than_minutes = 60 } = await req.json();
    
    // Get unprocessed links from emails table
    const links = await getUnprocessedLinks(max_links, older_than_minutes);
    
    if (links.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No new links to process" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Process links using Crawl4AI
    const processedCount = await processLinks(links);
    
    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedCount,
        message: `Successfully processed ${processedCount} links`
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function getUnprocessedLinks(maxLinks: number, olderThanMinutes: number): Promise<any[]> {
  // Get links from emails that haven't been processed
  const { data, error } = await supabase
    .from("emails")
    .select("email_id, links")
    .filter("received_at", "lt", new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString())
    .limit(maxLinks);
  
  if (error) {
    throw new Error(`Database query error: ${error.message}`);
  }
  
  // Flatten the array of links
  const allLinks: { emailId: string; url: string }[] = [];
  
  for (const email of data || []) {
    for (const url of email.links || []) {
      // Check if link already exists in link_docs
      const { data: existingLinks } = await supabase
        .from("link_docs")
        .select("link_id")
        .eq("url", url)
        .limit(1);
      
      if (!existingLinks || existingLinks.length === 0) {
        allLinks.push({ emailId: email.email_id, url });
      }
    }
  }
  
  return allLinks;
}

async function processLinks(links: { emailId: string; url: string }[]): Promise<number> {
  let processedCount = 0;
  
  for (const link of links) {
    try {
      // Generate a crawl session ID
      const crawlSessionId = crypto.randomUUID();
      
      // Crawl the link using Crawl4AI
      const crawlResult = await crawlLink(link.url);
      
      if (!crawlResult.content) {
        console.log(`No content for link ${link.url}`);
        continue;
      }
      
      // Generate embedding
      const embedding = await generateEmbedding(crawlResult.content);
      
      // Store root document in database
      const linkId = crypto.randomUUID();
      await storeLinkDoc({
        link_id: linkId,
        email_id: link.emailId,
        url: link.url,
        mime_type: crawlResult.mime_type || "text/html",
        title: crawlResult.title || link.url,
        content: crawlResult.content,
        embedding,
        crawl_session_id: crawlSessionId,
        root_url: link.url,
        source_email_id: link.emailId
      });
      
      // Process any child links found
      if (crawlResult.links && crawlResult.links.length > 0) {
        await processChildLinks(link.emailId, linkId, link.url, crawlResult.links, crawlSessionId);
      }
      
      processedCount++;
    } catch (error) {
      console.error(`Error processing link ${link.url}:`, error);
    }
  }
  
  return processedCount;
}

async function crawlLink(url: string): Promise<any> {
  // Call Crawl4AI API
  const response = await fetch("https://api.crawl4ai.io/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CRAWL4AI_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      includeLinks: true,
      removeHtml: true,
      extractImages: false,
      maxDepth: 2
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Crawl4AI API error: ${response.statusText}`);
  }
  
  return await response.json();
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8191), // OpenAI token limit
  });
  
  return response.data[0].embedding;
}

async function storeLinkDoc(linkDoc: LinkDoc): Promise<void> {
  // Insert into database
  const { error } = await supabase
    .from("link_docs")
    .insert(linkDoc);
  
  if (error) {
    throw new Error(`Database insertion error: ${error.message}`);
  }
}

async function processChildLinks(
  emailId: string,
  parentId: string,
  rootUrl: string,
  childLinks: string[],
  crawlSessionId: string
): Promise<void> {
  // Process each child link (limit to 5 per parent to avoid overloading)
  const limitedLinks = childLinks.slice(0, 5);
  
  for (const childUrl of limitedLinks) {
    try {
      // Check if link already exists
      const { data: existingLinks } = await supabase
        .from("link_docs")
        .select("link_id")
        .eq("url", childUrl)
        .limit(1);
      
      if (existingLinks && existingLinks.length > 0) {
        continue;
      }
      
      // Crawl the child link
      const crawlResult = await crawlLink(childUrl);
      
      if (!crawlResult.content) {
        continue;
      }
      
      // Generate embedding
      const embedding = await generateEmbedding(crawlResult.content);
      
      // Store with parent reference
      await storeLinkDoc({
        link_id: crypto.randomUUID(),
        email_id: emailId,
        url: childUrl,
        mime_type: crawlResult.mime_type || "text/html",
        title: crawlResult.title || childUrl,
        content: crawlResult.content,
        embedding,
        crawl_session_id: crawlSessionId,
        parent_doc_id: parentId,
        root_url: rootUrl,
        source_email_id: emailId
      });
    } catch (error) {
      console.error(`Error processing child link ${childUrl}:`, error);
    }
  }
}
