import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SectionCard({ title, linkTo, linkLabel, children }) {
  return (
    <div className="un-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-urban-border">
        <h3 className="text-sm font-semibold text-urban-text">{title}</h3>
        {linkTo && (
          <Link
            to={linkTo}
            className="flex items-center gap-1 text-xs font-medium text-urban-neon hover:underline"
          >
            {linkLabel ?? "View all"}
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}
