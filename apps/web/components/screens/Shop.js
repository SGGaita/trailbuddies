"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { economy, buddyLine } from "@trailbuddies/content";
import { createEvent } from "@trailbuddies/sync";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { speak } from "@/lib/speech";
import { playSound } from "@/lib/sounds";
import { OUTFITS } from "@/lib/art";
import LearnerShell from "@/components/shell/LearnerShell";
import Buddy from "@/components/art/Buddy";
import Loading from "@/components/Loading";

const TABS = ["hat", "eyes", "neck", "mine"];
const ITEMS = economy.shop.filter((i) => OUTFITS[i.id]).map((i) => ({ ...i, name: OUTFITS[i.id].name }));
const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** An outfit drawn on its own for the item card (same art the buddy wears). */
function ItemArt({ id, size = 120 }) {
  const it = byId[id];
  const svg = OUTFITS[id].svg({ hatY: it.slot === "hat" ? 92 : 0, eyeY: 60, neckY: 60, headW: 104 });
  return (
    <svg
      viewBox="0 0 200 120"
      width={size}
      height={(size * 120) / 200}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Saving goal (the "wish" from the shop): progress toward an item. */
export function SavingGoal({ learner, compact = false }) {
  const it = learner.wish && byId[learner.wish];
  if (!it || learner.owned.includes(it.id)) return null;
  const have = Math.min(learner.treasures, it.price);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: compact ? 160 : 220 }}>
      <Typography sx={{ fontWeight: 800, fontSize: compact ? 13 : 15 }}>
        {t("shop.savingFor", { item: it.name })} · {have} / {it.price}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={(have / it.price) * 100}
        aria-label={t("shop.savingFor", { item: it.name })}
        sx={{ height: 8, borderRadius: 1, bgcolor: colors.sand, "& .MuiLinearProgress-bar": { bgcolor: colors.sky.main } }}
      />
    </Box>
  );
}

/**
 * C18 Buddy shop (RWD-05, RWD-02, BUD-09): try things on, buy with treasures (stars are
 * never spent), wear them everywhere, or save up for something.
 */
