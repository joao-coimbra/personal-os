// biome-ignore-all lint/performance/noJsxPropsBind: tab and move handlers
"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@personal-os/ui/components/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { client, orpc } from "@/utils/orpc";

import { TasksGanttBoard } from "./tasks-gantt-board";
import { TasksKanbanBoard } from "./tasks-kanban-board";

export type TasksBoardTab = "gantt" | "kanban";

export function TasksBoards({
  defaultTab = "kanban",
}: {
  defaultTab?: TasksBoardTab;
}) {
  const [tab, setTab] = useState<TasksBoardTab>(defaultTab);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const tasks = useQuery(orpc.tasks.list.queryOptions({ input: {} }));
  const lists = useQuery(orpc.tasks.lists.queryOptions({ input: {} }));

  const handleTabChange = useCallback((value: string) => {
    if (value === "gantt" || value === "kanban") {
      setTab(value);
    }
  }, []);

  const move = useMutation({
    mutationFn: (input: { cardId: string; idList: string }) =>
      client.tasks.move(input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Falha ao mover task"
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Card movido no Trello");
    },
  });

  const handleMoveToList = useCallback(
    (input: { cardId: string; idList: string }) => move.mutateAsync(input),
    [move]
  );

  return (
    <Tabs className="gap-4" onValueChange={handleTabChange} value={tab}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList aria-label="Visualizações de planejamento" variant="default">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>
        {selectedId ? (
          <p className="truncate text-muted-foreground text-xs">
            Selecionada:{" "}
            <span className="text-foreground">
              {tasks.data?.find((task) => task.id === selectedId)?.name ??
                selectedId}
            </span>
          </p>
        ) : null}
      </div>

      <TabsContent className="mt-0" value="kanban">
        <TasksKanbanBoard
          error={tasks.error as Error | null}
          lists={lists.data}
          loading={tasks.isLoading || lists.isLoading}
          onMoveToList={handleMoveToList}
          onSelect={setSelectedId}
          selectedId={selectedId}
          tasks={tasks.data ?? []}
        />
      </TabsContent>

      <TabsContent className="mt-0" value="gantt">
        <TasksGanttBoard />
      </TabsContent>
    </Tabs>
  );
}
