import { createBrowserRouter, Navigate } from "react-router-dom"
import Login from "../pages/Login"
import Dashboard from "../pages/Dashboard"
import CreateUser from "../pages/CreateUser"
import GetUsers from "../pages/GetUsers"
import Profile from "../pages/Profile"
import GetVineyards from "../pages/GetVineyards"
import CreateVineyard from "../pages/CreateVineyard"
import Plots from "../pages/Plots"
import VineRows from "../pages/VineRows"
import Plants from "../pages/Plants"
import PlantDetail from "../pages/PlantDetail"
import PlotMap from "../pages/PlotMap"
import Harvests from "../pages/Harvests"
import Tasks from "../pages/Tasks"
import IrrigationSystems from "../pages/IrrigationSystems"
import Prunings from "../pages/Prunings"
import PlantHealthMap from "../pages/PlantHealthMap"
import Layout from "../components/layout/Layout"
import RequireAuth from "../components/RequireAuth"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },

      // Viñedos
      { path: "vineyards", element: <GetVineyards /> },
      { path: "vineyards/create", element: <CreateVineyard /> },
      { path: "vineyards/:vineyardId/plots", element: <Plots /> },

      // Parcelas
      { path: "plots", element: <Plots /> },
      { path: "plots/:plotId/map", element: <PlotMap /> },
      { path: "plots/:plotId/rows", element: <VineRows /> },
      { path: "plots/:plotId/rows/:rowId/plants", element: <Plants /> },
      { path: "plots/:plotId/rows/plants", element: <Plants /> },
      { path: "plots/:plotId/harvests", element: <Harvests /> },
      { path: "plots/:plotId/tasks", element: <Tasks /> },

      // Cosechas
      { path: "harvests", element: <Harvests /> },
      { path: "harvests/create", element: <Harvests /> },

      // Tareas
      { path: "tasks", element: <Tasks /> },
      { path: "tasks/create", element: <Tasks /> },

      // Sanidad (replaces Diseases + Treatments)
      { path: "sanidad", element: <PlantHealthMap /> },
      { path: "diseases", element: <Navigate to="/sanidad" replace /> },
      { path: "treatments", element: <Navigate to="/sanidad" replace /> },
      { path: "irrigation-systems", element: <IrrigationSystems /> },

      // Podas
      { path: "prunings", element: <Prunings /> },

      // Planta detalle
      { path: "plants/:plantId", element: <PlantDetail /> },

      // Usuarios (solo admin)
      { path: "users", element: <GetUsers /> },
      { path: "users/create", element: <CreateUser /> },

      // Perfil
      { path: "profile", element: <Profile /> },
    ],
  },
])
