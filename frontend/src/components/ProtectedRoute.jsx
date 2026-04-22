import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  return (
    <>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn signInForceRedirectUrl={location.pathname + location.search} />
      </SignedOut>
    </>
  );
}
