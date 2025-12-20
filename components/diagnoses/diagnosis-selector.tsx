"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ICDSearchResult, StructuredDiagnosis } from "@/types/icd"

interface DiagnosisSelectorProps {
  value?: StructuredDiagnosis | null
  onSelect: (diagnosis: StructuredDiagnosis) => void
  onCancel?: () => void
  placeholder?: string
  initialSearchText?: string
  className?: string
}

/**
 * DiagnosisSelector - Autocomplete search for ICD-11 codes
 * Uses Command (cmdk) + Popover for accessible combobox
 */
export function DiagnosisSelector({
  value,
  onSelect,
  onCancel,
  placeholder = "Buscar diagnóstico CIE-11...",
  initialSearchText = "",
  className,
}: DiagnosisSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState(initialSearchText)
  const [results, setResults] = React.useState<ICDSearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/icd/search?q=${encodeURIComponent(searchQuery)}&limit=10`
        )
        const data = await response.json()

        if (data.success && data.result) {
          setResults(data.result)
        } else {
          setResults([])
        }
      } catch (error) {
        console.error("ICD search error:", error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const handleSelect = (result: ICDSearchResult) => {
    const diagnosis: StructuredDiagnosis = {
      original_text: searchQuery || result.title,
      icd11_code: result.code,
      icd11_title: result.title,
      icd11_uri: result.uri,
      confidence: 1.0, // User-selected = full confidence
      verified_by_doctor: true, // User-selected = verified
      coded_at: new Date().toISOString(),
    }

    onSelect(diagnosis)
    setOpen(false)
    setSearchQuery("")
    setResults([])
  }

  const handleCustomDiagnosis = () => {
    if (!searchQuery.trim()) return

    const diagnosis: StructuredDiagnosis = {
      original_text: searchQuery.trim(),
      icd11_code: null,
      icd11_title: null,
      icd11_uri: null,
      confidence: 0,
      verified_by_doctor: false,
      coded_at: null,
    }

    onSelect(diagnosis)
    setOpen(false)
    setSearchQuery("")
    setResults([])
  }

  const displayValue = value
    ? value.icd11_code
      ? `[${value.icd11_code}] ${value.icd11_title || value.original_text}`
      : value.original_text
    : ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />
            )}
            {searchQuery && !isLoading && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setResults([])
                }}
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <CommandList>
            {!isLoading && searchQuery.length >= 2 && results.length === 0 && (
              <CommandEmpty>
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No se encontraron códigos CIE-11
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={handleCustomDiagnosis}
                  >
                    Agregar &quot;{searchQuery}&quot; sin código
                  </Button>
                </div>
              </CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading="Resultados CIE-11">
                {results.map((result) => (
                  <CommandItem
                    key={`${result.code}-${result.uri}`}
                    value={result.code}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {result.code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(result.matchScore * 100)}%
                        </span>
                      </div>
                      <span className="text-sm">{result.title}</span>
                    </div>
                    {value?.icd11_code === result.code && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchQuery.length >= 2 && results.length > 0 && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={handleCustomDiagnosis}
                >
                  Agregar &quot;{searchQuery}&quot; sin código CIE-11
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
        {onCancel && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onCancel()
                setOpen(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * InlineDiagnosisSelector - Simpler inline selector for quick edits
 */
interface InlineDiagnosisSelectorProps {
  initialValue?: string
  onSelect: (diagnosis: StructuredDiagnosis) => void
  onCancel: () => void
  autoFocus?: boolean
}

export function InlineDiagnosisSelector({
  initialValue = "",
  onSelect,
  onCancel,
  autoFocus = true,
}: InlineDiagnosisSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState(initialValue)
  const [results, setResults] = React.useState<ICDSearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/icd/search?q=${encodeURIComponent(searchQuery)}&limit=5`
        )
        const data = await response.json()

        if (data.success && data.result) {
          setResults(data.result)
          setSelectedIndex(0)
        } else {
          setResults([])
        }
      } catch (error) {
        console.error("ICD search error:", error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const handleSelect = (result: ICDSearchResult) => {
    const diagnosis: StructuredDiagnosis = {
      original_text: searchQuery || result.title,
      icd11_code: result.code,
      icd11_title: result.title,
      icd11_uri: result.uri,
      confidence: 1.0,
      verified_by_doctor: true,
      coded_at: new Date().toISOString(),
    }
    onSelect(diagnosis)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex])
      }
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
        <Search className="h-4 w-4 shrink-0 opacity-50" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent text-sm outline-none"
          placeholder="Buscar código CIE-11..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />
        )}
        <button onClick={onCancel} className="opacity-50 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg z-50 max-h-[200px] overflow-auto">
          {results.map((result, index) => (
            <button
              key={`${result.code}-${result.uri}`}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => handleSelect(result)}
            >
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {result.code}
              </span>
              <span className="truncate flex-1">{result.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
