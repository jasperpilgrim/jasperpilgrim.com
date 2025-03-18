let jsonData;
let allRecords = [];
let unionKeys = [];

const fileInput = document.getElementById("jsonFileInput");
const pasteInput = document.getElementById("jsonPasteInput");
const keysContainer = document.getElementById("keysContainer");
const linksContainer = document.getElementById("linksContainer");
const toggleKeysBtn = document.getElementById("toggleKeysBtn");
const downloadLink = document.getElementById("downloadLink");
const copyLink = document.getElementById("copyLink");

// Clear file input state and remove focus
function clearFileInput() {
  fileInput.value = '';
  fileInput.blur();
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
    unionKeys.forEach(k => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = k;
      checkbox.checked = (k === "phone_number" || k === "carrier.name" || k === "sid");
      checkbox.addEventListener("change", generateTable);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(k));
      keysContainer.appendChild(label);
    });
  } else {
    const p = document.createElement("p");
    p.textContent = "No keys found.";
    keysContainer.appendChild(p);
  }
  keysContainer.style.display = "none";
}

function toggleKeys() {
  if (!jsonData || allRecords.length === 0) {
    keysContainer.style.display = keysContainer.style.display === "none" ? "block" : "none";
    return;
  }

  if (keysContainer.style.display === "none") {
    keysContainer.style.display = "block";
  } else {
    keysContainer.style.display = "none";
  }
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
    updateButtonsState();
  } catch (err) {
    alert("Error parsing JSON: " + err);
    jsonData = null;
    updateButtonsState();
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

function downloadCSV() {
  if (!jsonData || allRecords.length === 0) {
    alert("No JSON data loaded!");
    return;
  }
  const selectedKeys = getSelectedKeys();
  if (selectedKeys.length === 0) {
    alert("No keys selected!");
    return;
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
  const csvContent = csvRows.join("\n");
  const csvDataUri = "data:text/csv;charset=utf-8," + csvContent;
  const encodedUri = encodeURI(csvDataUri);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// Initialize page state
document.addEventListener('DOMContentLoaded', () => {
  // Force initial state update
  keysContainer.style.display = "none";
  fileInput.value = '';
});