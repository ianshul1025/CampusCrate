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
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "./context/AuthContext"
import { SocketProvider } from "./context/SocketContext"
import { AdminAuthProvider } from "./context/AdminAuthContext"

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

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
              <SignedIn>
                <ProfileSetup />
              </SignedIn>
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <SignedIn>
                <Dashboard />
              </SignedIn>
            } 
          />

          <Route 
            path="/profile" 
            element={
              <SignedIn>
                <Profile />
              </SignedIn>
            } 
          />

          <Route 
            path="/report" 
            element={
              <SignedIn>
                <ReportItem />
              </SignedIn>
            } 
          />

          <Route 
            path="/item/:id" 
            element={
              <SignedIn>
                <ItemDetail />
              </SignedIn>
            } 
          />

          <Route 
            path="/messages" 
            element={
              <SignedIn>
                <Messages />
              </SignedIn>
            } 
          />
          <Route 
            path="/messages/:itemId" 
            element={
              <SignedIn>
                <Messages />
              </SignedIn>
            } 
          />
          <Route 
            path="/blocked-messages" 
            element={
              <SignedIn>
                <BlockedMessages />
              </SignedIn>
            } 
          />

          <Route 
            path="/my-posts" 
            element={
              <SignedIn>
                <MyPosts />
              </SignedIn>
            } 
          />

          <Route 
            path="/saved-items" 
            element={
              <SignedIn>
                <SavedItems />
              </SignedIn>
            } 
          />

          <Route 
            path="/edit-item/:id" 
            element={
              <SignedIn>
                <EditItem />
              </SignedIn>
            } 
          />

          {/* Admin Routes (Bypass Clerk) */}
          <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
          <Route path="/admin/dashboard" element={<AdminAuthProvider><AdminDashboard /></AdminAuthProvider>} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
            </Routes>
          </SocketProvider>
        </AuthProvider>
        <Toaster position="top-center" richColors theme="dark" />
      </BrowserRouter>
    </ClerkProvider>
  )
}

export default App
