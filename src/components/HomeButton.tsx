import { useNavigate } from "react-router";
import { Button } from "@mui/material";
import "./HomeButton.css";

export function HomeButton() {
  const navigate = useNavigate();

  return (
    <Button
      variant="contained"
      onClick={() => navigate("/")}
      className="home-button"
    >
      Return Home
    </Button>
  );
}
