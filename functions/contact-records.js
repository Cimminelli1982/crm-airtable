const fetch = require('node-fetch');

// Export the handler function for Netlify
exports.handler = async (event, context) => {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableId = process.env.AIRTABLE_TABLE_ID;

  const { contactId } = event.queryStringParameters;

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
    { airtableField: "Last contact", displayName: "Last contact" },
    { airtableField: "Next Keep in touch", displayName: "Next Birthday" },
    { airtableField: "Birthday wishes", displayName: "Birthday wishes" },
    { airtableField: "Christmas wishes", displayName: "Christmas wishes" },
    { airtableField: "Easter wishes", displayName: "Easter wishes" },
    { airtableField: "Contact Airtable ID", displayName: "Contact Airtable ID" },
  ];
