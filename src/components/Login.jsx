import styles from "./styles/LoginRegister.module.css";
import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
// Styles moved to Login.module.css and imported as `styles`.

function Login() {
  const { setAuthState } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", credentials);

      console.log("Login successful:", JSON.stringify(response.data));

      const { loggedInUser, roles } = response.data;

      // Update global auth state with user information
      setAuthState({
        isAuthenticated: true,
        user: loggedInUser,
        roles: roles,
      });

      // After successful login, take user to the Hub page
      navigate("/hub", { replace: true });
    } catch (error) {
      console.error("Login failed:", error.response || error);
      setError("Invalid username or password");
    }
  };

  return (
    <div className={styles.loginRegisterContainer}>
      <h2 className={styles.title}>Login</h2>
      <form
        className={styles.formWrapper}
        onSubmit={handleLogin}
        aria-label="Login form"
      >
        <label htmlFor="username">Username:</label>
        <input
          className={styles.styledInput}
          id="username"
          name="username"
          type="text"
          value={credentials.username}
          onChange={handleInputChange}
        />
        <label htmlFor="password">Password:</label>
        <input
          className={styles.styledInput}
          id="password"
          name="password"
          type="password"
          value={credentials.password}
          onChange={handleInputChange}
        />
        {error && <p className={styles.errorText}>{error}</p>}
        <button className={styles.submitButton} type="submit">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
