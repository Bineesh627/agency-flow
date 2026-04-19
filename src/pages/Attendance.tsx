import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkIn, checkOut, getAttendanceSettings, getMyAttendanceHistory,
  getTodayAttendance, withinWindow,
} from "@/services/attendance";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

const StatusPill = ({ status }: { status: string | null | undefined }) => {
  const map: Record<string, string> = {
    present: "bg-success/15 text-success",
    late: "bg-warning/15 text-warning",
    absent: "bg-muted text-muted-foreground",
    half_day: "bg-warning/15 text-warning",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md capitalize ${map[status ?? "absent"] ?? "bg-muted"}`}>
      {(status ?? "absent").replace("_", " ")}
    </span>
  );
};

const Attendance = () => {
  const qc = useQueryClient();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const settingsQ = useQuery({ queryKey: ["att-settings"], queryFn: getAttendanceSettings });
  const todayQ = useQuery({ queryKey: ["today-attendance"], queryFn: getTodayAttendance });
  const histQ = useQuery({ queryKey: ["att-history"], queryFn: getMyAttendanceHistory });

  const checkInMut = useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["today-attendance"] });
      qc.invalidateQueries({ queryKey: ["att-history"] });
      toast.success("Checked in");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const checkOutMut = useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["today-attendance"] });
      qc.invalidateQueries({ queryKey: ["att-history"] });
      toast.success("Checked out");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const s = settingsQ.data;
  const today = todayQ.data;

  const canCheckIn = !!s && !today?.check_in &&
    withinWindow(now, s.check_in_start, s.check_in_end, s.timezone);
  const canCheckOut = !!s && !!today?.check_in && !today?.check_out &&
    withinWindow(now, s.check_out_start, s.check_out_end, s.timezone);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your daily attendance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Today</h2>
          </div>
          <div className="space-y-3">
            <Row label="Status" value={<StatusPill status={today?.status} />} />
            <Row label="Check-in" value={today?.check_in ? new Date(today.check_in).toLocaleTimeString() : "—"} />
            <Row label="Check-out" value={today?.check_out ? new Date(today.check_out).toLocaleTimeString() : "—"} />
          </div>
          <div className="flex gap-2 mt-5">
            <Button
              onClick={() => checkInMut.mutate()}
              disabled={!canCheckIn || checkInMut.isPending}
              className="flex-1"
            >
              <LogIn className="h-4 w-4 mr-2" /> Check in
            </Button>
            <Button
              onClick={() => checkOutMut.mutate()}
              disabled={!canCheckOut || checkOutMut.isPending}
              variant="secondary"
              className="flex-1"
            >
              <LogOut className="h-4 w-4 mr-2" /> Check out
            </Button>
          </div>
        </div>

        <div className="card-elevated p-6">
          <h2 className="font-semibold mb-4">Allowed windows</h2>
          {s ? (
            <div className="space-y-2 text-sm">
              <Row label="Timezone" value={s.timezone} />
              <Row label="Check-in" value={`${s.check_in_start.slice(0,5)} – ${s.check_in_end.slice(0,5)}`} />
              <Row label="Check-out" value={`${s.check_out_start.slice(0,5)} – ${s.check_out_end.slice(0,5)}`} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </div>
      </div>

      <div className="card-elevated">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-6 py-3">Date</th>
                <th className="text-left px-6 py-3">Check-in</th>
                <th className="text-left px-6 py-3">Check-out</th>
                <th className="text-left px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(histQ.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-6 py-3">{r.date}</td>
                  <td className="px-6 py-3">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : "—"}</td>
                  <td className="px-6 py-3">{r.check_out ? new Date(r.check_out).toLocaleTimeString() : "—"}</td>
                  <td className="px-6 py-3"><StatusPill status={r.status} /></td>
                </tr>
              ))}
              {(histQ.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No history yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Attendance;
