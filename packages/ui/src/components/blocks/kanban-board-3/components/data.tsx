// @ts-nocheck
import type { BadgeProps } from "@personal-os/ui/components/reui/badge";
import { Dropbox } from "@personal-os/ui/components/ui/svgs/dropbox";
import { GithubDark } from "@personal-os/ui/components/ui/svgs/githubDark";
import { GithubLight } from "@personal-os/ui/components/ui/svgs/githubLight";
import { GoogleMeet } from "@personal-os/ui/components/ui/svgs/googleMeet";
import { Loom } from "@personal-os/ui/components/ui/svgs/loom";
import { Openai } from "@personal-os/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@personal-os/ui/components/ui/svgs/openaiDark";
import { Paypal } from "@personal-os/ui/components/ui/svgs/paypal";
import { Slack } from "@personal-os/ui/components/ui/svgs/slack";
import { Stripe } from "@personal-os/ui/components/ui/svgs/stripe";
import { Supabase } from "@personal-os/ui/components/ui/svgs/supabase";
import { Zoom } from "@personal-os/ui/components/ui/svgs/zoom";
import type { ReactNode } from "react";

export type PipelinePerson = {
  name: string;
  initials: string;
  avatar: string;
};

export type PipelineDeal = {
  id: string;
  company: string;
  logo: ReactNode;
  owner: PipelinePerson;
  dealValue: string;
  contractHint: string;
  nextStep: string;
  nextStepDate: string;
  rating: number;
  slaLabel: string;
  badgeLabel: string;
  badgeVariant: BadgeProps["variant"];
  attachmentCount: number;
  checklistCount: number;
  commentCount: number;
};

export type PipelineColumn = {
  id: string;
  title: string;
  description: string;
  dotClassName: string;
  addLabel: string;
};

function ThemeLogo({ light, dark }: { light: ReactNode; dark: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="dark:hidden">
        {light}
      </span>
      <span aria-hidden="true" className="hidden dark:block">
        {dark}
      </span>
    </>
  );
}

const PEOPLE = {
  jonas: {
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&dpr=2&q=80",
    initials: "JP",
    name: "Jonas Park",
  },
  lina: {
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&dpr=2&q=80",
    initials: "LO",
    name: "Lina Ortiz",
  },
  mara: {
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&dpr=2&q=80",
    initials: "MB",
    name: "Mara Bell",
  },
  theo: {
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&dpr=2&q=80",
    initials: "TG",
    name: "Theo Grant",
  },
} satisfies Record<string, PipelinePerson>;

export const PIPELINE_TITLE = "Sales Pipeline";
export const PIPELINE_DESCRIPTION = "Track accounts and next steps.";

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    addLabel: "Add prospect",
    description: "New account fit",
    dotClassName: "bg-muted-foreground/45",
    id: "prospecting",
    title: "Prospecting",
  },
  {
    addLabel: "Add qualified account",
    description: "Budget and need",
    dotClassName: "bg-primary",
    id: "qualification",
    title: "Qualification",
  },
  {
    addLabel: "Add meeting",
    description: "Discovery booked",
    dotClassName: "bg-warning",
    id: "meeting",
    title: "Meeting",
  },
  {
    addLabel: "Add proposal",
    description: "Scope in review",
    dotClassName: "bg-info",
    id: "proposal",
    title: "Proposal",
  },
  {
    addLabel: "Add negotiation",
    description: "Terms in motion",
    dotClassName: "bg-focus",
    id: "negotiation",
    title: "Negotiation",
  },
  {
    addLabel: "Add won deal",
    description: "Ready for handoff",
    dotClassName: "bg-success",
    id: "closed",
    title: "Closed Won",
  },
];

