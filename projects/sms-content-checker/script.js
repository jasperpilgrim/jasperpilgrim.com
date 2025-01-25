import emojiRegex from "https://esm.sh/emoji-regex";

const smsContent = document.getElementById("smsContent");
const warnings = document.getElementById("warnings");
const charCount = document.getElementById("charCount");

const wordsToAvoid = [
  "cocaine",
  "kush",
  "ganja",
  "weed",
  "pot",
  "reefer",
  "pcp",
  "marijuana",
  "dope",
  "acid",
  "thc",
  "cash",
  "bonus",
  "spam",
  "deal",
  "free",
  "guaranteed",
  "urgent",
  "benjamins",
  "exclusive"
];

const phrasesToAvoid = [
  "apply now",
  "take action",
  "act now",
  "limited time",
  "call now",
  "no strings attached",
  "no credit check",
  "hey there",
  "hi there"
];

smsContent.addEventListener("input", () => {
  warnings.innerHTML = "";
  const content = smsContent.value.trim();

  // Detect GSM-7 vs UCS-2 encoding
  let charLimit = 160; // Default to GSM-7
  let encodingWarning = "";
  if (/[^\x00-\x7F\n\r]/.test(content)) {
    // Check for non-GSM-7 characters
    charLimit = 70; // Switch to UCS-2
    encodingWarning =
      "Your message contains characters that require UCS-2 encoding. This reduces the character limit to 70.";
  }

  // Character count with highlighting and dynamic Limit
  const currentLength = content.length;
  charCount.innerHTML = `
      <span style="${currentLength > charLimit ? "color: red; font-weight: bold;" : ""
    }">${currentLength}</span>/${charLimit}
    `;

  // Group warnings
  const warningGroups = {
    length: [],
    content: [],
    formatting: []
  };

  // Length check
  if (content.length > charLimit && charLimit === 160) {
    // Only warn if exceeding GSM-7 limit
    warningGroups.length.push(
      "Your message exceeds the recommended maximum of 160 characters. Please consider shortening it."
    );
  }

  // Emoji check
  if (emojiRegex().test(content)) {
    warningGroups.content.push(
      "Emojis can inadvertently lead to carrier filtering. Please consider removing them."
    );
  }

  // Exclamation point check
  if ((content.match(/!/g) || []).length > 1) {
    warningGroups.formatting.push(
      "Please limit the use of exclamation points to once per message."
    );
  }

  // @ Symbol and URL check
  const urlRegex = /[@]|(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi;
  if (urlRegex.test(content)) {
    warningGroups.formatting.push(
      '"At" symbols (@) and URLs could potentially lead to carrier filtering.'
    );
  }

  // Words and phrases to avoid
  const checkWordsAndPhrases = (arr, message) => {
    for (const item of arr) {
      const regex = new RegExp(`\\b${item}\\b`, "gi");
      if (regex.test(content)) {
        warningGroups.content.push(
          `${message} "${item}" is not recommended for SMS. Please consider using an alternative.`
        );
      }
    }
  };

  checkWordsAndPhrases(wordsToAvoid, "The word");
  checkWordsAndPhrases(phrasesToAvoid, "The phrase");

  // $ Symbol check
  if (content.includes("$")) {
    warningGroups.formatting.push(
      "Dollar signs ($) are not recommended. Please use alternatives like 'USD' or 'CAN'"
    );
  }

  // Uppercase word check
  const words = content.split(/\s+/).filter((word) => !emojiRegex().test(word));
  const uppercaseWords = [
    ...new Set(
      words.filter(
        (word) =>
          /^[A-Z]+$/.test(word) &&
          word.length > 1 &&
          !wordsToAvoid.includes(word.toLowerCase()) &&
          !phrasesToAvoid.includes(word.toLowerCase())
      )
    )
  ];

  if (uppercaseWords.length > 0) {
    warningGroups.formatting.push(
      `The following words are in all caps: ${uppercaseWords.join(
        ", "
      )} which could potentially lead to carrier filtering.`
    );
  }

  // Display grouped warnings
  for (const group in warningGroups) {
    if (warningGroups[group].length > 0) {
      warnings.innerHTML += `
            <div class="warning-group">
              <h3 class="warning-group-title">${group.charAt(0).toUpperCase() + group.slice(1)
        }:</h3>
              ${warningGroups[group]
          .map((warning) => `<p class="warning">${warning}</p>`)
          .join("")}
            </div>
          `;
    }
  }
  if (encodingWarning) {
    warnings.innerHTML += `<div class="warning-group"><p class="warning">${encodingWarning}</p></div>`;
  }
});
