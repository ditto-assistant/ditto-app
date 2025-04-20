import { Search } from "lucide-react"
import "./SearchBar.css"

export default function SearchBar({ searchTerm, onSearchChange }) {
  return (
    <div className="search-wrapper">
      <div className="search-container">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Search scripts..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>
    </div>
  )
}
