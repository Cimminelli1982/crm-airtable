const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableId = process.env.AIRTABLE_TABLE_ID;

  const { contactId } = event.queryStringParameters;

  const htmlTemplate = (records, error = null) => `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f0f0f0;
          }
          .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            color: #333;
            margin-bottom: 20px;
          }
          .record {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
          }
          .record:hover {
            background-color: #f8f9fa;
          }
          .field-name {
            font-weight: bold;
            color: #666;
          }
          .error {
            color: #dc3545;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${error ? `
            <div class="error">${error}</div>
          ` : `
            <h2 class="header">Matching Records</h2>
            ${records.map(record => `
              <div class="record">
                ${Object.entries(record.fields).map(([key, value]) => `
                  <div>
                    <span class="field-name">${key}:</span> 
                    <span>${value}</span>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          `}
        </div>
      </body>
    </html>
  `;

  if (!contactId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: htmlTemplate([], 'Contact ID is required')
    };
  }

  try {
    // Query Airtable for records matching the Contact field
    const searchUrl = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableId}?filterByFormula={Contact}="${contactId}"`;
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch records from Airtable');
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: htmlTemplate(data.records)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: htmlTemplate([], `Error: ${error.message}`)
    };
  }
};