export const INITIAL_PIPELINE_DEALS: Record<string, PipelineDeal[]> = {
  closed: [
    {
      attachmentCount: 6,
      badgeLabel: "Procurement",
      badgeVariant: "destructive-light",
      checklistCount: 7,
      commentCount: 11,
      company: "PayPal",
      contractHint: "Global payout controls",
      dealValue: "$118,500",
      id: "deal-501",
      logo: <Paypal aria-hidden="true" className="size-3" />,
      nextStep: "Resolve pricing carveout",
      nextStepDate: "May 15, 2026",
      owner: PEOPLE.lina,
      rating: 4.5,
      slaLabel: "Escalated",
    },
    {
      attachmentCount: 3,
      badgeLabel: "Security",
      badgeVariant: "primary-light",
      checklistCount: 4,
      commentCount: 6,
      company: "Dropbox",
      contractHint: "Storage governance tier",
      dealValue: "$49,700",
      id: "deal-502",
      logo: <Dropbox aria-hidden="true" className="size-3" />,
      nextStep: "Finalize rollout owners",
      nextStepDate: "May 18, 2026",
      owner: PEOPLE.theo,
      rating: 4,
      slaLabel: "3d left",
    },
  ],
  meeting: [
    {
      attachmentCount: 2,
      badgeLabel: "Discovery",
      badgeVariant: "info-light",
      checklistCount: 3,
      commentCount: 4,
      company: "Zoom",
      contractHint: "Scheduling workspace pilot",
      dealValue: "$29,600",
      id: "deal-301",
      logo: <Zoom aria-hidden="true" className="size-3" />,
      nextStep: "Run discovery call",
      nextStepDate: "May 12, 2026",
      owner: PEOPLE.mara,
      rating: 4,
      slaLabel: "Booked",
    },
    {
      attachmentCount: 3,
      badgeLabel: "Exec",
      badgeVariant: "warning-light",
      checklistCount: 4,
      commentCount: 5,
      company: "Google Meet",
      contractHint: "Executive alignment session",
      dealValue: "$37,900",
      id: "deal-302",
      logo: <GoogleMeet aria-hidden="true" className="size-3" />,
      nextStep: "Prepare value map",
      nextStepDate: "May 13, 2026",
      owner: PEOPLE.theo,
      rating: 4.5,
      slaLabel: "Tomorrow",
    },
  ],
  negotiation: [],
  proposal: [
    {
      attachmentCount: 5,
      badgeLabel: "Legal",
      badgeVariant: "focus-light",
      checklistCount: 6,
      commentCount: 8,
      company: "GitHub",
      contractHint: "Enterprise source control add-on",
      dealValue: "$86,900",
      id: "deal-401",
      logo: (
        <ThemeLogo
          dark={<GithubDark aria-hidden="true" className="size-3" />}
          light={<GithubLight aria-hidden="true" className="size-3" />}
        />
      ),
      nextStep: "Send implementation scope",
      nextStepDate: "May 13, 2026",
      owner: PEOPLE.mara,
      rating: 4,
      slaLabel: "Review",
    },
    {
      attachmentCount: 2,
      badgeLabel: "Pilot",
      badgeVariant: "info-light",
      checklistCount: 3,
      commentCount: 2,
      company: "Loom",
      contractHint: "Enablement content hub",
      dealValue: "$27,300",
      id: "deal-402",
      logo: <Loom aria-hidden="true" className="size-3" />,
      nextStep: "Share success plan",
      nextStepDate: "May 14, 2026",
      owner: PEOPLE.jonas,
      rating: 3,
      slaLabel: "2d left",
    },
  ],
  prospecting: [
    {
      attachmentCount: 2,
      badgeLabel: "Inbound",
      badgeVariant: "info-light",
      checklistCount: 3,
      commentCount: 5,
      company: "Supabase",
      contractHint: "Annual platform expansion",
      dealValue: "$34,800",
      id: "deal-101",
      logo: <Supabase aria-hidden="true" className="size-3" />,
      nextStep: "Map technical buyer",
      nextStepDate: "May 6, 2026",
      owner: PEOPLE.mara,
      rating: 4,
      slaLabel: "2d left",
    },
    {
      attachmentCount: 1,
      badgeLabel: "Partner",
      badgeVariant: "primary-light",
      checklistCount: 2,
      commentCount: 3,
      company: "Slack",
      contractHint: "Team workflow pilot",
      dealValue: "$18,400",
      id: "deal-102",
      logo: <Slack aria-hidden="true" className="size-3" />,
      nextStep: "Confirm champion criteria",
      nextStepDate: "May 8, 2026",
      owner: PEOPLE.jonas,
      rating: 3.5,
      slaLabel: "Today",
    },
  ],
  qualification: [
    {
      attachmentCount: 3,
      badgeLabel: "Expansion",
      badgeVariant: "success-light",
      checklistCount: 5,
      commentCount: 4,
      company: "Stripe",
      contractHint: "Usage-based billing layer",
      dealValue: "$52,600",
      id: "deal-201",
      logo: <Stripe aria-hidden="true" className="size-3" />,
      nextStep: "Validate security review",
      nextStepDate: "May 9, 2026",
      owner: PEOPLE.lina,
      rating: 5,
      slaLabel: "4d left",
    },
    {
      attachmentCount: 4,
      badgeLabel: "Strategic",
      badgeVariant: "warning-light",
      checklistCount: 4,
      commentCount: 7,
      company: "OpenAI",
      contractHint: "Research workspace rollout",
      dealValue: "$41,200",
      id: "deal-202",
      logo: (
        <ThemeLogo
          dark={<OpenaiDark aria-hidden="true" className="size-3" />}
          light={<Openai aria-hidden="true" className="size-3" />}
        />
      ),
      nextStep: "Align procurement path",
      nextStepDate: "May 11, 2026",
      owner: PEOPLE.theo,
      rating: 4.5,
      slaLabel: "1d left",
    },
  ],
};
