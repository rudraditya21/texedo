import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  return (
    <div className="py-4 px-6 flex items-center justify-between border-b">
      <h1 className="tracking-wider">TEXEDO</h1>
      <div className="flex items-center space-x-4">
        <p>Settings</p>
        <ThemeToggle />
      </div>
    </div>
  )
}