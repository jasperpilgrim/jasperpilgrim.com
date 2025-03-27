import libphonenumber from "https://esm.sh/google-libphonenumber@latest";

const inputNumbers = document.getElementById("inputNumbers");
const outputNumbers = document.getElementById("outputNumbers");
const copyMessage = document.getElementById("copyMessage");
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
const whitelist = ["3035552314", "9195554832", "8046657213"];

const COUNTRY_CODES = {
  "+44": "UK",
  "+33": "France",
  "+353": "Ireland",
  "+41": "Switzerland",
  "+46": "Sweden",
  "+39": "Italy",
  "+1": "US"
};

function formatNumbers() {
  let inputText = inputNumbers.value || "";
  inputText = inputText
    .replace(/\r?\n/g, " ")
    .replace(/[•*]/g, "")  // Remove bullets and asterisks
    .trim();

  // US and UK number patterns
  const usFormattedRegex = /\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g;
  const usPlainRegex = /\b1?\d{10}\b/g;
  const ukRegex = /\b(07[\d]{3}[\s-]?\d{6})\b/g;

  const candidates = [
    ...(inputText.match(usFormattedRegex) || []),
    ...(inputText.match(usPlainRegex) || []),
    ...(inputText.match(ukRegex) || [])
  ];

  const rawNumbers = new Set();  // Use Set to prevent duplicates
  for (const match of candidates) {
    let cleaned = match.replace(/[^\d+]/g, "");
    if (whitelist.includes(cleaned)) continue;

    // Handle UK numbers (starting with 07)
    if (cleaned.startsWith("07") && cleaned.length === 11) {
      cleaned = "+44" + cleaned.substring(1); // Convert 07... to +447...
    }
    // Handle US numbers
    else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      cleaned = "+" + cleaned;
    } else if (cleaned.length === 10) {
      cleaned = "+1" + cleaned;
    }
    rawNumbers.add(cleaned);
  }

  const parsedNumbers = [];
  const countryForNumber = {};

  for (const cleaned of rawNumbers) {
    let formatted = tryPhoneUtilParse(cleaned);
    if (!formatted || formatted.startsWith("Invalid:") || formatted.startsWith("Error:")) {
      formatted = tryManualRules(cleaned);
    }
    if (!formatted || formatted.startsWith("Invalid:") || formatted.startsWith("Error:")) {
      formatted = tryDefaultRegionParse(cleaned);
    }
    if (!formatted || formatted.startsWith("Invalid:") || formatted.startsWith("Error:")) continue;
    const country = detectCountry(formatted);
    parsedNumbers.push(formatted);
    countryForNumber[formatted] = country;
  }

  const showDuplicates = document.getElementById("showDuplicates")?.checked ?? true;
  let finalNumbers = [];
  let duplicatesCount = 0;

  if (showDuplicates) {
    const occurrence = {};
    finalNumbers = parsedNumbers.map(num => {
      occurrence[num] = (occurrence[num] || 0) + 1;
      return occurrence[num] > 1 ? `<span style="color:red">${num}</span>` : num;
    });
    const uniqueCountTemp = Object.keys(
      parsedNumbers.reduce((acc, num) => ((acc[num] = true), acc), {})
    ).length;
    duplicatesCount = parsedNumbers.length - uniqueCountTemp;
  } else {
    const seen = new Set();
    finalNumbers = parsedNumbers.filter(num => {
      if (seen.has(num)) return false;
      seen.add(num);
      return true;
    });
  }

  outputNumbers.innerHTML = finalNumbers.join("<br>");

  let finalPlainList = [];
  if (showDuplicates) {
    finalPlainList = parsedNumbers;
  } else {
    finalPlainList = finalNumbers.map(n => n.replace(/<\/?span[^>]*>/g, ""));
  }

  const totalCount = finalPlainList.length;
  const uniqueSet = new Set(finalPlainList);
  const uniqueCount = uniqueSet.size;
  if (!showDuplicates) {
    duplicatesCount = 0;
  }

  const counts = { US: 0, UK: 0, Ireland: 0, France: 0, Switzerland: 0, Sweden: 0, Italy: 0 };
  for (const num of uniqueSet) {
    const c = countryForNumber[num];
    if (c && counts[c] !== undefined) counts[c]++;
  }

  const summaryHTML = `
    <div class="summary-row">
      <div class="summary-item">Total (<span class="count">${totalCount}</span>)</div>
      <div class="summary-item">Unique (<span class="count">${uniqueCount}</span>)</div>
      <div class="summary-item">
        Duplicates (<span class="count">${duplicatesCount}</span>)
        <input type="checkbox" id="showDuplicates" ${showDuplicates ? "checked" : ""}>
      </div>
    </div>
    <div class="summary-row">
      ${Object.entries(counts)
      .map(([country, count]) => `
          <div class="summary-item">
            ${country === "Italy" ? "Italy-WIP" : country} (<span class="count">${count}</span>)
          </div>
        `)
      .join("")}
    </div>
  `;
  document.getElementById("summary").innerHTML = summaryHTML;
  document.getElementById("showDuplicates")?.addEventListener("change", formatNumbers);
}

async function copyToClipboard() {
  try {
    const numbers = outputNumbers.innerHTML
      .split('<br>')
      .map(num => num.replace(/<\/?span[^>]*>/g, ''))
      .filter(num => num.trim());

    const textToCopy = numbers.join('\n');

    await navigator.clipboard.writeText(textToCopy);
    copyMessage.style.display = "inline";
    outputNumbers.classList.add("copied-highlight");
    setTimeout(() => {
      copyMessage.style.display = "none";
      outputNumbers.classList.remove("copied-highlight");
    }, 1500);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

function tryPhoneUtilParse(cleaned) {
  try {
    let region;
    if (cleaned.startsWith("+39")) {
      region = "IT";
    } else if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("39") && cleaned.length >= 11 && cleaned.length <= 13) {
        region = "IT";
        cleaned = "+" + cleaned;
      } else if (cleaned.length === 10) {
        region = "US";
      }
    }
    const parsed = phoneUtil.parse(cleaned, region);
    if (phoneUtil.isPossibleNumber(parsed)) {
      return phoneUtil.format(parsed, libphonenumber.PhoneNumberFormat.E164);
    }
    return `Invalid: ${cleaned}`;
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
    const strippedPlus = cleaned.replace(/^\+/, "");
    if (strippedPlus.startsWith("353")) defaultRegion = "IE";
    else if (strippedPlus.startsWith("46")) defaultRegion = "SE";
    else if (strippedPlus.startsWith("44")) defaultRegion = "GB";
    else if (strippedPlus.startsWith("33")) defaultRegion = "FR";
    else if (strippedPlus.startsWith("41")) defaultRegion = "CH";
    else if (strippedPlus.startsWith("39")) defaultRegion = "IT";
    const parsed = phoneUtil.parse(cleaned, defaultRegion);
    if (phoneUtil.isPossibleNumber(parsed)) {
      return phoneUtil.format(parsed, libphonenumber.PhoneNumberFormat.E164);
    }
    return `Invalid: ${cleaned}`;
  } catch (error) {
    return `Invalid: ${cleaned}`;
  }
}

function detectCountry(e164) {
  if (!e164 || e164.startsWith("Invalid:") || e164.startsWith("Error:")) return "";
  return Object.entries(COUNTRY_CODES).find(([code]) => e164.startsWith(code))?.[1] || "";
}

// Event Listeners
inputNumbers.addEventListener("input", formatNumbers);
outputNumbers.addEventListener("click", copyToClipboard);
document.addEventListener("DOMContentLoaded", formatNumbers);
