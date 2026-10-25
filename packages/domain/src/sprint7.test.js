import {
  UNDO_DAYS,
  purgeDate,
  undoDaysLeft,
  overdueRemovals,
  needsSignedForm,
  signedFormProblems,
  consentState,
  scrubText,
  scrubPath,
  scrubEvent,
  scrubCrumb,
  flagOn,
  DEMO_FLAGS,
  compareVersions,
  unseenReleases,
  RELEASES,
  visibleRange,
  nodesNear,
  chooseClip,
} from "./index.js";

describe("FAM-03 removal undo window", () => {
  const at = "2030-01-01T10:00:00.000Z";
  test("a removed learner is deleted 7 days later", () => {
    expect(UNDO_DAYS).toBe(7);
    expect(purgeDate(at).toISOString()).toBe("2030-01-08T10:00:00.000Z");
    expect(purgeDate(null)).toBeNull();
  });
  test("days left count down and never go negative", () => {
    expect(undoDaysLeft(at, new Date("2030-01-01T11:00:00Z"))).toBe(7);
    expect(undoDaysLeft(at, new Date("2030-01-07T11:00:00Z"))).toBe(1);
    expect(undoDaysLeft(at, new Date("2030-02-01T00:00:00Z"))).toBe(0);
  });
  test("overdue removals", () => {
    const list = [
      { id: "a", removing_at: at },
      { id: "b", removing_at: "2030-01-05T00:00:00Z" },
      { id: "c" },
    ];
    expect(overdueRemovals(list, new Date("2030-01-09T00:00:00Z")).map((l) => l.id)).toEqual(["a"]);
  });
});

describe("ONB-06b signed consent", () => {
  test("only US families sign the form", () => {
    expect(needsSignedForm("us-coppa")).toBe(true);
    expect(needsSignedForm("kenya-dpa")).toBe(false);
    expect(needsSignedForm(null)).toBe(false);
  });
  test("the signature must be the parent's full name", () => {
    const ok = { parent_name: "Grace Miller", signature: " grace  MILLER ", relationship: "parent" };
    expect(signedFormProblems(ok)).toEqual([]);
    expect(signedFormProblems({ ...ok, signature: "GM" })).toEqual(["signature"]);
    expect(signedFormProblems({ ...ok, parent_name: "Grace", signature: "Grace" })).toEqual(["name"]);
    expect(signedFormProblems({ ...ok, relationship: "" })).toEqual(["relationship"]);
  });
  test("consent states", () => {
    expect(consentState(null)).toBe("none");
    expect(consentState({ status: "pending" })).toBe("pending");
    expect(consentState({ status: "rejected" })).toBe("rejected");
    expect(consentState({})).toBe("approved");
  });
});

describe("SAF-07 scrubbing", () => {
  test("names, emails, media and signed links are removed", () => {
    const text =
      "Failed for Amani at https://app.example/play/x?learner=1 loading https://a.r2.cloudflarestorage.com/media/1?X-Amz-Signature=2 " +
      "blob:https://app/9 mum@mail.com token=abc";
    const out = scrubText(text, ["Amani", "", "A"]);
    expect(out).not.toMatch(/Amani|mail\.com|abc|cloudflarestorage|blob:|learner=1/);
    expect(out).toContain("[child]");
    expect(out).toContain("https://app.example/play/x");
    expect(scrubText("Ann and Annabel", ["Ann", "Annabel"])).toBe("[child] and [child]");
  });
  test("paths lose their query and are kept short", () => {
    expect(scrubPath("/play/lesson/counting-1-5?learner=Amani#x")).toBe("/play/lesson/counting-1-5");
    expect(scrubPath("/" + "a".repeat(200))).toHaveLength(80);
  });
  test("Sentry events keep no user, extras, request data or DOM breadcrumbs", () => {
    const e = scrubEvent(
      {
        user: { id: 1 },
        extra: { a: 1 },
        request: { url: "https://x/y?token=1", cookies: "c" },
        message: "Amani crashed",
        exception: {
          values: [{ value: "at /media/1?sig=2", stacktrace: { frames: [{ vars: { n: "Amani" } }] } }],
        },
        breadcrumbs: [
          { category: "ui.click", message: "button Amani" },
          { category: "navigation", message: "/play?x=1", data: { from: "a" } },
        ],
      },
      ["Amani"],
    );
    expect(e.user).toBeUndefined();
    expect(e.extra).toBeUndefined();
    expect(e.request).toEqual({ url: "https://x/y" });
    expect(e.message).toBe("[child] crashed");
    expect(e.exception.values[0].value).not.toContain("sig=2");
    expect(e.exception.values[0].stacktrace.frames[0].vars).toBeUndefined();
    expect(e.breadcrumbs[0]).toBeNull();
    expect(e.breadcrumbs[1].data).toBeUndefined();
    expect(scrubCrumb({ category: "console", message: "hi" })).toBeNull();
  });
});

