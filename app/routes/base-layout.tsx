import { Outlet } from "react-router";
import { Noise } from "~/components/noise";
import { Toaster } from "~/components/ui/sonner";

export default function Layout() {
  return (
    <>
      <Noise />
      <Outlet />
      <Toaster />
    </>
  );
}
