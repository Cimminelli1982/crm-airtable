const fieldsToShow = [
  { airtableField: "Name", displayName: "Name" },
  { airtableField: "Surname", displayName: "Surname" },
  { airtableField: "HubSpot ID", displayName: "HubSpot ID" },
  { airtableField: "Keep in Touch Status", displayName: "Keep in touch" },
  { airtableField: "Main Category", displayName: "Main category" },
  { airtableField: "Job title", displayName: "Job title" },
  { airtableField: "Company (string from Hubspot)", displayName: "Company" },
  { airtableField: "Keywords", displayName: "Keywords" },
  { airtableField: "Mobile phone number", displayName: "Mobile phone number" },
  { airtableField: "Phone number (from timelines)", displayName: "Phone number (from timelines)" },
  { airtableField: "Primary email", displayName: "Primary email" },
  { airtableField: "Linkedin Profile", displayName: "Linkedin" },
  { airtableField: "City", displayName: "City" },
  { airtableField: "Rating", displayName: "Rating" },
  { airtableField: "Last contact", displayName: "Last contact" },
  { airtableField: "Next Keep in touch", displayName: "Next Birthday" },
  { airtableField: "Birthday wishes", displayName: "Birthday wishes" },
  { airtableField: "Christmas wishes", displayName: "Christmas wishes" },
  { airtableField: "Easter wishes", displayName: "Easter wishes" },
  { airtableField: "Contact Airtable ID", displayName: "Contact Airtable ID" },
];

const htmlTemplate = (records, error = null, debugInfo = null) => `
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
        .debug {
          margin-top: 20px;
          padding: 10px;
          border: 1px dashed #ccc;
          background-color: #f8f9fa;
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
              ${fieldsToShow.map(({ airtableField, displayName }) => `
                <div>
                  <span class="field-name">${displayName}:</span> 
                  <span>${Array.isArray(record.fields[airtableField]) 
                    ? record.fields[airtableField].join(", ")
                    : typeof record.fields[airtableField] === "object" && record.fields[airtableField] !== null
                    ? record.fields[airtableField].label || "N/A"
                    : record.fields[airtableField] || "N/A"}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        `}
        ${debugInfo ? `
          <div class="debug">
            <h3>Debug Info</h3>
            <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        ` : ''}
      </div>
    </body>
  </html>
`;
