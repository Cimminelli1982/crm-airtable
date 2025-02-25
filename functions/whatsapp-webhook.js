const fetch = require('node-fetch');
const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base('appTMYAU4N43eJdxG');
const interactionsTable = base('tblXub1Mg6RtXScPG');

// Enhanced logging function
function logError(context, error, additionalData = {}) {
  console.error({
    timestamp: new Date().toISOString(),
    context: context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    additionalData
  });
}

// Format phone number to match Airtable format
function formatPhoneNumber(phone) {
  if (!phone) return null;
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Always add + prefix if not present
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// Format timestamp for Airtable Date field
function formatTimestamp(timestamp) {
  // Parse the input timestamp
  const date = new Date(timestamp);
  // Return just the date part in YYYY-MM-DD format
  return date.toISOString().split('T')[0];
}

// Create a new interaction record
async function createInteraction(data) {
  console.log('Creating new interaction:', data);
  
  try {
    const record = await interactionsTable.create(data);
    console.log('Interaction created successfully:', record.getId());
    return record;
  } catch (error) {
    logError('createInteraction', error, { data });
    throw error;
  }
}

// Parse incoming WhatsApp event from TimelinesAI
function parseWhatsAppEvent(eventData) {
  console.log('Received webhook payload:', JSON.stringify(eventData, null, 2));
  
  try {
    if (eventData.message) {
      // Single message format
      console.log('Processing single message format');
      return [{
        phoneNumber: eventData.chat.phone,
        timestamp: eventData.message.timestamp,
        direction: eventData.message.direction,
        text: eventData.message.text,
        messageId: eventData.message.message_uid
      }];
    }
    
    throw new Error('Invalid webhook format received');
  } catch (error) {
    logError('parseWhatsAppEvent', error, { eventData });
    throw error;
  }
}

// Validate phone number
function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    console.warn('Phone number is empty or undefined');
    return false;
  }
  
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  // Check if we have at least a reasonable number of digits for an international number
  const isValid = cleaned.length >= 10;
  
  if (!isValid) {
    console.warn(`Invalid phone number format: ${phoneNumber}`);
  } else {
    console.log(`Valid phone number: ${phoneNumber}`);
  }
  
  return isValid;
}

// Netlify function handler
exports.handler = async (event, context) => {
  console.log('Received webhook request:', {
    method: event.httpMethod,
    headers: event.headers,
    path: event.path
  });

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.warn('Rejected non-POST request');
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const messages = parseWhatsAppEvent(body);
    
    console.log(`Processing ${messages.length} messages`);
    
    for (const messageData of messages) {
      const { phoneNumber, timestamp, direction, text } = messageData;
      
      // Validate phone number format
      if (!isValidPhoneNumber(phoneNumber)) {
        console.warn(`Skipping invalid phone number format: ${phoneNumber}`);
        continue;
      }

      // Format the timestamp for Airtable - ensure it's in ISO format
      const formattedDate = formatTimestamp(timestamp);
      console.log('Formatted date for Airtable (ISO format):', formattedDate);
      
      // Create interaction record data
      const interactionData = {
        'Interaction Date': formattedDate,  // This must be YYYY-MM-DD
        'Interaction Type': 'WhatsApp',
        'Contact Mobile': formatPhoneNumber(phoneNumber),
        'Direction': direction === 'sent' ? 'Outbound' : 'Inbound',
        'Notes': text || ''
      };
      
      // Generate the iteration field value - formatted as YYYY-MM-DD - Type - Phone
      interactionData['Iteration'] = `${formattedDate} - WhatsApp - ${formatPhoneNumber(phoneNumber)}`;
      
      // Create the interaction record
      await createInteraction(interactionData);
      
      console.log('Created interaction record for:', phoneNumber);
    }

    console.log('Successfully processed all messages');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    logError('webhookHandler', error, { eventBody: event.body });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