describe("OPS-06 flags", () => {
  test("missing and unknown flags are off", () => {
    expect(flagOn(null, "beta-feedback")).toBe(false);
    expect(flagOn({ "beta-feedback": true }, "beta-feedback")).toBe(true);
    expect(flagOn({ x: "yes" }, "x")).toBe(false);
    expect(flagOn(DEMO_FLAGS, "beta-faq")).toBe(true);
  });
});

describe("OFF-06 what's new", () => {
  test("versions compare by number", () => {
    expect(compareVersions("0.10.0", "0.9.9")).toBe(1);
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("0.6.2", "0.7.0")).toBe(-1);
  });
  test("only releases after the last one seen, up to this version", () => {
    const r = [
      { version: "0.8.0", notes: [] },
      { version: "0.7.0", notes: [] },
      { version: "0.6.0", notes: [] },
    ];
    expect(unseenReleases("0.6.0", "0.7.0", r).map((x) => x.version)).toEqual(["0.7.0"]);
    expect(unseenReleases(null, "0.7.0", r)).toEqual([]);
    expect(unseenReleases("0.7.0", "0.7.0", r)).toEqual([]);
    expect(RELEASES[0].notes.length).toBeGreaterThan(0);
  });
});

describe("MAP-05 virtual trail", () => {
  test("only stones near the viewport are mounted", () => {
    const r = visibleRange({ count: 120, itemSize: 100, start: 2000, viewport: 800, overscan: 2 });
    expect(r).toEqual({ from: 18, to: 30 });
    expect(r.to - r.from).toBeLessThan(20);
  });
  test("clamped at both ends", () => {
    expect(visibleRange({ count: 10, itemSize: 100, start: 0, viewport: 800 })).toEqual({ from: 0, to: 10 });
    expect(visibleRange({ count: 120, itemSize: 100, start: 99999, viewport: 800 })).toEqual({
      from: 120,
      to: 120,
    });
    expect(visibleRange({ count: 0, itemSize: 100, start: 0, viewport: 800 })).toEqual({ from: 0, to: 0 });
  });
});

describe("MAP-05 trail window", () => {
  const nodes = Array.from({ length: 120 }, (_, i) => ({ id: `n${i}`, y: i * 100 }));
  test("stones near the window plus the ones that must stay", () => {
    const near = nodesNear(nodes, { top: 3000, bottom: 4000, margin: 200, keep: ["n0", "n119"] });
    expect(near.map((n) => n.id)).toEqual([
      "n0",
      ...Array.from({ length: 15 }, (_, i) => `n${28 + i}`),
      "n119",
    ]);
  });
});

describe("LES-18 recordings first", () => {
  const parent = new Map([["daisy", "blob:mum-daisy"]]);
  const pack = new Map([["vp-daisy", "/voice/daisy.mp3"]]);
  test("a grown-up's recording beats the voice pack, which beats the device voice", () => {
    expect(chooseClip(" Daisy ", "vp-daisy", { parent, pack })).toBe("blob:mum-daisy");
    expect(chooseClip("Rose", "vp-daisy", { parent, pack })).toBe("/voice/daisy.mp3");
    expect(chooseClip("Rose", undefined, { parent, pack })).toBeNull();
  });
});
