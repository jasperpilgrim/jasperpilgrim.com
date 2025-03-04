import emojiRegex from "https://esm.sh/emoji-regex";

const smsContentInput = document.getElementById("smsContentInput");
const smsContentWarnings = document.getElementById("smsContentWarnings");
const smsContentHighlighted = document.getElementById("smsContentHighlighted");
const warningsToggle = document.getElementById("smsContentWarningsToggle");

const wordsToAvoid = [
  "cocaine", "kush", "ganja", "weed", "pot", "reefer", "pcp", "marijuana",
  "dope", "acid", "thc", "cash", "bonus", "spam", "deal", "free",
  "guaranteed", "urgent", "benjamins", "exclusive"
];

const phrasesToAvoid = [
  "apply now", "take action", "act now", "limited time", "call now",
  "no strings attached", "no credit check", "hey there", "hi there"
];

const processedWordsToAvoid = wordsToAvoid.map(word =>
  word.toLowerCase() === "urgent" ? "urgent(?!\\s+care)" : word
);

const charLengthLimitSpan = document.getElementById("charLengthLimit");
const segmentCountSpan = document.getElementById("segmentCount");

const warningMessages = {
  characterLimit: "<span class='warning-type'>Emojis & Special Characters:</span> Reduces the character limit from 160 to 70",
  characterLimitExceeded: "<span class='warning-type'>Character Limit:</span> Message exceeds the character limit of {limit}.",
  dollarSigns: "<span class='warning-type'>Dollar Signs:</span> Use 'USD' or 'CAN'.",
  exclamationPoints: "<span class='warning-type'>Exclamation Points:</span> Limit to one per message.",
  urlsAndAtSymbols: "<span class='warning-type'>URLs & \"@\" Symbols:</span> May increase odds of carrier filtering.",
  wordsToAvoid: "<span class='warning-type'>Words & Phrases to Avoid:</span> Do not use high-risk words or phrases (",
  uppercaseWords: "<span class='warning-type'>Uppercase Words:</span> Do not use all caps ("
};

const dollarSignRegex = /\$/g;
const exclamationRegex = /!/g;
const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi;
const atSymbolRegex = /(?:^|\s)@(?:\s|$)/g;
const uppercaseWordsRegex = /\b[A-Z]{2,}\b/g;
const combinedAvoidRegex = new RegExp(`\\b(${[...processedWordsToAvoid, ...phrasesToAvoid].join('|')})\\b`, "gi");

const whitelist = [
  "ACLS", "ADA", "AL", "ALF", "AMA", "ANA", "AR", "ATS", "AZ", "BGC",
  "BLS", "CA", "CDC", "CM", "CMA", "CME", "CMO", "CMS", "CNA", "CNS",
  "CN", "CO", "COO", "COTA", "COVID", "CRNA", "CT", "CTO", "DC", "DE",
  "DOH", "DON", "DO", "EEOC", "EHR", "EMR", "EMT", "EOD", "EOW", "ER",
  "EVP", "FDA", "FL", "FLSA", "FMLA", "FTE", "FT", "GA", "GME", "GM",
  "HI", "HIPAA", "HR", "HRIS", "HUC", "IA", "IC", "ICU", "ID", "IL",
  "IN", "IV", "JCAHO", "KPI", "KS", "KY", "LA", "LI", "LMFT", "LMSW",
  "LOA", "LPC", "LPN", "LCSW", "LT", "LTAC", "LVN", "MA", "MD", "ME",
  "MI", "MLT", "MN", "MO", "MS", "MSP", "MT", "NC", "ND", "NDA", "NE",
  "NH", "NICU", "NJ", "NM", "NOC", "NP", "NRP", "NV", "NY", "OH", "OK",
  "OR", "OSHA", "OT", "PA", "PACU", "PALS", "PC", "PCT", "PE", "PICU",
  "PPC", "PRN", "PT", "PTO", "RD", "RFP", "RI", "RN", "RPO", "RT", "RTO",
  "SC", "SD", "SLA", "SLP", "SMB", "SNF", "SVP", "TA", "TJC", "TN",
  "TX", "UT", "VA", "VT", "VMS", "VP", "WA", "WFH", "WI", "WV", "WY",
  "YOY", "LTC", "UC", "urgent care"
].map(item => item.toLowerCase());

