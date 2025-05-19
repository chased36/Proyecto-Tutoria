import { Menu } from "lucide-react";

export default function MenuButton({ toggle }: { toggle: () => void }) {
  return (
    <button
      title="Abrir menú"
      onClick={toggle}
      className="absolute top-34 left-4 z-30 p-2 bg-[#012243] rounded-md hover:bg-zinc-700 focus:outline-none"
    >
      <Menu size={20} color="white" />
    </button>
  );
}
