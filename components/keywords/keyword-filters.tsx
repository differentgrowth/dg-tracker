"use client";

import type { Route } from "next";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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
        <NativeSelect
          className="w-full"
          defaultValue={initial.domainId}
          id="filter-domain"
          key={`domain-${initial.domainId}`}
          name="domainId"
          onChange={(event) => setParam("domain", event.currentTarget.value)}
        >
          <NativeSelectOption value="">All domains</NativeSelectOption>
          {domains.map((domain) => (
            <NativeSelectOption key={domain.id} value={domain.id}>
              {domain.url}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-priority">Priority</Label>
        <NativeSelect
          className="w-full"
          defaultValue={initial.priority}
          id="filter-priority"
          key={`priority-${initial.priority}`}
          name="priority"
          onChange={(event) => setParam("priority", event.currentTarget.value)}
        >
          <NativeSelectOption value="">Any priority</NativeSelectOption>
          {KEYWORD_PRIORITIES.map((priority) => (
            <NativeSelectOption key={priority} value={priority}>
              {priority}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-tag">Tag</Label>
        <NativeSelect
          className="w-full"
          defaultValue={initial.tag}
          id="filter-tag"
          key={`tag-${initial.tag}`}
          name="tag"
          onChange={(event) => setParam("tag", event.currentTarget.value)}
        >
          <NativeSelectOption value="">Any tag</NativeSelectOption>
          {tags.map((tag) => (
            <NativeSelectOption key={tag} value={tag}>
              {tag}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-stale">Last checked</Label>
        <NativeSelect
          className="w-full"
          defaultValue={initial.stale}
          id="filter-stale"
          key={`stale-${initial.stale}`}
          name="stale"
          onChange={(event) => setParam("stale", event.currentTarget.value)}
        >
          {STALE_OPTIONS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-status">Status</Label>
        <NativeSelect
          className="w-full"
          defaultValue={initial.status}
          id="filter-status"
          key={`status-${initial.status}`}
          name="status"
          onChange={(event) => setParam("status", event.currentTarget.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
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
