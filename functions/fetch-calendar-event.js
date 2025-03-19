// This function fetches event data after receiving a notification
const { google } = require('googleapis');

exports.handler = async function(event, context) {
  try {
    // Parse the incoming request
    const payload = JSON.parse(event.body || '{}');
    console.log('Received fetch request:', JSON.stringify(payload));
    
    if (!payload.resourceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing resourceId in request' })
      };
    }
    
    const resourceId = payload.resourceId;
    const calendarId = payload.calendarId || 'primary';
    
    // Configure OAuth2 credentials
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
    
    // Retrieve the events list to find the relevant event
    // The resourceId format doesn't directly map to an event ID
    // We need to list events and match based on the notification
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
      timeMax: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next 24 hours
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const events = response.data.items || [];
    console.log(`Found ${events.length} recent events`);
    
    // Format events to include all fields needed by our Supabase function
    return {
      statusCode: 200,
      body: JSON.stringify({
        resourceId: resourceId,
        calendarId: calendarId,
        events: events.map(event => ({
          id: event.id,
          google_meeting_id: event.id,
          summary: event.summary || 'Untitled Event',
          description: event.description,
          start: event.start,
          meeting_date: event.start?.dateTime || event.start?.date,
          end: event.end,
          status: event.status,
          created: event.created,
          updated: event.updated,
          colorId: event.colorId,
          calendar_colour: event.colorId ? `${event.colorId} ${response.data.summary || 'Calendar'}` : null,
          calendar: {
            id: calendarId,
            name: response.data.summary || 'Google Calendar'
          },
          attendees: (event.attendees || []).map(a => ({
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus
          }))
        }))
      })
    };
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error fetching calendar event',
        message: error.message,
        stack: error.stack
      })
    };
  }
};