import React from 'react';
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductSearchProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  className?: string;
}

export default function ProductSearch({ 
  onSearch, 
  searchQuery: externalSearchQuery, 
  setSearchQuery: externalSetSearchQuery,
  className = ""
}: ProductSearchProps) {
  // Internal state for the old API
  const [internalSearchQuery, setInternalSearchQuery] = React.useState('');
  
  // Determine if we're using the new controlled pattern or old callback pattern
  const isControlled = externalSearchQuery !== undefined && externalSetSearchQuery !== undefined;
  
  // Use either external state or internal state
  const searchQuery = isControlled ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = isControlled 
    ? externalSetSearchQuery 
    : setInternalSearchQuery;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If using old API, call onSearch
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (onSearch) {
        onSearch(searchQuery);
      }
    }
  };
  
  const handleClear = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto mb-8 ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Input
            type="text"
            placeholder="Search for shoes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-4 pr-12 py-2 text-base font-lato border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent"
          />
          {searchQuery ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-10 hover:bg-transparent"
            >
              <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="absolute right-2 hover:bg-transparent"
          >
            <Search className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </Button>
        </div>
      </form>
    </div>
  );
}
