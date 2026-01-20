import { useNavigate } from "react-router-dom";
import styles from "./styles/Hub.module.css";
import Logout from "./Logout";

function Hub() {
  const navigate = useNavigate();

  return (
    <div className={styles.hubContainer}>
      <h2 className={styles.title}>Hub</h2>
      <div className={styles.buttons}>
        {/* 1. Log Out */}
        <Logout />

        {/* 2. Availability */}
        <button
          type="button"
          className={styles.hubButton}
          onClick={() => navigate("/provider/availability")}
        >
          Availability
        </button>

        {/* 3. Appointment */}
        <button
          type="button"
          className={styles.hubButton}
          onClick={() => navigate("/appointment")}
        >
          Appointment
        </button>

        {/* 4. Admin Dashboard */}
        <button
          type="button"
          className={styles.hubButton}
          onClick={() => navigate("/admin/dashboard")}
        >
          Admin Dashboard
        </button>
      </div>
    </div>
  );
}

export default Hub;
