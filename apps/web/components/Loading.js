import Box from "@mui/material/Box";
import Buddy from "@/components/art/Buddy";

/** Shown for a moment while the saved family loads in the browser. */
export default function Loading() {
  return (
    <Box
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}
      aria-busy="true"
      aria-label="Loading"
    >
      <Buddy id="zip" size={90} />
    </Box>
  );
}
