"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  MapPin,
  CreditCard,
  Phone,
  Globe,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

interface BusinessProfile {
  businessHours?: string;
  address?: string;
  paymentMethods?: string;
  phone?: string;
  socialLinks?: string;
}

export function BusinessProfileCard() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: settings } = useQuery({
    queryKey: ["intelligence-settings"],
    queryFn: () =>
      apiFetch<{ businessProfile?: Record<string, unknown> }>("/organizations/intelligence-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const [hours, setHours] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("");
  const [phone, setPhone] = useState("");
  const [social, setSocial] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!settings?.businessProfile) return;
    const s = settings.businessProfile as BusinessProfile;
    setHours(s.businessHours ?? "");
    setAddress(s.address ?? "");
    setPayment(s.paymentMethods ?? "");
    setPhone(s.phone ?? "");
    setSocial(s.socialLinks ?? "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/organizations/intelligence-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({
          businessProfile: {
            businessHours: hours.trim() || undefined,
            address: address.trim() || undefined,
            paymentMethods: payment.trim() || undefined,
            phone: phone.trim() || undefined,
            socialLinks: social.trim() || undefined,
          },
        }),
      }),
    onSuccess: () => {
      success("Business profile saved.");
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["intelligence-settings"] });
    },
    onError: (err) => toastError(toUserMessage(err, "Could not save.")),
  });

  function handleChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setDirty(true);
    };
  }

  const fields = [
    {
      icon: Clock,
      label: "Business hours",
      placeholder: "Mon-Sat 9AM-7PM, Sunday closed",
      value: hours,
      onChange: handleChange(setHours),
    },
    {
      icon: MapPin,
      label: "Address / Location",
      placeholder: "123 MG Road, Bengaluru, Karnataka",
      value: address,
      onChange: handleChange(setAddress),
    },
    {
      icon: CreditCard,
      label: "Payment methods",
      placeholder: "UPI, Cash, Card, Net Banking",
      value: payment,
      onChange: handleChange(setPayment),
    },
    {
      icon: Phone,
      label: "Phone number",
      placeholder: "+91 98765 43210",
      value: phone,
      onChange: handleChange(setPhone),
    },
    {
      icon: Globe,
      label: "Social links",
      placeholder: "instagram.com/yourbiz, facebook.com/yourbiz",
      value: social,
      onChange: handleChange(setSocial),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        These details are always available to your AI — even without knowledge documents. Fill in
        what your customers frequently ask about.
      </p>

      {fields.map((field) => (
        <div key={field.label} className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50">
            <field.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              {field.label}
            </label>
            <Input
              placeholder={field.placeholder}
              value={field.value}
              onChange={field.onChange}
              className="h-9 rounded-lg text-sm"
            />
          </div>
        </div>
      ))}

      {dirty && (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            className="rounded-xl"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <GrowvisiSpinner size="xs" />
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save profile
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
