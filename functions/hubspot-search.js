// functions/hubspot-search.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Enable CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET'
      }
    };
  }

  // Use the same API key and portal ID from your original script
  const hubspotApiKey = 'pat-eu1-7db99493-9362-4987-9551-9021c309a6ea';
  const hubspotPortalId = '144666820';

  // Get record ID and email from query parameters
  const { recordId, email } = event.queryStringParameters;

  if (!email || !recordId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Email and recordId parameters are required' })
    };
  }

  try {
    // Search for the contact in HubSpot using the exact same search parameters as your original script
    const searchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email
              }
            ]
          },
          {
            filters: [
              {
                propertyName: 'hs_additional_emails',
                operator: 'CONTAINS_TOKEN',
                value: email
              }
            ]
          }
        ]
      })
    });

    const searchData = await searchResponse.json();

    if (searchData.total > 0) {
      const hubspotId = searchData.results[0].id;
      const hubspotUrl = `https://app-eu1.hubspot.com/contacts/${hubspotPortalId}/contact/${hubspotId}`;

      // Fetch additional emails just like in your original script
      const contactUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}?properties=email,hs_additional_emails`;
      const contactResponse = await fetch(contactUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const contactData = await contactResponse.json();
      const allEmails = [contactData.properties.email];
      if (contactData.properties.hs_additional_emails) {
        allEmails.push(...contactData.properties.hs_additional_emails.split(';'));
      }

      // Update Airtable record
      return {
        statusCode: 200,
        body: JSON.stringify({
          fields: {
            'HubSpot ID': hubspotId,
            'HubSpot URL': hubspotUrl,
            'allEmails': allEmails.join(', ')
          }
        })
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No matching HubSpot contact found' })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};