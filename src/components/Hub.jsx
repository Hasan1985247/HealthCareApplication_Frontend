import { useNavigate } from "react-router-dom";
import styles from "./styles/Hub.module.css";
import Logout from "./Logout";
import { useAuth } from "../hooks/useAuth";

function Hub() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const roles = authState?.roles || [];
  const isAdmin = roles.some((role) => String(role).toLowerCase() === "admin");
  const isProvider = roles.some(
    (role) => String(role).toLowerCase() === "provider",
  );
  const isPatient = roles.some(
    (role) => String(role).toLowerCase() === "patient",
  );

  return (
    <div className={styles.hubContainer}>
      <h2 className={styles.title}>Hub</h2>
      <div className={styles.buttons}>
        {/* 1. Log Out */}
        <Logout />

        {/* 2. Availability - visible to PROVIDER and ADMIN */}
        {(isProvider || isAdmin) && (
          <button
            type="button"
            className={styles.hubButton}
            onClick={() => navigate("/provider/availability")}
          >
            Availability
          </button>
        )}

        {/* 3. Appointment - visible to PATIENT, PROVIDER, ADMIN */}
        {(isPatient || isProvider || isAdmin) && (
          <button
            type="button"
            className={styles.hubButton}
            onClick={() => navigate("/appointment")}
          >
            Appointment
          </button>
        )}

        {/* 4. Admin Dashboard - visible to ADMIN only */}
        {isAdmin && (
          <button
            type="button"
            className={styles.hubButton}
            onClick={() => navigate("/admin/dashboard")}
          >
            Admin Dashboard
          </button>
        )}
      </div>
    </div>
  );
}

export default Hub;
