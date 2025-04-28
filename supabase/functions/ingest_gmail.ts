import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2.39.7';
import { OpenAI } from 'jsr:@anthropic-ai/sdk@0.19.0';

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') || '',
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Gmail API credentials
const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID') || '';
const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET') || '';
const GMAIL_REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN') || '';

interface EmailData {
  email_id: string;
  from_addr: string;
  to_addr: string[];
  subject: string;
  received_at: string;
  labels: string[];
  clean_text: string;
  links: string[];
  embedding: number[];
}

Deno.serve(async (req: Request) => {
  try {
    const { since_hours = 24 } = await req.json();

    // Authenticate with Gmail API
    const gmailToken = await getGmailAccessToken();

    // Fetch emails from Gmail
    const emails = await fetchGmailEmails(gmailToken, since_hours);

    // Process each email
    const processedCount = await processEmails(emails);

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedCount,
        message: `Successfully processed ${processedCount} emails`,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

async function getGmailAccessToken(): Promise<string> {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function fetchGmailEmails(accessToken: string, sinceHours: number): Promise<any[]> {
  const date = new Date();
  date.setHours(date.getHours() - sinceHours);
  const query = `after:${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.json();
  return data.messages || [];
}

async function processEmails(emails: any[]): Promise<number> {
  let processedCount = 0;

  for (const email of emails) {
    try {
      // Get full email details
      const emailDetails = await getEmailDetails(email.id);

      // Extract text and links
      const { cleanText, links } = extractTextAndLinks(emailDetails);

      // Generate embedding
      const embedding = await generateEmbedding(cleanText);

      // Store in database
      await storeEmail(emailDetails, cleanText, links, embedding);

      processedCount++;
    } catch (error) {
      console.error(`Error processing email ${email.id}:`, error);
    }
  }

  return processedCount;
}

async function getEmailDetails(emailId: string): Promise<any> {
  // Placeholder - this would actually call the Gmail API to get full email details
  return {
    id: emailId,
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Email subject',
    receivedAt: new Date().toISOString(),
    labels: ['INBOX'],
    body: 'Email body text with https://example.com link',
  };
}

function extractTextAndLinks(emailDetails: any): { cleanText: string; links: string[] } {
  // Extract links using regex
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const links = emailDetails.body.match(linkRegex) || [];

  // Remove HTML and clean text
  const cleanText = emailDetails.body
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return { cleanText, links };
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8191), // OpenAI token limit
  });

  return response.data[0].embedding;
}

async function storeEmail(
  emailDetails: any,
  cleanText: string,
  links: string[],
  embedding: number[],
): Promise<void> {
  const emailData: EmailData = {
    email_id: crypto.randomUUID(),
    from_addr: emailDetails.from,
    to_addr: emailDetails.to,
    subject: emailDetails.subject,
    received_at: emailDetails.receivedAt,
    labels: emailDetails.labels,
    clean_text: cleanText,
    links,
    embedding,
  };

  // Insert into database
  const { error } = await supabase.from('emails').insert(emailData);

  if (error) {
    throw new Error(`Database insertion error: ${error.message}`);
  }
}
