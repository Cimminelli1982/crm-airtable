const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Return all environment variables and their values
  return {
    statusCode: 200,
    body: JSON.stringify({
      envVars: {
        HUBSPOT_API_KEY: process.env.HUBSPOT_API_KEY || 'not set',
        HUBSPOT_PORTAL_ID: process.env.HUBSPOT_PORTAL_ID || 'not set',
        AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'not set',
        AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || 'not set',
        AIRTABLE_TABLE_ID: process.env.AIRTABLE_TABLE_ID || 'not set'
      },
      query: event.queryStringParameters
    })
  };
};