const fetch = require('node-fetch');

// Export the handler function for Netlify
exports.handler = async (event, context) => {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableId = process.env.AIRTABLE_TABLE_ID;
  const hubspotApiKey = process.env.NEW_HUBSPOT_API_KEY; // Use the new key here

  const { contactId, action, airtableId, hubspotId } = event.queryStringParameters;

  // Delete action handler
  if (action === "delete" && airtableId && hubspotId) {
    try {
      // Delete from Airtable
      const airtableResponse = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableId}/${airtableId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${airtableApiKey}`,
        },
      });
      if (!airtableResponse.ok) {
        throw new Error("Failed to delete record from Airtable.");
      }

      // Delete from HubSpot
      const hubspotResponse = await fetch(`https://api.hubapi.com/contacts/v1/contact/vid/${hubspotId}?hapikey=${hubspotApiKey}`, {
        method: "DELETE",
      });

      const hubspotResponseText = await hubspotResponse.text();
      if (!hubspotResponse.ok) {
        throw new Error(`Failed to delete record from HubSpot. Response: ${hubspotResponseText}`);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Record deleted successfully" }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: `Error deleting record: ${error.message}` }),
      };
    }
  }

  // Main record fetching and rendering logic
  const fieldsToShow = [
    { airtableField: "Name", displayName: "Name" },
    { airtableField: "Surname", displayName: "Surname" },
    { airtableField: "Last contact", displayName: "Last contact" },
    { airtableField: "Contact Airtable ID", displayName: "Contact Airtable ID" },
    { airtableField: "HubSpot ID", displayName: "HubSpot ID" },
    { airtableField: "Keep in Touch", displayName: "Keep in touch" },
    { airtableField: "Main Category", displayName: "Main category" },
    { airtableField: "Job Title", displayName: "Job title" },
    { airtableField: "Company (string from Hubspot)", displayName: "Company" },
    { airtableField: "Keywords", displayName: "Keywords" },
    { airtableField: "Mobile phone number", displayName: "Mobile phone number" },
    { airtableField: "Phone number (from timelines)", displayName: "Phone number (from timelines)" },
    { airtableField: "Primary email", displayName: "Primary email" },
    { airtableField: "Linkedin adjusted", displayName: "Linkedin" },
    { airtableField: "City", displayName: "City" },
    { airtableField: "Rating", displayName: "Rating" },
    { airtableField: "Next Keep in touch", displayName: "Next Birthday" },
    { airtableField: "Birthday wishes", displayName: "Birthday wishes" },
    { airtableField: "Christmas wishes", displayName: "Christmas wishes" },
    { airtableField: "Easter wishes", displayName: "Easter wishes" },
  ];

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
          .delete-btn {
            margin-top: 10px;
            padding: 8px 12px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .delete-btn:hover {
            background-color: #c82333;
          }
          .error {
            color: #dc3545;
            padding: 20px;
            text-align: center;
          }
        </style>
        <script>
          function deleteRecord(airtableId, hubspotId) {
            if (confirm("Are you sure you want to delete this record?")) {
              fetch(`?action=delete&airtableId=${airtableId}&hubspotId=${hubspotId}`, { method: "GET" })
                .then(response => response.json())
                .then(data => {
                  alert(data.message);
                  window.location.reload();
                })
                .catch(error => alert("Error deleting record: " + error.message));
            }
          }
        </script>
      </head>
      <body>
        <div class="container">
          ${error ? `
            <div class="error">${error}</div>
          ` : `
            <h2 class="header">Matching Records</h2>
            ${records.map(record => `
              <div class="record">
                ${fieldsToShow.map(({ airtableField, displayName }) => `
                  <div>
                    <span class="field-name">${displayName}:</span> 
                    <span>${Array.isArray(record.fields[airtableField]) 
                      ? record.fields[airtableField].join(", ") 
                      : record.fields[airtableField] || "N/A"}</span>
                  </div>
                `).join('')}
                <button class="delete-btn" onclick="deleteRecord('${record.id}', '${record.fields['HubSpot ID']}')">Delete</button>
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
      body: htmlTemplate([], 'Contact ID is required'),
    };
  }

  try {
    const searchUrl = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableId}?filterByFormula={Contact}="${contactId}"`;
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${airtableApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch records from Airtable.");
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: htmlTemplate(data.records),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: htmlTemplate([], `Error: ${error.message}`),
    };
  }
};
