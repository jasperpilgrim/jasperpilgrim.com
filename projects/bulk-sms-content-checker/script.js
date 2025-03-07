import Papa from "https://cdn.skypack.dev/papaparse";
import emojiRegex from "https://esm.sh/emoji-regex";

const columnsToExclude = [
  "account_sid",
  "api_version",
  "date_created",
  "date_updated",
  "direction",
  "messaging_service_sid",
  "num_media",
  "price",
  "price_unit",
  "subresource_uris",
  "uri",
  "ApiVersion",
  "AccountSid",
  "Direction",
  "Price",
  "PriceUnit",
  "ShortenedLinkEnabled",
  "ShortenedLinkFirstClicked"
];

const wordsToAvoid = [
  "cocaine", "kush", "ganja", "weed", "pot", "reefer", "pcp", "marijuana",
  "dope", "acid", "thc", "cash", "bonus", "spam", "deal", "free",
  "guaranteed", "urgent", "benjamins", "exclusive"
];

const phrasesToAvoid = [
  "apply now", "take action", "act now", "limited time", "call now",
  "no strings attached", "no credit check", "hey there", "hi there"
];

function checkEmojisAndSpecialCharacters(content) {
  if (/[^\x00-\x7F]/.test(content)) {
    return { type: "emojisAndSpecialCharacters", message: "Emojis & Special Characters: Reduces the character limit from 160 to 70" };
  }
  return null;
}

function checkCharacterLimitExceeded(content) {
  let limit = 160;
  if (/[^\x00-\x7F]/.test(content)) {
    limit = 70;
  }
  if (content.length > limit) {
    return { type: "characterLimit", message: `Character Limit: Message exceeds the character limit of ${limit}.` };
  }
  return null;
}

const processedWordsToAvoid = wordsToAvoid.map(word =>
  word.toLowerCase() === "urgent" ? "urgent(?!\\s+care)" : word
);

const warningMessages = {
  emojisAndSpecialCharacters: "Emojis & Special Characters: Reduces the character limit from 160 to 70",
  characterLimit: "Character Limit: Message exceeds the character limit of {limit}.",
  dollarSigns: "Dollar Signs: Use 'USD' or 'CAN'.",
  exclamationPoints: "Exclamation Points: Limit to one per message.",
  urlsAndAtSymbols: "URLs & \"@\" Symbols: May increase odds of carrier filtering.",
  wordsToAvoid: "Words & Phrases to Avoid: Do not use high-risk words or phrases (",
  uppercaseWords: "Uppercase Words: Do not use all caps ("
};

const dollarSignRegex = /\$/g;
const exclamationRegex = /!/g;
const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi;
const atSymbolRegex = /(?:^|\s)@(?:\s|$)/g;
const uppercaseWordsRegex = /\b[A-Z]{2,}\b/g;
const combinedAvoidRegex = new RegExp(`\\b(${[...processedWordsToAvoid, ...phrasesToAvoid].join("|")})\\b`, "gi");

const whitelist = [
  "acls", "ada", "al", "alf", "ama", "ana", "ar", "ats", "az", "bgc",
  "bls", "ca", "cdc", "cm", "cma", "cme", "cmo", "cms", "cna", "cns",
  "cn", "co", "coo", "cota", "covid", "crna", "ct", "cto", "dc", "de",
  "doh", "don", "do", "eeoc", "ehr", "emr", "emt", "eod", "eow", "er",
  "evp", "fda", "fl", "flsa", "fmla", "fte", "ft", "ga", "gme", "gm",
  "hi", "hipaa", "hr", "hris", "huc", "ia", "ic", "icu", "id", "il",
  "in", "iv", "jcaho", "kpi", "ks", "ky", "la", "li", "lmft", "lmsw",
  "loa", "lpc", "lpn", "lcsw", "lt", "ltac", "lvn", "ma", "md", "me",
  "mi", "mlt", "mn", "mo", "ms", "msp", "mt", "nc", "nd", "nda", "ne",
  "nh", "nicu", "nj", "nm", "noc", "np", "nrp", "nv", "ny", "oh", "ok",
  "or", "osha", "ot", "pa", "pacu", "pals", "pc", "pct", "pe", "picu",
  "ppc", "prn", "pt", "pto", "rd", "rfp", "ri", "rn", "rpo", "rt", "rto",
  "sc", "sd", "sla", "slp", "smb", "snf", "stop", "start", "svp", "ta",
  "tjc", "tn", "tx", "ut", "va", "vt", "vms", "vp", "wa", "wfh", "wi",
  "wv", "wy", "yoy", "ltc", "uc", "urgent care", "ak"
];

