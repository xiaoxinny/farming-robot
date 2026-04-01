import { MediaPlaceholder } from "@/components/MediaPlaceholder";

const TEAM_MEMBERS = [
  { name: "Sarah Chen", role: "CEO" },
  { name: "Raj Patel", role: "CTO" },
  { name: "Dr. Mei Lin", role: "Head of Agronomy" },
  { name: "James Tan", role: "Head of Robotics" },
  { name: "Aisha Rahman", role: "Lead Data Scientist" },
  { name: "David Lim", role: "VP of Engineering" },
] as const;

export function TeamSection() {
  return (
    <section id="team" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
        Our Team
      </h2>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM_MEMBERS.map((member) => (
          <div
            key={member.name}
            className="flex flex-col items-center rounded-lg border border-border bg-background p-6 shadow-sm"
          >
            <MediaPlaceholder
              alt={`Team member photo — ${member.role}`}
              aspectRatio="1/1"
              width="160px"
              className="mb-4 rounded-full"
            />
            <h3 className="text-lg font-semibold">{member.name}</h3>
            <p className="text-sm text-muted-foreground">{member.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
