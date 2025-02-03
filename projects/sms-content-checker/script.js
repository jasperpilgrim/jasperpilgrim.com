import emojiRegex from "https://esm.sh/emoji-regex";

const smsContentInput = document.getElementById("smsContentInput");
const smsContentWarnings = document.getElementById("smsContentWarnings");
const smsContentHighlighted = document.getElementById("smsContentHighlighted");

const wordsToAvoid = [
  "cocaine", "kush", "ganja", "weed", "pot", "reefer", "pcp", "marijuana",
  "dope", "acid", "thc", "cash", "bonus", "spam", "deal", "free",
  "guaranteed", "urgent", "benjamins", "exclusive"
];

const phrasesToAvoid = [
  "apply now", "take action", "act now", "limited time", "call now",
  "no strings attached", "no credit check", "hey there", "hi there"
];

const charLengthLimitSpan = document.getElementById("charLengthLimit");
const segmentCountSpan = document.getElementById("segmentCount");

const warningMessages = {
  characterLimit: "<span class='warning-type'>Character Limit:</span> Special characters reduce the character limit from 160 to 70.",
  characterLimitExceeded: "<span class='warning-type'>Character Limit:</span> Message exceeds the character limit of {limit}.",
  dollarSigns: "<span class='warning-type'>Dollar Signs:</span> Use 'USD' or 'CAN'.",
  emojis: "<span class='warning-type'>Emojis:</span> May reduce deliverability rate.",
  exclamationPoints: "<span class='warning-type'>Exclamation Points:</span> Limit to one per message.",
  urlsAndAtSymbols: "<span class='warning-type'>URLs & \"@\" Symbols:</span> May increase odds of carrier filtering.",
  wordsToAvoid: "<span class='warning-type'>Words & Phrases to Avoid:</span> Do not use high-risk words or phrases (",
  uppercaseWords: "<span class='warning-type'>Uppercase Words:</span> Do not use all caps (",
};

function checkCharacterLimit(content) {
  let charLimit = 160;
  let ucs2Chars = "";
  if (/[^\x00-\x7F\n\r]/.test(content)) {
    charLimit = 70;
    ucs2Chars = content.match(/[^\x00-\x7F\n\r]/g).join("");
    return { limit: charLimit, warning: warningMessages.characterLimit };
  }
  return { limit: charLimit, warning: null };
}

function checkDollarSigns(content) {
  const dollarSignCount = content.match(/\$/g) ? content.match(/\$/g).length : 0;
  return dollarSignCount > 0 ? warningMessages.dollarSigns : null;
}

function checkEmojis(content) {
  return emojiRegex().test(content) ? warningMessages.emojis : null;
}

function checkExclamationPoints(content) {
  const exclamationCount = content.match(/!/g)?.length || 0;
  return exclamationCount > 1 ? warningMessages.exclamationPoints : null;
}

function checkUrlsAndEmails(content) {
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}\b/gi;

  if (urlRegex.test(content) || emailRegex.test(content) || content.includes("@")) {
    return warningMessages.urlsAndAtSymbols;
  }
  return null;
}

function checkWordsAndPhrasesToAvoid(content) {
  const flagged = [];
  const check = (arr) => {
    for (const item of arr) {
      const regex = new RegExp(`\\b${item}\\b`, "gi");
      if (regex.test(content) && !flagged.includes(item)) {
        flagged.push(item);
      }
    }
  };
  check(wordsToAvoid);
  check(phrasesToAvoid);
  return flagged.length > 0 ? `${warningMessages.wordsToAvoid}${flagged.join(", ")}).` : null;
}

function checkUppercaseWords(content) {
  const words = content.split(/(?=[^a-zA-Z0-9])|(?<=[^a-zA-Z0-9])/).filter((word) => !emojiRegex().test(word));
  const uppercaseWords = words.filter(word => /^[A-Z]+$/.test(word) && word.length > 1 && !wordsToAvoid.includes(word) && !phrasesToAvoid.includes(word));
  return uppercaseWords.length > 0 ? `${warningMessages.uppercaseWords}${uppercaseWords.join(", ")}).` : null;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateHighlightedContent(content) {
  let highlightedContent = escapeHtml(content);
  let exclamationCount = 0;

  const warnings = [
    { regex: /\$/g, class: 'highlighted-text' },
    { regex: emojiRegex(), class: 'highlighted-text' },
    {
      regex: /!/g, class: 'highlighted-text', shouldHighlight: () => {
        exclamationCount++;
        return exclamationCount > 1;
      }
    },
    { regex: /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi, class: 'highlighted-text' },
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}\b/gi, class: 'highlighted-text' },
    { regex: /@/g, class: 'highlighted-text' },
    { regex: new RegExp(`\\b(${[...wordsToAvoid, ...phrasesToAvoid].join('|')})\\b`, "gi"), class: 'highlighted-text' },
    { regex: /\b[A-Z]{2,}\b/g, class: 'highlighted-text' }
  ];

  warnings.forEach(warning => {
    if (warning.shouldHighlight) {
      highlightedContent = highlightedContent.replace(warning.regex, (match) => {
        return warning.shouldHighlight() ? `<span class="${warning.class}">${match}</span>` : match;
      });
    } else {
      highlightedContent = highlightedContent.replace(warning.regex, `<span class="${warning.class}">$&</span>`);
    }
  });

  return highlightedContent;
}

window.addEventListener('DOMContentLoaded', (event) => {
  segmentCountSpan.textContent = "(0)";
});

smsContentInput.addEventListener("input", () => {
  smsContentWarnings.innerHTML = "";
  const content = smsContentInput.value.trim();
  const allWarnings = [];

  const { limit, warning: lengthWarning } = checkCharacterLimit(content);
  if (lengthWarning) allWarnings.push(lengthWarning);

  const currentLength = content.length;
  const charLengthStyle = currentLength > limit ? "color: var(--dracula-red); font-weight: bold;" : "";
  charLengthLimitSpan.style.cssText = "";
  charLengthLimitSpan.innerHTML = `<span style="${charLengthStyle}">${currentLength}</span>/${limit}`;

  const segmentLength = limit === 70 ? 67 : 153;
  const segmentCount = Math.ceil(currentLength / segmentLength);

  let segmentCountValue = `(${segmentCount})`;

  if (segmentCount === 2) {
    segmentCountValue = `(<span style="color: var(--dracula-orange);">${segmentCount}</span>)`;
  } else if (segmentCount > 2) {
    segmentCountValue = `(<span style="color: var(--dracula-red); font-weight: bold;">${segmentCount}</span>)`;
  }

  segmentCountSpan.innerHTML = segmentCountValue;

  if (content.length > limit) {
    allWarnings.push(warningMessages.characterLimitExceeded.replace("{limit}", limit));
  }

  const contentWarnings = [
    checkDollarSigns(content),
    checkEmojis(content),
    checkExclamationPoints(content),
    checkUrlsAndEmails(content),
    checkWordsAndPhrasesToAvoid(content),
    checkUppercaseWords(content),
  ].filter(Boolean);

  allWarnings.push(...contentWarnings);

  if (allWarnings.length > 0) {
    smsContentWarnings.innerHTML = "<ul>" + allWarnings.map(warning => `<li class="warning">${warning}</li>`).join("") + "</ul>";
  }

  const highlightedContent = generateHighlightedContent(content);
  smsContentHighlighted.innerHTML = highlightedContent;
});