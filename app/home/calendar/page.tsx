import Schedule from "@/components/ui/calendarComp";

export default function CalendarPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Appointement Manager</h1>
      <Schedule />
    </div>
  );
}