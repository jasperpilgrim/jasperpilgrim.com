import libphonenumber from "https://esm.sh/google-libphonenumber@latest";

const inputNumbers = document.getElementById("inputNumbers");
const outputContainer = document.getElementById("outputContainer");
const outputNumbers = document.getElementById("outputNumbers");
const copyMessage = document.getElementById("copyMessage");
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

const whitelist = ["3035552314", "9195554832", "8046657213"];

function formatNumbers() {
  // The regex matches either a US pattern or an Italian pattern.
  // US pattern: e.g. (201) 228-3739 with optional spaces or dashes.
  // Italian pattern: e.g. +39 340 778 6455 or 39 340 778 6455.
  const candidateRegex = /(?:(?:\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})|(?:\+?39[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{4}))/g;
  const inputText = inputNumbers.value;
  const candidates = inputText.match(candidateRegex) || [];
  const rawNumbers = [];
  candidates.forEach(candidate => {
    let cleaned = candidate.replace(/[^\d+]/g, "");
    if (whitelist.includes(cleaned)) return;
    if (cleaned.startsWith("++")) {
      cleaned = cleaned.replace(/^\++/, "+");
    }
    rawNumbers.push(cleaned);
  });
  const formattedNumbers = [];
  const countryForNumber = {};
  rawNumbers.forEach(cleaned => {
    let formatted = tryPhoneUtilParse(cleaned);
    if (!formatted || formatted.startsWith("Invalid:") || formatted.startsWith("Error:")) {
      formatted = tryManualRules(cleaned);
    }
    if (!formatted || formatted.startsWith("Invalid:") || formatted.startsWith("Error:")) {
      formatted = tryDefaultRegionParse(cleaned);
    }
    if (formatted.startsWith("Invalid:") || formatted.startsWith("Error:")) return;
    const country = detectCountry(formatted);
    formattedNumbers.push(formatted);
    countryForNumber[formatted] = country;
  });
  let occurrence = {};
  const lines = formattedNumbers.map(num => {
    occurrence[num] = (occurrence[num] || 0) + 1;
    return occurrence[num] > 1 ? `<span style="color:red">${num}</span>` : num;
  });
  outputNumbers.innerHTML = lines.join("<br>");
  const totalCount = formattedNumbers.length;
  const uniqueNumbers = Object.keys(formattedNumbers.reduce((acc, num) => (acc[num] = true, acc), {}));
  const uniqueCount = uniqueNumbers.length;
  const duplicatesCount = totalCount - uniqueCount;
  const counts = { US: 0, UK: 0, Ireland: 0, France: 0, Switzerland: 0, Sweden: 0, Italy: 0 };
  uniqueNumbers.forEach(num => {
    const c = countryForNumber[num];
    if (c && counts[c] !== undefined) counts[c]++;
  });
  let summaryHTML = `
    <div class="summary-row">
      <div class="summary-item">Total (<span class="count">${totalCount}</span>)</div>
      <div class="summary-item">Unique (<span class="count">${uniqueCount}</span>)</div>
      <div class="summary-item">Duplicates (<span class="count">${duplicatesCount}</span>)</div>
    </div>
    <div class="summary-row">
      <div class="summary-item">US (<span class="count">${counts["US"]}</span>)</div>
      <div class="summary-item">UK (<span class="count">${counts["UK"]}</span>)</div>
      <div class="summary-item">Ireland (<span class="count">${counts["Ireland"]}</span>)</div>
      <div class="summary-item">France (<span class="count">${counts["France"]}</span>)</div>
      <div class="summary-item">Switzerland (<span class="count">${counts["Switzerland"]}</span>)</div>
      <div class="summary-item">Sweden (<span class="count">${counts["Sweden"]}</span>)</div>
      <div class="summary-item">Italy (<span class="count">${counts["Italy"]}</span>)</div>
    </div>
  `;
  document.getElementById("summary").innerHTML = summaryHTML;
}

function copyToClipboard() {
  const range = document.createRange();
  range.selectNode(outputNumbers);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  document.execCommand("copy");
  window.getSelection().removeAllRanges();
  copyMessage.style.display = "inline";
  setTimeout(() => {
    copyMessage.style.display = "none";
  }, 3000);
}

outputNumbers.addEventListener("click", copyToClipboard);
window.formatNumbers = formatNumbers;

function tryPhoneUtilParse(cleaned) {
  try {
    let region;
    if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("39") && cleaned.length === 12) {
        region = "IT";
        cleaned = "+" + cleaned;
      } else if (cleaned.length === 10) {
        region = "US";
      }
    }
    const parsed = phoneUtil.parse(cleaned, region);
    if (phoneUtil.isPossibleNumber(parsed)) {
      return phoneUtil.format(parsed, libphonenumber.PhoneNumberFormat.E164);
    } else {
      return `Invalid: ${cleaned}`;
    }
  } catch (e) {
    return `Invalid: ${cleaned}`;
  }
}

function tryManualRules(cleaned) {
  if (cleaned.length === 10 && cleaned.startsWith("08")) return `+353${cleaned.slice(1)}`;
  if (cleaned.length === 11 && cleaned.startsWith("07")) return `+44${cleaned.slice(1)}`;
  if (cleaned.length === 10 && cleaned.startsWith("07")) return `+46${cleaned.slice(1)}`;
  const swissMatch = cleaned.match(/^(?:\+41|41)(\d{9})$/);
  if (swissMatch) return `+41${swissMatch[1]}`;
  if (cleaned.length === 10 && cleaned.startsWith("0") && !cleaned.startsWith("07") && !cleaned.startsWith("08")) return `+33${cleaned.slice(1)}`;
  if (cleaned.length === 12 && cleaned.startsWith("44")) return `+${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("33")) return `+${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("353")) return `+${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("46")) return `+${cleaned}`;
  if (cleaned.startsWith("+39") && cleaned.length === 13) return cleaned;
  if (cleaned.length === 12 && cleaned.startsWith("39")) return `+${cleaned}`;
  return `Invalid: ${cleaned}`;
}

function tryDefaultRegionParse(cleaned) {
  try {
    let defaultRegion = "US";
    if (cleaned.startsWith("353")) defaultRegion = "IE";
    else if (cleaned.startsWith("46")) defaultRegion = "SE";
    else if (cleaned.startsWith("44")) defaultRegion = "GB";
    else if (cleaned.startsWith("33")) defaultRegion = "FR";
    else if (cleaned.startsWith("41")) defaultRegion = "CH";
    else if (cleaned.startsWith("39")) defaultRegion = "IT";
    const parsed = phoneUtil.parse(cleaned, defaultRegion);
    if (phoneUtil.isPossibleNumber(parsed)) {
      return phoneUtil.format(parsed, libphonenumber.PhoneNumberFormat.E164);
    } else {
      return `Invalid: ${cleaned}`;
    }
  } catch (error) {
    return `Invalid: ${cleaned}`;
  }
}

function detectCountry(e164) {
  if (!e164 || e164.startsWith("Invalid:") || e164.startsWith("Error:")) return "";
  if (e164.startsWith("+44")) return "UK";
  if (e164.startsWith("+33")) return "France";
  if (e164.startsWith("+353")) return "Ireland";
  if (e164.startsWith("+41")) return "Switzerland";
  if (e164.startsWith("+46")) return "Sweden";
  if (e164.startsWith("+39")) return "Italy";
  if (e164.startsWith("+1")) return "US";
  return "";
}

document.addEventListener("DOMContentLoaded", formatNumbers);
