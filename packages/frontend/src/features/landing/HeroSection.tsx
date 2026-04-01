import { MediaPlaceholder } from "@/components/MediaPlaceholder";

export function HeroSection() {
  return (
    <section id="hero" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Helping Farms Flourish
          </h1>
          <p className="text-lg text-muted-foreground">
            Based in Singapore, we reduce the cost of growing vegetables by
            tackling pest and disease growth with AI-driven analytics, sensor
            networks, robotics, and drones. Our multi-stage automation platform
            empowers farms to grow smarter and more sustainably.
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("about")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Learn More
            </button>
          </div>
        </div>

        <MediaPlaceholder
          alt="Aerial view of smart farm with drone monitoring and sensor networks"
          aspectRatio="16/9"
        />
      </div>
    </section>
  );
}
