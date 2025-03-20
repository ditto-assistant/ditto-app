import React, { ReactNode } from "react";
import { Outlet } from "react-router";
import "../../styles/layouts/layout.css";

interface LayoutProps {
  children?: ReactNode;
  className: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return <div className={className}>{children || <Outlet />}</div>;
};

export default Layout;
