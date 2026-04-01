import { MediaPlaceholder } from "@/components/MediaPlaceholder";

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    features: [
      "Up to 5 sensor nodes",
      "Basic pest detection alerts",
      "Weekly analytics reports",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "$299",
    period: "/month",
    features: [
      "Up to 25 sensor nodes",
      "Real-time pest & disease monitoring",
      "Daily analytics with AI insights",
      "Drone scheduling integration",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Unlimited sensor nodes",
      "Full automation suite",
      "Custom AI model training",
      "Robotics & drone fleet management",
      "Dedicated account manager",
    ],
  },
] as const;

export function PricingSection() {
  return (
    <section id="pricing" className="bg-muted/40 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
          Pricing
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="flex flex-col rounded-lg border border-border bg-background p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold">{tier.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                {tier.price}
                <span className="text-base font-normal text-muted-foreground">
                  {tier.period}
                </span>
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-primary">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {tier.name === "Enterprise" ? "Contact Sales" : "Get Started"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <MediaPlaceholder
            alt="Pricing comparison chart for automation tiers"
            aspectRatio="16/9"
          />
        </div>
      </div>
    </section>
  );
}
