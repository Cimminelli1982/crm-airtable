// ... (keep all the previous code until the hubspotRecords HTML section)

// Update the HTML template section for HubSpot records to include merge functionality:
```javascript
<div class="column">
  <h2>HubSpot Records</h2>
  ${hubspotRecords.length > 1 ? `
    <button class="merge-btn" onclick="mergeRecords()">Merge Selected Records</button>
  ` : ''}
  ${hubspotRecords.length
    ? hubspotRecords
        .map(
          (record) => `
      <div class="record">
        <input type="checkbox" class="merge-checkbox" value="${record.id}" onchange="updateMergeSelection(this)">
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
```

// Add these styles to the existing style section:
```css
.merge-btn {
  margin-bottom: 20px;
  padding: 8px 12px;
  background-color: #0077cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.merge-btn:hover {
  background-color: #005fa3;
}
.merge-checkbox {
  margin: 10px;
}
```

// Add this JavaScript to handle merging:
```javascript
<script>
  let selectedRecords = [];

  function updateMergeSelection(checkbox) {
    if (checkbox.checked) {
      selectedRecords.push(checkbox.value);
    } else {
      selectedRecords = selectedRecords.filter(id => id !== checkbox.value);
    }
  }

  function mergeRecords() {
    if (selectedRecords.length < 2) {
      alert('Please select at least 2 records to merge');
      return;
    }
    
    if (confirm("Are you sure you want to merge these records? This action cannot be undone.")) {
      fetch(`?action=merge&records=${selectedRecords.join(',')}&contactId=${contactId}`, { 
        method: "GET"
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          alert(data.message);
          window.location.reload();
        })
        .catch(error => alert("Error merging records: " + error.message));
    }
  }
</script>
```

// Add this new action handler in the main function:
```javascript
// Inside the try block, after checking for delete action:
if (action === 'merge') {
  const recordsToMerge = event.queryStringParameters.records.split(',');
  
  if (recordsToMerge.length < 2) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'At least 2 records are required for merging' })
    };
  }

  // Get the first record as primary
  const primaryRecord = recordsToMerge[0];
  const secondaryRecords = recordsToMerge.slice(1);

  try {
    // Merge the contacts in HubSpot
    const mergeResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/merge',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hubspotAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          primaryObjectId: primaryRecord,
          objectIdToMerge: secondaryRecords[0]
        })
      }
    );

    if (!mergeResponse.ok) {
      throw new Error('Failed to merge HubSpot records');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Records merged successfully' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
}
```