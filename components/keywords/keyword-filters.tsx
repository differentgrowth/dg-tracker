"use client";

import type { Route } from "next";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KEYWORD_PRIORITIES } from "@/lib/validators/keyword";

interface KeywordFiltersProps {
  domains: { id: string; url: string }[];
  initial: {
    domainId: string;
    priority: string;
    tag: string;
    stale: string;
    status: string;
  };
  tags: string[];
}

const STALE_OPTIONS = [
  { value: "", label: "Any freshness" },
  { value: "7", label: "Not checked in 7+ days" },
  { value: "30", label: "Not checked in 30+ days" },
  { value: "90", label: "Not checked in 90+ days" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

export function KeywordFilters({
  domains,
  tags,
  initial,
}: KeywordFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === defaultValueFor(key)) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    const url = (query ? `${pathname}?${query}` : pathname) as Route;
    startTransition(() => {
      router.replace(url);
    });
  }

  function reset() {
    startTransition(() => {
      router.replace(pathname as Route);
    });
  }

  return (
    <form
      aria-busy={isPending}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-domain">Domain</Label>
        <Select
          defaultValue={initial.domainId}
          id="filter-domain"
          items={[
            { label: "All domains", value: "" },
            ...domains.map((domain) => ({
              label: domain.url,
              value: domain.id,
            })),
          ]}
          key={`domain-${initial.domainId}`}
          name="domainId"
          onValueChange={(value: string | null) =>
            setParam("domain", value ?? "")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All domains</SelectItem>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.url}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-priority">Priority</Label>
        <Select
          defaultValue={initial.priority}
          id="filter-priority"
          items={[
            { label: "Any priority", value: "" },
            ...KEYWORD_PRIORITIES.map((priority) => ({
              label: priority,
              value: priority,
            })),
          ]}
          key={`priority-${initial.priority}`}
          name="priority"
          onValueChange={(value: string | null) =>
            setParam("priority", value ?? "")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Any priority</SelectItem>
              {KEYWORD_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-tag">Tag</Label>
        <Select
          defaultValue={initial.tag}
          id="filter-tag"
          items={[
            { label: "Any tag", value: "" },
            ...tags.map((tag) => ({ label: tag, value: tag })),
          ]}
          key={`tag-${initial.tag}`}
          name="tag"
          onValueChange={(value: string | null) => setParam("tag", value ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">Any tag</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-stale">Last checked</Label>
        <Select
          defaultValue={initial.stale}
          id="filter-stale"
          items={STALE_OPTIONS}
          key={`stale-${initial.stale}`}
          name="stale"
          onValueChange={(value: string | null) =>
            setParam("stale", value ?? "")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STALE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-status">Status</Label>
        <Select
          defaultValue={initial.status}
          id="filter-status"
          items={STATUS_OPTIONS}
          key={`status-${initial.status}`}
          name="status"
          onValueChange={(value: string | null) =>
            setParam("status", value ?? "")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end md:col-span-2 xl:col-span-5">
        <Button onClick={reset} type="button" variant="ghost">
          Clear filters
        </Button>
      </div>
    </form>
  );
}

function defaultValueFor(key: string) {
  if (key === "status") {
    return "active";
  }
  return "";
}
