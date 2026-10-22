import { notFound } from "next/navigation";
import { getSubjects, getReadyUnits, getUnit } from "@trailbuddies/content";
import { GAMES } from "@trailbuddies/domain";
import GamePlayer from "@/components/games/GamePlayer";

export const dynamicParams = false;
/** Every game with every unit that has content (GAM-05: any item set). */
export const generateStaticParams = () =>
  GAMES.flatMap((game) => getSubjects().flatMap((s) => getReadyUnits(s.id).map((u) => ({ game, unit: u.id }))));

export async function generateMetadata({ params }) {
  const { game, unit } = await params;
  return { title: `${game === "memory" ? "Memory flip" : "Jigsaw"} · ${getUnit(unit)?.title || ""} · Trailbuddies` };
}

export default async function GamePage({ params }) {
  const { game, unit } = await params;
  if (!getUnit(unit) || !GAMES.includes(game)) notFound();
  return <GamePlayer game={game} unitId={unit} />;
}
