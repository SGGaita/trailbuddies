import { HELP_TOPICS, HELP_ARTICLES, searchHelp, helpFor } from "./index.js";

describe("HLP-01 help articles", () => {
  test("every topic the story names has articles, and ids are unique", () => {
    const topics = HELP_TOPICS.map((t) => t.id);
    expect(topics).toEqual(["start", "lessons", "rewards", "privacy", "billing", "offline"]);
    for (const t of topics) expect(HELP_ARTICLES.some((a) => a.topic === t)).toBe(true);
    expect(new Set(HELP_ARTICLES.map((a) => a.id)).size).toBe(HELP_ARTICLES.length);
    expect(HELP_ARTICLES.length).toBeGreaterThanOrEqual(15);
  });
  test("search finds by title, keyword and text, best first", () => {
    expect(searchHelp("offline")[0].id).toBe("offline");
    expect(searchHelp("grandma").map((a) => a.id)).toContain("invite-grown-up");
    expect(searchHelp("phonics")[0].id).toBe("letter-sounds");
    expect(searchHelp("")).toEqual([]);
    expect(searchHelp("zzzz")).toEqual([]);
  });
  test("a screen's ? opens its article", () => {
    expect(helpFor("/family/create").id).toBe("make-lesson");
    expect(helpFor("/play")).toBeNull();
  });
});
