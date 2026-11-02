import {
  PICTURES,
  validPictureSeq,
  pictureKey,
  afterWrongTry,
  makePictureLock,
  checkPictureLock,
  HINT_AFTER,
  SOUNDS,
  SOUND_IDS,
  isSound,
  soundLines,
  recordedCount,
  firstStepsCard,
} from "./index.js";

describe("FAM-02 picture password", () => {
  test("3 of 9 pictures, in order", () => {
    expect(PICTURES).toHaveLength(9);
    expect(validPictureSeq(["cat", "sun", "cat"])).toBe(true);
    expect(validPictureSeq(["cat", "sun"])).toBe(false);
    expect(validPictureSeq(["cat", "sun", "car"])).toBe(false);
    expect(pictureKey(["cat", "sun", "moon"])).not.toBe(pictureKey(["sun", "cat", "moon"]));
  });
  test("the lock is hashed and keeps only the first picture as a hint", async () => {
    const lock = await makePictureLock(["cat", "sun", "moon"]);
    expect(lock.hint).toBe("cat");
    expect(Object.keys(lock).sort()).toEqual(["hash", "hint", "iterations", "salt"]);
    expect(await checkPictureLock(["cat", "sun", "moon"], lock)).toBe(true);
    expect(await checkPictureLock(["sun", "cat", "moon"], lock)).toBe(false);
    await expect(makePictureLock(["cat"])).rejects.toThrow();
  });
  test("a hint after 3 wrong tries", () => {
    expect(HINT_AFTER).toBe(3);
    expect(afterWrongTry(2).hint).toBe(false);
    expect(afterWrongTry(3).hint).toBe(true);
  });
});

describe("LES-19 letter sounds", () => {
  test("a to z plus 10 digraphs", () => {
    expect(SOUNDS).toHaveLength(36);
    expect(SOUND_IDS).toEqual(expect.arrayContaining(["a", "z", "sh", "ch", "th", "ee"]));
    expect(isSound("sh")).toBe(true);
    expect(isSound("qu")).toBe(false);
  });
  test("recordings attach to every line that says that sound", () => {
    const units = [
      { items: [{ letter: "s", say: "sss" }, { letter: "a", say: "a, like in apple" }, { say: "cat" }] },
      {
        items: [
          { letter: "S", say: "sss" },
          { letter: "sh", say: "shh" },
        ],
      },
    ];
    expect(soundLines(units, { s: "M1", sh: "M2" })).toEqual([
      { text: "sss", sound: "s", media: "M1" },
      { text: "s", sound: "s", media: "M1" },
      { text: "shh", sound: "sh", media: "M2" },
      { text: "sh", sound: "sh", media: "M2" },
    ]);
    expect(recordedCount({ s: "M1", sh: "M2", nope: "x" })).toBe(2);
  });
});

describe("ONB-12 first steps", () => {
  test("only after a first lesson, until dismissed", () => {
    expect(firstStepsCard([{ lessons: 0, stars: 0 }], {})).toBeNull();
    const card = firstStepsCard(
      [
        { lessons: 1, stars: 3 },
        { lessons: 0, stars: 0 },
      ],
      {},
    );
    expect(card).toMatchObject({ lessons: 1, stars: 3 });
    expect(card.links.map((l) => [l.id, l.ready])).toEqual([
      ["lesson", true],
      ["badge", false],
      ["class", false],
      ["help", true],
    ]);
    expect(firstStepsCard([{ lessons: 1, stars: 3 }], { dismissed: true })).toBeNull();
    expect(firstStepsCard([{ lessons: 1 }], {}, { classes: true }).links[2].ready).toBe(true);
  });
});
