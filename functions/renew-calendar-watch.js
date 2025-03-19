const { google } = require('googleapis');

exports.handler = async function(event, context) {
  console.log('Starting Calendar watch renewal process');
  
  try {
    const projectId = process.env.PROJECT_ID || 'watchful-goods-430419-r0';
    const topicName = process.env.CALENDAR_TOPIC_NAME || 'calendar-notifications';
    const userEmail = process.env.USER_EMAIL || 'simone@cimminelli.com';
    
    // Configure OAuth2 credentials
    const oAuth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      'https://developers.google.com/oauthplayground' // Redirect URI used by OAuth Playground
    );

    // Set credentials using refresh token - use calendar-specific token
    oAuth2Client.setCredentials({
      refresh_token: process.env.CALENDAR_REFRESH_TOKEN
    });

    // Get a new access token
    await oAuth2Client.getAccessToken();
    
    console.log('Successfully refreshed access token');
    console.log(`Project ID: ${projectId}`);
    console.log(`Topic Name: ${topicName}`);
    console.log(`User Email: ${userEmail}`);

    // Initialize Calendar API client
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    // First, stop any existing watches to prevent duplicate notifications
    try {
      const channels = await calendar.channels.list();
      if (channels && channels.data && channels.data.items) {
        for (const channel of channels.data.items) {
          if (channel.resourceId) {
            await calendar.channels.stop({
              requestBody: {
                id: channel.id,
                resourceId: channel.resourceId
              }
            });
            console.log(`Stopped existing channel: ${channel.id}`);
          }
        }
      }
    } catch (error) {
      console.log('No existing channels found or error stopping channels:', error.message);
    }

    // Set up a new watch notification
    const response = await calendar.events.watch({
      calendarId: 'primary', // Use primary calendar, or specific calendar ID
      requestBody: {
        id: `calendar-watch-${Date.now()}`, // Unique ID for this watch
        type: 'web_hook',
        address: 'https://efazuvegwxouysfcgwja.supabase.co/functions/v1/calendar',
        params: { 
          // Add the following header to help Supabase function understand the format
          ttl: '604800' // 7 days in seconds
        }
      }
    });

    console.log('Calendar watch renewal successful');
    console.log('Watch ID:', response.data.id);
    
    if (response.data.expiration) {
      const expirationDate = new Date(parseInt(response.data.expiration));
      console.log('Watch will expire on:', expirationDate.toISOString());
      console.log('Days until expiration:', Math.round((expirationDate - new Date()) / (1000 * 60 * 60 * 24)));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Calendar watch renewal successful',
        watchId: response.data.id,
        resourceId: response.data.resourceId,
        expiration: response.data.expiration ? 
          new Date(parseInt(response.data.expiration)).toISOString() : 
          'Not provided',
        info: 'Calendar notifications will be sent directly to the Supabase function'
      })
    };
  } catch (error) {
    console.error('Error renewing Calendar watch:', error.message);
    
    if (error.response && error.response.data) {
      console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data || 'No additional details available'
      })
    };
  }
};