function checkCharacterLimit(content) {
  let charLimit = 160;
  if (/[^\x00-\x7F]/.test(content)) {
    charLimit = 70;
    const uniqueChars = new Set();
    for (let i = 0; i < content.length; i++) {
      const charCode = content.charCodeAt(i);
      if (charCode > 127) {
        const char = content.charAt(i);
        if (i + 1 < content.length) {
          const nextCharCode = content.charCodeAt(i + 1);
          if (charCode >= 0xd800 && charCode <= 0xdbff && nextCharCode >= 0xdc00 && nextCharCode <= 0xdfff) {
            uniqueChars.add(char + content.charAt(i + 1));
            i++;
            continue;
          }
        }
        uniqueChars.add(char);
      }
    }
    const specialChars = [...uniqueChars].join(", ");
    return { limit: charLimit, warning: `<span class='warning-type'>Emojis & Special Characters:</span> Reduces the character limit from 160 to 70 (${specialChars}).` };
  }
  return { limit: charLimit, warning: null };
}

function checkDollarSigns(content) {
  const count = (content.match(dollarSignRegex) || []).length;
  return count > 0 ? warningMessages.dollarSigns : null;
}

function checkExclamationPoints(content) {
  const count = (content.match(exclamationRegex) || []).length;
  return count > 1 ? warningMessages.exclamationPoints : null;
}

function checkUrlsAndEmails(content) {
  if (urlRegex.test(content) || atSymbolRegex.test(content)) {
    return warningMessages.urlsAndAtSymbols;
  }
  return null;
}

function checkWordsAndPhrasesToAvoid(content) {
  const lowercaseContent = content.toLowerCase();
  if (whitelist.some(phrase => lowercaseContent === phrase.trim())) {
    return null;
  }
  const matches = content.match(combinedAvoidRegex);
  if (!matches) {
    return null;
  }
  let flagged = [...new Set(matches.map(match => match.toLowerCase()))];
  flagged = flagged.filter(word => !whitelist.includes(word));
  if (flagged.includes("urgent")) {
    const urgentMatches = [...lowercaseContent.matchAll(/urgent(?!\s+care\b)/gi)];
    if (urgentMatches.length === 0) {
      flagged = flagged.filter(word => word !== "urgent");
    }
  }
  return flagged.length > 0 ? `${warningMessages.wordsToAvoid}${flagged.join(", ")}).` : null;
}

function checkAgainstWhitelist() {
  const content = smsContentInput.value;
  const lowercaseContent = content.toLowerCase();
  const words = content.split(/(?=[^a-zA-Z0-9])|(?<=[^a-zA-Z0-9])/).filter(word => !emojiRegex().test(word));
  const uppercaseWords = words.filter(word => uppercaseWordsRegex.test(word) && word.length > 1);
  const nonWhitelisted = uppercaseWords.filter(word => !whitelist.includes(word.toLowerCase()));
  const flagged = [...new Set(nonWhitelisted)];
  return flagged.length > 0 ? { warning: `${warningMessages.uppercaseWords}${flagged.join(", ")}).`, words: flagged } : { warning: null, words: [] };
}

