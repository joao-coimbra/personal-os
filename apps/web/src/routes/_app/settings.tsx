import { Button } from "@personal-os/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { Input } from "@personal-os/ui/components/input";
import { Label } from "@personal-os/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const prefs = useQuery(orpc.preferences.get.queryOptions());
  const queryClient = useQueryClient();
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [focusMinutes, setFocusMinutes] = useState(50);
  const [breakMinutes, setBreakMinutes] = useState(15);

  useEffect(() => {
    if (prefs.data) {
      setTimezone(prefs.data.timezone);
      setWorkStart(prefs.data.workStart);
      setWorkEnd(prefs.data.workEnd);
      setFocusMinutes(prefs.data.focusMinutes);
      setBreakMinutes(prefs.data.breakMinutes);
    }
  }, [prefs.data]);

  const save = useMutation({
    mutationFn: () =>
      client.preferences.upsert({
        breakMinutes,
        focusMinutes,
        timezone,
        workEnd,
        workStart,
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-semibold text-2xl">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productivity preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label htmlFor="tz">Timezone</Label>
            <Input
              id="tz"
              onChange={(e) => setTimezone(e.target.value)}
              value={timezone}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="ws">Work start</Label>
              <Input
                id="ws"
                onChange={(e) => setWorkStart(e.target.value)}
                value={workStart}
              />
            </div>
            <div>
              <Label htmlFor="we">Work end</Label>
              <Input
                id="we"
                onChange={(e) => setWorkEnd(e.target.value)}
                value={workEnd}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="focus">Focus block (min)</Label>
              <Input
                id="focus"
                onChange={(e) => setFocusMinutes(Number(e.target.value))}
                type="number"
                value={focusMinutes}
              />
            </div>
            <div>
              <Label htmlFor="break">Break (min)</Label>
              <Input
                id="break"
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                type="number"
                value={breakMinutes}
              />
            </div>
          </div>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate()}
            type="button"
          >
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
