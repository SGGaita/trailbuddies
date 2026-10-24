import { Suspense } from "react";
import { notFound } from "next/navigation";
import Loading from "@/components/Loading";
import { getSubjects, getReadyUnits, getUnit } from "@trailbuddies/content";
import { GAMES } from "@trailbuddies/domain";
import GamePlayer from "@/components/games/GamePlayer";

export const dynamicParams = false;
/** Every game with every unit that has content (GAM-05: any item set). */
export const generateStaticParams = () =>
  GAMES.flatMap((game) => [
    ...getSubjects().flatMap((s) => getReadyUnits(s.id).map((u) => ({ game, unit: u.id }))),
    // A family lesson's cards (BLD-06): /play/game/memory/family?lesson=<id>
    { game, unit: "family" },
  ]);

export async function generateMetadata({ params }) {
  const { game, unit } = await params;
  const what = unit === "family" ? "Family lesson" : getUnit(unit)?.title || "";
  return { title: `${game === "memory" ? "Memory flip" : "Jigsaw"} · ${what} · Trailbuddies` };
}

export default async function GamePage({ params }) {
  const { game, unit } = await params;
  if ((unit !== "family" && !getUnit(unit)) || !GAMES.includes(game)) notFound();
  return (
    <Suspense fallback={<Loading />}>
      <GamePlayer game={game} unitId={unit} />
    </Suspense>
  );
}
