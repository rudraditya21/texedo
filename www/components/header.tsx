import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SettingsIcon } from "lucide-react";

export default function Header() {
  return (
    <div className="py-4 px-6 flex items-center justify-between border-b">
      <h1 className="tracking-wider">TEXEDO</h1>
      <div className="flex items-center space-x-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-xs uppercase rounded-full flex items-center ">
              <SettingsIcon />
              <span>Settings</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <ThemeToggle />
      </div>
    </div>
  )
}