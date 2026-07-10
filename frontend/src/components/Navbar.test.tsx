import { fireEvent, render, screen } from "@testing-library/react";
import Navbar from "./Navbar";

jest.mock("react-router-dom", () => {
  const React = jest.requireActual("react") as typeof import("react");

  return {
    Link: ({ children, onClick, to }: {
      children?: import("react").ReactNode;
      onClick?: import("react").MouseEventHandler<HTMLAnchorElement>;
      to: string;
    }) => React.createElement("a", { href: to, onClick }, children),
    useLocation: () => ({ pathname: "/" })
  };
}, { virtual: true });

test("toggles the navigation menu", () => {
  render(<Navbar />);

  const toggle = screen.getByRole("button", { name: "Open navigation menu" });
  const menu = screen.getByRole("list", { name: "Primary navigation menu" });

  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(menu?.classList.contains("is-open")).toBe(false);

  fireEvent.click(toggle);

  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(toggle.getAttribute("aria-label")).toBe("Close navigation menu");
  expect(menu?.classList.contains("is-open")).toBe(true);

  fireEvent.click(toggle);

  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(menu?.classList.contains("is-open")).toBe(false);
});
