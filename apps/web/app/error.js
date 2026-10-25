"use client";
import CalmError from "@/components/CalmError";

export default function AppError({ error, reset }) {
  return <CalmError error={error} reset={reset} home="/" />;
}
