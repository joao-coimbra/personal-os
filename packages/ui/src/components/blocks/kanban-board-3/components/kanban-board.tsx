// @ts-nocheck
"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@personal-os/ui/components/avatar";
import { Button } from "@personal-os/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { Item, ItemMedia } from "@personal-os/ui/components/item";
import { Badge } from "@personal-os/ui/components/reui/badge";
import {
  Kanban,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@personal-os/ui/components/reui/kanban";
import { Rating } from "@personal-os/ui/components/reui/rating";
import { cn } from "cn";
import {
  CalendarIcon,
  CircleDollarSignIcon,
  ClockIcon,
  FileIcon,
  FilterIcon,
  GripVerticalIcon,
  MessageSquareIcon,
  PlusIcon,
  SquareCheckIcon,
  StarIcon,
  UserRoundIcon,
} from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import {
  INITIAL_PIPELINE_DEALS,
  PIPELINE_COLUMNS,
  PIPELINE_DESCRIPTION,
  PIPELINE_TITLE,
  type PipelineColumn,
  type PipelineDeal,
} from "./data";

const PIPELINE_COLUMN_BY_ID = new Map(
  PIPELINE_COLUMNS.map((column) => [column.id, column])
);

function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root
      className="relative w-full min-w-0 pb-3"
      data-slot="scroll-area"
    >
      <ScrollAreaPrimitive.Viewport
        className="w-full rounded-lg outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-slot="scroll-area-viewport"
      >
        <ScrollAreaPrimitive.Content
          className="flex min-w-full"
          data-slot="scroll-area-content"
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        className="flex touch-none select-none p-px transition-colors data-horizontal:h-2.5 data-vertical:h-full data-vertical:w-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:border-l data-vertical:border-l-transparent"
        data-orientation="horizontal"
        data-slot="scroll-area-scrollbar"
        orientation="horizontal"
      >
        <ScrollAreaPrimitive.Thumb
          className="relative flex-1 rounded-full bg-foreground/15"
          data-slot="scroll-area-thumb"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function PipelineToolbar({ dealCount }: { dealCount: number }) {
  return (
    <header aria-label="Sales pipeline toolbar" className="px-1 py-1">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold text-base">
              {PIPELINE_TITLE}
            </h2>
            <Badge className="bg-background" variant="outline">
              {dealCount}
            </Badge>
          </div>
          <p className="mt-0.5 line-clamp-1 text-muted-foreground text-sm">
            {PIPELINE_DESCRIPTION}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <Button size="sm" type="button" variant="outline">
            <FilterIcon aria-hidden="true" data-icon="inline-start" />
            Filters
          </Button>

          <Button size="sm" type="button" variant="outline">
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            New deal
          </Button>
        </div>
      </div>
    </header>
  );
}

function DealMetaRow({
  icon,
  children,
  muted,
}: {
  icon: ReactNode;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid min-h-5 min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 text-sm",
        muted && "text-muted-foreground"
      )}
    >
      <Item
        className="flex size-4 items-center justify-center border-0 p-0 text-muted-foreground"
        render={<span />}
      >
        <ItemMedia className="size-auto" variant="icon">
          {icon}
        </ItemMedia>
      </Item>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function DealFooterMetric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <span aria-label={label} className="flex items-center gap-1 tabular-nums">
      {icon}
      <span>{value}</span>
    </span>
  );
}

interface DealCardProps
  extends Omit<ComponentProps<typeof KanbanItem>, "value" | "children"> {
  deal: PipelineDeal;
  isOverlay?: boolean;
}

