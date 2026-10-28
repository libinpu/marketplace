import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Professionals from "./pages/Professionals";
import Verification from "./pages/Verification";
import Requests from "./pages/Requests";
import Reviews from "./pages/Reviews";
import Payments from "./pages/Payments";
import Complaints from "./pages/Complaints";
import Categories from "./pages/Categories";
import LocationPricing from "./pages/LocationPricing";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="professionals" element={<Professionals />} />
          <Route path="verification" element={<Verification />} />
          <Route path="requests" element={<Requests />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="payments" element={<Payments />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="categories" element={<Categories />} />
          <Route path="pricing" element={<LocationPricing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;