import { MediaPlaceholder } from "@/components/MediaPlaceholder";

export function AboutSection() {
  return (
    <section id="about" className="bg-muted/40 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
          About Us
        </h2>

        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              We are a Singapore-based agri-tech startup on a mission to
              revolutionise farming through technology. Our multi-stage
              automation platform combines AI-powered analytics, IoT sensor
              networks, robotics, and drone systems to help farms reduce costs
              and increase yields.
            </p>
            <p className="text-muted-foreground">
              From early-stage pest and disease detection to fully automated
              crop management, our solutions are designed to make precision
              agriculture accessible to farms of every size. We are proud to
              support Singapore's national objectives for self-grown food
              supply.
            </p>
          </div>

          <MediaPlaceholder
            alt="AgriTech team working with farm automation systems"
            aspectRatio="16/9"
          />
        </div>
      </div>
    </section>
  );
}
