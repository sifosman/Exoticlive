import React from 'react';
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductSearchProps {
  onSearch: (query: string) => void;
}

export default function ProductSearch({ onSearch }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
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
