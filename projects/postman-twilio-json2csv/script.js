let jsonData;
let allRecords = [];
let unionKeys = [];
let viewWindow = null;

const fileInput = document.getElementById("jsonFileInput");
const pasteInput = document.getElementById("jsonPasteInput");
const keysContainer = document.getElementById("keysContainer");
const linksContainer = document.getElementById("linksContainer");
const toggleKeysBtn = document.getElementById("toggleKeysBtn");
const downloadLink = document.getElementById("downloadLink");
const viewLink = document.getElementById("viewLink");

function clearFileInput() {
  fileInput.value = '';
  fileInput.blur();
}

function selectAll(checked, container, isViewWindow = false) {
  const checkboxes = container.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach(cb => {
    if (cb.value !== 'select-all') {
      cb.checked = checked;
      if (!isViewWindow) {
        // Update the view window checkbox if it exists
        if (viewWindow && !viewWindow.closed) {
          const viewCheckbox = viewWindow.document.querySelector(`input[type="checkbox"][value="${cb.value}"]`);
          if (viewCheckbox) {
            viewCheckbox.checked = checked;
          }
        }
      } else {
        // Update the main window checkbox
        const mainCheckbox = document.querySelector(`input[type="checkbox"][value="${cb.value}"]`);
        if (mainCheckbox) {
          mainCheckbox.checked = checked;
        }
      }
    }
  });
  if (!isViewWindow && viewWindow && !viewWindow.closed) {
    // Update view window's select all checkbox
    const viewSelectAll = viewWindow.document.querySelector('input[value="select-all"]');
    if (viewSelectAll) {
      viewSelectAll.checked = checked;
    }
  }
  if (viewWindow && !viewWindow.closed) {
    updateView();
  }
}

function updateSelectAllState(container) {
  const selectAllCheckbox = container.querySelector("input[value='select-all']");
  if (!selectAllCheckbox) return;
  
  const checkboxes = container.querySelectorAll("input[type='checkbox']:not([value='select-all'])");
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  selectAllCheckbox.checked = allChecked;
}

function flattenObject(obj, parentKey = "", res = {}) {
  for (let key in obj) {
    const newKey = parentKey ? parentKey + "." + key : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      flattenObject(obj[key], newKey, res);
    } else {
      res[newKey] = obj[key];
    }
  }
  return res;
}

function updateKeysUI() {
  const keysSet = new Set();
  allRecords.forEach(record => {
    Object.keys(record).forEach(k => {
      keysSet.add(k);
    });
  });
  unionKeys = Array.from(keysSet);
  unionKeys.sort();
  
  keysContainer.innerHTML = "";
  if (unionKeys.length > 0) {
    const p = document.createElement("p");
    p.textContent = "Select keys to include:";
    keysContainer.appendChild(p);

    const selectAllLabel = document.createElement("label");
    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.value = "select-all";
    selectAllCheckbox.addEventListener("change", () => {
      selectAll(selectAllCheckbox.checked, keysContainer);
    });
    selectAllLabel.appendChild(selectAllCheckbox);
    selectAllLabel.appendChild(document.createTextNode("Select All"));
    selectAllLabel.style.fontWeight = "bold";
    keysContainer.appendChild(selectAllLabel);

    unionKeys.forEach(k => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = k;
      checkbox.checked = (k === "phone_number" || k === "carrier.name" || k === "sid");
      checkbox.addEventListener("change", () => {
        updateSelectAllState(keysContainer);
        updateView();
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(k));
      keysContainer.appendChild(label);
    });

    updateSelectAllState(keysContainer);
  } else {
    const p = document.createElement("p");
    p.textContent = "No keys found.";
    keysContainer.appendChild(p);
  }
  keysContainer.style.display = "none";
}

function toggleKeys() {
  keysContainer.style.display = keysContainer.style.display === "none" ? "block" : "none";
}

function getSelectedKeys() {
  const checkboxes = keysContainer.querySelectorAll("input[type='checkbox']");
  let selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selected.push(cb.value);
  });
  if (selected.includes("phone_number")) {
    selected = selected.filter(k => k !== "phone_number");
    selected.unshift("phone_number");
  }
  return selected;
}

function parseJSONInput(jsonText) {
  try {
    jsonData = JSON.parse(jsonText);
    allRecords = [];
    if (jsonData.results && Array.isArray(jsonData.results)) {
      jsonData.results.forEach(result => {
        if (result.allTests && Array.isArray(result.allTests)) {
          result.allTests.forEach(item => {
            for (const key in item) {
              try {
                const recordObj = JSON.parse(key);
                if (recordObj.incoming_phone_numbers && Array.isArray(recordObj.incoming_phone_numbers)) {
                  recordObj.incoming_phone_numbers.forEach(phone => {
                    const merged = Object.assign({}, recordObj, phone);
                    delete merged.incoming_phone_numbers;
                    const flatRecord = flattenObject(merged);
                    allRecords.push(flatRecord);
                  });
                } else {
                  const flatRecord = flattenObject(recordObj);
                  allRecords.push(flatRecord);
                }
              } catch (e) {}
            }
          });
        }
      });
    } else {
      alert("No 'results' array found in JSON.");
      jsonData = null;
    }
    updateKeysUI();
    if (viewWindow && !viewWindow.closed) {
      updateView();
    }
  } catch (err) {
    alert("Error parsing JSON: " + err);
    jsonData = null;
  }
}

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    pasteInput.value = evt.target.result;
    parseJSONInput(evt.target.result);
  };
  reader.readAsText(file);
});

