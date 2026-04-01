export function ContactSection() {
  return (
    <section
      id="contact"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
    >
      <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
        Contact Us
      </h2>

      <div className="grid gap-12 lg:grid-cols-2">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              placeholder="Your name"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              placeholder="you@example.com"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-message" className="text-sm font-medium">
              Message
            </label>
            <textarea
              id="contact-message"
              rows={5}
              placeholder="How can we help?"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="self-start rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Send Message
          </button>
        </form>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Our Office</h3>
          <address className="not-italic text-muted-foreground">
            AgriTech Pte. Ltd.
            <br />
            71 Ayer Rajah Crescent
            <br />
            #01-01, Block 71
            <br />
            Singapore 139951
          </address>
          <p className="text-sm text-muted-foreground">
            info@agritech.example.com
          </p>
        </div>
      </div>
    </section>
  );
}
