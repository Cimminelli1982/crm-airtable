// This function adapts Google Calendar webhooks to a format your Supabase function can understand
const fetch = require('node-fetch');
const { google } = require('googleapis');

exports.handler = async function(event, context) {
  try {
    console.log('Received Calendar webhook');
    console.log('Method:', event.httpMethod);
    console.log('Headers:', JSON.stringify(event.headers, null, 2));
    console.log('Body:', event.body || '(no body)');
    
    // Google Calendar notifications come as headers, not JSON body
    const headers = event.headers;
    
    // Extract the important headers
    const channelId = headers['x-goog-channel-id'] || '';
    const resourceId = headers['x-goog-resource-id'] || '';
    const resourceState = headers['x-goog-resource-state'] || '';
    const messageNumber = headers['x-goog-message-number'] || '';
    const changedFields = headers['x-goog-changed'] || '';
    
    console.log(`Channel ID: ${channelId}`);
    console.log(`Resource ID: ${resourceId}`);
    console.log(`Resource State: ${resourceState}`);
    console.log(`Message Number: ${messageNumber}`);
    console.log(`Changed Fields: ${changedFields}`);
    
    // If it's a sync message, just acknowledge it
    if (resourceState === 'sync') {
      console.log('This is just a sync message, no event data to process');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Sync notification received and acknowledged' })
      };
    }
    
    // For actual changes, fetch the event data right away
    if (resourceState === 'exists' || resourceState === 'update' || resourceState === 'delete') {
      // Setup Google Calendar API
      const oAuth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
      );
      
      oAuth2Client.setCredentials({
        refresh_token: process.env.CALENDAR_REFRESH_TOKEN
      });
      
      // Get a new access token
      await oAuth2Client.getAccessToken();
      
      // Initialize Calendar API client
      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      const calendarId = process.env.CALENDAR_ID || 'primary';
      
      // Fetch recent events (last day + next day)
      console.log('Fetching recent events from Google Calendar API');
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        timeMax: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next 24 hours
        maxResults: 10,
        singleEvents: true,
        orderBy: 'updated'
      });
      
      const events = response.data.items || [];
      console.log(`Found ${events.length} recent events`);
      
      // Clean up and normalize event data
      const cleanedEvents = events.map(event => ({
        id: event.id,
        google_meeting_id: event.id, // Use the same ID as provided by Google
        summary: event.summary || 'Untitled Event',
        description: event.description,
        start: event.start,
        end: event.end,
        status: event.status,
        created: event.created,
        updated: event.updated,
        colorId: event.colorId,
        calendar: {
          id: calendarId,
          name: response.data.summary || 'Google Calendar'
        },
        attendees: (event.attendees || []).map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus
        }))
      }));
      
      // Prepare the full payload with notification data AND event data
      const payload = {
        type: 'calendar_notification',
        resource: {
          channelId,
          resourceId,
          resourceState,
          messageNumber: parseInt(messageNumber, 10) || 0,
          changedFields: changedFields ? changedFields.split(',') : []
        },
        events: cleanedEvents,
        timestamp: new Date().toISOString()
      };
      
      console.log('Forwarding to Supabase with payload including events');
      
      // Forward the complete payload to the Supabase function
      const response2 = await fetch('https://efazuvegwxouysfcgwja.supabase.co/functions/v1/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response2.text();
      console.log('Supabase response status:', response2.status);
      console.log('Supabase response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { raw: responseText };
      }
      
      if (!response2.ok) {
        console.error('Error forwarding to Supabase:', responseText);
        return {
          statusCode: 502,
          body: JSON.stringify({ 
            error: 'Failed to forward to Supabase',
            details: responseText
          })
        };
      }
      
      console.log('Successfully forwarded to Supabase with events data');
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Calendar notification processed with events data and forwarded to Supabase',
          eventsCount: cleanedEvents.length,
          result
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification received but no action needed' })
    };
    
  } catch (error) {
    console.error('Error processing calendar webhook:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error processing webhook',
        message: error.message,
        stack: error.stack
      })
    };
  }
};