const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Debug environment variables
  const debug = {
    hasHubspotKey: !!process.env.HUBSPOT_API_KEY,
    hasHubspotPortal: !!process.env.HUBSPOT_PORTAL_ID,
    hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
    hasAirtableBase: !!process.env.AIRTABLE_BASE_ID,
    hasAirtableTable: !!process.env.AIRTABLE_TABLE_ID,
    hubspotKeyLength: process.env.HUBSPOT_API_KEY ? process.env.HUBSPOT_API_KEY.length : 0,
    params: event.queryStringParameters
  };

  const hubspotApiKey = process.env.HUBSPOT_API_KEY;
  const hubspotPortalId = process.env.HUBSPOT_PORTAL_ID;
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableId = process.env.AIRTABLE_TABLE_ID;

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
    debug.searchResponse = searchData;

    if (searchData.total > 0) {
      const hubspotId = searchData.results[0].id;
      const hubspotUrl = `https://app-eu1.hubspot.com/contacts/${hubspotPortalId}/contact/${hubspotId}`;

      const updateData = {
        fields: {
          'HubSpot ID': hubspotId,
          'HubSpot URL': hubspotUrl
        }
      };

      const airtableResponse = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableId}/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!airtableResponse.ok) {
        const errorData = await airtableResponse.text();
        throw new Error(`Failed to update Airtable: ${errorData}`);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Successfully updated Airtable record',
          fields: updateData.fields,
          debug
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