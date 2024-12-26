const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  // ... [previous code remains the same until the htmlTemplate] ...

  // This is where we update the HTML template with the new JavaScript
  const htmlTemplate = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #f0f0f0; }
          .container { display: flex; }
          .column { flex: 1; margin-right: 20px; }
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
                  if (data.error) {
                    throw new Error(data.error);
                  }
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
          <div class="column">
            <h2>Airtable Records</h2>
            ${filteredAirtableRecords.length
              ? filteredAirtableRecords
                  .map(
                    (record) => `
                <div class="record">
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
                  <button class="delete-btn" onclick="deleteRecord('Airtable', '${record.id}')">Delete</button>
                </div>
              `
                  )
                  .join("")
              : "<div>No Airtable records found.</div>"}
          </div>
          <div class="column">
            <h2>HubSpot Records</h2>
            ${hubspotRecords.length
              ? hubspotRecords
                  .map(
                    (record) => `
                <div class="record">
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
                  <button class="delete-btn" onclick="deleteRecord('HubSpot', '${record.id}')">Delete</button>
                </div>
              `
                  )
                  .join("")
              : "<div>No HubSpot records found.</div>"}
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: htmlTemplate,
  };

};