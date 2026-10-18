import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Desk from "./pages/Desk.jsx";
import WorkerPage from "./pages/WorkerPage.jsx";
import SeniorPage from "./pages/SeniorPage.jsx";
import ManagerPage from "./pages/ManagerPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import { readSession } from "./session.js";

function ScrollTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function RequireLogin() {
  const { pathname } = useLocation();
  const session = readSession();
  if (!session) return <Navigate to="/login" replace />;
  const onOwnDesk = pathname === session.path || pathname.startsWith(`${session.path}/`);
  if (!onOwnDesk) return <Navigate to={session.path} replace />;
  return <Desk session={session} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboards" element={<RequireLogin />}>
          <Route index element={<SignedInHome />} />
          <Route path="support-worker" element={<WorkerPage />} />
          <Route path="shift-lead" element={<SeniorPage />} />
          <Route path="manager" element={<ManagerPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="care-worker" element={<SignedInHome />} />
          <Route path="senior" element={<SignedInHome />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function SignedInHome() {
  const session = readSession();
  return <Navigate to={session?.path || "/login"} replace />;
}
