const logos = [
  "RetailCo",
  "PropHub",
  "EduFirst",
  "HealthPlus",
  "AgencyX",
  "ShopLocal",
];

export function LogoStrip() {
  return (
    <section className="border-y border-border bg-white py-10">
      <div className="mx-auto max-w-[1120px] px-6">
        <p className="mb-8 text-center text-[13px] font-medium text-muted-foreground">
          Trusted by WhatsApp-first teams worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((name) => (
            <span
              key={name}
              className="text-[15px] font-bold tracking-tight text-foreground/20 transition-colors hover:text-foreground/35"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
