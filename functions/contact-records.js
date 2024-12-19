const fetch = require("node-fetch");

// Export the handler function for Netlify
exports.handler = async (event, context) => {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableId = process.env.AIRTABLE_TABLE_ID;
  const hubspotAccessToken = process.env.HUBSPOT_ACCESS_TOKEN; // Private app token

  const { contactId, action, source, recordId } = event.queryStringParameters;

  // Handle delete requests
  if (action === "delete" && source && recordId) {
    try {
      if (source === "Airtable") {
        // Delete from Airtable
        const airtableResponse = await fetch(
          `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableId}/${recordId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${airtableApiKey}`,
            },
          }
        );

        if (!airtableResponse.ok) {
          throw new Error("Failed to delete record from Airtable.");
        }
      } else if (source === "HubSpot") {
        // Delete from HubSpot
        const hubspotResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${recordId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${hubspotAccessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!hubspotResponse.ok) {
          throw new Error("Failed to delete record from HubSpot.");
        }
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

  // Main functionality: Fetch records
  if (!contactId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `<html><body><h2>Contact Name is required</h2></body></html>`,
    };
  }

  const airtableFieldsToShow = [
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

  try {
    // Fetch matching records from Airtable
    const airtableSearchUrl = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableId}?filterByFormula={Contact}="${contactId}"`;
    const airtableResponse = await fetch(airtableSearchUrl, {
      headers: { Authorization: `Bearer ${airtableApiKey}` },
    });

    if (!airtableResponse.ok) {
      throw new Error("Failed to fetch records from Airtable.");
    }

    const airtableData = await airtableResponse.json();

    const filteredAirtableRecords = airtableData.records.map((record) => {
      const filteredFields = {};
      airtableFieldsToShow.forEach(({ airtableField, displayName }) => {
        if (record.fields[airtableField]) {
          filteredFields[displayName] = record.fields[airtableField];
        }
      });
      return { source: "Airtable", fields: filteredFields, id: record.id };
    });

    // Fetch matching records from HubSpot
    const hubspotSearchUrl = `https://api.hubapi.com/crm/v3/objects/contacts/search`;
    const hubspotSearchPayload = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "firstname",
              operator: "EQ",
              value: contactId.split(" ")[0],
            },
            {
              propertyName: "lastname",
              operator: "EQ",
              value: contactId.split(" ")[1],
            },
          ],
        },
      ],
      properties: ["firstname", "lastname", "email", "phone", "hs_object_id"],
      limit: 50,
    };

    const hubspotResponse = await fetch(hubspotSearchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hubspotAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(hubspotSearchPayload),
    });

    if (!hubspotResponse.ok) {
      throw new Error("Failed to fetch records from HubSpot.");
    }

    const hubspotData = await hubspotResponse.json();

    const hubspotRecords = hubspotData.results.map((result) => ({
      source: "HubSpot",
      fields: {
        "Full Name": `${result.properties.firstname || "N/A"} ${result.properties.lastname || "N/A"}`,
        "Email": result.properties.email || "N/A",
        "Phone": result.properties.phone || "N/A",
        "HubSpot ID": result.id,
      },
      id: result.id,
    }));

    const combinedRecords = [...filteredAirtableRecords, ...hubspotRecords];

    // Render HTML
    const htmlTemplate = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f0f0f0; }
            .container { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { color: #333; margin-bottom: 20px; }
            .record { border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
            .record:hover { background-color: #f8f9fa; }
            .field-name { font-weight: bold; color: #666; }
            .delete-btn { margin-top: 10px; padding: 8px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; }
            .delete-btn:hover { background-color: #c82333; }
          </style>
          <script>
            function deleteRecord(source, recordId) {
              if (confirm("Are you sure you want to delete this record?")) {
                fetch(\`?action=delete&source=\${source}&recordId=\${recordId}\`, { method: "GET" })
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
            <h2 class="header">Matching Records for "${contactId}"</h2>
            ${combinedRecords.length
              ? combinedRecords
                  .map(
                    (record) => `
                <div class="record">
                  <div class="source">Source: ${record.source}</div>
                  ${Object.entries(record.fields)
                    .map(
                      ([key, value]) => `
                    <div>
                      <span class="field-name">${key}:</span> 
                      <span>${value}</span>
                    </div>
                  `
                    )
                    .join("")}
                  <button class="delete-btn" onclick="deleteRecord('${record.source}', '${record.id}')">Delete</button>
                </div>
              `
                  )
                  .join("")
              : "<div>No matching records found.</div>"}
          </div>
        </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: htmlTemplate,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: `<html><body><h2>Error: ${error.message}</h2></body></html>`,
    };
  }
};
