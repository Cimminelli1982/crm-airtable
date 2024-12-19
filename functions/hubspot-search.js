const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const hubspotApiKey = 'pat-eu1-7db99493-9362-4987-9551-9021c309a6ea';
  const hubspotPortalId = '144666820';
  const airtableApiKey = 'pat31Rx6dxZsbexBc.3227ebbc64cdb5888b6e3a628edebba82c42e8534bee68921887fbfd27434728';
  const airtableBaseId = 'appTMYAU4N43eJdxG';

  // Debug object to collect all relevant information
  const debug = {
    startTime: new Date().toISOString(),
    queryParams: event.queryStringParameters,
    steps: []
  };

  const { recordId, email } = event.queryStringParameters;

  if (!email || !recordId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'Email and recordId parameters are required',
        debug
      })
    };
  }

  try {
    debug.steps.push('Starting HubSpot search');
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
    debug.steps.push('HubSpot search completed');
    debug.hubspotSearchResult = searchData;

    if (searchData.total > 0) {
      const hubspotId = searchData.results[0].id;
      const hubspotUrl = `https://app-eu1.hubspot.com/contacts/${hubspotPortalId}/contact/${hubspotId}`;

      debug.steps.push('Fetching additional emails');
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

      const updateData = {
        fields: {
          'HubSpot ID': hubspotId,
          'HubSpot URL': hubspotUrl,
          'All Emails': allEmails.join(', ')
        }
      };

      debug.steps.push('Attempting Airtable update');
      debug.airtableUpdateUrl = `https://api.airtable.com/v0/${airtableBaseId}/tblUx9VGA0rxLmidU/${recordId}`;
      debug.airtableUpdateData = updateData;

      const airtableResponse = await fetch(debug.airtableUpdateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const airtableResult = await airtableResponse.text();
      debug.airtableResponseStatus = airtableResponse.status;
      debug.airtableResponseText = airtableResult;
      debug.steps.push('Airtable update completed');

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Operation completed',
          hubspotData: {
            id: hubspotId,
            url: hubspotUrl,
            allEmails: allEmails
          },
          debug: debug,
          airtableUpdateSuccess: airtableResponse.ok
        })
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'No matching HubSpot contact found',
          debug
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        debug
      })
    };
  }
};