// This function adapts Google Calendar webhooks to a format your Supabase function can understand
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    console.log('Received Calendar webhook');
    
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
      
      // Forward the structured payload to the Supabase function
      const response = await fetch('https://efazuvegwxouysfcgwja.supabase.co/functions/v1/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error forwarding to Supabase:', errorText);
        return {
          statusCode: 502,
          body: JSON.stringify({ 
            error: 'Failed to forward to Supabase',
            details: errorText
          })
        };
      }
      
      const result = await response.json();
      console.log('Successfully forwarded to Supabase:', JSON.stringify(result));
      
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
        message: error.message
      })
    };
  }
};