function DealCard({ deal, isOverlay, ...props }: DealCardProps) {
  const card = (
    <Card
      className={cn(
        "gap-0 bg-card p-0 shadow-xs transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm",
        isOverlay && "shadow-lg"
      )}
      size="sm"
    >
      <CardHeader className="grid min-h-5 min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 px-3 pt-3 pb-0">
        <Item
          className="flex size-4 items-center justify-center border-0 p-0"
          render={<span />}
        >
          <ItemMedia className="size-auto" variant="icon">
            {deal.logo}
          </ItemMedia>
        </Item>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle
            className="min-w-0 truncate text-sm leading-5"
            title={deal.company}
          >
            {deal.company}
          </CardTitle>
          <Badge variant={deal.badgeVariant}>{deal.badgeLabel}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-[11.75rem] flex-col gap-3 px-3 pt-3 pb-3">
        <div className="flex flex-col gap-2">
          <DealMetaRow
            icon={
              <CircleDollarSignIcon aria-hidden="true" className="size-3.5" />
            }
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium tabular-nums">
                {deal.dealValue}
              </span>
              <span
                className="truncate text-muted-foreground text-xs"
                title={deal.contractHint}
              >
                {deal.contractHint}
              </span>
            </div>
          </DealMetaRow>

          <DealMetaRow
            icon={<CalendarIcon aria-hidden="true" className="size-3.5" />}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate" title={deal.nextStep}>
                {deal.nextStep}
              </span>
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                {deal.nextStepDate}
              </span>
            </div>
          </DealMetaRow>

          <DealMetaRow
            icon={<UserRoundIcon aria-hidden="true" className="size-3.5" />}
            muted
          >
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-5" size="sm">
                <AvatarImage alt={deal.owner.name} src={deal.owner.avatar} />
                <AvatarFallback className="text-[0.625rem]">
                  {deal.owner.initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate" title={deal.owner.name}>
                {deal.owner.name}
              </span>
            </div>
          </DealMetaRow>
        </div>

        <DealMetaRow
          icon={<StarIcon aria-hidden="true" className="size-3.5" />}
          muted
        >
          <Rating
            aria-label={`${deal.rating} star account fit`}
            rating={deal.rating}
            size="sm"
          />
        </DealMetaRow>

        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-1 text-muted-foreground text-xs">
          <div className="flex min-w-0 items-center gap-2.5">
            <DealFooterMetric
              icon={<FileIcon aria-hidden="true" className="size-3.5" />}
              label={`${deal.attachmentCount} attachments`}
              value={deal.attachmentCount}
            />
            <DealFooterMetric
              icon={<SquareCheckIcon aria-hidden="true" className="size-3.5" />}
              label={`${deal.checklistCount} checklist items`}
              value={deal.checklistCount}
            />
            <DealFooterMetric
              icon={
                <MessageSquareIcon aria-hidden="true" className="size-3.5" />
              }
              label={`${deal.commentCount} comments`}
              value={deal.commentCount}
            />
          </div>

          <span className="flex shrink-0 items-center gap-1 tabular-nums">
            <ClockIcon aria-hidden="true" className="size-3.5" />
            {deal.slaLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <KanbanItem value={deal.id} {...props}>
      {isOverlay ? (
        card
      ) : (
        <KanbanItemHandle className="block">{card}</KanbanItemHandle>
      )}
    </KanbanItem>
  );
}

function AddDealButton({ column }: { column: PipelineColumn }) {
  return (
    <Button
      aria-label={column.addLabel}
      className="w-full justify-start bg-transparent px-3 text-left text-muted-foreground hover:text-foreground"
      type="button"
      variant="outline"
    >
      <PlusIcon aria-hidden="true" data-icon="inline-start" />
      {column.addLabel}
    </Button>
  );
}

function AddStageButton() {
  return (
    <div className="w-[calc(100vw-4rem)] max-w-[18.5rem] shrink-0 p-1 sm:w-[18.5rem]">
      <Button
        aria-label="Add pipeline stage"
        className="h-9 px-2 text-muted-foreground hover:text-foreground"
        size="sm"
        type="button"
        variant="ghost"
      >
        <PlusIcon aria-hidden="true" data-icon="inline-start" />
        Add Stage
      </Button>
    </div>
  );
}

interface PipelineColumnProps
  extends Omit<ComponentProps<typeof KanbanColumn>, "value" | "children"> {
  column: PipelineColumn;
  deals: PipelineDeal[];
  isOverlay?: boolean;
}

function PipelineColumn({
  column,
  deals,
  isOverlay,
  ...props
}: PipelineColumnProps) {
  return (
    <KanbanColumn
      className="w-[calc(100vw-4rem)] max-w-[18.5rem] shrink-0 sm:w-[18.5rem]"
      value={column.id}
      {...props}
    >
      <section
        aria-label={`${column.title}: ${column.description}`}
        className={cn(
          "group/column flex flex-col gap-2 rounded-lg p-1",
          isOverlay && "bg-background"
        )}
      >
        <div className="flex min-h-9 items-center gap-2 px-1">
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              column.dotClassName
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3
                className="truncate font-semibold text-sm"
                title={column.title}
              >
                {column.title}
              </h3>
              <Badge className="bg-background" size="sm" variant="outline">
                {deals.length}
              </Badge>
            </div>
          </div>

          <Button
            aria-label={column.addLabel}
            className="pointer-events-none text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-focus-within/column:pointer-events-auto group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:opacity-100"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <PlusIcon aria-hidden="true" />
          </Button>

          <KanbanColumnHandle
            className="pointer-events-none opacity-0 transition-opacity group-focus-within/column:pointer-events-auto group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:opacity-100"
            render={({ className, ...handleProps }) => (
              <Button
                {...handleProps}
                aria-label={`Move ${column.title} stage`}
                className={cn(
                  "cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing",
                  className
                )}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <GripVerticalIcon aria-hidden="true" />
              </Button>
            )}
          />
        </div>

        <KanbanColumnContent
          className={cn("gap-3 px-1 py-1", deals.length === 0 && "min-h-40")}
          value={column.id}
        >
          {deals.map((deal) => (
            <DealCard deal={deal} key={deal.id} />
          ))}
          {deals.length === 0 && <AddDealButton column={column} />}
        </KanbanColumnContent>
      </section>
    </KanbanColumn>
  );
}

export function KanbanBoard() {
  const [dealsByColumn, setDealsByColumn] = useState(INITIAL_PIPELINE_DEALS);
  const dealCount = Object.values(dealsByColumn).reduce(
    (count, deals) => count + deals.length,
    0
  );

  return (
    <section className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
      <PipelineToolbar dealCount={dealCount} />

      <Kanban
        className="w-full"
        getItemValue={(item) => item.id}
        onValueChange={setDealsByColumn}
        value={dealsByColumn}
      >
        <BoardScrollArea>
          <SortableContext
            items={Object.keys(dealsByColumn)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              className="flex min-w-full items-start gap-3 p-1"
              data-slot="kanban-board"
            >
              {Object.entries(dealsByColumn).map(([columnId, deals]) => {
                const column = PIPELINE_COLUMN_BY_ID.get(columnId);

                if (!column) {
                  return null;
                }

                return (
                  <PipelineColumn
                    column={column}
                    deals={deals}
                    key={columnId}
                  />
                );
              })}
              <AddStageButton />
            </div>
          </SortableContext>
        </BoardScrollArea>

        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const column = PIPELINE_COLUMN_BY_ID.get(String(value));

              if (!column) {
                return null;
              }

              return (
                <PipelineColumn
                  column={column}
                  deals={dealsByColumn[String(value)] ?? []}
                  isOverlay
                />
              );
            }

            const deal = Object.values(dealsByColumn)
              .flat()
              .find((item) => item.id === value);

            return deal ? <DealCard deal={deal} isOverlay /> : null;
          }}
        </KanbanOverlay>
      </Kanban>
    </section>
  );
}
