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
    
    // For actual changes, use our fetch-calendar-event Lambda function
    if (resourceState === 'exists' || resourceState === 'update' || resourceState === 'delete') {
      console.log('Fetching calendar events using fetch-calendar-event function');
      
      // First prepare the payload for the fetch-calendar-event function
      const fetchPayload = {
        resourceId,
        calendarId: process.env.CALENDAR_ID || 'primary',
        resourceState
      };
      
      // Call our fetch-calendar-event function directly 
      // In a real deployment, this would be a Lambda function call
      // We're importing it directly here for reliability
      const { handler: fetchCalendarEventHandler } = require('./fetch-calendar-event');
      
      // Create a mock event object for the fetch function
      const mockEvent = {
        body: JSON.stringify(fetchPayload)
      };
      
      // Call the function
      console.log('Calling fetch-calendar-event with payload:', JSON.stringify(fetchPayload));
      const fetchResult = await fetchCalendarEventHandler(mockEvent, {});
      
      // Parse the response
      let eventsData;
      try {
        eventsData = JSON.parse(fetchResult.body);
        console.log(`Received ${eventsData.events?.length || 0} events from fetch-calendar-event`);
      } catch (error) {
        console.error('Error parsing fetch-calendar-event response:', error);
        throw new Error(`Failed to parse events data: ${error.message}`);
      }
      
      if (!eventsData.events || eventsData.events.length === 0) {
        console.log('No events found - nothing to process');
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            message: 'Calendar notification processed but no events found to update',
            resourceId,
            resourceState
          })
        };
      }
      
      // Map the events properly to include required fields
      const cleanedEvents = eventsData.events.map(event => ({
        ...event,
        google_meeting_id: event.id,
        meeting_date: event.start?.dateTime || event.start?.date,
        calendar_colour: event.colorId ? `${event.colorId} ${eventsData.calendarId}` : null
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