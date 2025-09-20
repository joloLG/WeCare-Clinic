"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

type Appointment = {
  id: string;
  patient_name: string;
  patient_contact_number: string;
  appointment_date?: string | null;
  start_time?: string | null;
};

export default function SendMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!appointmentId) return;
    const fetchAppointment = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patient_name, patient_contact_number")
        .eq("id", appointmentId)
        .single();
      if (!error && data) {
        const appt = data as Appointment;
        setAppointment(appt);
        setDate(appt.appointment_date || "");
        setTime(appt.start_time || "");
      }
      setLoading(false);
    };
    fetchAppointment();
  }, [appointmentId, supabase]);

  useEffect(() => {
    if (appointment && date && time) {
      setMessage(
        `Hi Mr/Ms ${appointment.patient_name}, your appointment is settled to happen on ${date} at the time of ${time}. Please come to this address Zone 8 Bulan Sorsogon.`
      );
    }
  }, [appointment, date, time]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      if (!appointment) {
        throw new Error("No appointment loaded");
      }
      // Call your Twilio API route here
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: appointment.patient_contact_number,
          body: message,
        }),
      });
      if (!res.ok) throw new Error("Failed to send SMS");
      // Update appointment status to settled
      await supabase
        .from("appointments")
        .update({ status: "settled" })
        .eq("id", appointmentId);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/admin/appointments"), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!appointment) return <div className="p-8 text-center text-red-600">Appointment not found.</div>;

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Send SMS to Patient</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Patient Name</label>
        <div className="p-2 bg-gray-100 rounded">{appointment.patient_name}</div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Patient Phone Number</label>
        <div className="p-2 bg-gray-100 rounded">{appointment.patient_contact_number}</div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Appointment Date</label>
  <input type="date" className="input input-bordered w-full" value={date} onChange={e => setDate(e.target.value)} placeholder="Select appointment date" />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Appointment Time</label>
  <input type="time" className="input input-bordered w-full" value={time} onChange={e => setTime(e.target.value)} placeholder="Select appointment time" />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Message</label>
  <textarea className="input input-bordered w-full" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter SMS message to send to patient" />
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">Message sent and appointment settled!</div>}
      <Button onClick={handleSend} disabled={sending} className="w-full">
        {sending ? "Sending..." : "Send SMS & Settle Appointment"}
      </Button>
    </div>
  );
}