function convertToCSV(data) {
  const array = [Object.keys(data[0])].concat(data);
  return array.map(row => {
    return Object.values(row).map(value => {
      let str = String(value).replace(/"/g, '""');
      if (str.search(/("|,|\n)/g) >= 0) {
        str = `"${str}"`;
      }
      return str;
    }).join(",");
  }).join("\n");
}

function getEnabledWarningTypes() {
  const toggles = document.querySelectorAll(".warning-toggle");
  return Array.from(toggles).filter(toggle => toggle.checked).map(toggle => toggle.dataset.warningType);
}

function checkDollarSigns(content) {
  const count = (content.match(dollarSignRegex) || []).length;
  return count > 0 ? { type: "dollarSigns", message: warningMessages.dollarSigns } : null;
}

function checkExclamationPoints(content) {
  const count = (content.match(exclamationRegex) || []).length;
  return count > 1 ? { type: "exclamationPoints", message: warningMessages.exclamationPoints } : null;
}

function checkUrlsAndEmails(content) {
  if (urlRegex.test(content) || atSymbolRegex.test(content)) {
    return { type: "urlsAndAtSymbols", message: warningMessages.urlsAndAtSymbols };
  }
  return null;
}

function checkWordsAndPhrasesToAvoid(content) {
  const lowercaseContent = content.toLowerCase();
  if (whitelist.some(phrase => lowercaseContent === phrase.trim())) {
    return null;
  }
  const matches = content.match(combinedAvoidRegex);
  if (!matches) return null;
  let flagged = [...new Set(matches.map(match => match.toLowerCase()))];
  flagged = flagged.filter(word => !whitelist.includes(word));
  if (flagged.includes("urgent")) {
    const urgentMatches = [...lowercaseContent.matchAll(/urgent(?!\s+care\b)/gi)];
    if (urgentMatches.length === 0) {
      flagged = flagged.filter(word => word !== "urgent");
    }
  }
  return flagged.length > 0 ? { type: "wordsToAvoid", message: `${warningMessages.wordsToAvoid}${flagged.join(", ")}).` } : null;
}

function checkAgainstWhitelistForBulk(content) {
  const words = content.split(/(?=[^a-zA-Z0-9])|(?<=[^a-zA-Z0-9])/).filter(word => !emojiRegex().test(word));
  const uppercaseWords = words.filter(word => uppercaseWordsRegex.test(word) && word.length > 1);
  const nonWhitelisted = uppercaseWords.filter(word => !whitelist.includes(word.toLowerCase()));
  const flagged = [...new Set(nonWhitelisted)];
  return flagged.length > 0 ? { type: "uppercaseWords", message: `${warningMessages.uppercaseWords}${flagged.join(", ")}).` } : null;
}

function processMessage(message, enabledWarningTypes) {
  const warnings = [];
  const emojisCheck = checkEmojisAndSpecialCharacters(message);
  if (emojisCheck && enabledWarningTypes.includes("emojisAndSpecialCharacters")) {
    warnings.push(emojisCheck);
  }
  const limitCheck = checkCharacterLimitExceeded(message);
  if (limitCheck && enabledWarningTypes.includes("characterLimit")) {
    warnings.push(limitCheck);
  }
  const dollarWarning = checkDollarSigns(message);
  if (dollarWarning && enabledWarningTypes.includes(dollarWarning.type)) {
    warnings.push(dollarWarning);
  }
  const exclamationWarning = checkExclamationPoints(message);
  if (exclamationWarning && enabledWarningTypes.includes(exclamationWarning.type)) {
    warnings.push(exclamationWarning);
  }
  const urlWarning = checkUrlsAndEmails(message);
  if (urlWarning && enabledWarningTypes.includes(urlWarning.type)) {
    warnings.push(urlWarning);
  }
  const wordsWarning = checkWordsAndPhrasesToAvoid(message);
  if (wordsWarning && enabledWarningTypes.includes(wordsWarning.type)) {
    warnings.push(wordsWarning);
  }
  const uppercaseCheck = checkAgainstWhitelistForBulk(message);
  if (uppercaseCheck && enabledWarningTypes.includes(uppercaseCheck.type)) {
    warnings.push(uppercaseCheck);
  }
  return warnings;
}

function excludeColumnsFromLog(log) {
  const newLog = {};
  for (const key in log) {
    if (!columnsToExclude.includes(key)) {
      newLog[key] = log[key];
    }
  }
  return newLog;
}

function openTableInNewWindow(processedLogs) {
  const newWin = window.open("", "_blank");
  newWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bulk SMS Content Checker Output</title>
      <style>
        body {
          font-family: sans-serif;
          margin: 1rem;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          font-size: 0.8rem;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 0.5rem;
          text-align: left;
          vertical-align: top;
        }
        thead {
          background: #f9f9f9;
        }
        .has-warnings {
          background-color: #ffe6e6;
        }
        td[data-label="body"],
        td[data-label="Body"] {
          max-width: 400px;
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        @media only screen and (max-width: 800px) {
          table, thead, tbody, tr, th, td {
            display: block;
          }
          tr {
            margin-bottom: 1rem;
            border: 1px solid #ccc;
            padding: 0.5rem;
          }
          th {
            display: none;
          }
          td {
            border: none;
            padding: 0.5rem 0;
            position: relative;
            padding-left: 45%;
            text-align: left;
            word-wrap: break-word;
            white-space: normal;
          }
          td:before {
            content: attr(data-label);
            position: absolute;
            left: 0;
            width: 40%;
            padding-left: 0.5rem;
            font-weight: bold;
            white-space: nowrap;
          }
        }
      </style>
    </head>
    <body>
      <h2>Bulk SMS Content Checker Output</h2>
      <table>
        <thead>
          <tr></tr>
        </thead>
        <tbody></tbody>
      </table>
    </body>
    </html>
  `);
  newWin.document.close();
  if (!processedLogs.length) return;
  const doc = newWin.document;
  const theadRow = doc.querySelector("thead tr");
  const tbody = doc.querySelector("tbody");
  const headers = Object.keys(processedLogs[0]);
  headers.forEach(header => {
    const th = doc.createElement("th");
    th.textContent = header;
    theadRow.appendChild(th);
  });
  processedLogs.forEach(row => {
    const tr = doc.createElement("tr");
    if (row.Warnings && row.Warnings !== "No Warnings") {
      tr.classList.add("has-warnings");
    }
    headers.forEach(header => {
      const td = doc.createElement("td");
      td.setAttribute("data-label", header);
      td.textContent = row[header];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function processLogs(logs) {
  logs = logs.map(excludeColumnsFromLog);
  const enabledWarningTypes = getEnabledWarningTypes();
  let totalWarningsCount = 0;
  const warningTypeCounts = {};
  const filteredLogs = logs.filter(row => {
    const status = (row.Status || row.status || "").toLowerCase();
    return status !== "receiving" && status !== "received";
  });
  const processedLogs = filteredLogs.map(log => {
    const message = log.body || "";
    const warnings = processMessage(message, enabledWarningTypes);
    warnings.forEach(w => {
      totalWarningsCount++;
      warningTypeCounts[w.type] = (warningTypeCounts[w.type] || 0) + 1;
    });
    return {
      ...log,
      Warnings: warnings.length ? [...new Set(warnings.map(w => w.type))].join(" | ") : "No Warnings"
    };
  });
  let summaryHtml = `<p>Total warnings found: ${totalWarningsCount}</p>`;
  summaryHtml += `<table class="summary-table">`;
  summaryHtml += `<thead><tr><th>Warning Type</th><th>Count</th></tr></thead>`;
  summaryHtml += `<tbody>`;
  for (const [type, count] of Object.entries(warningTypeCounts)) {
    summaryHtml += `<tr><td>${type}</td><td>${count}</td></tr>`;
  }
  summaryHtml += `</tbody></table>`;
  document.getElementById("summaryInfo").innerHTML = summaryHtml;
  if (processedLogs.length) {
    const csv = convertToCSV(processedLogs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.getElementById("downloadLink");
    downloadLink.href = url;
    downloadLink.style.display = "inline-block";
    const viewTableLink = document.getElementById("viewTableLink");
    viewTableLink.style.display = "inline-block";
    viewTableLink.onclick = e => {
      e.preventDefault();
      openTableInNewWindow(processedLogs);
    };
  }
}

function parseCSV(csvText) {
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (result.errors.length) {
    console.error("CSV parse errors:", result.errors);
    alert("Error parsing CSV file. See console for details.");
    return [];
  }
  const data = result.data.map(row => {
    const bodyVal = row.Body || row.body || "";
    delete row.Body;
    delete row.body;
    return { ...row, body: bodyVal };
  });
  return data;
}

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", () => {
  if (!fileInput.files.length) {
    alert("No file selected.");
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const extension = (file.name.split(".").pop() || "").toLowerCase();
      if (extension === "json") {
        const parsed = JSON.parse(e.target.result);
        const logs = Array.isArray(parsed.messages) ? parsed.messages : (Array.isArray(parsed) ? parsed : null);
        if (!logs) {
          alert("Invalid JSON format. Expected an array of log objects or an object with a 'messages' array.");
          return;
        }
        processLogs(logs);
      } else if (extension === "csv") {
        const csvText = e.target.result;
        const logs = parseCSV(csvText);
        if (!logs.length) return;
        processLogs(logs);
      } else {
        alert("Unsupported file format. Please upload a .json or .csv file.");
      }
    } catch (error) {
      console.error(error);
      alert("Error processing file. Please ensure it is valid JSON or CSV.");
    }
  };
  reader.readAsText(file);
});
