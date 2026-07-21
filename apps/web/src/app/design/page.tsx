"use client";

import { useState } from "react";
import { Bell, Check, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SURFACES = [
  ["--surface-base", "bg-surface-base"],
  ["--surface-panel", "bg-surface-panel"],
  ["--surface-raised", "bg-surface-raised"],
  ["--surface-sunken", "bg-surface-sunken"],
] as const;

const STATUS = [
  ["Success", "bg-success"],
  ["Warning", "bg-warning"],
  ["Danger", "bg-destructive"],
  ["Info", "bg-info"],
  ["Accent", "bg-accent"],
  ["Brand", "bg-primary"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const [dark, setDark] = useState(false);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-background px-6 py-10 text-foreground transition-colors">
        <div className="mx-auto max-w-4xl space-y-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Growvisi DS v1</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Theme-aware design system reference for the authenticated product.
              </p>
            </div>
            <div className="inline-flex overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setDark(false)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${!dark ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground"}`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setDark(true)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${dark ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground"}`}
              >
                Dark
              </button>
            </div>
          </header>

          <Section title="Surfaces">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SURFACES.map(([name, cls]) => (
                <div key={name} className="rounded-xl border border-border p-3">
                  <div className={`mb-2 h-12 rounded-lg border border-border ${cls}`} />
                  <code className="text-xs text-muted-foreground">{name}</code>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Status & brand">
            <div className="flex flex-wrap gap-3">
              {STATUS.map(([label, cls]) => (
                <div key={label} className="text-center">
                  <div className={`h-14 w-24 rounded-xl ${cls}`} />
                  <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Buttons">
            <div className="flex flex-wrap items-center gap-3">
              <Button>
                <Plus className="h-[18px] w-[18px]" /> Primary
              </Button>
              <Button variant="brand">Brand</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">
                <Trash2 className="h-[18px] w-[18px]" /> Delete
              </Button>
              <Button isLoading>Loading</Button>
              <Button size="sm">Small</Button>
            </div>
          </Section>

          <Section title="Badges">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </Section>

          <Section title="Card & form">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Card title</CardTitle>
                  <CardDescription>Canonical surface — rounded-2xl, elev-1.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Cards, panels, and inline surfaces all share this primitive.
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="ghost">
                    Cancel
                  </Button>
                  <Button size="sm">
                    <Check className="h-[18px] w-[18px]" /> Save
                  </Button>
                </CardFooter>
              </Card>
              <Card interactive className="p-5">
                <Field label="Full name" htmlFor="ds-name" required>
                  <Input id="ds-name" placeholder="Priya Sharma" />
                </Field>
                <div className="mt-4">
                  <Field label="Email" htmlFor="ds-email" hint="We never share this" error="Enter a valid email">
                    <Input id="ds-email" placeholder="you@company.in" />
                  </Field>
                </div>
              </Card>
            </div>
          </Section>

          <Section title="Table">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Aarav Mehta", "Qualified", "₹42,000"],
                    ["Diya Nair", "New", "₹18,500"],
                    ["Kabir Rao", "Won", "₹1,20,000"],
                  ].map(([name, stage, value]) => (
                    <TableRow key={name} interactive>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>
                        <Badge variant="info">{stage}</Badge>
                      </TableCell>
                      <TableCell>{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </Section>

          <Section title="Alerts">
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                <Bell className="h-4 w-4" /> Warning banner uses status tokens.
              </div>
              <div className="rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
                Info banner — theme-aware in light and dark.
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
