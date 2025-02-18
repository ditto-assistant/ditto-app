import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

type AuthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  return children;
}
