let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const searchTerm = word.toLowerCase();

  return notes.filter((note) =>
    note.text.toLowerCase().includes(searchTerm)
  );
}

// 3. Finding the note with the most characters
function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

// 4. Counting notes by category
function countByCategory() {
  const counts = {};

  for (const note of notes) {
    if (!counts[note.category]) {
      counts[note.category] = 0;
    }

    counts[note.category]++;
  }

  return counts;
}

// 5. Creating a summary sentence
function getSummary() {
  const counts = countByCategory();
  const noteWord = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

// 6. Checking whether a note is already a duplicate
function isDuplicate(text) {
  const cleanedText = text.trim().toLowerCase();

  return notes.some(
    (note) => note.text.trim().toLowerCase() === cleanedText
  );
}

// 7. Adding a note if it passes all validation rules
function addNote(text, category) {
  const cleanedText = text.trim();
  const validCategories = ["personal", "work", "study"];

  if (cleanedText.length < 1 || cleanedText.length > 200) {
    console.log("❌ Note rejected: text must be 1-200 characters.");
    return false;
  }

  if (isDuplicate(cleanedText)) {
    console.log("❌ Note rejected: duplicate note.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log("❌ Note rejected: category must be personal, work, or study.");
    return false;
  }

  const newNote = {
    id: Date.now(),
    text: cleanedText,
    category: category,
  };

  notes.push(newNote);

  console.log(`✅ Added: "${newNote.text}"`);
  return true;
}

// --------------------------------------------------
// TESTS
// --------------------------------------------------

// searchNotes - normal case
console.log(searchNotes("javascript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

// searchNotes - edge case: no match
console.log(searchNotes("pizza"));
// Expected: []

// longestNote - normal case
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

// longestNote - edge case: empty array
const savedNotesForLongestTest = notes;
notes = [];
console.log(longestNote());
// Expected: null
notes = savedNotesForLongestTest;

// countByCategory - normal case
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

// countByCategory - edge case: empty array
const savedNotesForCountTest = notes;
notes = [];
console.log(countByCategory());
// Expected: {}
notes = savedNotesForCountTest;

// getSummary - normal case
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

// getSummary - edge case: exactly one note
const savedNotesForSummaryTest = notes;
notes = [
  { id: 99, text: "One note only", category: "personal" },
];
console.log(getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."
notes = savedNotesForSummaryTest;

// isDuplicate - normal case
console.log(isDuplicate("  buy MILK and bread  "));
// Expected: true

// isDuplicate - edge case: completely new text
console.log(isDuplicate("Walk the dog"));
// Expected: false

// addNote - normal case: valid new note
console.log(addNote("Learn the DOM", "study"));
// Expected: true

// addNote - edge case: duplicate note
console.log(addNote("  learn THE dom  ", "study"));
// Expected: false

// addNote - edge case: invalid category
console.log(addNote("Plan weekend activities", "shopping"));
// Expected: false