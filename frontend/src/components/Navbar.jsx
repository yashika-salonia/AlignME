import React from "react";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useNavigate, Link } from "react-router";
import "../style/navbar.scss";

const Navbar = () => {
  const { handleLogout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    await handleLogout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <h1 className="navbar__title">
          <Link to={"/"}>
            Align<span className="highlight">ME</span>
          </Link>
        </h1>{" "}
      </div>
      <div className="navbar__right">
        <button
          className="button primary-button navbar__logout"
          onClick={handleLogoutClick}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
