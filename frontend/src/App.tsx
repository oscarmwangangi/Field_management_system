import {  Routes, Route } from 'react-router-dom';
import Layout from './layouts/layoutes.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Agents from './pages/Agents.tsx';
import Fields from './pages/Fields.tsx';
import Reports from './pages/Reports.tsx';
import Login from './pages/auth/Login.tsx';
import Register from './pages/auth/Register.tsx';
import ProtectedRoute from './components/reusables/ProtectedRoute.tsx';
function App() {
 // App.jsx
 return(

  <Routes>
     <Route element={<ProtectedRoute />} >
  <Route path="/" element={<Layout /> }>
 

 
    <Route path='/admin/dashboard' element={<Dashboard />} />
    <Route path="/admin/agents" element={<Agents />} />
    <Route path="/admin/fields" element={<Fields />} />
    <Route path="/admin/reports" element={<Reports/>} />
 </Route>
  </Route>

  <Route path="/login" element={<Login />}  />
  <Route path="/register" element={<Register />}  />
</Routes>

 )

}
export default App