export default function Shop() {
  const ready = useHydrated();
  const learner = useLearner();
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  const record = useFamily((s) => s.record);
  const updateLearner = useFamily((s) => s.updateLearner);
  const router = useRouter();
  const [tab, setTab] = useState("hat");
  const [tryOn, setTryOn] = useState(/** @type {string | null} */ (null));
  const [dialog, setDialog] = useState(/** @type {null | "buy" | "need"} */ (null));
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  if (!ready || !learner) return <Loading />;

  const say = (text) => speak(text, { band: learner.band, buddy: learner.buddy, enabled: voice });
  const items = tab === "mine" ? learner.owned.map((id) => byId[id]).filter(Boolean) : ITEMS.filter((i) => i.slot === tab);
  const sel = tryOn && byId[tryOn];
  const owned = sel && learner.owned.includes(sel.id);
  const wearing = sel && learner.outfit[sel.slot] === sel.id;
  const preview = { ...learner.outfit, ...(sel ? { [sel.slot]: sel.id } : {}) };
  const need = sel ? sel.price - learner.treasures : 0;

  const pick = (it) => {
    setTryOn(it.id);
    say(`${it.name}! ${it.price} treasures.`);
  };
  const buy = () => {
    if (need > 0) {
      setDialog("need");
      return say(buddyLine("shop.need-more", { n: need }, 0, learner.buddy));
    }
    setDialog("buy");
  };
  const confirmBuy = () => {
    record([createEvent("treasure_spent", learner.id, { amount: sel.price, itemId: sel.id, kind: "outfit" })]);
    updateLearner(learner.id, {
      outfit: { ...learner.outfitChosen, [sel.slot]: sel.id },
      ...(learner.wish === sel.id ? { wish: null } : {}),
    });
    setDialog(null);
    playSound("done");
    say(buddyLine("shop.bought", { item: sel.name }, 0, learner.buddy));
  };
  const wear = () => {
    const outfit = { ...learner.outfitChosen };
    if (wearing) delete outfit[sel.slot];
    else outfit[sel.slot] = sel.id;
    updateLearner(learner.id, { outfit });
  };
  const saveFor = () => {
    updateLearner(learner.id, { wish: sel.id });
    setDialog(null);
    say(buddyLine("shop.saving", { item: sel.name }, 0, learner.buddy));
  };

  return (
    <LearnerShell learner={learner} title={t("shop.title")} back="/play/map" active="/play/more/shop" goal={goal}>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1.5, sm: 2.75 },
          px: { xs: 1.5, sm: 3.25 },
          py: { xs: 1.5, sm: 2.25 },
          minHeight: 0,
        }}
      >
        <Box
          component="section"
          aria-label={tryOn ? "Trying on" : "Your buddy"}
          sx={{
            width: { xs: "100%", sm: 300, lg: 330 },
            flex: "none",
            display: "flex",
            flexDirection: { xs: "row", sm: "column" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.25,
            p: { xs: 1.5, sm: 2.25 },
            bgcolor: "background.paper",
            border: `2px solid ${colors.line}`,
            borderRadius: 7,
          }}
        >
          <Box sx={{ display: { xs: "block", sm: "none" } }}>
            <Buddy id={learner.buddy} outfit={preview} mood={tryOn ? "cheer" : "happy"} size={96} />
          </Box>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Buddy id={learner.buddy} outfit={preview} mood={tryOn ? "cheer" : "happy"} size={200} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", sm: "center" }, gap: 1, flex: 1 }}>
            {sel ? (
              <>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: { xs: 20, sm: 26 } }}>
                  {sel.name}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 18 }}>💎 {sel.price}</Typography>
                {owned ? (
                  <Button variant="contained" onClick={wear}>
                    {wearing ? t("shop.takeOff") : t("shop.wear")}
                  </Button>
                ) : (
                  <Button variant="contained" color="secondary" onClick={buy}>
                    {t("shop.buyFor", { price: sel.price })}
                  </Button>
                )}
              </>
            ) : (
              <Typography sx={{ color: "text.secondary", textAlign: "center" }}>{buddyLine("shop.try", {}, 0, learner.buddy)}</Typography>
            )}
            <SavingGoal learner={learner} compact />
            <Typography sx={{ color: "text.secondary", fontSize: 13 }}>⭐ {learner.stars} · stars are always kept</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.75, minWidth: 0 }}>
          <Box role="tablist" aria-label={t("shop.title")} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {TABS.map((k) => (
              <Button
                key={k}
                role="tab"
                aria-selected={tab === k}
                variant={tab === k ? "contained" : "outlined"}
                onClick={() => {
                  setTab(k);
                  setTryOn(null);
                }}
                sx={{ borderRadius: 999, borderWidth: 2, minHeight: 40 }}
              >
                {k === "mine" ? t("shop.wardrobe") : t(`shop.slot.${k}`)}
              </Button>
            ))}
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
              gridAutoRows: { xs: 150, sm: 170 },
              gap: { xs: 1.25, sm: 1.75 },
              alignContent: "start",
            }}
          >
            {items.map((it) => {
              const own = learner.owned.includes(it.id);
              const short = it.price - learner.treasures;
              return (
                <Box
                  key={it.id}
                  component="button"
                  type="button"
                  onClick={() => pick(it)}
                  aria-label={t("shop.tryOn", { item: it.name })}
                  aria-pressed={tryOn === it.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    bgcolor: "background.paper",
                    border: `3px solid ${tryOn === it.id ? colors.sky.main : colors.line}`,
                    borderRadius: 5.5,
                    cursor: "pointer",
                    color: "text.primary",
                    p: 1,
                  }}
                >
                  <ItemArt id={it.id} size={120} />
                  <Typography sx={{ fontWeight: 800 }}>{it.name}</Typography>
                  {own ? (
                    <Box component="span" sx={{ px: 1.25, borderRadius: 999, bgcolor: colors.leaf.soft, color: colors.leaf.deep, fontWeight: 800, fontSize: 14 }}>
                      {learner.outfit[it.slot] === it.id ? t("shop.wearing") : t("shop.owned")}
                    </Box>
                  ) : (
                    <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
                      💎 {it.price}
                      {short > 0 && (
                        <Box component="span" sx={{ color: "text.secondary", fontWeight: 700 }}>
                          {" "}
                          · {short} more
                        </Box>
                      )}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={!!dialog && !!sel}
        onClose={() => setDialog(null)}
        slotProps={{ paper: { sx: { borderRadius: 5.5, p: 3, textAlign: "center", alignItems: "center", gap: 1.5, maxWidth: 420 } } }}
      >
        {sel && dialog === "buy" && (
          <>
            <Buddy id={learner.buddy} outfit={preview} mood="cheer" size={110} />
            <Typography variant="h5" component="h2">
              {t("shop.confirm", { item: sel.name, price: sel.price })}
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={() => setDialog(null)}>
                {t("shop.no")}
              </Button>
              <Button variant="contained" color="secondary" onClick={confirmBuy} autoFocus>
                {t("shop.yes")}
              </Button>
            </Box>
          </>
        )}
        {sel && dialog === "need" && (
          <>
            <Buddy id={learner.buddy} outfit={learner.outfit} mood="think" size={100} />
            <Typography variant="h5" component="h2">
              {buddyLine("shop.need-more", { n: need }, 0, learner.buddy)}
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={() => setDialog(null)}>
                {t("shop.no")}
              </Button>
              <Button variant="contained" onClick={saveFor} autoFocus>
                {t("shop.saveFor")}
              </Button>
            </Box>
          </>
        )}
      </Dialog>
    </LearnerShell>
  );
}
