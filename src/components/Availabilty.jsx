import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import styles from "./styles/Availability.module.css";

const WORKDAY_START_TIME = 8;
const WORKDAY_END_TIME = 17;

function Availability() {
  const {
    authState: { user, roles },
  } = useAuth();

  //Recommended to use useMemo for static data like hourly slots if not creating new data each time.
  const hourlySlots = useMemo(
    () =>
      Array.from(
        { length: WORKDAY_END_TIME - WORKDAY_START_TIME },
        (_, index) => ({
          start: WORKDAY_START_TIME + index,
          end: WORKDAY_START_TIME + index + 1,
        })
      ),
    []
  );

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  const [slots, setSlots] = useState(() =>
    hourlySlots.map((slot) => ({
      ...slot,
      isAvailable: false,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Local state for PROVIDER availability creation form
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // Don't fetch if no user is available
    if (!user) {
      setSlots(
        hourlySlots.map((slot) => ({
          ...slot,
          isAvailable: false,
        }))
      );
      return;
    }

    const controller = new AbortController();

    const fetchAvailability = async () => {
      setLoading(true);
      setError("");

      try {
        //Small workaround date window around the selected date because the backend
        //returns availability for dates BETWEEN from:/to: and not matching them.
        const selected = new Date(selectedDate);

        const fromDate = new Date(selected);
        fromDate.setDate(selected.getDate() - 1); // previous day

        const toDate = new Date(selected);
        toDate.setDate(selected.getDate() + 1); // next day
        //BAckend expects dates but it expectes a range in the params not a single date. SO we need to fetch the previous and next day to get the availability for the selected date.

        const response = await axios.get(
          "http://localhost:8080/availability/all",
          {
            params: {
              from: fromDate.toISOString().slice(0, 10),
              to: toDate.toISOString().slice(0, 10),
            },
            withCredentials: true,
            signal: controller.signal,
          }
        );

        const data = response.data || [];

        //Build a set of available hours for the selected date
        const availableHours = new Set();

        data.forEach((a) => {
          // Backend can return "2026-01-31" or "2026-01-31T00:00:00" or full ISO "datestring.
          const availabilityDate = a.date
            ? a.date.toString().slice(0, 10)
            : null;
          console.log("Availability item:", {
            date: a.date,
            normalizedDate: availabilityDate,
            startTime: a.startTime,
            endTime: a.endTime,
            matchesSelectedDate: availabilityDate === selectedDate,
          });

          // Only process availability for the selected date
          if (availabilityDate === selectedDate) {
            //Parse startTime and endTime (format "09:00")
            // Handle both "09:00" and "09:00:00" formats
            //When writing tests for this it wanted the :00 (seconds) at the end of the time string, so to be sure its working I added it.
            const startTimeStr = a.startTime.toString();
            const endTimeStr = a.endTime.toString();
            const startHour = Number(startTimeStr.slice(0, 2));
            const endHour = Number(endTimeStr.slice(0, 2));

            console.log(
              `Marking hours ${startHour} to ${endHour} as available`
            );

            //Mark all hours [startHour, endHour] as available
            for (let h = startHour; h < endHour; h++) {
              availableHours.add(h);
            }
          }
        });

        console.log("Available hours set:", Array.from(availableHours).sort());

        //Map availability to hourly slots
        const mappedSlots = hourlySlots.map((slot) => ({
          ...slot,
          isAvailable: availableHours.has(slot.start),
        }));

        setSlots(mappedSlots);
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          console.error("Failed to fetch availability:", err);
          setError(
            err.response?.status === 404
              ? "No availability found for this date."
              : "Could not load availability. Please try again."
          );
          // Fall back to all unavailable slots
          setSlots(
            hourlySlots.map((slot) => ({
              ...slot,
              isAvailable: false,
            }))
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();

    return () => {
      controller.abort();
    };
  }, [selectedDate, user, hourlySlots]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Caregiver Availability</h2>
        <p className={styles.subtitle}>
          Welcome, {user}. Choose a date and review your workday slots
          (08:00–17:00).
        </p>
      </header>

      <section className={styles.controls}>
        <label>
          Date:
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
      </section>

      {/* Provider-only availability creation form */}
      {roles?.includes("PROVIDER") && (
        <section className={styles.createSection}>
          <h3 className={styles.createTitle}>Create Availability</h3>
          <form
            className={styles.createForm}
            onSubmit={async (e) => {
              e.preventDefault();
              setFormError("");
              setSuccessMessage("");

              if (!formDate || !startTime || !endTime) {
                setFormError("All fields are required.");
                return;
              }

              // Ensure format HH:MM and that start < end
              const start = startTime.slice(0, 5);
              const end = endTime.slice(0, 5);

              if (start >= end) {
                setFormError("Start time must be earlier than end time.");
                return;
              }

              try {
                await axios.post(
                  "http://localhost:8080/availability/create",
                  {
                    date: formDate,
                    startTime: start,
                    endTime: end,
                  },
                  { withCredentials: true }
                );

                setSuccessMessage("Availability created successfully.");
                // Optionally reset times but keep date
                setStartTime("");
                setEndTime("");
              } catch (err) {
                console.error("Failed to create availability:", err);
                setFormError(
                  err.response?.data?.message ||
                    "Could not create availability. Please try again."
                );
              }
            }}
          >
            <div className={styles.formRow}>
              <label>
                Date:
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>
              <label>
                Start time:
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </label>
              <label>
                End time:
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </label>
            </div>
            <button type="submit" className={styles.submitButton}>
              Create availability
            </button>
          </form>
        </section>
      )}

      {loading && (
        <p className={styles.loadingMessage}>Loading availability...</p>
      )}
      {error && <p className={styles.errorMessage}>{error}</p>}
      {formError && <p className={styles.errorMessage}>{formError}</p>}
      {successMessage && (
        <p className={styles.successMessage}>{successMessage}</p>
      )}

      <section>
        <div className={styles.slotsGrid}>
          {slots.map((slot) => {
            const startLabel = `${String(slot.start).padStart(2, "0")}:00`;
            const endLabel = `${String(slot.end).padStart(2, "0")}:00`;
            const className = slot.isAvailable
              ? `${styles.slot} ${styles.slotAvailable}`
              : styles.slot;

            return (
              <div key={slot.start} className={className}>
                {startLabel} – {endLabel}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Availability;
