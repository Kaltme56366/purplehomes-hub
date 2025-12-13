/**
 * Unified GHL API - Single Vercel Serverless Function
 * 
 * Consolidates all GHL API calls into one function to stay within Vercel's
 * free tier limit of 12 serverless functions.
 * 
 * Route via query param: /api/ghl?resource=contacts&action=list
 * 
 * Supported Resources:
 * - contacts: CRUD operations for contacts
 * - opportunities: CRUD operations for opportunities (properties)
 * - social: Social planner (accounts, posts, categories, tags, statistics)
 * - media: Media file management
 * - custom-fields: Location custom fields
 * - custom-values: Location custom values
 * - tags: Location tags management
 * - calendars: Calendar management (calendars, groups, events, resources)
 * - forms: Forms listing
 * - documents: Document templates and contracts
 * - messages: Email/SMS messaging
 * - ai-caption: AI-powered caption generation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GHL_API_URL = 'https://services.leadconnectorhq.com';
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Pipeline IDs
const SELLER_ACQUISITION_PIPELINE_ID = process.env.GHL_SELLER_ACQUISITION_PIPELINE_ID || 'U4FANAMaB1gGddRaaD9x'; // Acquisition Seller pipeline
const BUYER_ACQUISITION_PIPELINE_ID = process.env.GHL_BUYER_ACQUISITION_PIPELINE_ID || 'FRw9XPyTSnPv8ct0cWcm';
const DEAL_ACQUISITION_PIPELINE_ID = process.env.GHL_DEAL_ACQUISITION_PIPELINE_ID || '2NeLTlKaeMyWOnLXdTCS';

// Google Sheets Auth Configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_CREDENTIALS = process.env.GOOGLE_SHEET_CREDENTIALS;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[GHL API] Request received:', {
    method: req.method,
    resource: req.query.resource,
    action: req.query.action,
    id: req.query.id,
    hasBody: !!req.body,
    timestamp: new Date().toISOString()
  });
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-GHL-API-Key, X-GHL-Location-ID');

  if (req.method === 'OPTIONS') {
    console.log('[GHL API] OPTIONS request - returning CORS headers');
    return res.status(200).end();
  }

  console.log('[GHL API] Environment check:', {
    GHL_API_KEY_exists: !!GHL_API_KEY,
    GHL_API_KEY_length: GHL_API_KEY?.length,
    GHL_API_KEY_prefix: GHL_API_KEY?.substring(0, 15) + '...',
    GHL_LOCATION_ID_exists: !!GHL_LOCATION_ID,
    GHL_LOCATION_ID: GHL_LOCATION_ID,
    OPENAI_API_KEY_exists: !!OPENAI_API_KEY,
    GOOGLE_SHEET_ID_exists: !!GOOGLE_SHEET_ID,
    SELLER_PIPELINE: SELLER_ACQUISITION_PIPELINE_ID,
    BUYER_PIPELINE: BUYER_ACQUISITION_PIPELINE_ID,
    DEAL_PIPELINE: DEAL_ACQUISITION_PIPELINE_ID
  });

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error('[GHL API] ❌ MISSING CREDENTIALS');
    return res.status(500).json({ 
      error: 'GHL API credentials not configured',
      message: 'Please add GHL_API_KEY and GHL_LOCATION_ID to Vercel environment variables',
      missing: {
        GHL_API_KEY: !GHL_API_KEY,
        GHL_LOCATION_ID: !GHL_LOCATION_ID
      }
    });
  }

  console.log('[GHL API] ✅ Credentials loaded successfully');

  const headers = {
    'Authorization': `Bearer ${GHL_API_KEY}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
  };

  console.log('[GHL API] Headers prepared:', {
    Authorization: 'Bearer ' + GHL_API_KEY.substring(0, 15) + '...',
    ContentType: headers['Content-Type'],
    Version: headers['Version']
  });

  try {
    const { method, query, body } = req;
    const resource = query.resource as string;
    const action = query.action as string;
    const id = query.id as string;

    // ============ CONTACTS ============
    // Scopes: contacts.readonly, contacts.write
    if (resource === 'contacts') {
      console.log('[CONTACTS] Handling contacts resource');
      
      if (method === 'GET') {
        console.log('[CONTACTS] GET request');
        
        // Get single contact by ID
        if (id) {
          console.log('[CONTACTS] Fetching single contact:', id);
          try {
            const fetchUrl = `${GHL_API_URL}/contacts/${id}`;
            console.log('[CONTACTS] Request URL:', fetchUrl);
            
            const response = await fetch(fetchUrl, { headers });
            console.log('[CONTACTS] Response status:', response.status, response.statusText);
            
            const data = await response.json();
            console.log('[CONTACTS] Response data:', JSON.stringify(data).substring(0, 200) + '...');
            
            if (!response.ok) {
              console.error('[CONTACTS] ❌ Error fetching contact:', data);
            } else {
              console.log('[CONTACTS] ✅ Contact fetched successfully');
            }
            
            return res.status(response.ok ? 200 : response.status).json(data);
          } catch (error) {
            console.error('[CONTACTS] ❌ Exception fetching contact:', error);
            return res.status(500).json({ 
              error: 'Failed to fetch contact',
              details: error instanceof Error ? error.message : String(error)
            });
          }
        }
        
        // Use simple GET /contacts/ endpoint with pagination to fetch ALL contacts
        const requestedLimit = query.limit ? parseInt(query.limit as string) : 10000;
        
        let allContacts: any[] = [];
        let pageCount = 0;
        const maxPages = 100;
        
        console.log('[CONTACTS] Starting pagination fetch:', {
          requestedLimit,
          maxPages,
          ghlApiUrl: GHL_API_URL,
          locationId: GHL_LOCATION_ID
        });
        
        // Build initial request URL with limit of 100 per page (GHL max)
        let currentUrl = `${GHL_API_URL}/contacts/?locationId=${GHL_LOCATION_ID}&limit=100`;
        console.log('[CONTACTS] Initial URL:', currentUrl);
        
        // Paginate through all contacts
        while (pageCount < maxPages && allContacts.length < requestedLimit) {
          console.log(`[CONTACTS] 📄 Fetching page ${pageCount + 1}/${maxPages}`);
          console.log(`[CONTACTS] Current URL: ${currentUrl}`);
          
          try {
            const response = await fetch(currentUrl, { method: 'GET', headers });
            console.log(`[CONTACTS] Page ${pageCount + 1} response:`, {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              headers: {
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length')
              }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[CONTACTS] ❌ Page ${pageCount + 1} failed:`, {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText
              });
              
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { message: errorText };
              }
              
              // If first page fails, return error
              if (pageCount === 0) {
                console.error('[CONTACTS] ❌ First page failed, aborting');
                return res.status(response.status).json({
                  error: 'Failed to fetch contacts from GHL',
                  details: errorData,
                  ghlStatus: response.status,
                  ghlStatusText: response.statusText
                });
              }
              
              // Otherwise, return what we have
              console.warn(`[CONTACTS] ⚠️ Page ${pageCount + 1} failed, returning ${allContacts.length} contacts collected so far`);
              break;
            }
            
            const data = await response.json();
            const contacts = data.contacts || [];
            
            console.log(`[CONTACTS] ✅ Page ${pageCount + 1} success:`, {
              contactsReceived: contacts.length,
              totalSoFar: allContacts.length + contacts.length,
              hasNextPage: !!data.meta?.nextPageUrl,
              metaInfo: data.meta
            });
            
            if (contacts.length === 0) {
              console.log('[CONTACTS] No more contacts, stopping pagination');
              break;
            }
            
            allContacts = allContacts.concat(contacts);
            pageCount++;
            
            // Check for next page URL in meta
            if (data.meta?.nextPageUrl) {
              currentUrl = data.meta.nextPageUrl;
              console.log(`[CONTACTS] Next page URL: ${currentUrl}`);
            } else {
              console.log('[CONTACTS] No nextPageUrl in meta, stopping pagination');
              break;
            }
            
            // Stop if we've reached requested limit
            if (allContacts.length >= requestedLimit) {
              console.log(`[CONTACTS] Reached requested limit (${requestedLimit}), stopping`);
              break;
            }
          } catch (error) {
            console.error(`[CONTACTS] ❌ Exception on page ${pageCount + 1}:`, {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            });
            
            if (pageCount === 0) {
              return res.status(500).json({
                error: 'Exception while fetching contacts',
                details: error instanceof Error ? error.message : String(error)
              });
            }
            break;
          }
        }
        
        // Trim to requested limit if needed
        if (allContacts.length > requestedLimit) {
          console.log(`[CONTACTS] Trimming from ${allContacts.length} to ${requestedLimit}`);
          allContacts = allContacts.slice(0, requestedLimit);
        }
        
        console.log('[CONTACTS] ✅✅✅ PAGINATION COMPLETE:', {
          totalContacts: allContacts.length,
          pagesProcessed: pageCount,
          requestedLimit
        });
        
        return res.status(200).json({ 
          contacts: allContacts,
          meta: { total: allContacts.length, pages: pageCount }
        });
      }
      
      if (method === 'POST') {
        console.log('[CONTACTS] POST - Creating contact');
        try {
          const payload = { ...body, locationId: GHL_LOCATION_ID };
          console.log('[CONTACTS] Create payload:', JSON.stringify(payload).substring(0, 200));
          
          const response = await fetch(`${GHL_API_URL}/contacts/`, {
            method: 'POST', headers, body: JSON.stringify(payload)
          });
          console.log('[CONTACTS] Create response:', response.status, response.statusText);
          
          const data = await response.json();
          if (!response.ok) {
            console.error('[CONTACTS] ❌ Create failed:', data);
          }
          
          return res.status(response.ok ? 201 : response.status).json(data);
        } catch (error) {
          console.error('[CONTACTS] ❌ Exception creating contact:', error);
          return res.status(500).json({ error: 'Exception creating contact', details: String(error) });
        }
      }
      
      if (method === 'PUT' && id) {
        console.log('[CONTACTS] PUT - Updating contact:', id);
        try {
          const response = await fetch(`${GHL_API_URL}/contacts/${id}`, {
            method: 'PUT', headers, body: JSON.stringify(body)
          });
          console.log('[CONTACTS] Update response:', response.status);
          
          const data = await response.json();
          if (!response.ok) {
            console.error('[CONTACTS] ❌ Update failed:', data);
          }
          
          return res.status(response.ok ? 200 : response.status).json(data);
        } catch (error) {
          console.error('[CONTACTS] ❌ Exception updating contact:', error);
          return res.status(500).json({ error: 'Exception updating contact', details: String(error) });
        }
      }
      
      if (method === 'DELETE' && id) {
        console.log('[CONTACTS] DELETE - Deleting contact:', id);
        try {
          const response = await fetch(`${GHL_API_URL}/contacts/${id}`, { method: 'DELETE', headers });
          console.log('[CONTACTS] Delete response:', response.status);
          
          if (!response.ok) {
            const error = await response.text();
            console.error('[CONTACTS] ❌ Delete failed:', error);
          }
          
          return res.status(response.ok ? 204 : response.status).end();
        } catch (error) {
          console.error('[CONTACTS] ❌ Exception deleting contact:', error);
          return res.status(500).json({ error: 'Exception deleting contact', details: String(error) });
        }
      }
    }

    // ============ OPPORTUNITIES (Properties) ============
    // Scopes: opportunities.readonly, opportunities.write
    if (resource === 'opportunities') {
      // Determine pipeline based on type parameter or use seller acquisition as default
      let pipelineId = query.pipeline as string;
      if (!pipelineId) {
        const pipelineType = query.pipelineType as string;
        switch (pipelineType) {
          case 'buyer-acquisition':
            pipelineId = BUYER_ACQUISITION_PIPELINE_ID;
            break;
          case 'deal-acquisition':
            pipelineId = DEAL_ACQUISITION_PIPELINE_ID;
            break;
          case 'seller-acquisition':
          default:
            pipelineId = SELLER_ACQUISITION_PIPELINE_ID;
            break;
        }
      }
      
      if (method === 'GET') {
        if (id) {
          const response = await fetch(`${GHL_API_URL}/opportunities/${id}`, { headers });
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        // GHL opportunities/search requires POST with body
        // We need to paginate to get ALL opportunities
        const limit = parseInt((query.limit as string) || '100', 10);
        let allOpportunities: any[] = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
          const searchBody: Record<string, any> = {
            locationId: GHL_LOCATION_ID,
            limit,
            page,
          };
          if (query.status) searchBody.status = query.status;
          if (query.stageId) searchBody.stageId = query.stageId;
          
          // Note: GHL API doesn't support pipelineId in search body
          // We'll filter client-side after fetching
          
          const response = await fetch(`${GHL_API_URL}/opportunities/search`, { 
            method: 'POST',
            headers, 
            body: JSON.stringify(searchBody)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
          }
          
          const data = await response.json();
          const opportunities = data.opportunities || [];
          allOpportunities = allOpportunities.concat(opportunities);
          
          // Check if there are more pages
          // Keep fetching until we get no results or hit reasonable limit
          if (opportunities.length < limit) {
            hasMore = false;
          } else if (page >= 50) {
            // Safety limit: stop after 50 pages (5000 opportunities)
            hasMore = false;
          } else {
            page++;
          }
        }
        
        // Filter by pipeline client-side after fetching all
        if (pipelineId) {
          allOpportunities = allOpportunities.filter(
            (opp: any) => opp.pipelineId === pipelineId
          );
        }
        
        return res.status(200).json({ 
          opportunities: allOpportunities,
          count: allOpportunities.length,
          pipelineId
        });
      }
      
      if (method === 'POST') {
        const payload = { ...body, locationId: GHL_LOCATION_ID, pipelineId };
        const response = await fetch(`${GHL_API_URL}/opportunities`, {
          method: 'POST', headers, body: JSON.stringify(payload)
        });
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'PUT' && id) {
        const response = await fetch(`${GHL_API_URL}/opportunities/${id}`, {
          method: 'PUT', headers, body: JSON.stringify(body)
        });
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(`${GHL_API_URL}/opportunities/${id}`, { method: 'DELETE', headers });
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ PIPELINES ============
    // Get all pipelines with their stages
    if (resource === 'pipelines') {
      if (method === 'GET') {
        const response = await fetch(
          `${GHL_API_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`, 
          { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
    }

    // ============ TAGS ============
    // Scopes: locations/tags.readonly, locations/tags.write
    if (resource === 'tags') {
      if (method === 'GET') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/tags`, { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'POST') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/tags`,
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'PUT' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/tags/${id}`,
          { method: 'PUT', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/tags/${id}`,
          { method: 'DELETE', headers }
        );
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ CUSTOM FIELDS ============
    // Scopes: locations/customFields.readonly, locations/customFields.write
    if (resource === 'custom-fields') {
      if (method === 'GET') {
        const model = (query.model as string) || 'opportunity';
        const params = model !== 'all' ? `?model=${model}` : '';
        
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customFields${params}`, { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'POST') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customFields`,
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'PUT' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customFields/${id}`,
          { method: 'PUT', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customFields/${id}`,
          { method: 'DELETE', headers }
        );
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ CUSTOM VALUES ============
    // Scopes: locations/customValues.readonly, locations/customValues.write
    if (resource === 'custom-values') {
      if (method === 'GET') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customValues`, { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'POST') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customValues`,
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'PUT' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customValues/${id}`,
          { method: 'PUT', headers, body: JSON.stringify(body) }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}/customValues/${id}`,
          { method: 'DELETE', headers }
        );
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ CALENDARS ============
    // Scopes: calendars.readonly, calendars.write, calendars/groups, calendars/events, calendars/resources
    if (resource === 'calendars') {
      // Calendar Resources
      if (action === 'resources') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/resources?locationId=${GHL_LOCATION_ID}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/resources`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/resources/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/resources/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Calendar Groups
      if (action === 'groups') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/groups?locationId=${GHL_LOCATION_ID}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/groups`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/groups/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/groups/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Calendar Events
      if (action === 'events') {
        if (method === 'GET') {
          const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
          if (query.calendarId) params.append('calendarId', query.calendarId as string);
          if (query.startTime) params.append('startTime', query.startTime as string);
          if (query.endTime) params.append('endTime', query.endTime as string);
          
          const response = await fetch(
            `${GHL_API_URL}/calendars/events?${params}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/calendars/events`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/events/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/events/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Base Calendars
      if (!action || action === 'list') {
        if (method === 'GET') {
          if (id) {
            const response = await fetch(`${GHL_API_URL}/calendars/${id}`, { headers });
            return res.status(response.ok ? 200 : response.status).json(await response.json());
          }
          const response = await fetch(
            `${GHL_API_URL}/calendars?locationId=${GHL_LOCATION_ID}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/calendars`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/calendars/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
    }

    // ============ FORMS ============
    // Scopes: forms.readonly
    if (resource === 'forms') {
      if (method === 'GET') {
        if (id) {
          const response = await fetch(`${GHL_API_URL}/forms/${id}`, { headers });
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
        if (query.limit) params.append('limit', query.limit as string);
        if (query.skip) params.append('skip', query.skip as string);
        
        const response = await fetch(`${GHL_API_URL}/forms?${params}`, { headers });
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
    }

    // ============ SOCIAL PLANNER ============
    // Scopes: socialplanner/account, socialplanner/post, socialplanner/category, socialplanner/tag, socialplanner/statistics
    if (resource === 'social') {
      // Social Accounts
      if (action === 'accounts') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/accounts`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/accounts/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Social Posts
      if (action === 'posts') {
        if (method === 'GET') {
          const params = new URLSearchParams();
          if (query.status) params.append('status', query.status as string);
          if (query.limit) params.append('limit', query.limit as string);
          if (query.skip) params.append('skip', query.skip as string);
          
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/posts?${params}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        if (method === 'POST') {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/posts`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
        
        if (method === 'PUT' && id) {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/posts/${id}`,
            { method: 'PUT', headers, body: JSON.stringify(body) }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        if (method === 'DELETE' && id) {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/posts/${id}`,
            { method: 'DELETE', headers }
          );
          return res.status(response.ok ? 204 : response.status).end();
        }
      }
      
      // Social Categories
      if (action === 'categories') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/categories`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
      }
      
      // Social Tags
      if (action === 'tags') {
        if (method === 'GET') {
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/tags`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
      }
      
      // Social Statistics
      if (action === 'statistics') {
        if (method === 'GET') {
          const params = new URLSearchParams();
          if (query.startDate) params.append('startDate', query.startDate as string);
          if (query.endDate) params.append('endDate', query.endDate as string);
          
          const response = await fetch(
            `${GHL_API_URL}/social-media-posting/${GHL_LOCATION_ID}/statistics?${params}`, { headers }
          );
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
      }
    }

    // ============ MEDIA ============
    // Scopes: medias.readonly, medias.write
    if (resource === 'media') {
      if (method === 'GET') {
        if (id) {
          const response = await fetch(`${GHL_API_URL}/medias/${id}`, { headers });
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        const params = new URLSearchParams({ altId: GHL_LOCATION_ID, altType: 'location' });
        if (query.folderId) params.append('parentId', query.folderId as string);
        if (query.limit) params.append('limit', query.limit as string);
        
        const response = await fetch(`${GHL_API_URL}/medias/files?${params}`, { headers });
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
      
      if (method === 'POST' && action === 'upload') {
        const payload = {
          altId: GHL_LOCATION_ID,
          altType: 'location',
          name: body.name,
          ...(body.fileUrl ? { hosted: true, fileUrl: body.fileUrl } : { file: body.file })
        };
        const response = await fetch(`${GHL_API_URL}/medias/upload-file`, {
          method: 'POST', headers, body: JSON.stringify(payload)
        });
        return res.status(response.ok ? 201 : response.status).json(await response.json());
      }
      
      if (method === 'DELETE' && id) {
        const response = await fetch(
          `${GHL_API_URL}/medias/${id}?altId=${GHL_LOCATION_ID}&altType=location`,
          { method: 'DELETE', headers }
        );
        return res.status(response.ok ? 204 : response.status).end();
      }
    }

    // ============ DOCUMENTS & CONTRACTS ============
    // Scopes: documents_contracts_template/list.readonly, documents_contracts_template/sendLink.write
    // Scopes: documents_contracts/list.readonly, documents_contracts/sendLink.write
    // Base path: /documents-and-contracts/v1
    if (resource === 'documents') {
      console.log('[DOCUMENTS] Handling documents resource:', { action, method, id });
      
      // Document Templates
      if (action === 'templates') {
        if (method === 'GET') {
          console.log('[DOCUMENTS] Fetching templates');
          const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
          if (query.limit) params.append('limit', query.limit as string);
          if (query.skip) params.append('skip', query.skip as string);
          
          const url = `${GHL_API_URL}/documents-and-contracts/v1/templates?${params}`;
          console.log('[DOCUMENTS] Templates URL:', url);
          
          const response = await fetch(url, { headers });
          const data = await response.json();
          
          console.log('[DOCUMENTS] Templates response:', {
            status: response.status,
            ok: response.ok,
            hasTemplates: !!data.templates,
            count: data.templates?.length
          });
          
          return res.status(response.ok ? 200 : response.status).json(data);
        }
        
        // Send template link
        if (method === 'POST' && id) {
          console.log('[DOCUMENTS] Sending template:', id);
          const response = await fetch(
            `${GHL_API_URL}/documents-and-contracts/v1/templates/${id}/send`,
            { method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID }) }
          );
          const data = await response.json();
          console.log('[DOCUMENTS] Send template response:', response.status, response.ok);
          return res.status(response.ok ? 200 : response.status).json(data);
        }
      }
      
      // Document Contracts (sent documents)
      if (action === 'contracts') {
        if (method === 'GET') {
          console.log('[DOCUMENTS] Fetching contracts/documents');
          const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
          if (query.contactId) params.append('contactId', query.contactId as string);
          if (query.limit) params.append('limit', query.limit as string);
          
          const url = `${GHL_API_URL}/documents-and-contracts/v1/documents?${params}`;
          console.log('[DOCUMENTS] Contracts URL:', url);
          
          const response = await fetch(url, { headers });
          const data = await response.json();
          
          console.log('[DOCUMENTS] Contracts response:', {
            status: response.status,
            ok: response.ok,
            hasDocuments: !!data.documents,
            count: data.documents?.length
          });
          
          return res.status(response.ok ? 200 : response.status).json(data);
        }
        
        // Send document link
        if (method === 'POST' && id) {
          console.log('[DOCUMENTS] Sending document:', id);
          const response = await fetch(
            `${GHL_API_URL}/documents-and-contracts/v1/documents/${id}/send`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );
          const data = await response.json();
          console.log('[DOCUMENTS] Send document response:', response.status, response.ok);
          return res.status(response.ok ? 200 : response.status).json(data);
        }
      }
      
      // Legacy documents endpoint (backward compatibility)
      if (!action) {
        if (method === 'GET') {
          const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
          const response = await fetch(`${GHL_API_URL}/documents-and-contracts/v1/documents?${params}`, { headers });
          return res.status(response.ok ? 200 : response.status).json(await response.json());
        }
        
        if (method === 'POST') {
          if (id) {
            // Send document
            const response = await fetch(`${GHL_API_URL}/documents-and-contracts/v1/documents/${id}/send`, {
              method: 'POST', headers, body: JSON.stringify(body)
            });
            return res.status(response.ok ? 200 : response.status).json(await response.json());
          }
          
          const response = await fetch(`${GHL_API_URL}/documents-and-contracts/v1/documents`, {
            method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID })
          });
          return res.status(response.ok ? 201 : response.status).json(await response.json());
        }
      }
    }

    // ============ MESSAGES ============
    // For sending emails and SMS
    if (resource === 'messages') {
      if (method === 'POST') {
        const type = query.type as string; // 'email' or 'sms'
        const endpoint = type === 'email' ? 'emails' : 'sms';
        
        const response = await fetch(`${GHL_API_URL}/conversations/messages/${endpoint}`, {
          method: 'POST', headers, body: JSON.stringify({ ...body, locationId: GHL_LOCATION_ID })
        });
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
    }

    // ============ LOCATION INFO ============
    // Scopes: locations.readonly
    if (resource === 'location') {
      if (method === 'GET') {
        const response = await fetch(
          `${GHL_API_URL}/locations/${GHL_LOCATION_ID}`, { headers }
        );
        return res.status(response.ok ? 200 : response.status).json(await response.json());
      }
    }

    // ============ AI CAPTION GENERATION ============
    if (resource === 'ai-caption') {
      if (method === 'POST') {
        if (!OPENAI_API_KEY) {
          return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        const { property, platform, style } = body;
        
        const stylePrompts: Record<string, string> = {
          professional: 'Write in a professional, trustworthy tone suitable for serious real estate investors.',
          witty: 'Write in a witty, clever tone with wordplay and humor while still being informative.',
          powerful: 'Write in a powerful, action-oriented tone that creates urgency and excitement.',
          friendly: 'Write in a warm, friendly, approachable tone like talking to a neighbor.',
          luxury: 'Write in an elegant, sophisticated tone emphasizing exclusivity and premium quality.',
          casual: 'Write in a casual, conversational tone like texting a friend about a great find.',
        };

        const platformInstructions: Record<string, string> = {
          facebook: 'For Facebook: Use 40-80 characters for best engagement. Include emojis, questions to encourage comments, and a clear call-to-action.',
          instagram: 'For Instagram: Write engaging first line (most important). Use up to 30 relevant hashtags at the end. Include emojis throughout.',
          linkedin: 'For LinkedIn: Use professional language with line breaks for readability. Focus on investment value and ROI. Include 3-5 professional hashtags.',
        };

        const systemPrompt = `You are a real estate social media expert. Generate compelling property captions that drive engagement and leads.

${stylePrompts[style] || stylePrompts.professional}

${platformInstructions[platform] || platformInstructions.facebook}

Property Details:
- Address: ${property.address || 'N/A'}
- City: ${property.city || 'N/A'}
- Price: $${property.price?.toLocaleString() || 'N/A'}
- Beds: ${property.beds || 'N/A'}
- Baths: ${property.baths || 'N/A'}
- Sqft: ${property.sqft || 'N/A'}
- Property Type: ${property.propertyType || 'N/A'}
- Condition: ${property.condition || 'N/A'}
- Description: ${property.description || 'N/A'}

Generate ONLY the caption text, nothing else.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate a ${style} ${platform} caption for this property listing.` }
            ],
            max_tokens: 500,
            temperature: 0.8,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('OpenAI API error:', error);
          return res.status(response.status).json({ error: 'Failed to generate caption' });
        }

        const data = await response.json();
        const caption = data.choices?.[0]?.message?.content || '';
        
        return res.status(200).json({ caption, platform, style });
      }
    }

    // ============ AUTH (Google Sheets) ============
    if (resource === 'auth') {
      if (action === 'login' && method === 'POST') {
        const { email, password } = body;
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        if (!GOOGLE_SHEET_ID || !GOOGLE_SHEET_CREDENTIALS) {
          return res.status(500).json({ error: 'Google Sheets not configured' });
        }

        try {
          // Parse credentials
          const credentials = JSON.parse(GOOGLE_SHEET_CREDENTIALS);
          
          // Create JWT for Google Sheets API
          const jwt = await createGoogleJWT(credentials);
          const accessToken = await getGoogleAccessToken(jwt, credentials);
          
          // Fetch users from Google Sheet
          const sheetResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Users!A:D`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          );
          
          if (!sheetResponse.ok) {
            const errorData = await sheetResponse.json();
            console.error('Google Sheets error:', errorData);
            return res.status(500).json({ error: 'Failed to fetch users from sheet', details: errorData });
          }
          
          const sheetData = await sheetResponse.json();
          const rows = sheetData.values || [];
          
          // Skip header row, find matching user
          // Expected columns: Email, Password, Name, Role
          for (let i = 1; i < rows.length; i++) {
            const [userEmail, userPassword, userName, userRole] = rows[i];
            if (userEmail?.toLowerCase() === email.toLowerCase() && userPassword === password) {
              return res.status(200).json({
                authenticated: true,
                user: {
                  email: userEmail,
                  name: userName || userEmail.split('@')[0],
                  role: userRole || 'user'
                }
              });
            }
          }
          
          return res.status(401).json({ authenticated: false, error: 'Invalid email or password' });
        } catch (error) {
          console.error('Auth error:', error);
          return res.status(500).json({ error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    // ============ NOTIFICATIONS ============
    if (resource === 'notifications') {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      
      if (action === 'connection-failure' && method === 'POST') {
        const { email, failedSince, message } = body;
        
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        
        if (!RESEND_API_KEY) {
          console.log('RESEND_API_KEY not configured, skipping email notification');
          return res.status(200).json({ 
            success: false, 
            message: 'Email notifications not configured (RESEND_API_KEY missing)' 
          });
        }
        
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'PropertyPro <onboarding@resend.dev>',
              to: [email],
              subject: '⚠️ GHL Connection Alert - PropertyPro',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #ef4444; margin-bottom: 20px;">⚠️ Connection Alert</h1>
                  <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
                    The connection to HighLevel (GHL) has been down for more than 5 minutes.
                  </p>
                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #991b1b;">
                      <strong>Failed Since:</strong> ${new Date(failedSince).toLocaleString()}
                    </p>
                    ${message ? `<p style="margin: 8px 0 0; color: #991b1b;">${message}</p>` : ''}
                  </div>
                  <p style="font-size: 14px; color: #6b7280;">
                    Please check your GHL API configuration and ensure your credentials are valid.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                  <p style="font-size: 12px; color: #9ca3af;">
                    This is an automated alert from PropertyPro. 
                    Go to Settings → Connection Status to view details.
                  </p>
                </div>
              `,
            }),
          });
          
          if (!emailResponse.ok) {
            const error = await emailResponse.json();
            console.error('Failed to send notification email:', error);
            return res.status(500).json({ error: 'Failed to send email', details: error });
          }
          
          const result = await emailResponse.json();
          return res.status(200).json({ success: true, emailId: result.id });
        } catch (error) {
          console.error('Error sending notification:', error);
          return res.status(500).json({ 
            error: 'Failed to send notification',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    console.log('[GHL API] ⚠️ No handler found for resource/action:', { resource, action, method });
    return res.status(400).json({ error: 'Invalid resource or action', resource, action, method });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[GHL API] ❌❌❌ UNHANDLED EXCEPTION ❌❌❌');
    console.error('[GHL API] Error type:', error?.constructor?.name);
    console.error('[GHL API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[GHL API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[GHL API] Request info:', {
      method: req.method,
      resource: req.query.resource,
      action: req.query.action,
      id: req.query.id
    });
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

// Helper functions for Google Sheets auth
async function createGoogleJWT(credentials: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signInput = `${encode(header)}.${encode(claim)}`;
  
  // Use Node.js crypto for signing
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(credentials.private_key, 'base64url');
  
  return `${signInput}.${signature}`;
}

async function getGoogleAccessToken(jwt: string, credentials: any): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}