const fetch = require('node-fetch');
const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE_ID);
const table = base('Contacts');

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
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Always add + prefix if not present
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// Find contact by phone number in Airtable
async function findContactByPhone(phoneNumber) {
  console.log('Searching for contact with phone:', phoneNumber);
  
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Formatted phone number:', formattedPhone);
    
    const records = await table.select({
      filterByFormula: `{Mobile Phone Number} = '${formattedPhone}'`
    }).firstPage();
    
    console.log(`Found ${records.length} matching contacts`);
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    logError('findContactByPhone', error, { phoneNumber });
    throw error;
  }
}

// Format timestamp for Airtable
function formatTimestamp(timestamp) {
  // Convert "2025-02-06 12:45:01+00:00" to "2025-02-06T12:45:01.000Z"
  return new Date(timestamp).toISOString();
}

// Update contact's WhatsApp timestamp
async function updateContactWhatsAppTimestamp(recordId, direction, timestamp) {
  console.log('Updating contact:', { recordId, direction, timestamp });
  
  const fieldToUpdate = direction === 'sent' ? 'Last Whatsapp Sent' : 'Last Whatsapp Received';
  const formattedTimestamp = formatTimestamp(timestamp);
  
  console.log('Formatted timestamp:', formattedTimestamp);
  
  try {
    await table.update(recordId, {
      [fieldToUpdate]: formattedTimestamp
    });
    
    console.log('Contact updated successfully');
  } catch (error) {
    logError('updateContactWhatsAppTimestamp', error, { recordId, direction, timestamp, formattedTimestamp });
    throw error;
  }
}

// Create new contact
async function createNewContact(phoneNumber, direction, timestamp) {
  console.log('Creating new contact:', { phoneNumber, direction, timestamp });
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  console.log('Formatted phone for new contact:', formattedPhone);
  
  const formattedTimestamp = formatTimestamp(timestamp);
  console.log('Formatted timestamp:', formattedTimestamp);

  const newContact = {
    'Mobile Phone Number': formattedPhone,
    'Last Whatsapp Sent': direction === 'sent' ? formattedTimestamp : null,
    'Last Whatsapp Received': direction === 'received' ? formattedTimestamp : null
  };

  try {
    const record = await table.create(newContact);
    console.log('Contact created successfully:', record.getId());
  } catch (error) {
    logError('createNewContact', error, { newContact });
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
      const { phoneNumber, timestamp, direction } = messageData;
      
      // Validate phone number format
      if (!isValidPhoneNumber(phoneNumber)) {
        console.warn(`Skipping invalid phone number format: ${phoneNumber}`);
        continue;
      }

      // Check if contact exists
      const existingContact = await findContactByPhone(phoneNumber);
      
      if (existingContact) {
        console.log('Updating existing contact:', existingContact.id);
        await updateContactWhatsAppTimestamp(existingContact.id, direction, timestamp);
      } else {
        console.log('Creating new contact for phone:', phoneNumber);
        await createNewContact(phoneNumber, direction, timestamp);
      }
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
