"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Buddy from "@/components/art/Buddy";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 3,
        textAlign: "center",
      }}
    >
      <Buddy id="tumi" mood="think" size={120} />
      <Typography variant="h4" component="h1">
        Hmm, this path isn&apos;t on the map.
      </Typography>
      <Button component={Link} href="/play" variant="contained">
        Back to the start
      </Button>
    </Box>
  );
}
