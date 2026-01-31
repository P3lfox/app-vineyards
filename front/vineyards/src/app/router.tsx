import { createBrowserRouter } from "react-router-dom"
import Login from "../pages/Login"
import Dashboard from "../pages/Dashboard"
import CreateUser from "../pages/CreateUser"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <Dashboard />, // después va a ser layout protegido
  },
  {
    path:"/createUser",
    element: <CreateUser/>,
  }
])
