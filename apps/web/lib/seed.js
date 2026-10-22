/**
 * Demo family used until accounts arrive in Sprint 2. Matches the prototype's
 * Zawadi (6), Amani (3) and Joseph (adult learner).
 */
export const seedFamily = () => ({
  family: { parent: "Grace", plan: "Free" },
  settings: { voice: true, goal: 2, limit: 20 },
  learners: [
    {
      id: "zawadi",
      name: "Zawadi",
      birth: { year: 2020, month: 6 },
      color: "coral",
      buddy: "zip",
      outfit: { hat: "sunhat" },
      interests: ["animals", "numbers"],
      today: 1,
      minutes: 12,
      week: [20, 35, 0, 28, 18, 0, 12],
      treasures: 130,
      progress: { "counting-1-5-1": 3, "counting-1-5-2": 2 },
    },
    {
      id: "amani",
      name: "Amani",
      birth: { year: 2023, month: 3 },
      color: "sky",
      buddy: null,
      outfit: {},
      interests: ["animals"],
      today: 0,
      minutes: 0,
      week: [0, 10, 0, 8, 0, 0, 0],
      treasures: 0,
      progress: {},
    },
    {
      id: "joseph",
      name: "Joseph",
      birth: { year: 1980, month: 4 },
      color: "night",
      buddy: "kiki",
      outfit: {},
      interests: [],
      today: 0,
      minutes: 0,
      week: [30, 25, 0, 40, 20, 15, 0],
      treasures: 410,
      progress: { "counting-1-5-1": 3, "counting-1-5-2": 3, "counting-1-5-3": 3 },
    },
  ],
  waiting: [{ id: "w1", learnerId: "zawadi", text: "asked for Bedtime story of my choice" }],
  activeId: null,
});
