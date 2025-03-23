import { Outlet } from "react-router";
import { Noise } from "~/components/noise";

export default function Layout() {
  return (
    <>
      <Noise />
      <Outlet />
    </>
  );
}
