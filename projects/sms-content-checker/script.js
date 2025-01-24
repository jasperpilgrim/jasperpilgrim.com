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

  // Group warnings  (Moved to the beginning)
  const warningGroups = {
    length: [],
    content: [],
  };

  // Detect GSM-7 vs UCS-2 encoding
  let charLimit = 160; // Default to GSM-7
  let ucs2Chars = "";
  if (/[^\x00-\x7F\n\r]/.test(content)) {
    charLimit = 70; // Switch to UCS-2
    // Find all non-GSM-7 characters
    ucs2Chars = content.match(/[^\x00-\x7F\n\r]/g).join("");
    warningGroups.length.push(
      `Your message contains characters that require UCS-2 encoding (${ucs2Chars}), which reduces the character limit from 160 to 70.`
    );
  }

  // Character count with highlighting and dynamic Limit
  const currentLength = content.length;
  charCount.innerHTML = `
      <span style="${currentLength > charLimit ? "color: #FF5555; font-weight: bold;" : ""
    }">${currentLength}</span>/${charLimit}
    `;

  // Length check
  if (content.length > charLimit) {
    warningGroups.length.push(
      `Your message exceeds the character limit (${charLimit}).`
    );
  }

  // Emoji check
  if (emojiRegex().test(content)) {
    warningGroups.content.push(
      "Emojis can inadvertently lead to carrier filtering."
    );
  }

  // Exclamation point check
  if ((content.match(/!/g) || []).length > 1) {
    warningGroups.content.push(
      "Limit the use of exclamation points to once per message."
    );
  }

  // @ Symbol and URL check
  const urlRegex = /[@]|(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi;
  if (urlRegex.test(content)) {
    warningGroups.content.push(
      '"At" symbols (@) and URLs could potentially lead to carrier filtering.'
    );
  }

  // Words and phrases to avoid
  const wordsAndPhrasesWarning = "The following words or phrases are not recommended for SMS: ";
  let flaggedWordsAndPhrases = [];

  const checkWordsAndPhrases = (arr) => {
    for (const item of arr) {
      const regex = new RegExp(`\\b${item}\\b`, "gi");
      if (regex.test(content) && !flaggedWordsAndPhrases.includes(item)) {
        flaggedWordsAndPhrases.push(item);
      }
    }
  };

  checkWordsAndPhrases(wordsToAvoid);
  checkWordsAndPhrases(phrasesToAvoid);

  if (flaggedWordsAndPhrases.length > 0) {
    warningGroups.content.push(
      `${wordsAndPhrasesWarning} "${flaggedWordsAndPhrases.join(", ")}".`
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
    warningGroups.content.push(
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
});