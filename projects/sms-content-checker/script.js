import emojiRegex from "https://esm.sh/emoji-regex";

const smsContent = document.getElementById("smsContent");
const warnings = document.getElementById("warnings");
const charCount = document.getElementById("charCount");
const optimizedContentDiv = document.getElementById("optimizedContent");

const wordsToAvoid = [
  "cocaine", "kush", "ganja", "weed", "pot", "reefer", "pcp", "marijuana",
  "dope", "acid", "thc", "cash", "bonus", "spam", "deal", "free",
  "guaranteed", "urgent", "benjamins", "exclusive"
];

const phrasesToAvoid = [
  "apply now", "take action", "act now", "limited time", "call now",
  "no strings attached", "no credit check", "hey there", "hi there"
];

function checkCharacterLimit(content) {
  let charLimit = 160;
  let ucs2Chars = "";
  if (/[^\x00-\x7F\n\r]/.test(content)) {
    charLimit = 70;
    ucs2Chars = content.match(/[^\x00-\x7F\n\r]/g).join("");
    return { limit: charLimit, warning: `Your message contains characters that require UCS-2 encoding (${ucs2Chars}), which reduces the character limit from 160 to 70.` };
  }
  return { limit: charLimit, warning: null };
}

function checkDollarSigns(content) {
  const dollarSignCount = (content.match(/\$/g) || []).length;
  return dollarSignCount > 0? `Dollar signs ($) are not recommended. Consider alternatives like 'USD' or 'CAN'.`: null;
}

function checkEmojis(content) {
  return emojiRegex().test(content)? `Emojis can inadvertently lead to carrier filtering.`: null;
}

function checkExclamationPoints(content) {
  const exclamationCount = (content.match(/!/g) || []).length;
  return exclamationCount > 1? `Limit the use of exclamation points to once per message.`: null;
}

function checkUrlsAndEmails(content) {
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}\b/gi;

  if (urlRegex.test(content) || emailRegex.test(content) || content.includes("@")) {
    return `"At" symbols (@) and URLs could potentially lead to carrier filtering.`;
  }
  return null;
}

function checkBannedWordsAndPhrases(content) {
  const flagged = [];
  const check = (arr) => {
    for (const item of arr) {
      const regex = new RegExp(`\\b${item}\\b`, "gi");
      if (regex.test(content) &&!flagged.includes(item)) {
        flagged.push(item);
      }
    }
  };
  check(wordsToAvoid);
  check(phrasesToAvoid);
  return flagged.length > 0? `The following words or phrases are not recommended for SMS: "${flagged.join(", ")}".`: null;
}

function checkUppercaseWords(content) {
  const words = content.split(/(?=[^a-zA-Z0-9])|(?<=[^a-zA-Z0-9])/).filter((word) =>!emojiRegex().test(word));
  const uppercaseWords = words.filter(word => /^[A-Z]+$/.test(word) && word.length > 1 &&!wordsToAvoid.includes(word) &&!phrasesToAvoid.includes(word));
  return uppercaseWords.length > 0? `The following words are in all caps: ${uppercaseWords.join(", ")} which could potentially lead to carrier filtering.`: null;
}

function optimizeContent(content) {
  let optimized = content;
  optimized = optimized.replace(emojiRegex(), "");
  optimized = optimized.replace(/!!+/g, "!");
  optimized = optimized.replace(/!/g, (match, offset, string) => offset === string.indexOf("!")? "!": ".");
  optimized = optimized.replace(/(^|\s)@(\s|$)/g, '$1at$2');

  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}\b/gi;
  optimized = optimized.replace(emailRegex, (match) => `<span class="highlighted-text">${match}</span>`);
  optimized = optimized.replace(urlRegex, '<span class="highlighted-text">$&</span>');

  const words = content.split(/(?=[^a-zA-Z0-9])|(?<=[^a-zA-Z0-9])/).filter((word) =>!emojiRegex().test(word));
  const uppercaseWords = words.filter(word => /^[A-Z]+$/.test(word) && word.length > 1 &&!wordsToAvoid.includes(word) &&!phrasesToAvoid.includes(word));
  uppercaseWords.forEach((word) => {
    optimized = optimized.replace(new RegExp(`\\b${word}\\b`, 'g'), word.toLowerCase());
  });

  return optimized;
}

smsContent.addEventListener("input", () => {
  warnings.innerHTML = "";
  const content = smsContent.value.trim();
  const allWarnings = [];

  const { limit, warning: lengthWarning } = checkCharacterLimit(content);
  if (lengthWarning) allWarnings.push(lengthWarning);

  const currentLength = content.length;
  charCount.innerHTML = `<span style="${currentLength > limit? "color: #FF5555; font-weight: bold;": ""}">${currentLength}</span>/${limit}`;

  if (content.length > limit) {
    allWarnings.push(`Your message exceeds the character limit (${limit}).`);
  }

  let optimizedContent = optimizeContent(content);

  const contentWarnings = [
    checkDollarSigns(content),
    checkEmojis(content),
    checkExclamationPoints(content),
    checkUrlsAndEmails(content),
    checkBannedWordsAndPhrases(content),
    checkUppercaseWords(content),
  ].filter(Boolean);

  allWarnings.push(...contentWarnings);

  if (allWarnings.length > 0) {
    warnings.innerHTML = "<ul>" + allWarnings.map(warning => `<li class="warning">${warning}</li>`).join("") + "</ul>";
  }

  if (optimizedContent!== content) {
    optimizedContentDiv.innerHTML = `<h2 id="heading-optimizedContent">Optimized Content</h2><blockquote>${optimizedContent}</blockquote>`;
  } else {
    optimizedContentDiv.innerHTML = '';
  }
});