pasteInput.addEventListener("input", e => {
  parseJSONInput(e.target.value);
});

function generateTable() {
  const outputArea = document.getElementById("outputArea");
  outputArea.innerHTML = "";
  const selectedKeys = getSelectedKeys();
  if (selectedKeys.length === 0) return;
  const table = document.createElement("table");
  table.className = "main-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const numTh = document.createElement("th");
  numTh.textContent = "#";
  headerRow.appendChild(numTh);
  selectedKeys.forEach(k => {
    const th = document.createElement("th");
    th.textContent = k;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  allRecords.forEach((record, i) => {
    const tr = document.createElement("tr");
    const numTd = document.createElement("td");
    numTd.textContent = i + 1;
    tr.appendChild(numTd);
    selectedKeys.forEach(k => {
      const td = document.createElement("td");
      td.textContent = record[k] !== undefined ? (record[k] === null ? "null" : record[k]) : "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  outputArea.appendChild(table);
}

function clearTable() {
  document.getElementById("outputArea").innerHTML = "";
}

function updateButtonsState() {
  if (jsonData && allRecords.length > 0 && unionKeys.length > 0) {
    generateTable();
  } else {
    clearTable();
  }
}

function generateCSV() {
    if (!jsonData || allRecords.length === 0) {
        alert("No JSON data loaded!");
        return '';
    }
    const selectedKeys = getSelectedKeys();
    if (selectedKeys.length === 0) {
        alert("No keys selected!");
        return '';
    }
    const csvRows = [];
    csvRows.push(selectedKeys.join(","));
    allRecords.forEach(record => {
        const row = selectedKeys.map(k => {
            let val = record[k];
            if (val === undefined) {
                val = "undefined";
            } else if (val === null) {
                val = "null";
            }
            if (typeof val === "string" && (val.includes(",") || val.includes("\""))) {
                val = "\"" + val.replace(/"/g, "\"\"") + "\"";
            }
            return val;
        });
        csvRows.push(row.join(","));
    });
    return csvRows.join("\n");
}

function downloadCSV() {
  const csvContent = generateCSV();
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'postman-twilio-JSON2CSV_output.csv');
  a.click();
  window.URL.revokeObjectURL(url);
}

function updateView() {
    if (!viewWindow || viewWindow.closed) {
        return;
    }

    const selectedKeys = getSelectedKeys();
    const existingKeysContainer = viewWindow.document.querySelector('.keys-container');
    const keysVisible = existingKeysContainer ? existingKeysContainer.style.display === 'grid' : false;

    // Clear the view window's content
    viewWindow.document.body.innerHTML = '';

    // Create and append header
    const headerRow = viewWindow.document.createElement('div');
    headerRow.className = 'header-row';
    
    const title = viewWindow.document.createElement('h2');
    title.textContent = 'Postman/Twilio - JSON 2 CSV Output';
    headerRow.appendChild(title);
    viewWindow.document.body.appendChild(headerRow);

    // Create and append controls
    const controlsRow = viewWindow.document.createElement('div');
    controlsRow.className = 'controls-row';

    const toggleKeysBtn = viewWindow.document.createElement('a');
    toggleKeysBtn.className = 'toggle-keys-btn';
    toggleKeysBtn.textContent = 'Show/Hide Keys';
    toggleKeysBtn.href = '#';
    toggleKeysBtn.onclick = (e) => {
        e.preventDefault();
        const keysContainer = viewWindow.document.querySelector('.keys-container');
        if (keysContainer) {
            keysContainer.style.display = keysContainer.style.display === 'none' ? 'grid' : 'none';
        }
    };

    const downloadLink = viewWindow.document.createElement('a');
    downloadLink.className = 'download-link';
    downloadLink.textContent = 'Download CSV';
    downloadLink.href = '#';
    downloadLink.onclick = (e) => {
        e.preventDefault();
        const csvContent = generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = viewWindow.URL.createObjectURL(blob);
        const a = viewWindow.document.createElement('a');
        a.href = url;
        a.download = 'output.csv';
        a.click();
        viewWindow.URL.revokeObjectURL(url);
    };

    controlsRow.appendChild(toggleKeysBtn);
    controlsRow.appendChild(downloadLink);
    viewWindow.document.body.appendChild(controlsRow);

    // Create and append keys container
    const keysContainer = viewWindow.document.createElement('div');
    keysContainer.className = 'keys-container';
    keysContainer.style.display = keysVisible ? 'grid' : 'none';

    const keysTitle = viewWindow.document.createElement('p');
    keysTitle.textContent = 'Select keys to include:';
    keysContainer.appendChild(keysTitle);

    const selectAllLabel = viewWindow.document.createElement('label');
    const selectAllCheckbox = viewWindow.document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.value = 'select-all';
    selectAllCheckbox.addEventListener('change', () => {
      selectAll(selectAllCheckbox.checked, keysContainer, true);
    });
    selectAllLabel.appendChild(selectAllCheckbox);
    selectAllLabel.appendChild(viewWindow.document.createTextNode('Select All'));
    selectAllLabel.style.fontWeight = 'bold';
    keysContainer.appendChild(selectAllLabel);

    unionKeys.forEach(key => {
        const label = viewWindow.document.createElement('label');
        const checkbox = viewWindow.document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = key;
        checkbox.checked = selectedKeys.includes(key);
        checkbox.addEventListener('change', () => {
            const mainCheckbox = document.querySelector(`input[type="checkbox"][value="${key}"]`);
            if (mainCheckbox) {
                mainCheckbox.checked = checkbox.checked;
            }
            updateSelectAllState(keysContainer);
            updateView();
        });
        label.appendChild(checkbox);
        label.appendChild(viewWindow.document.createTextNode(key));
        keysContainer.appendChild(label);
    });

    updateSelectAllState(keysContainer);
    viewWindow.document.body.appendChild(keysContainer);

    // Create table or message
    if (!selectedKeys.length) {
        const messageContainer = viewWindow.document.createElement('div');
        messageContainer.style.textAlign = 'center';
        messageContainer.style.padding = '2rem';
        messageContainer.style.backgroundColor = '#f9f9f9';
        messageContainer.style.border = '1px solid #ccc';
        messageContainer.style.borderRadius = '4px';
        messageContainer.style.margin = '1rem';
        messageContainer.textContent = 'Please select at least one key to display data';
        viewWindow.document.body.appendChild(messageContainer);
        return;
    }

    // Create and append table with data
    const table = viewWindow.document.createElement('table');
    const thead = viewWindow.document.createElement('thead');
    const headerRow2 = viewWindow.document.createElement('tr');
    
    selectedKeys.forEach(key => {
        const th = viewWindow.document.createElement('th');
        th.textContent = key;
        headerRow2.appendChild(th);
    });
    
    thead.appendChild(headerRow2);
    table.appendChild(thead);
    
    const tbody = viewWindow.document.createElement('tbody');
    allRecords.forEach((record, index) => {
        const tr = viewWindow.document.createElement('tr');
        
        selectedKeys.forEach(key => {
            const td = viewWindow.document.createElement('td');
            td.setAttribute('data-label', key);
            td.textContent = record[key] !== undefined ? (record[key] === null ? "null" : record[key]) : "";
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    viewWindow.document.body.appendChild(table);
}

function viewInBrowser() {
    if (!jsonData || allRecords.length === 0) {
        alert("No JSON data loaded!");
        return;
    }
    const selectedKeys = getSelectedKeys();
    if (selectedKeys.length === 0) {
        alert("No keys selected!");
        return;
    }

    if (viewWindow && !viewWindow.closed) {
        viewWindow.focus();
        return;
    }

    viewWindow = window.open('', '_blank');
    viewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Postman/Twilio - JSON 2 CSV Output | Jasper Pilgrim</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="/styles/postman-twilio-json2csv.css">
        </head>
        <body class="view-window">
        </body>
        </html>
    `);
    viewWindow.document.close();
    updateView();

    viewWindow.addEventListener('beforeunload', () => {
        viewWindow = null;
    });
}

function copyToClipboard() {
  if (!jsonData || allRecords.length === 0) {
    alert("No CSV data available!");
    return;
  }
  const selectedKeys = getSelectedKeys();
  if (selectedKeys.length === 0) {
    alert("No keys selected!");
    return;
  }
  const csvRows = [];
  csvRows.push(selectedKeys.join("\t"));
  allRecords.forEach(record => {
    const row = selectedKeys.map(k => {
      let val = record[k];
      if (val === undefined) {
        val = "undefined";
      } else if (val === null) {
        val = "null";
      }
      if (typeof val === "string") {
        val = val.replace(/\t/g, " ");
      }
      return val;
    });
    csvRows.push(row.join("\t"));
  });
  const csvText = csvRows.join("\n");
  navigator.clipboard.writeText(csvText).then(() => {
    alert("CSV data copied to clipboard!");
  }).catch(err => {
    alert("Error copying data: " + err);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  keysContainer.style.display = "none";
  fileInput.value = '';
});