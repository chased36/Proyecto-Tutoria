import Link from "next/link";

export interface MenuItem {
  name: string;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  menuItems: MenuItem[];
  title?: string;
}

const Sidebar = ({ isOpen, menuItems, title = "Menú" }: SidebarProps) => {
  return (
    <aside
      className={`h-full bg-blue-500 p-6 transition-transform duration-300 z-20 ${
        isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
      }`}
    >
      <h2 className="text-lg font-semibold border-b border-white pb-2 mt-8 text-white">
        {title}
      </h2>
      <nav className="mt-4">
        <ul>
          {menuItems.map((item) => (
            <li key={item.name} className="mb-4">
              <Link href={item.path} className="text-white hover:text-blue-200">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
