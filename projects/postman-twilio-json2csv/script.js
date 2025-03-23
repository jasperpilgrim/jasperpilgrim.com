let jsonData;
let allRecords = [];
let unionKeys = [];

const fileInput = document.getElementById("jsonFileInput");
const pasteInput = document.getElementById("jsonPasteInput");
const keysContainer = document.getElementById("keysContainer");
const linksContainer = document.getElementById("linksContainer");
const toggleKeysBtn = document.getElementById("toggleKeysBtn");
const downloadLink = document.getElementById("downloadLink");

function clearFileInput() {
  fileInput.value = '';
  fileInput.blur();
}

function selectAll(checked, container) {
  const checkboxes = container.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach(cb => {
    if (cb.value !== 'select-all') {
      cb.checked = checked;
    }
  });
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
      updateButtonsState();
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
        updateButtonsState();
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(k));
      keysContainer.appendChild(label);
    });

    updateSelectAllState(keysContainer);
    updateButtonsState();
  } else {
    const p = document.createElement("p");
    p.textContent = "No keys found.";
    keysContainer.appendChild(p);
  }
  keysContainer.style.display = "none";
}

function toggleKeys() {
  keysContainer.style.display = keysContainer.style.display === "none" ? "grid" : "none";
}

function getSelectedKeys() {
  const checkboxes = keysContainer.querySelectorAll("input[type='checkbox']:not([value='select-all'])");
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
      td.setAttribute("data-label", k);
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
    const copyLink = document.getElementById('copyLink');
    if (copyLink) {
      copyLink.classList.add('copy-success');
      setTimeout(() => copyLink.classList.remove('copy-success'), 600);
    }
  }).catch(err => {
    alert("Error copying data: " + err);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  keysContainer.style.display = "none";
  fileInput.value = '';
});