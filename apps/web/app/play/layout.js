import ClassroomTimer from "@/components/classroom/ClassroomTimer";

/** Learner screens. On a classroom device, children are signed out when they stop playing (CRM-03). */
export default function PlayLayout({ children }) {
  return (
    <>
      {children}
      <ClassroomTimer />
    </>
  );
}
