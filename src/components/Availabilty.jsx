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
  const [availabilityEntries, setAvailabilityEntries] = useState([]);
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
      setAvailabilityEntries([]);
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

        // Build a set of available HOURS for the selected date so we can create the hour-slots.
        // Also keep the raw availability entries so we can show a list (with DI) for deletion.
        const availableHours = new Set();
        const entriesForSelectedDate = [];

        data.forEach((a) => {
          // Backend can return date in multiple formats like:
          // "2026-01-31" or "2026-01-31T00:00:00" or full ISO string.
          //  Normalize to "YYYY-MM-DD" before comparing with `selectedDate`.
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

          // Only process availability for the selected date (ignore other days returned by the range query)
          if (availabilityDate === selectedDate) {
            entriesForSelectedDate.push(a);
            // Parse startTime/endTime from the backend
            const startTimeStr = a.startTime.toString();
            const endTimeStr = a.endTime.toString();
            const startHour = Number(startTimeStr.slice(0, 2));
            const endHour = Number(endTimeStr.slice(0, 2));

            console.log(
              `Marking hours ${startHour} to ${endHour} as available`
            );

            // Mark all hours [startHour, endHour) as available
            for (let h = startHour; h < endHour; h++) {
              availableHours.add(h);
            }
          }
        });

        console.log("Available hours set:", Array.from(availableHours).sort());

        // Map the availability hours to our static hourly slot list for the grid
        const mappedSlots = hourlySlots.map((slot) => ({
          ...slot,
          isAvailable: availableHours.has(slot.start),
        }));

        setAvailabilityEntries(entriesForSelectedDate);
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
          setAvailabilityEntries([]);
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

              // all fields required
              if (!formDate || !startTime || !endTime) {
                setFormError("All fields are required.");
                return;
              }

              // Ensure format XX:XX and that start < end.
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
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                >
                  <option value="">Select hour</option>
                  {/* Hour-only options so minutes cannot be changed (13:00, 14:00 etc) */}
                  {Array.from(
                    { length: WORKDAY_END_TIME - WORKDAY_START_TIME + 1 },
                    (_, index) => WORKDAY_START_TIME + index
                  ).map((hour) => {
                    const label = `${String(hour).padStart(2, "0")}:00`;
                    return (
                      <option key={hour} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                End time:
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                >
                  <option value="">Select hour</option>
                  {/* Hour-only options so minutes cannot be changed (13:00, 14:00 etc) */}
                  {Array.from(
                    { length: WORKDAY_END_TIME - WORKDAY_START_TIME + 1 },
                    (_, index) => WORKDAY_START_TIME + index
                  ).map((hour) => {
                    const label = `${String(hour).padStart(2, "0")}:00`;
                    return (
                      <option key={hour} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
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

      {/* Provider-only list of availability entries with delete actions */}
      {roles?.includes("PROVIDER") && availabilityEntries.length > 0 && (
        <section className={styles.entriesSection}>
          <h3 className={styles.entriesTitle}>Your availability entries</h3>
          <ul className={styles.entriesList}>
            {availabilityEntries
              .slice()
              .sort((a, b) =>
                String(a.startTime).localeCompare(String(b.startTime))
              )
              .map((a) => {
                // We need id to call DELETE /availability/:id
                const id = a.id ?? a.availabilityId ?? a.availabiltyId;
                const start = String(a.startTime).slice(0, 5);
                const end = String(a.endTime).slice(0, 5);

                return (
                  <li
                    key={id ?? `${a.date}-${start}-${end}`}
                    className={styles.entryRow}
                  >
                    <span className={styles.entryText}>
                      {selectedDate}: {start} – {end}
                    </span>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={async () => {
                        setFormError("");
                        setSuccessMessage("");

                        //cannot call DELETE without an id
                        if (!id) {
                          setFormError(
                            "Cannot delete this entry because its id is missing from the API response."
                          );
                          return;
                        }

                        // Confirmation
                        const ok = window.confirm(
                          `Delete availability for ${selectedDate} from ${start} to ${end}?`
                        );
                        if (!ok) return;

                        try {
                          // Backend: DELETE /availability/:id
                          await axios.delete(
                            `http://localhost:8080/availability/${id}`,
                            { withCredentials: true }
                          );

                          // Update the entries list immediately (no refetch needed)
                          setAvailabilityEntries((prev) =>
                            prev.filter(
                              (x) =>
                                (x.id ??
                                  x.availabilityId ??
                                  x.availabiltyId) !== id
                            )
                          );

                          // Update the timeslots hour-grid by removing these slots.
                          // This assumes availability entries map to whole hours (which I fixed in last edit).
                          const startHour = Number(
                            String(a.startTime).slice(0, 2)
                          );
                          const endHour = Number(String(a.endTime).slice(0, 2));
                          setSlots((prevSlots) =>
                            prevSlots.map((slot) => {
                              if (
                                slot.start >= startHour &&
                                slot.start < endHour
                              ) {
                                return { ...slot, isAvailable: false };
                              }
                              return slot;
                            })
                          );

                          // Show a success message so the user knows it worked
                          setSuccessMessage(
                            "Availability deleted successfully."
                          );
                        } catch (err) {
                          console.error("Failed to delete availability:", err);
                          setFormError(
                            err.response?.data?.message ||
                              "Could not delete availability. Please try again."
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
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
