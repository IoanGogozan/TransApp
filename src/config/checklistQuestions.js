const questions = [
  { key: "lights_ok", text_en: "Do the lights work properly?" },
  { key: "brakes_ok", text_en: "Do the brakes seem OK?" },
  { key: "tires_ok", text_en: "Are the tires in acceptable condition?" },
  { key: "fluids_ok", text_en: "Are fluid levels acceptable?" },
  { key: "mirrors_ok", text_en: "Are mirrors and windows intact/clean?" },
  { key: "horn_ok", text_en: "Does the horn work?" },
  { key: "seatbelt_ok", text_en: "Are seatbelts functioning?" },
  { key: "damages", text_en: "Any visible damages?" },
];

const isValidQuestionKey = (key) => questions.some((q) => q.key === key);

module.exports = {
  questions,
  isValidQuestionKey,
};
