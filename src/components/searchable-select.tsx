"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";

interface SearchableSelectOption {
  value: number;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  onCreateNew?: (searchText: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

type DropdownItem =
  | { type: "option"; value: number; label: string }
  | { type: "create"; value: -1; label: string };

export function SearchableSelect({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = "Select...",
  required = false,
  disabled = false,
  label = "Select an option",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionIdPrefix = useId();

  const selectedLabel = value !== null ? options.find(o => o.value === value)?.label ?? "" : "";

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const showCreateNew = onCreateNew && search.trim().length > 0 && !options.some(o => o.label.toLowerCase() === search.toLowerCase());

  const items: DropdownItem[] = [
    ...filtered.map(o => ({ type: "option" as const, value: o.value, label: o.label })),
    ...(showCreateNew ? [{ type: "create" as const, value: -1 as const, label: `Create new: "${search.trim()}"` }] : []),
  ];

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setHighlightIndex(-1);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  const selectValue = (v: number | null) => {
    onChange(v);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        setHighlightIndex(items.length > 0 ? 0 : -1);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setHighlightIndex(items.length > 0 ? 0 : -1);
        break;
      case "End":
        e.preventDefault();
        setHighlightIndex(items.length > 0 ? items.length - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < items.length) {
          const item = items[highlightIndex];
          if (item.type === "create" && onCreateNew) {
            onCreateNew(search.trim());
            close();
          } else if (item.type === "option") {
            selectValue(item.value);
          }
        }
        break;
      case "Escape":
        close();
        inputRef.current?.focus();
        break;
    }
  };

  const displayValue = isOpen ? search : selectedLabel;
  const placeholderText = selectedLabel || placeholder;

  const activeDescendant = highlightIndex >= 0 && highlightIndex < items.length
    ? `${optionIdPrefix}-${highlightIndex}`
    : undefined;

  return (
    <div ref={containerRef} className="searchable-select">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        className="searchable-select-input"
        value={displayValue}
        onChange={e => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={isOpen ? "Type to search..." : placeholderText}
        required={required && value === null}
        disabled={disabled}
        autoComplete="off"
        aria-label={label}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-haspopup="listbox"
      />
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="searchable-select-dropdown"
          aria-label={label}
        >
          {items.length === 0 && (
            <li className="searchable-select-empty" role="presentation">No matches</li>
          )}
          {items.map((item, i) => (
            <li
              id={`${optionIdPrefix}-${i}`}
              key={item.type === "create" ? "__create__" : item.value}
              role="option"
              aria-selected={item.type === "option" && item.value === value}
              className={[
                "searchable-select-item",
                i === highlightIndex ? "highlighted" : "",
                item.type === "create" ? "create-new" : "",
                item.type === "option" && item.value === value ? "selected" : "",
              ].filter(Boolean).join(" ")}
              onMouseDown={e => {
                e.preventDefault();
                if (item.type === "create" && onCreateNew) {
                  onCreateNew(search.trim());
                  close();
                } else if (item.type === "option") {
                  selectValue(item.value);
                }
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
