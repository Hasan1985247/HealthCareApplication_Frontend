# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
  HealthCare AB — Booking Application Frontend
  A React-based frontend for the Healthcare AB booking system.
  Users can register, log in, manage availability (providers) and book appointments (patients).

Tech Stack

React 18
Vite (build tool + dev server)
React Router DOM v6 (client-side routing)
Axios (HTTP requests to backend API)
Styled Components + CSS Modules (styling)


Prerequisites

Node.js (v18 or higher)
npm
Backend running on http://localhost:8080


How to Run Locally
1. Clone the repository
   bashgit clone https://github.com/REPO-URL/HealthCareApplication_Frontend.git
   cd HealthCareApplication_Frontend
2. Install dependencies
   bashnpm install
3. Create environment file
   Create a file called .env.local in the root folder:
   VITE_API_URL=http://localhost:8080
4. Start the development server
   bashnpm run dev
   The app runs on http://localhost:5173
