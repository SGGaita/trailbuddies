import Box from "@mui/material/Box";
import { colors } from "@trailbuddies/tokens";

/** The buddy's speech bubble. */
export default function Bubble({ children, small = false, sx }) {
  return (
    <Box
      className="popin"
      sx={{
        bgcolor: "background.paper",
        border: `2px solid ${colors.line}`,
        borderRadius: small ? 4.5 : 5.5,
        px: small ? 1.75 : 2.5,
        py: small ? 1.25 : 1.75,
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: small ? { xs: 17, sm: 19 } : { xs: 20, sm: 26 },
        lineHeight: 1.15,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
