// This function adapts Google Calendar webhooks to a format your Supabase function can understand
const fetch = require('node-fetch');

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
    
    // For actual changes, we need to fetch the event data
    if (resourceState === 'exists' || resourceState === 'update' || resourceState === 'delete') {
      // Prepare a structured payload for the Supabase function
      const payload = {
        type: 'calendar_notification',
        resource: {
          channelId,
          resourceId,
          resourceState,
          messageNumber: parseInt(messageNumber, 10) || 0,
          changedFields: changedFields ? changedFields.split(',') : []
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('Forwarding to Supabase with payload:', JSON.stringify(payload));
      
      // Forward the structured payload to the Supabase function
      const response = await fetch('https://efazuvegwxouysfcgwja.supabase.co/functions/v1/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      console.log('Supabase response status:', response.status);
      console.log('Supabase response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { raw: responseText };
      }
      
      if (!response.ok) {
        console.error('Error forwarding to Supabase:', responseText);
        return {
          statusCode: 502,
          body: JSON.stringify({ 
            error: 'Failed to forward to Supabase',
            details: responseText
          })
        };
      }
      
      console.log('Successfully forwarded to Supabase');
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Calendar notification processed and forwarded to Supabase',
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