function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function generateHighlightedContent(content, uppercaseWords, enabledWarningTypes) {
  let highlightedContent = escapeHtml(content);
  let exclamationCount = 0;
  const warnings = [
    { regex: dollarSignRegex, class: "highlighted-text", warningType: "dollarSigns" },
    { regex: exclamationRegex, class: "highlighted-text", warningType: "exclamationPoints", shouldHighlight: () => { exclamationCount++; return exclamationCount > 1; } },
    { regex: urlRegex, class: "highlighted-text", warningType: "urlsAndAtSymbols" },
    { regex: atSymbolRegex, class: "highlighted-text", warningType: "urlsAndAtSymbols" },
    { regex: combinedAvoidRegex, class: "highlighted-text", warningType: "wordsToAvoid" },
    { regex: /[^\x00-\x7F]/g, class: "highlighted-text", warningType: "characterLimit" }
  ];
  uppercaseWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, "g");
    warnings.push({ regex: regex, class: "highlighted-text", warningType: "uppercaseWords" });
  });
  warnings.forEach((warning) => {
    if (!enabledWarningTypes.includes(warning.warningType)) {
      return;
    }
    highlightedContent = highlightedContent.replace(warning.regex, (match) => {
      if (warning.shouldHighlight && !warning.shouldHighlight()) {
        return escapeHtml(match);
      }
      return `<span class="${warning.class}">${escapeHtml(match)}</span>`;
    });
  });
  return highlightedContent;
}

function getEnabledWarningTypes() {
  return Array.from(warningsToggle.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.dataset.warningType);
}

window.addEventListener("DOMContentLoaded", () => {
  segmentCountSpan.innerHTML = "(Segments: 0)";
  const isOpen = localStorage.getItem('warningsToggleOpen') === 'true';
  document.getElementById('warningsToggle').open = isOpen;
});

document.getElementById('warningsToggle').addEventListener('toggle', (event) => {
  localStorage.setItem('warningsToggleOpen', event.target.open);
});

smsContentInput.addEventListener("input", () => {
  smsContentWarnings.innerHTML = "";
  const content = smsContentInput.value.trim();
  const allWarnings = [];
  const { limit, warning: lengthWarning } = checkCharacterLimit(content);
  if (lengthWarning) allWarnings.push(lengthWarning);
  const currentLength = content.length;
  const charLengthStyle = currentLength > limit ? "color: #D2042D; font-weight: bold;" : "";
  charLengthLimitSpan.style.cssText = "";
  charLengthLimitSpan.innerHTML = `<span style="${charLengthStyle}">${currentLength}</span>/${limit}`;
  const segmentLength = limit === 70 ? 67 : 153;
  const segmentCount = Math.ceil(currentLength / segmentLength);
  let segmentCountValue = `(Segments: ${segmentCount})`;
  if (segmentCount === 2) {
    segmentCountValue = `(Segments: <span style="color: #FFA500;">${segmentCount}</span>)`;
  } else if (segmentCount > 2) {
    segmentCountValue = `(Segments: <span style="color: #D2042D; font-weight: bold;">${segmentCount}</span>)`;
  }
  segmentCountSpan.innerHTML = segmentCountValue;
  if (content.length > limit) {
    allWarnings.push(warningMessages.characterLimitExceeded.replace("{limit}", limit));
  }
  const uppercaseCheck = checkAgainstWhitelist();
  const uppercaseWarning = uppercaseCheck.warning;
  const uppercaseWordsToHighlight = uppercaseCheck.words;
  if (uppercaseWarning) allWarnings.push(uppercaseWarning);
  const contentWarnings = [
    checkDollarSigns(content),
    checkExclamationPoints(content),
    checkUrlsAndEmails(content),
    checkWordsAndPhrasesToAvoid(content)
  ].filter(Boolean);
  allWarnings.push(...contentWarnings);
  const enabledWarningTypes = getEnabledWarningTypes();
  const filteredWarnings = allWarnings.filter(warning => {
    const warningType = Object.keys(warningMessages).find(key => warning.includes(warningMessages[key].split(':')[0]));
    return enabledWarningTypes.includes(warningType);
  });
  if (filteredWarnings.length > 0) {
    smsContentWarnings.innerHTML = "<ul>" + filteredWarnings.map(warning => `<li class="warning">${warning}</li>`).join("") + "</ul>";
  }
  const highlightedContent = generateHighlightedContent(content, uppercaseWordsToHighlight, enabledWarningTypes);
  smsContentHighlighted.innerHTML = highlightedContent;
});

warningsToggle.addEventListener("change", (event) => {
  if (event.target.matches('input[type="checkbox"]')) {
    smsContentInput.dispatchEvent(new Event('input'));
  }
});
