"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { useFamily, useHydrated } from "@/lib/store";
import { canEdit } from "@/lib/account";
import FamilyShell from "@/components/shell/FamilyShell";
import Icon from "@/components/Icon";
import Loading from "@/components/Loading";
import { CardPic, UploadBanner } from "./parts";

const TEMPLATE = { learn: "builder.tpl.learn", sort: "builder.tpl.sort", puzzle: "builder.tpl.puzzle" };

/** P10 Lesson Builder home: make a lesson, and the family's lessons to edit. */
export default function BuilderHome() {
  const ready = useHydrated();
  const s = useFamily();
  if (!ready) return <Loading />;
  const editable = canEdit(s);
  const nameOf = (id) => s.learners.find((l) => l.id === id)?.name;
  const lessons = [...s.lessons].reverse();

  return (
    <FamilyShell title={t("builder.title")} family={s.family} active="/family/create" wide>
      <UploadBanner />
      <Card
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{t("builder.make")}</Typography>
          <Typography sx={{ color: "text.secondary" }}>{t("builder.intro")}</Typography>
        </Box>
        {editable ? (
          <Button
            component={Link}
            href="/family/create/lesson"
            variant="contained"
            startIcon={<Icon name="plus" size={20} />}
          >
            {t("builder.make")}
          </Button>
        ) : (
          <Typography sx={{ color: "text.secondary", fontWeight: 700 }}>{t("builder.viewOnly")}</Typography>
        )}
      </Card>

      <Typography variant="h6" component="h2">
        {t("builder.mine")}
      </Typography>
      {lessons.length === 0 ? (
        <Card sx={{ p: 2, bgcolor: colors.sun.soft, borderColor: colors.sun.main }}>
          <Typography>{t("builder.none")}</Typography>
        </Card>
      ) : (
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          {lessons.map((l) => {
            const names = l.assigned.map(nameOf).filter(Boolean);
            return (
              <li key={l.id}>
                <Card
                  component={Link}
                  href={`/family/create/lesson?id=${l.id}`}
                  sx={{
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    textDecoration: "none",
                    color: "text.primary",
                  }}
                >
                  <CardPic card={l.cards[0]} size={64} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 17 }} noWrap>
                      {l.title}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                      {t("builder.cardsN", { n: l.cards.length })} · {t(TEMPLATE[l.template])}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 14 }} noWrap>
                      {names.length
                        ? t("builder.forWho", { names: names.join(", ") })
                        : t("builder.forNobody")}
                    </Typography>
                  </Box>
                  <Box sx={{ transform: "scaleX(-1)", display: "flex" }}>
                    <Icon name="back" size={20} />
                  </Box>
                </Card>
              </li>
            );
          })}
        </Box>
      )}
    </FamilyShell>
  );
}
