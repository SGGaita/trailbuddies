import { avatarColors } from "@trailbuddies/tokens";

/** Round initial avatar in the learner's colour. */
export default function LearnerAvatar({ learner, size = 44 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarColors[learner.color] || avatarColors.leaf,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-display), sans-serif",
        fontWeight: 800,
        fontSize: size * 0.45,
        flex: "none",
      }}
    >
      {learner.name[0]}
    </span>
  );
}
