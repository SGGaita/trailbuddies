"use client";
import IconButton from "@mui/material/IconButton";
import { colors } from "@trailbuddies/tokens";
import { SoundIcon } from "@/components/art/UiIcon";
import { speak } from "@/lib/speech";
import { useFamily } from "@/lib/store";

/** Round "hear it again" button. Children's prompts are always available as speech. */
export default function SpeakButton({ text, size = 56 }) {
  const voice = useFamily((s) => s.settings.voice);
  return (
    <IconButton
      onClick={() => speak(text, { enabled: voice })}
      aria-label="Hear it"
      sx={{
        width: size,
        height: size,
        border: `3px solid ${colors.leaf.deep}`,
        color: colors.leaf.deep,
        bgcolor: "background.paper",
        flex: "none",
      }}
    >
      <SoundIcon size={size * 0.62} />
    </IconButton>
  );
}
