"""Wire the Number Mountain artwork into the Trailbuddies web app. Run from apps/web:  python ../../number-mountain-patch/apply.py  (any path works). Idempotent."""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs("public/art", exist_ok=True)
for src, dst in [
    ("number-mountain.webp", "public/art/number-mountain.webp"),
    ("number-mountain-sm.webp", "public/art/number-mountain-sm.webp"),
    ("NumberMountain.js", "components/art/NumberMountain.js"),
    ("number-mountain.spec.js", "e2e/number-mountain.spec.js"),
]:
    shutil.copyfile(os.path.join(HERE, src), dst)
    print("copied", dst)


def edit(path, pairs):
    s = open(path, encoding="utf-8").read()
    for old, new, marker in pairs:
        if marker in s:
            continue
        if old not in s:
            sys.exit(f"{path}: anchor not found:\n{old[:120]}")
        s = s.replace(old, new, 1)
    open(path, "w", encoding="utf-8", newline="\n").write(s)
    print("ok", path)


# Service worker: precache the art and serve /art/ cache-first.
edit(
    "app/sw.js/route.js",
    [
        (
            '  "/sounds/done.wav",\n];',
            '  "/sounds/done.wav",\n  "/art/number-mountain.webp",\n  "/art/number-mountain-sm.webp",\n];',
            '"/art/number-mountain.webp"',
        ),
        (
            '(url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))',
            '(\n      url.pathname.startsWith("/_next/static/") ||\n      url.pathname.startsWith("/icons/") ||\n      url.pathname.startsWith("/art/")\n    )',
            'startsWith("/art/")',
        ),
    ],
)

# World map: Numbers Mountain artwork instead of the generic island (tablet/web grid and phone list).
edit(
    "components/screens/WorldMap.js",
    [
        (
            'import Island from "@/components/art/Island";\n',
            'import Island from "@/components/art/Island";\nimport NumberMountain from "@/components/art/NumberMountain";\n',
            "import NumberMountain",
        ),
        (
            '                <Island kind={s.island} width="min(180px, 100%)" height={120} />',
            '                {s.id === "numbers" ? (\n'
            '                  <NumberMountain small width="min(240px, 100%)" />\n'
            "                ) : (\n"
            '                  <Island kind={s.island} width="min(180px, 100%)" height={120} />\n'
            "                )}",
            '<NumberMountain small width="min(240px, 100%)" />',
        ),
        (
            "            <Island kind={s.island} width={88} height={62} />",
            '            {s.id === "numbers" ? (\n'
            "              <NumberMountain small width={110} />\n"
            "            ) : (\n"
            "              <Island kind={s.island} width={88} height={62} />\n"
            "            )}",
            "<NumberMountain small width={110} />",
        ),
    ],
)

# Numbers trail: tappable mountain header and a faint mountain backdrop behind the stones.
edit(
    "components/screens/Trail.js",
    [
        (
            'import Buddy from "@/components/art/Buddy";\n',
            'import Buddy from "@/components/art/Buddy";\n'
            'import NumberMountain, { NUMBER_MOUNTAIN_SRC } from "@/components/art/NumberMountain";\n',
            "import NumberMountain",
        ),
        (
            "  const sp = subjectProgress(units, learner.progress);\n",
            "  const sp = subjectProgress(units, learner.progress);\n"
            '  const mountain = subjectId === "numbers";\n',
            'const mountain = subjectId === "numbers";',
        ),
        (
            "            px: 1,\n          }}\n        >\n          <Box\n            sx={{\n              position: \"relative\",\n"
            "              width: \"100%\",\n              maxWidth: W,\n              mx: \"auto\",\n"
            "              aspectRatio: `${W} / ${trail.height}`,\n            }}\n          >",
            "            px: 1,\n          }}\n        >\n"
            "          {mountain && (\n"
            "            <Box sx={{ maxWidth: { xs: 420, sm: 520 }, mx: \"auto\", pt: { xs: 1.5, sm: 2.5 } }}>\n"
            "              <NumberMountain peaks band={learner.band} buddy={learner.buddy} />\n"
            "            </Box>\n"
            "          )}\n"
            "          <Box\n            sx={{\n              position: \"relative\",\n"
            "              width: \"100%\",\n              maxWidth: W,\n              mx: \"auto\",\n"
            "              aspectRatio: `${W} / ${trail.height}`,\n"
            "              ...(mountain && {\n"
            "                \"&::before\": {\n"
            "                  content: '\"\"',\n"
            "                  position: \"absolute\",\n"
            "                  inset: 0,\n"
            "                  backgroundImage: `url(${NUMBER_MOUNTAIN_SRC})`,\n"
            "                  backgroundRepeat: \"repeat-y\",\n"
            "                  backgroundSize: \"100% auto\",\n"
            "                  backgroundPosition: \"center 40px\",\n"
            "                  opacity: 0.08,\n"
            "                  filter: \"blur(1px)\",\n"
            "                  pointerEvents: \"none\",\n"
            "                },\n"
            "              }),\n"
            "            }}\n          >",
            "NUMBER_MOUNTAIN_SRC})`",
        ),
    ],
)

# Trail side panel: stay in view under the sticky header while the page scrolls to the next
# stone (the mountain header made the page taller, which pushed the panel off screen).
edit(
    "components/screens/Trail.js",
    [
        (
            '          component="aside"\n          sx={{\n            display: { xs: "none", sm: "flex" },\n',
            '          component="aside"\n          sx={{\n            display: { xs: "none", sm: "flex" },\n'
            '            position: "sticky",\n'
            "            top: 74, // LearnerShell header height on tablet and web\n"
            '            alignSelf: "flex-start",\n'
            '            height: "calc(100dvh - 74px)",\n'
            '            overflowY: "auto",\n',
            "top: 74, // LearnerShell",
        ),
    ],
)
