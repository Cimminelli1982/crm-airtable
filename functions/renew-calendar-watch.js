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

    // Set credentials using refresh token
    oAuth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN
    });

    // Get a new access token
    await oAuth2Client.getAccessToken();
    
    console.log('Successfully refreshed access token');
    console.log(`Project ID: ${projectId}`);
    console.log(`Topic Name: ${topicName}`);
    console.log(`User Email: ${userEmail}`);

    // Initialize Calendar API client
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    // Topic name in the format projects/{PROJECT_ID}/topics/{TOPIC_NAME}
    const fullTopicName = `projects/${projectId}/topics/${topicName}`;
    
    console.log(`Full topic name: ${fullTopicName}`);
    
    // Send watch request
    const response = await calendar.events.watch({
      calendarId: 'primary', // Use primary calendar, or specific calendar ID
      requestBody: {
        id: `calendar-watch-${Date.now()}`, // Unique ID for this watch
        type: 'pubsub',
        address: fullTopicName,
        params: {
          ttl: '604800' // 7 days in seconds
        }
      }
    });

    console.log('Calendar watch renewal successful');
    console.log('Watch ID:', response.data.id);
    
    if (response.data.expiration) {
      const expirationDate = new Date(parseInt(response.data.expiration));
      console.log('Watch will expire on:', expirationDate.toISOString());
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Calendar watch renewal successful',
        watchId: response.data.id,
        resourceId: response.data.resourceId,
        expiration: response.data.expiration ? 
          new Date(parseInt(response.data.expiration)).toISOString() : 
          'Not provided'
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