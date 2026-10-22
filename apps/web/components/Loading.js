import Box from "@mui/material/Box";
import Buddy from "@/components/art/Buddy";

/** Shown for a moment while the saved family loads in the browser. */
export default function Loading({ label = "Loading" }) {
  return (
    <Box
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", alignContent: "center", gap: 1 }}
      aria-busy="true"
      aria-label={label}
    >
      <Buddy id="zip" size={90} />
      {label !== "Loading" && <Box sx={{ fontWeight: 800, color: "text.secondary" }}>{label}</Box>}
    </Box>
  );
}
