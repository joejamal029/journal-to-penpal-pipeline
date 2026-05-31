import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Journal → Penpal" },
      {
        name: "description",
        content: "A local-first workstation for routing journal thoughts into penpal letters.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <AppShell />;
}
