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

  // Group warnings
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

  // Character count with highlighting and dynamic limit
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

  let optimizedContent = content;

  // Dollar sign check
  const dollarSignCount = (content.match(/\$/g) || []).length;
  if (dollarSignCount > 0) {
    warningGroups.content.push(
      `Dollar signs ($) are not recommended. Consider alternatives like 'USD' or 'CAN'.`
    );
  }

  // Emoji check
  if (emojiRegex().test(content)) {
    warningGroups.content.push(
      `Emojis can inadvertently lead to carrier filtering.`
    );
    // Remove emojis from optimized content
    optimizedContent = optimizedContent.replace(emojiRegex(), "");
  }

  // Exclamation point check
  optimizedContent = optimizedContent.replace(/!!+/g, "!"); // Replace multiple "!" with single "!"

  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    warningGroups.content.push(
      `Limit the use of exclamation points to once per message.`
    );

    optimizedContent = optimizedContent.replace(/!/g, (match, offset, string) =>
      (offset === string.indexOf("!") ? "!" : ".")
    );
  }

  // @ Symbol and URL check
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*\/?/gi;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}\b/g;

  if (urlRegex.test(content) || emailRegex.test(content)) {
    warningGroups.content.push(
      `"At" symbols (@) and URLs could potentially lead to carrier filtering.`
    );

    // Highlight email addresses first
    optimizedContent = optimizedContent.replace(emailRegex, (match) => `<span style="color: #FFB86C;">${match}</span>`);

    // Then highlight URLs 
    optimizedContent = optimizedContent.replace(urlRegex, '<span style="color: #FFB86C;">$&</span>');
  }

  // Replace standalone '@' symbols with 'at'
  optimizedContent = optimizedContent.replace(/(^|\s)@(\s|$)/g, '$1at$2');

  // Words and phrases to avoid
  const wordsAndPhrasesWarning = `The following words or phrases are not recommended for SMS: `;
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
  const words = content.split(/(?=[^a-zA-Z0-9])|(?<=[^a-zA-Z0-9])/).filter((word) => !emojiRegex().test(word));
  const uppercaseWords = words.filter(
    (word) =>
      /^[A-Z]+$/.test(word) &&
      word.length > 1 &&
      !wordsToAvoid.includes(word) &&
      !phrasesToAvoid.includes(word)
  );

  if (uppercaseWords.length > 0) {
    uppercaseWords.forEach((word) => {
      optimizedContent = optimizedContent.replace(new RegExp(`\\b${word}\\b`, 'g'), word.toLowerCase());
    });
  }

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
                <h3 class="warning-group-title">${group.charAt(0).toUpperCase() + group.slice(1)}</h3>
                <ul>
                  ${warningGroups[group]
          .map((warning) => `<li class="warning">${warning}</li>`)
          .join("")}
                </ul>  
              </div>
            `;
    }
  }

  // Display the optimized content + click-to-copy functionality
  let optimizedContentDiv = document.getElementById('optimizedContent');
  if (!optimizedContentDiv) {
    optimizedContentDiv = document.createElement('div');
    optimizedContentDiv.id = 'optimizedContent';
    charCount.parentNode.insertBefore(optimizedContentDiv, charCount.nextSibling);
  }

  optimizedContentDiv.innerHTML = `<p class="optimized-content"><span id="optimizedContentText"><blockquote>${optimizedContent}</blockquote></span></p>`;

  const optimizedContentText = document.getElementById('optimizedContentText');
  optimizedContentText.addEventListener('click', () => {
    const textToCopy = optimizedContentText.textContent;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        const originalHTML = optimizedContentText.innerHTML;
        optimizedContentText.innerHTML = 'Copied!';
        setTimeout(() => {
          optimizedContentText.innerHTML = originalHTML;
        }, 1000);
      });
  });
});