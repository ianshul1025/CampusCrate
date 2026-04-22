import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import './index.css'

// Placeholder Components (Will build these next)
import LandingPage from "./pages/LandingPage"
import Dashboard from "./pages/Dashboard"
import ProfileSetup from "./pages/ProfileSetup"
import Profile from "./pages/Profile"
import AdminLogin from "./pages/AdminLogin"
import AdminDashboard from "./pages/AdminDashboard"
import ReportItem from "./pages/ReportItem"
import ItemDetail from "./pages/ItemDetail"
import Messages from "./pages/Messages"
import BlockedMessages from "./pages/BlockedMessages"
import MyPosts from "./pages/MyPosts"
import EditItem from "./pages/EditItem"
import SavedItems from "./pages/SavedItems"
import NotFound from "./pages/NotFound"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "./context/AuthContext"
import { SocketProvider } from "./context/SocketContext"
import { AdminAuthProvider } from "./context/AdminAuthContext"

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Routes>
          
          {/* Public Landing Page - accessible to everyone */}
          <Route 
            path="/" 
            element={<LandingPage />} 
          />

          {/* Protected Routes */}
          <Route 
            path="/complete-profile" 
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/report" 
            element={
              <ProtectedRoute>
                <ReportItem />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/item/:id" 
            element={
              <ProtectedRoute>
                <ItemDetail />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/messages/:itemId" 
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/messages/:itemId/:otherUserId" 
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/blocked-messages" 
            element={
              <ProtectedRoute>
                <BlockedMessages />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/my-posts" 
            element={
              <ProtectedRoute>
                <MyPosts />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/saved-items" 
            element={
              <ProtectedRoute>
                <SavedItems />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/edit-item/:id" 
            element={
              <ProtectedRoute>
                <EditItem />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes (Bypass Clerk) */}
          <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
          <Route path="/admin/dashboard" element={<AdminAuthProvider><AdminDashboard /></AdminAuthProvider>} />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
          
            </Routes>
          </SocketProvider>
        </AuthProvider>
        <Toaster position="top-center" richColors theme="dark" />
      </BrowserRouter>
    </ClerkProvider>
  )
}

export default App
