const { google } = require('googleapis');

exports.handler = async function(event, context) {
  console.log('Starting Gmail watch renewal process');
  
  try {
    const projectId = process.env.PROJECT_ID || 'watchful-goods-430419-r0';
    const topicName = process.env.TOPIC_NAME || 'gmail-email-notifications';
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

    // Initialize Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Topic name in the format projects/{PROJECT_ID}/topics/{TOPIC_NAME}
    const fullTopicName = `projects/${projectId}/topics/${topicName}`;
    
    console.log(`Full topic name: ${fullTopicName}`);
    
    // Send watch request
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: fullTopicName,
        labelIds: ['INBOX']
      }
    });

    console.log('Gmail watch renewal successful');
    console.log('History ID:', response.data.historyId);
    if (response.data.expiration) {
      console.log('Expiration:', new Date(parseInt(response.data.expiration)).toISOString());
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Gmail watch renewal successful',
        historyId: response.data.historyId,
        expiration: response.data.expiration ? 
          new Date(parseInt(response.data.expiration)).toISOString() : 
          'Not provided'
      })
    };
  } catch (error) {
    console.error('Error renewing Gmail watch:', error.message);
    
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